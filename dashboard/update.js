#!/usr/bin/env node

/**
 * HyperRanking dashboard data updater
 * Pulls latest Mainnet leaderboard + per-address portfolio curves,
 * computes rankings, styles, rules, and writes data/latest.json.
 */

const fs = require("fs");
const path = require("path");

const LEADERBOARD_URL = "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard";
const INFO_URL = "https://api.hyperliquid.xyz/info";

const OUTPUT_DIR = path.join(__dirname, "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "latest.json");

const EXCLUDED_ADDRESSES = new Set(
  [
    "0x1f6093d33db935b2ebd81d23312da5f11759973e",
    "0x24de6b77e8bc31c40aa452926daa6bbab7a71b0f",
    "0x2d1e9d7702fc42a1dc0d19c5a4e46925d5b7d9ac",
    "0x54cd89623888e8010fdea1c62e86265a9c6da950",
    "0x574bafce69d9411f662a433896e74e4f153096fa",
    "0x5b6fce52630f5f11fc9b77dfa5cfa8970f944ec2",
    "0x6777dba3e54300b7c69f68fa6f796e5e7d0d0c61",
    "0x8dafbe89302656a7df43c470e9ebcb4c540835c0",
    "0x8ac07902383196b25a8a48efeb5a59e317da789e",
    "0xa822a9ceb6d6cb5b565bd10098abcfa9cf18d748",
    "0xe6111266afdcdf0b1fe8505028cc1f7419d798a7",
    "0xbfdf5fb5680cd15375f751f6262143fc4b3f6e1e",
    "0xdc78799911e46baca335e6c5ba50da89e9885520",
    "0xf3b6be5fb66f4e1a7f74454e9579985f038579bc",
    "0x010461c14e146ac35fe42271bdc1134ee31c703a",
    "0x31ca8395cf837de08b24da3f660e77761dfb974b",
    "0xffffffffffffffffffffffffffffffffffffffff",
  ].map((x) => x.toLowerCase())
);

const TRACKING_FLOOR = {
  accountValue: 100_000,
  monthVlm: 10_000_000,
  topN: 18,
};

const MID_ACCOUNT_BAND = {
  min: 100_000,
  max: 2_000_000,
  minCountInTopN: 8,
};

const RISK_REDLINE = {
  maxDrawdownProxy: 0.25,
  maxDailyLoss: 0.08,
  maxWhipsaw: 4,
};

const SCORE_WEIGHTS = {
  stableReturn: 0.35,
  riskControl: 0.3,
  replicability: 0.2,
  capacity: 0.1,
  alpha: 0.05,
};

const CURVE_CONFIG = {
  maxPoints: 140,
  windows: ["month", "week", "day", "allTime"],
  concurrency: 4,
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeAddress(v) {
  return String(v || "").toLowerCase();
}

function parseWindowPerformance(windowPerformances) {
  const m = new Map(windowPerformances || []);
  const read = (w, k) => toNum((m.get(w) || {})[k]);
  return {
    pnl_d: read("day", "pnl"),
    pnl_w: read("week", "pnl"),
    pnl_m: read("month", "pnl"),
    pnl_a: read("allTime", "pnl"),
    roi_d: read("day", "roi"),
    roi_w: read("week", "roi"),
    roi_m: read("month", "roi"),
    roi_a: read("allTime", "roi"),
    vlm_d: read("day", "vlm"),
    vlm_w: read("week", "vlm"),
    vlm_m: read("month", "vlm"),
    vlm_a: read("allTime", "vlm"),
  };
}

function percentileRanks(rows, key, outKey) {
  const pairs = rows.map((r, i) => ({ i, v: r[key] })).sort((a, b) => a.v - b.v);
  const n = pairs.length;
  let start = 0;
  while (start < n) {
    let end = start;
    while (end + 1 < n && pairs[end + 1].v === pairs[start].v) end += 1;
    const p = n > 1 ? ((start + end) / 2) / (n - 1) : 1;
    for (let j = start; j <= end; j += 1) rows[pairs[j].i][outKey] = p;
    start = end + 1;
  }
}

function classifyStyle(row) {
  const roiM = row.roi_m;
  const roiW = row.roi_w;
  const eff = row.eff_raw;
  const monthlyTurnover = row.vlm_m / Math.max(row.accountValue, 1);
  const signFlip = row.pnls.filter((x) => x > 0).length <= 2;
  const speed = row.vlm_d / Math.max(row.vlm_m, 1);

  let primary = "趋势";
  let secondary = "事件驱动";

  if (monthlyTurnover > 30 && eff < 60) {
    primary = "高频做市";
    secondary = "反转";
  } else if (signFlip && Math.abs(roiM) < 0.2 && Math.abs(roiW) < 0.1) {
    primary = "反转";
    secondary = "事件驱动";
  } else if (roiM > 0.2 && roiW > 0) {
    primary = "趋势";
    secondary = speed > 0.09 ? "事件驱动" : "高频做市";
  } else if (speed > 0.12) {
    primary = "事件驱动";
    secondary = "高频做市";
  }

  return { primary, secondary };
}

function buildRules(row) {
  const { primary, secondary } = row.style;
  const risk = row.accountValue > 15_000_000 ? "稳健" : "进取";

  let entry = "";
  let follow = "";
  let stop = "";

  if (primary === "趋势") {
    entry = "连续2次同方向开仓且周ROI仍为正时入场；优先跟随主趋势币种。";
    follow = "单笔跟随不超过该地址近7日均仓位的20%，分3笔进入。";
    stop = "单地址跟随组合回撤-4%减半，-7%清仓；若周ROI转负暂停3天。";
  } else if (primary === "反转") {
    entry = "日PnL转负但周/月PnL仍正，且出现逆向开仓时小仓试单。";
    follow = "首单10%，确认盈利后加到25%；严禁追单超过2次。";
    stop = "单笔-1.5R止损，连续3次失败当周停止跟随。";
  } else if (primary === "高频做市") {
    entry = "仅在高流动币对与高活跃时段跟随，避免低流动时段滑点。";
    follow = "使用低杠杆+小滑点限价，单日总跟随金额不超过账户的8%。";
    stop = "当日净值回撤-2.5%停止当日跟随；连续2日负收益降频50%。";
  } else {
    entry = "重大波动窗口（资金费率、公告、链上异动）出现后再跟随。";
    follow = "事件后首30分钟轻仓，确认延续后加仓，事件结束逐步退出。";
    stop = "事件反向2根K线或波动衰减50%即离场。";
  }

  return {
    riskProfile: risk,
    style: `${primary}/${secondary}`,
    entryCondition: entry,
    followThreshold: follow,
    stopRule: stop,
  };
}

function downsamplePoints(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const stride = (points.length - 1) / (maxPoints - 1);
  const out = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const idx = Math.round(i * stride);
    out.push(points[idx]);
  }
  return out;
}

function parsePortfolioCurve(portfolioRaw) {
  const map = new Map(Array.isArray(portfolioRaw) ? portfolioRaw : []);
  let chosenWindow = null;
  let series = [];
  for (const w of CURVE_CONFIG.windows) {
    const hist = map.get(w)?.accountValueHistory || [];
    if (hist.length > 1) {
      chosenWindow = w;
      series = hist;
      break;
    }
  }
  if (!chosenWindow) return null;

  const points = series
    .map((x) => ({ t: toNum(x[0]), v: toNum(x[1]) }))
    .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.v))
    .sort((a, b) => a.t - b.t);
  if (points.length < 2) return null;

  const sampled = downsamplePoints(points, CURVE_CONFIG.maxPoints);
  const first = sampled[0].v;
  const last = sampled[sampled.length - 1].v;
  const changePct = first === 0 ? 0 : (last - first) / first;

  return { window: chosenWindow, points: sampled, first, last, changePct };
}

