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
  curveCanvas: document.getElementById("detailCurveCanvas"),
  linkGroup: document.getElementById("linkGroup"),
};

function qAddr() {
  const q = new URLSearchParams(window.location.search);
  return String(q.get("addr") || "").toLowerCase();
}

function money(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
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

async function fetchState(addr) {
  return fetchJson(
    INFO_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: addr }),
    },
    20_000
  );
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
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(d);
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
  const candidates = [position.openTime, position.openTs, position.openTimestamp, position.time];
  for (const ts of candidates) {
    const ms = normalizeEpochMs(ts);
    if (ms) return ms;
  }
  return null;
}

function renderPositions(chState) {
  const rows = (chState?.assetPositions || []).map((x) => x.position).filter(Boolean);
  const accountValue = Number(chState?.marginSummary?.accountValue || 0);
  if (!rows.length) {
    setText(detailEls.positionStatus, "当前无持仓（或地址无可用持仓数据）。");
    setHTML(detailEls.positionTableBody, "");
    return;
  }

  setText(detailEls.positionStatus, `当前持仓数量：${rows.length}`);
  const html = rows
    .map((p) => {
      const lev = p.leverage?.value != null ? `${p.leverage.value}x` : "-";
      const openTime = parseOpenTime(p);
      const marginUsed = Number(p.marginUsed || 0);
      const marginRatio = accountValue > 0 ? marginUsed / accountValue : 0;
      return `
      <tr>
        <td>${p.coin || "-"}</td>
        <td>${sideFromSzi(p.szi)}</td>
        <td>${fmtNum(p.szi, 3)}</td>
        <td>${fmtDateTime(openTime)}</td>
        <td>${fmtNum(p.entryPx, 6)}</td>
        <td>${money(p.positionValue)}</td>
        <td>${money(p.unrealizedPnl)}</td>
        <td>${lev}</td>
        <td>${money(p.marginUsed)}</td>
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
  // Enforce fixed Y:X = 1:2 for detail chart readability.
  const height = Math.max(180, Math.floor(width / 2));
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  const values = points.map((p) => p.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = Math.max(maxV - minV, 1e-9);

  const leftPad = 88;
  const rightPad = 20;
  const topPad = 16;
  const bottomPad = 52;
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
  ctx.lineWidth = 2;
  ctx.strokeStyle = positive ? "#39d98a" : "#ff6b7a";
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = toX(i);
    const y = toY(p.v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
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

    setText(detailEls.positionStatus, "加载当前持仓...");
    const ch = await fetchState(addr);
    renderPositions(ch);

    setText(detailEls.curveStatus, "加载资金曲线...");
    const portfolioRaw = await fetchPortfolio(addr);
    const curve = parsePortfolioCurve(portfolioRaw);
    if (!curve) {
      setText(detailEls.curveStatus, "无可用资金曲线数据。");
      return;
    }
    const first = curve.points[0].v;
    const last = curve.points[curve.points.length - 1].v;
    const change = first === 0 ? 0 : (last - first) / first;
    setText(detailEls.curveStatus, `资金曲线加载完成（${curve.window}，${pct(change)}）`);
    drawCurveWithAxes(detailEls.curveCanvas, curve.points);
  } catch (err) {
    console.error(err);
    setText(detailEls.strategyStatus, `加载失败：${err.message}`);
    setText(detailEls.positionStatus, "持仓加载失败。");
    setText(detailEls.curveStatus, "资金曲线加载失败。");
  }
}

init();
