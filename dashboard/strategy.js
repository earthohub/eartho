const INFO_URL = "https://api.hyperliquid.xyz/info";

const detailEls = {
  strategyTitle: document.getElementById("strategyTitle"),
  strategyStatus: document.getElementById("strategyStatus"),
  strategyMetrics: document.getElementById("strategyMetrics"),
  styleTags: document.getElementById("styleTags"),
  ruleBookList: document.getElementById("ruleBookList"),
  factorGrid: document.getElementById("factorGrid"),
  positionStatus: document.getElementById("positionStatus"),
  positionTableBody: document.getElementById("positionTableBody"),
  curveStatus: document.getElementById("curveStatusDetail"),
  curveMeta: document.getElementById("curveMetaDetail"),
  curveCanvas: document.getElementById("detailCurveCanvas"),
  linkGroup: document.getElementById("linkGroup"),
};

function qAddr() {
  const q = new URLSearchParams(window.location.search);
  return String(q.get("addr") || "").toLowerCase();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num(v));
}

function moneySigned(v) {
  const n = num(v);
  const body = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return body;
}

function pct(v) {
  return `${(Number(v || 0) * 100).toFixed(2)}%`;
}

function pctFrom100(v) {
  return `${Number(v || 0).toFixed(2)}%`;
}

function setText(el, text) {
  if (el) el.textContent = text;
}

function setHTML(el, html) {
  if (el) el.innerHTML = html;
}

function normalizeEpochMs(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  return n < 1e12 ? n * 1000 : n;
}

function fmtAxisTime(ts, spanMs) {
  const ms = normalizeEpochMs(ts);
  if (!ms) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  if (spanMs <= 2 * 24 * 60 * 60 * 1000) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function fetchJson(url, options = {}, timeoutMs = 18_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: ctrl.signal, cache: "no-store" });
    if (!resp.ok) throw new Error(`请求失败：${url} (${resp.status})`);
    return await resp.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchPortfolio(addr) {
  return fetchJson(
    INFO_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "portfolio", user: addr }),
    },
    20_000
  );
}

function sideFromSzi(szi) {
  const v = Number(szi || 0);
  if (v > 0) return "多";
  if (v < 0) return "空";
  return "平";
}

function fmtNum(v, d = 4) {
  if (v === null || v === undefined || v === "") return "-";
  const n = num(v);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(d);
}