async function pullJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
  return res.json();
}

async function pullPortfolio(address) {
  const res = await fetch(INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "portfolio", user: address }),
  });
  if (!res.ok) throw new Error(`Request failed: portfolio ${address} (${res.status})`);
  return res.json();
}

async function fetchCurvesForRows(rows) {
  const curves = {};
  let success = 0;
  let failed = 0;
  const queue = [...rows];

  const workers = Array.from({ length: Math.min(CURVE_CONFIG.concurrency, queue.length) }).map(
    async () => {
      while (queue.length) {
        const row = queue.shift();
        try {
          const raw = await pullPortfolio(row.address);
          const curve = parsePortfolioCurve(raw);
          if (curve) {
            curves[row.address] = curve;
            success += 1;
          } else {
            failed += 1;
          }
        } catch (err) {
          failed += 1;
        }
      }
    }
  );

  await Promise.all(workers);
  return { curves, success, failed };
}

function pickTopWithMidBandQuota(rows, limit, bandConfig) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const inBand = sorted.filter(
    (r) => r.accountValue >= bandConfig.min && r.accountValue <= bandConfig.max
  );
  const mustTake = Math.min(bandConfig.minCountInTopN, limit, inBand.length);
  const selected = inBand.slice(0, mustTake);
  const used = new Set(selected.map((r) => r.address));

  for (const row of sorted) {
    if (selected.length >= limit) break;
    if (used.has(row.address)) continue;
    selected.push(row);
    used.add(row.address);
  }

  selected.sort((a, b) => b.score - a.score);
  return selected;
}

