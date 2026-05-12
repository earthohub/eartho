#!/usr/bin/env python3
"""
Lightweight Polymarket probability monitor: velocity, acceleration, volume context,
and rough lead–lag vs BTC spot (default: CoinGecko; Polymarket resolution text often cites Binance).

Public APIs only — no API keys.
"""

from __future__ import annotations

import argparse
import json
import math
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from statistics import mean, pstdev
from typing import Any, Iterable

GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"
COINGECKO_CHART = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"


def _http_json(url: str, timeout: float = 30.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "polymarket-monitor/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_event_by_slug(slug: str) -> dict[str, Any]:
    q = urllib.parse.urlencode({"slug": slug})
    data = _http_json(f"{GAMMA_API}/events?{q}")
    if not data:
        raise RuntimeError(f"No event found for slug={slug!r}")
    return data[0]


def parse_clob_token_ids(market: dict[str, Any]) -> tuple[str, str]:
    raw = market.get("clobTokenIds") or "[]"
    if isinstance(raw, str):
        ids = json.loads(raw)
    else:
        ids = raw
    if len(ids) < 2:
        raise ValueError("market missing clobTokenIds")
    return str(ids[0]), str(ids[1])  # Yes, No


def fetch_midpoint(token_id: str) -> float:
    q = urllib.parse.urlencode({"token_id": token_id})
    j = _http_json(f"{CLOB_API}/midpoint?{q}")
    return float(j["mid"])


def fetch_spread(token_id: str) -> float:
    q = urllib.parse.urlencode({"token_id": token_id})
    j = _http_json(f"{CLOB_API}/spread?{q}")
    return float(j["spread"])


def fetch_prices_history(
    token_id: str,
    *,
    interval: str = "1d",
    fidelity: int = 5,
    start_ts: int | None = None,
    end_ts: int | None = None,
) -> list[dict[str, Any]]:
    params: dict[str, str | int] = {
        "market": token_id,
        "interval": interval,
        "fidelity": fidelity,
    }
    if start_ts is not None:
        params["startTs"] = start_ts
    if end_ts is not None:
        params["endTs"] = end_ts
    q = urllib.parse.urlencode(params)
    j = _http_json(f"{CLOB_API}/prices-history?{q}")
    hist = j.get("history") or []
    hist.sort(key=lambda x: int(x["t"]))
    return hist


def fetch_btc_chart_usd(*, days: float = 1.0) -> list[tuple[int, float]]:
    """CoinGecko market_chart: [ms, price]."""
    q = urllib.parse.urlencode({"vs_currency": "usd", "days": str(days)})
    j = _http_json(f"{COINGECKO_CHART}?{q}")
    out: list[tuple[int, float]] = []
    for ms, px in j.get("prices") or []:
        out.append((int(ms) // 1000, float(px)))
    out.sort(key=lambda x: x[0])
    return out


def price_at_or_before(series: list[tuple[int, float]], t_target: int) -> float | None:
    """series sorted by t ascending; last point with t <= t_target."""
    lo, hi = 0, len(series) - 1
    best: float | None = None
    best_t = -1
    while lo <= hi:
        mid = (lo + hi) // 2
        t, p = series[mid]
        if t <= t_target:
            if t >= best_t:
                best_t, best = t, p
            lo = mid + 1
        else:
            hi = mid - 1
    return best


def history_to_series(hist: list[dict[str, Any]]) -> list[tuple[int, float]]:
    return [(int(h["t"]), float(h["p"])) for h in hist]


def deltas_from_series(
    series: list[tuple[int, float]],
    *,
    now_ts: int,
    horizons_sec: Iterable[int],
) -> dict[int, float | None]:
    """p_now uses last sample <= now_ts; p_h uses last sample <= now_ts - h."""
    if not series:
        return {h: None for h in horizons_sec}
    p_now = price_at_or_before(series, now_ts)
    out: dict[int, float | None] = {}
    for h in horizons_sec:
        past = price_at_or_before(series, now_ts - h)
        if p_now is None or past is None:
            out[h] = None
        else:
            out[h] = p_now - past
    return out


def zscore_last_vs_window(values: list[float], last: float) -> float | None:
    if len(values) < 3:
        return None
    m = mean(values)
    s = pstdev(values)
    if s < 1e-12:
        return None
    return (last - m) / s


def build_rolling_deltas(series: list[tuple[int, float]], window_sec: int) -> list[float]:
    """For each point t, delta = p(t) - p(t_window) where t_window is last point <= t - window."""
    out: list[float] = []
    for t, _ in series:
        p0 = price_at_or_before(series, t)
        p1 = price_at_or_before(series, t - window_sec)
        if p0 is not None and p1 is not None:
            out.append(p0 - p1)
    return out


def pearson(xs: list[float], ys: list[float]) -> float | None:
    n = min(len(xs), len(ys))
    if n < 5:
        return None
    xs, ys = xs[:n], ys[:n]
    mx, my = mean(xs), mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if dx < 1e-12 or dy < 1e-12:
        return None
    return num / (dx * dy)


def align_nearest(
    lead: list[tuple[int, float]],
    follow: list[tuple[int, float]],
    max_lag_sec: int = 360,
) -> list[tuple[float, float]]:
    """For each (t,p) in lead, pair with follow price at nearest t (within max_lag_sec)."""
    out: list[tuple[float, float]] = []
    for t, p in lead:
        best: tuple[int, float] | None = None
        for tf, pf in follow:
            if abs(tf - t) <= max_lag_sec:
                if best is None or abs(tf - t) < abs(best[0] - t):
                    best = (tf, pf)
        if best is not None:
            out.append((p, best[1]))
    return out


def simple_diffs(prices: list[float]) -> list[float]:
    return [prices[i] - prices[i - 1] for i in range(1, len(prices))]


def log_diffs_btc(prices: list[float]) -> list[float]:
    out: list[float] = []
    for i in range(1, len(prices)):
        a, b = prices[i - 1], prices[i]
        if a <= 0 or b <= 0:
            out.append(0.0)
        else:
            out.append(math.log(b / a))
    return out


def lead_lag_corr(
    prob_series: list[tuple[int, float]],
    btc_series: list[tuple[int, float]],
    *,
    max_steps: int = 6,
) -> list[tuple[int, float | None]]:
    """
    Align prob and BTC on common timestamps (prob clock).
    prob_shift > 0 pairs earlier prob moves with later BTC moves (prob may lead).
    """
    if len(prob_series) < 10 or len(btc_series) < 10:
        return []
    aligned = align_nearest(prob_series, btc_series, max_lag_sec=600)
    if len(aligned) < 10:
        return []
    p_seq = [a[0] for a in aligned]
    b_seq = [a[1] for a in aligned]
    rp = simple_diffs(p_seq)
    rb = log_diffs_btc(b_seq)
    n = min(len(rp), len(rb))
    if n < 6:
        return []
    rp, rb = rp[:n], rb[:n]
    results: list[tuple[int, float | None]] = []
    for s in range(-max_steps, max_steps + 1):
        if s == 0:
            c = pearson(rp, rb)
            results.append((0, c))
            continue
        if s > 0:
            a, b = rp[s:], rb[:-s]
        else:
            k = -s
            a, b = rp[:-k], rb[k:]
        m = min(len(a), len(b))
        if m < 5:
            results.append((s, None))
        else:
            results.append((s, pearson(a[:m], b[:m])))
    return results


def top_book_depth_usd(book: dict[str, Any], levels: int = 3) -> tuple[float, float]:
    """Sum size at top N bid / ask levels (size is in outcome tokens, not USD — used as relative liquidity)."""
    bids = book.get("bids") or []
    asks = book.get("asks") or []
    bid_sz = sum(float(x["size"]) for x in bids[:levels])
    ask_sz = sum(float(x["size"]) for x in asks[:levels])
    return bid_sz, ask_sz


def fetch_book(token_id: str) -> dict[str, Any]:
    q = urllib.parse.urlencode({"token_id": token_id})
    return _http_json(f"{CLOB_API}/book?{q}")


@dataclass
class MarketSnap:
    market_id: str
    question: str
    group_title: str
    yes_token: str
    mid: float
    spread: float
    vol24: float
    liq: float
    bid_depth3: float
    ask_depth3: float
    dp_5m: float | None
    dp_15m: float | None
    dp_1h: float | None
    vel_15m_per_min: float | None
    accel_15m: float | None
    z_15m: float | None
    alert: str = ""

    def row(self) -> list[str]:
        def f(x: float | None, nd: int = 4) -> str:
            if x is None:
                return "—"
            return f"{x:.{nd}f}"

        return [
            self.group_title[:18] + ("…" if len(self.group_title) > 18 else ""),
            f"{self.mid:.4f}",
            f"{self.spread:.4f}",
            f"{self.vol24:,.0f}",
            f(self.dp_5m),
            f(self.dp_15m),
            f(self.dp_1h),
            f(self.vel_15m_per_min, 6),
            f(self.accel_15m, 6),
            f(self.z_15m, 2),
            self.alert or "",
        ]


def analyze_market(
    m: dict[str, Any],
    *,
    now_ts: int,
    z_alert: float,
    dp_alert: float,
) -> MarketSnap:
    yes, _no = parse_clob_token_ids(m)
    mid = fetch_midpoint(yes)
    spread = fetch_spread(yes)
    book = fetch_book(yes)
    bd, ad = top_book_depth_usd(book, 3)
    hist = fetch_prices_history(yes, interval="1d", fidelity=5)
    series = history_to_series(hist)
    if not series:
        series = [(now_ts, mid)]

    dp = deltas_from_series(series, now_ts=now_ts, horizons_sec=(300, 900, 3600))
    dp_5m, dp_15m, dp_1h = dp[300], dp[900], dp[3600]

    vel_15m = (dp_15m / 15.0) if dp_15m is not None else None
    p_15_ago = price_at_or_before(series, now_ts - 900)
    p_30_ago = price_at_or_before(series, now_ts - 1800)
    vel_prev = None
    if p_15_ago is not None and p_30_ago is not None:
        vel_prev = (p_15_ago - p_30_ago) / 15.0
    accel = None
    if vel_15m is not None and vel_prev is not None:
        accel = vel_15m - vel_prev

    roll = build_rolling_deltas(series, window_sec=900)
    z15 = zscore_last_vs_window(roll[:-1], roll[-1]) if roll else None

    alert_parts: list[str] = []
    if z15 is not None and abs(z15) >= z_alert:
        alert_parts.append(f"z15>{z_alert:.1f}")
    if dp_15m is not None and abs(dp_15m) >= dp_alert:
        alert_parts.append(f"|dp15|>{dp_alert:.2f}")

    vol24 = float(m.get("volume24hrClob") or m.get("volume24hr") or 0.0)
    liq = float(m.get("liquidityClob") or m.get("liquidityNum") or m.get("liquidity") or 0.0)

    return MarketSnap(
        market_id=str(m.get("id", "")),
        question=str(m.get("question", "")),
        group_title=str(m.get("groupItemTitle") or m.get("question", ""))[:80],
        yes_token=yes,
        mid=mid,
        spread=spread,
        vol24=vol24,
        liq=liq,
        bid_depth3=bd,
        ask_depth3=ad,
        dp_5m=dp_5m,
        dp_15m=dp_15m,
        dp_1h=dp_1h,
        vel_15m_per_min=vel_15m,
        accel_15m=accel,
        z_15m=z15,
        alert=",".join(alert_parts),
    )


def volume_confirm(snaps: list[MarketSnap], snap: MarketSnap, dp_thresh: float = 0.01) -> bool:
    """Heuristic: large |dp15| among markets with above-median 24h CLOB volume."""
    if snap.dp_15m is None or abs(snap.dp_15m) < dp_thresh:
        return False
    vols = sorted(s.vol24 for s in snaps)
    if not vols:
        return False
    med = vols[len(vols) // 2]
    return snap.vol24 >= med and abs(snap.dp_15m) >= dp_thresh


def run_once(
    slug: str,
    *,
    top_n: int | None,
    workers: int,
    z_alert: float,
    dp_alert: float,
    lead_lag: bool,
) -> dict[str, Any]:
    ev = fetch_event_by_slug(slug)
    markets: list[dict[str, Any]] = list(ev.get("markets") or [])
    markets.sort(key=lambda x: float(x.get("volume24hrClob") or x.get("volume24hr") or 0.0), reverse=True)
    if top_n is not None:
        markets = markets[:top_n]

    now_ts = int(time.time())
    snaps: list[MarketSnap] = []

    def job(mm: dict[str, Any]) -> MarketSnap:
        return analyze_market(mm, now_ts=now_ts, z_alert=z_alert, dp_alert=dp_alert)

    with ThreadPoolExecutor(max_workers=max(1, workers)) as ex:
        futs = {ex.submit(job, m): m for m in markets}
        for fut in as_completed(futs):
            snaps.append(fut.result())
    snaps.sort(key=lambda s: s.vol24, reverse=True)

    for s in snaps:
        if volume_confirm(snaps, s):
            extra = "vol_confirm"
            s.alert = f"{s.alert},{extra}".strip(",")

    payload: dict[str, Any] = {
        "btc_reference": "coingecko_bitcoin_usd_market_chart",
        "event": {
            "slug": ev.get("slug"),
            "title": ev.get("title"),
            "volume24hr": ev.get("volume24hr"),
            "liquidity": ev.get("liquidity"),
        },
        "as_of_unix": now_ts,
        "markets": [
            {
                "id": s.market_id,
                "groupItemTitle": s.group_title,
                "mid_yes": s.mid,
                "spread": s.spread,
                "volume24hr_clob": s.vol24,
                "liquidity_clob": s.liq,
                "bid_depth3": s.bid_depth3,
                "ask_depth3": s.ask_depth3,
                "dp_5m": s.dp_5m,
                "dp_15m": s.dp_15m,
                "dp_1h": s.dp_1h,
                "velocity_15m_per_min": s.vel_15m_per_min,
                "acceleration_15m": s.accel_15m,
                "zscore_15m_delta": s.z_15m,
                "alerts": s.alert,
            }
            for s in snaps
        ],
    }

    if lead_lag and snaps:
        rep = snaps[0]
        try:
            best_std = -1.0
            pser_best: list[tuple[int, float]] | None = None
            for s in snaps[: min(20, len(snaps))]:
                ph = fetch_prices_history(s.yes_token, interval="1d", fidelity=5)
                ps = [float(x["p"]) for x in ph]
                dif = simple_diffs(ps)
                if len(dif) < 8:
                    continue
                std = pstdev(dif)
                if std > best_std:
                    best_std, rep = std, s
                    pser_best = history_to_series(ph)

            pser = pser_best or history_to_series(
                fetch_prices_history(rep.yes_token, interval="1d", fidelity=5)
            )
            btc = fetch_btc_chart_usd(days=1.0)
            cors = lead_lag_corr(pser, btc, max_steps=6)
            best_shift: int | None = None
            best: float | None = None
            for sh, c in cors:
                if c is None:
                    continue
                if best is None or abs(c) > abs(best):
                    best, best_shift = c, sh
            payload["lead_lag"] = {
                "representative_market": rep.group_title,
                "representative_prob_stdev": best_std if best_std >= 0 else None,
                "correlations_by_step": [{"step": s, "r": c} for s, c in cors],
                "note": "step shifts paired series; + step => earlier prob vs later BTC (prob may lead).",
                "strongest_step": best_shift,
                "strongest_r": best,
            }
        except (urllib.error.HTTPError, urllib.error.URLError, KeyError, ValueError) as e:
            payload["lead_lag"] = {"error": str(e)}

    return payload


def print_table(payload: dict[str, Any]) -> None:
    ev = payload["event"]
    print(f"Event: {ev.get('title')} ({ev.get('slug')})")
    print(f"As of: {payload['as_of_unix']} (unix)")
    headers = [
        "strike",
        "mid",
        "spr",
        "vol24",
        "dp5m",
        "dp15m",
        "dp1h",
        "v15/m",
        "a15",
        "z15",
        "flags",
    ]
    rows = [headers] + [s.row() for s in _snaps_from_payload(payload)]
    widths = [max(len(row[i]) for row in rows) for i in range(len(headers))]
    for row in rows:
        print("  ".join(cell.ljust(widths[i]) for i, cell in enumerate(row)))
    ll = payload.get("lead_lag")
    if ll and "correlations_by_step" in ll:
        print("\nLead–lag (prob vs BTC, coarse):")
        for item in ll["correlations_by_step"]:
            r = item["r"]
            rs = f"{r:.3f}" if r is not None else "—"
            print(f"  step {item['step']:+d}: r={rs}")
        if ll.get("strongest_r") is not None:
            print(
                f"  strongest: step={ll.get('strongest_step')}, r={ll.get('strongest_r'):.3f}"
            )


def _snaps_from_payload(payload: dict[str, Any]) -> list[MarketSnap]:
    """Reconstruct minimal snaps for printing from payload markets."""
    out: list[MarketSnap] = []
    for m in payload["markets"]:
        out.append(
            MarketSnap(
                market_id=str(m["id"]),
                question="",
                group_title=str(m.get("groupItemTitle", "")),
                yes_token="",
                mid=float(m["mid_yes"]),
                spread=float(m["spread"]),
                vol24=float(m["volume24hr_clob"]),
                liq=float(m["liquidity_clob"]),
                bid_depth3=float(m["bid_depth3"]),
                ask_depth3=float(m["ask_depth3"]),
                dp_5m=m.get("dp_5m"),
                dp_15m=m.get("dp_15m"),
                dp_1h=m.get("dp_1h"),
                vel_15m_per_min=m.get("velocity_15m_per_min"),
                accel_15m=m.get("acceleration_15m"),
                z_15m=m.get("zscore_15m_delta"),
                alert=str(m.get("alerts") or ""),
            )
        )
    return out


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Polymarket probability dynamics monitor")
    p.add_argument(
        "--slug",
        default="what-price-will-bitcoin-hit-in-may-2026",
        help="Gamma event slug (from polymarket.com/event/<slug>)",
    )
    p.add_argument("--top", type=int, default=None, help="Only top N markets by 24h volume")
    p.add_argument("--workers", type=int, default=8, help="Parallel Gamma/CLOB fetches")
    p.add_argument("--z-alert", type=float, default=2.0, help="Flag if |z| on 15m rolling delta exceeds this")
    p.add_argument("--dp-alert", type=float, default=0.05, help="Flag if |dp_15m| exceeds this")
    p.add_argument("--no-lead-lag", action="store_true", help="Skip BTC lead–lag block")
    p.add_argument("--json", action="store_true", help="Print JSON only")
    p.add_argument("--loop-sec", type=int, default=0, help="If >0, repeat every N seconds (Ctrl+C to stop)")
    args = p.parse_args(argv)

    def once() -> dict[str, Any]:
        return run_once(
            args.slug,
            top_n=args.top,
            workers=args.workers,
            z_alert=args.z_alert,
            dp_alert=args.dp_alert,
            lead_lag=not args.no_lead_lag,
        )

    if args.loop_sec <= 0:
        payload = once()
        if args.json:
            print(json.dumps(payload, indent=2))
        else:
            print_table(payload)
        return 0

    try:
        while True:
            payload = once()
            if args.json:
                print(json.dumps(payload), flush=True)
            else:
                print_table(payload)
                print()
            time.sleep(args.loop_sec)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