/** Entry / mark prices: compact decimals for large prices. */
function fmtPrice(v) {
  const n = num(v);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function fmtDateTime(ts) {
  const ms = normalizeEpochMs(ts);
  if (!ms) return "-";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0"
  )}`;
}

function parseOpenTime(position) {
  const candidates = [
    position.openTime,
    position.openTs,
    position.openTimestamp,
    position.time,
    position.entryTime,
  ];
  for (const ts of candidates) {
    const ms = normalizeEpochMs(ts);
    if (ms) return ms;
  }
  return null;
}

function renderPositions(chState) {
  const raw = chState?.assetPositions || [];
  const rows = raw
    .map((x) => {
      if (x?.position) return { dex: x.dex, position: x.position };
      if (x?.coin || x?.szi) return { dex: "", position: x };
      return null;
    })
    .filter(Boolean);
  const accountValue = num(chState?.marginSummary?.accountValue);
  if (!rows.length) {
    const hint =
      chState?._mergedDexCount > 1
        ? `当前无持仓（已合并 ${chState._mergedDexCount} 个永续市场；与官网不一致时请刷新）。`
        : "当前无持仓（或地址无可用持仓数据）。";
    setText(detailEls.positionStatus, hint);
    setHTML(detailEls.positionTableBody, "");
    return;
  }

  const statusExtra =
    chState?._mergedDexCount > 1 ? ` · 已合并 ${chState._mergedDexCount} 个永续市场` : "";
  setText(detailEls.positionStatus, `当前持仓数量：${rows.length}${statusExtra}`);
  const html = rows
    .map(({ dex, position: p }) => {
      const levRaw = p.leverage?.value;
      const lev =
        levRaw != null && Number.isFinite(Number(levRaw)) ? `${Number(levRaw)}x` : "-";
      const levType = p.leverage?.type ? String(p.leverage.type) : "";
      const levLabel = levType ? `${lev} (${levType})` : lev;
      const openMs = parseOpenTime(p);
      const marginUsed = num(p.marginUsed);
      const marginRatio = accountValue > 0 ? marginUsed / accountValue : 0;
      const pnl = num(p.unrealizedPnl);
      const pnlClass = pnl > 0 ? "pos" : pnl < 0 ? "neg" : "";
      const coinLabel = dex && dex !== "主所" ? `${p.coin || "-"} <span class="muted">· ${dex}</span>` : (p.coin || "-");
      return `
      <tr>
        <td>${coinLabel}</td>
        <td>${sideFromSzi(p.szi)}</td>
        <td class="mono">${fmtNum(p.szi, 5)}</td>
        <td class="mono">${fmtPrice(p.entryPx)}</td>
        <td>${money(p.positionValue)}</td>
        <td class="${pnlClass} mono">${moneySigned(p.unrealizedPnl)}</td>
        <td>${levLabel}</td>
        <td>${money(p.marginUsed)}</td>
        <td>${openMs ? fmtDateTime(openMs) : "—"}</td>
        <td>${pct(marginRatio)}</td>
      </tr>`;
    })
    .join("");
  setHTML(detailEls.positionTableBody, html);
}

function downsamplePoints(points, maxPoints = 180) {
  if (points.length <= maxPoints) return points;
  const stride = (points.length - 1) / (maxPoints - 1);
  const out = [];
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(points[Math.round(i * stride)]);
  }
  return out;
}

function parsePortfolioCurve(portfolioRaw) {
  const map = new Map(Array.isArray(portfolioRaw) ? portfolioRaw : []);
  const windows = ["month", "week", "day", "allTime"];
  for (const w of windows) {
    const hist = map.get(w)?.accountValueHistory || [];
    if (hist.length > 1) {
      const pts = hist
        .map((x) => ({ t: Number(x[0]), v: Number(x[1]) }))
        .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.v))
        .sort((a, b) => a.t - b.t);
      if (pts.length > 1) return { window: w, points: downsamplePoints(pts, 180) };
    }
  }
  return null;
}

function drawCurveWithAxes(canvas, points) {
  if (!canvas || !points || points.length < 2) return;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(canvas.clientWidth));
  let height = Math.floor(canvas.clientHeight);
  if (height < 120) {
    height = Math.max(200, Math.floor(width / 2.15));
  }
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  const values = points.map((p) => p.v);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = Math.max(rawMax - rawMin, 1e-9);
  const pad = Math.max(rawSpan * 0.08, Math.max(Math.abs(rawMax), Math.abs(rawMin)) * 1e-6);
  const minV = rawMin - pad;
  const maxV = rawMax + pad;
  const span = Math.max(maxV - minV, 1e-9);

  const leftPad = 92;
  const rightPad = 20;
  const topPad = 18;
  const bottomPad = 54;
  const plotW = width - leftPad - rightPad;
  const plotH = height - topPad - bottomPad;
  const bottomY = topPad + plotH;
  if (plotW <= 0 || plotH <= 0) return;

  const toX = (i) => leftPad + (i / (points.length - 1)) * plotW;
  const toY = (v) => topPad + ((maxV - v) / span) * plotH;

  const yTicks = [maxV, (maxV + minV) / 2, minV];
  ctx.lineWidth = 1.2;
  ctx.font = '13px "Inter", "Segoe UI", sans-serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yTicks.forEach((tick) => {
    const y = toY(tick);
    ctx.strokeStyle = "rgba(184, 196, 216, 0.34)";
    ctx.beginPath();
    ctx.moveTo(leftPad, y);
    ctx.lineTo(width - rightPad, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(237, 242, 251, 0.98)";
    ctx.fillText(money(tick), leftPad - 10, y);
  });

  ctx.strokeStyle = "rgba(219, 228, 242, 0.92)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftPad, topPad);
  ctx.lineTo(leftPad, bottomY);
  ctx.lineTo(width - rightPad, bottomY);
  ctx.stroke();

  const firstT = points[0].t;
  const midT = points[Math.floor((points.length - 1) / 2)].t;
  const lastT = points[points.length - 1].t;
  const firstMs = normalizeEpochMs(firstT);
  const lastMs = normalizeEpochMs(lastT);
  const spanMs = firstMs && lastMs ? Math.max(lastMs - firstMs, 0) : 0;
  const xTicks = [
    { x: leftPad, label: fmtAxisTime(firstT, spanMs), align: "left" },
    { x: leftPad + plotW / 2, label: fmtAxisTime(midT, spanMs), align: "center" },
    { x: width - rightPad, label: fmtAxisTime(lastT, spanMs), align: "right" },
  ];
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(220, 229, 243, 0.95)";
  ctx.fillStyle = "rgba(237, 242, 251, 0.98)";
  ctx.textBaseline = "top";
  xTicks.forEach((tick) => {
    ctx.beginPath();
    ctx.moveTo(tick.x, bottomY);
    ctx.lineTo(tick.x, bottomY + 6);
    ctx.stroke();
    ctx.textAlign = tick.align;
    ctx.fillText(tick.label, tick.x, bottomY + 10);
  });

  const firstV = points[0].v;
  const lastV = points[points.length - 1].v;
  const positive = lastV >= firstV;
  const lineColor = positive ? "#39d98a" : "#ff6b7a";
  const fillTop = points.map((p, i) => ({ x: toX(i), y: toY(p.v) }));
  ctx.lineWidth = 2.25;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = lineColor;
  ctx.beginPath();
  fillTop.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();

  const grad = ctx.createLinearGradient(0, topPad, 0, bottomY);
  grad.addColorStop(0, positive ? "rgba(57, 217, 138, 0.22)" : "rgba(255, 107, 122, 0.2)");
  grad.addColorStop(1, "rgba(18, 23, 34, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(fillTop[0].x, bottomY);
  fillTop.forEach((pt) => ctx.lineTo(pt.x, pt.y));
  ctx.lineTo(fillTop[fillTop.length - 1].x, bottomY);
  ctx.closePath();
  ctx.fill();
}

function renderRow(row) {
  const titleName = row.displayName || row.address;
  setText(detailEls.strategyTitle, `${titleName} 策略详情`);
  setText(detailEls.strategyStatus, `地址：${row.address}`);

  setHTML(
    detailEls.strategyMetrics,
    `
    <div class="metric-pill">账户净值：<strong>${money(row.accountValue)}</strong></div>
    <div class="metric-pill">月ROI：<strong>${pctFrom100(row.monthRoiPct)}</strong></div>
    <div class="metric-pill">月PnL：<strong>${money(row.monthPnl)}</strong></div>
    <div class="metric-pill">月成交额：<strong>${money(row.monthVlm)}</strong></div>
    <div class="metric-pill">综合分：<strong>${Number(row.score || 0).toFixed(4)}</strong></div>
  `
  );

  const s = row.style || {};
  setHTML(
    detailEls.styleTags,
    `<span class="tag trend">${s.primary || "-"}</span><span class="tag hft-mm">${s.secondary || "-"}</span>`
  );

  const rb = row.ruleBook || {};
  setHTML(
    detailEls.ruleBookList,
    `
    <li><strong>入场：</strong>${rb.entryCondition || "-"}</li>
    <li><strong>跟随：</strong>${rb.followThreshold || "-"}</li>
    <li><strong>止损：</strong>${rb.stopRule || "-"}</li>
  `
  );

  const f = row.factorPct || {};
  setHTML(
    detailEls.factorGrid,
    `
    <div>稳定收益 <strong>${pctFrom100(f.stableReturn)}</strong></div>
    <div>风险控制 <strong>${pctFrom100(f.riskControl)}</strong></div>
    <div>可复制性 <strong>${pctFrom100(f.replicability)}</strong></div>
    <div>Alpha <strong>${pctFrom100(f.alpha)}</strong></div>
    <div>容量 <strong>${pctFrom100(f.capacity)}</strong></div>
  `
  );

  setHTML(
    detailEls.linkGroup,
    `
    <a class="strategy-link local" href="./index.html">返回总览</a>
    <a class="strategy-link" href="https://app.hyperliquid.xyz/trader/${row.address}" target="_blank" rel="noopener noreferrer">Hyperliquid 官方页</a>
  `
  );
}

async function init() {
  const addr = qAddr();
  if (!addr) {
    setText(detailEls.strategyStatus, "缺少地址参数（?addr=0x...）");
    return;
  }

  try {
    setText(detailEls.strategyStatus, "加载策略快照...");
    const snap = await fetchJson("./data/latest.json", {}, 12_000);
    const list = snap?.top18 || snap?.top10 || snap?.top20 || [];
    const row = list.find((x) => String(x.address || "").toLowerCase() === addr);
    if (!row) {
      setText(detailEls.strategyStatus, "快照中未找到该地址（可能不在当前Top列表）。");
      return;
    }
    renderRow(row);

    setText(detailEls.positionStatus, "加载当前持仓（合并全部永续市场）...");
    const ch = await fetchMergedClearinghouseState(addr);
    renderPositions(ch);

    setText(detailEls.curveStatus, "加载资金曲线...");
    const portfolioRaw = await fetchPortfolio(addr);
    const curve = parsePortfolioCurve(portfolioRaw);
    if (!curve) {
      lastCurvePoints = null;
      setText(detailEls.curveStatus, "无可用资金曲线数据。");
      if (detailEls.curveMeta) setText(detailEls.curveMeta, "—");
      return;
    }
    const first = curve.points[0].v;
    const last = curve.points[curve.points.length - 1].v;
    const change = first === 0 ? 0 : (last - first) / first;
    setText(detailEls.curveStatus, `资金曲线加载完成（${curve.window}，${pct(change)}）`);
    if (detailEls.curveMeta) {
      setText(
        detailEls.curveMeta,
        `${curve.window} · ${money(first)} → ${money(last)} · ${pct(change)}`
      );
    }
    lastCurvePoints = curve.points;
    drawCurveWithAxes(detailEls.curveCanvas, curve.points);
  } catch (err) {
    console.error(err);
    setText(detailEls.strategyStatus, `加载失败：${err.message}`);
    setText(detailEls.positionStatus, "持仓加载失败。");
    setText(detailEls.curveStatus, "资金曲线加载失败。");
  }
}

let lastCurvePoints = null;
window.addEventListener("resize", () => {
  if (lastCurvePoints && detailEls.curveCanvas) {
    drawCurveWithAxes(detailEls.curveCanvas, lastCurvePoints);
  }
});

init();