async function main() {
  const lbRaw = await pullJson(LEADERBOARD_URL);

  const rows = (lbRaw.leaderboardRows || [])
    .map((r) => {
      const w = parseWindowPerformance(r.windowPerformances);
      return {
        address: normalizeAddress(r.ethAddress),
        displayName: r.displayName || "",
        accountValue: toNum(r.accountValue),
        ...w,
      };
    })
    .filter((r) => r.address && !EXCLUDED_ADDRESSES.has(r.address));

  const eligible = rows.filter(
    (r) => r.accountValue >= TRACKING_FLOOR.accountValue && r.vlm_m >= TRACKING_FLOOR.monthVlm
  );

  for (const r of eligible) {
    r.alpha_pnl_raw = 0.4 * r.pnl_m + 0.3 * r.pnl_a + 0.2 * r.pnl_w + 0.1 * r.pnl_d;
    r.eff_raw =
      10000 *
      (0.65 * (r.pnl_m / Math.max(r.vlm_m, 1)) +
        0.25 * (r.pnl_w / Math.max(r.vlm_w, 1)) +
        0.1 * (r.pnl_a / Math.max(r.vlm_a, 1)));
    const posPnl = [r.pnl_d, r.pnl_w, r.pnl_m, r.pnl_a].filter((x) => x > 0).length;
    const posRoi = [r.roi_d, r.roi_w, r.roi_m, r.roi_a].filter((x) => x > 0).length;
    r.cons_raw =
      0.6 * (posPnl / 4) +
      0.4 * (posRoi / 4) -
      0.35 * Math.max(0, -r.roi_m) -
      0.2 * Math.max(0, -r.roi_w);
    r.capacity_raw = 0.55 * Math.log10(r.accountValue + 1) + 0.45 * Math.log10(r.vlm_m + 1);
    r.pnls = [r.pnl_d, r.pnl_w, r.pnl_m, r.pnl_a];

    // Balanced profile factors: stability + risk control + replicability
    const account = Math.max(r.accountValue, 1);
    r.drawdown_proxy = Math.max(0, -Math.min(r.pnl_d, r.pnl_w, r.pnl_m, 0) / account);
    r.daily_loss_proxy = Math.max(0, -r.pnl_d / account);
    r.whipsaw_proxy =
      (Math.abs(r.roi_d) + Math.abs(r.roi_w) + Math.abs(r.roi_m)) / Math.max(Math.abs(r.roi_m), 0.01);
    r.positive_roi_share = [r.roi_d, r.roi_w, r.roi_m].filter((x) => x > 0).length / 3;

    r.stable_return_raw = 0.6 * r.roi_m + 0.3 * r.roi_w + 0.1 * r.roi_d + 0.1 * r.positive_roi_share;
    r.risk_control_raw =
      -0.55 * r.drawdown_proxy - 0.3 * r.daily_loss_proxy - 0.15 * Math.max(0, r.whipsaw_proxy - 1);
    r.replicability_raw = 0.65 * r.eff_raw + 0.35 * r.cons_raw * 100;

    const breaches = [];
    if (r.drawdown_proxy > RISK_REDLINE.maxDrawdownProxy) breaches.push("mdd30");
    if (r.daily_loss_proxy > RISK_REDLINE.maxDailyLoss) breaches.push("dailyShock");
    if (r.whipsaw_proxy > RISK_REDLINE.maxWhipsaw) breaches.push("whipsaw");
    r.redline_breaches = breaches;
    r.is_core_eligible = breaches.length === 0;
  }

  percentileRanks(eligible, "stable_return_raw", "stable_return_pct");
  percentileRanks(eligible, "risk_control_raw", "risk_control_pct");
  percentileRanks(eligible, "replicability_raw", "replicability_pct");
  percentileRanks(eligible, "alpha_pnl_raw", "alpha_pnl_pct");
  percentileRanks(eligible, "capacity_raw", "capacity_pct");

  for (const r of eligible) {
    r.score =
      SCORE_WEIGHTS.stableReturn * r.stable_return_pct +
      SCORE_WEIGHTS.riskControl * r.risk_control_pct +
      SCORE_WEIGHTS.replicability * r.replicability_pct +
      SCORE_WEIGHTS.capacity * r.capacity_pct +
      SCORE_WEIGHTS.alpha * r.alpha_pnl_pct;
    r.style = classifyStyle(r);
    r.ruleBook = buildRules(r);
  }

  const coreCandidates = eligible.filter((r) => r.is_core_eligible);
  const selected = pickTopWithMidBandQuota(coreCandidates, TRACKING_FLOOR.topN, MID_ACCOUNT_BAND);

  const topNRows = selected.map((r, i) => ({
    rank: i + 1,
    address: r.address,
    displayName: r.displayName,
    style: r.style,
    accountValue: r.accountValue,
    monthRoiPct: r.roi_m * 100,
    monthPnl: r.pnl_m,
    monthVlm: r.vlm_m,
    score: r.score,
    factorPct: {
      stableReturn: r.stable_return_pct * 100,
      riskControl: r.risk_control_pct * 100,
      replicability: r.replicability_pct * 100,
      alpha: r.alpha_pnl_pct * 100,
      capacity: r.capacity_pct * 100,
    },
    riskGate: {
      passed: r.is_core_eligible,
      breaches: r.redline_breaches,
      drawdownProxy: r.drawdown_proxy,
      dailyLossProxy: r.daily_loss_proxy,
      whipsawProxy: r.whipsaw_proxy,
    },
    ruleBook: r.ruleBook,
  }));

  const curveResult = await fetchCurvesForRows(topNRows);

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      leaderboard: LEADERBOARD_URL,
      infoPortfolio: INFO_URL,
    },
    summary: {
      totalRowsRaw: (lbRaw.leaderboardRows || []).length,
      totalRowsFiltered: rows.length,
      totalEligible: eligible.length,
      totalCoreEligible: coreCandidates.length,
      midBandCount: topNRows.filter(
        (r) => r.accountValue >= MID_ACCOUNT_BAND.min && r.accountValue <= MID_ACCOUNT_BAND.max
      ).length,
      floor: TRACKING_FLOOR,
      midAccountBand: MID_ACCOUNT_BAND,
      redline: RISK_REDLINE,
      scoreWeights: SCORE_WEIGHTS,
      curves: {
        requested: topNRows.length,
        success: curveResult.success,
        failed: curveResult.failed,
      },
    },
    top18: topNRows,
    top10: topNRows.slice(0, 10),
    curves: curveResult.curves,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`Updated dashboard data: ${OUTPUT_FILE}`);
  console.log(
    `Rows(raw/filtered/eligible): ${output.summary.totalRowsRaw}/${output.summary.totalRowsFiltered}/${output.summary.totalEligible}`
  );
  console.log(
    `Curves(requested/success/failed): ${output.summary.curves.requested}/${output.summary.curves.success}/${output.summary.curves.failed}`
  );
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});

