const DATA_URLS = {
  leaderboard: "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard",
};

const INFO_URL = "https://api.hyperliquid.xyz/info";

const CONFIG = {
  minAccountValue: 100_000,
  minMonthVolume: 10_000_000,
  topN: 10,
  portfolioConcurrency: 4,
  curveMaxPoints: 140,
  curveWindows: ["month", "week", "day", "allTime"],
  redline: {
    maxDrawdownProxy: 0.25,
    maxDailyLoss: 0.08,
    maxWhipsaw: 4,
  },
  weights: {
    stableReturn: 0.35,
    riskControl: 0.3,
    replicability: 0.2,
    capacity: 0.1,
    alpha: 0.05,
  },
};

const EXCLUDED_ADDRESSES = new Set(
  [
    "0xffffffffffffffffffffffffffffffffffffffff",
    "0x010461c14e146ac35fe42271bdc1134ee31c703a",
    "0x31ca8395cf837de08b24da3f660e77761dfb974b",
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
  ].map((x) => x.toLowerCase())
);

const state = {
  lastUpdatedAt: null,
  top10: [],
  summary: null,
  curves: {},
  curveLoading: false,
  curveProgress: { done: 0, total: 0, success: 0, failed: 0 },
};

const els = {
  refreshBtn: document.getElementById("refreshBtn"),
  exportBtn: document.getElementById("exportBtn"),
  statusText: document.getElementById("statusText"),
  summaryMetrics: document.getElementById("summaryMetrics"),
  top10TemplateGrid:
    document.getElementById("top10TemplateGrid") || document.getElementById("strategyCardGrid"),
  curveStatus: document.getElementById("curveStatus"),
};

const APP_BUILD = "2026-04-18-top10-only";
window.__HL_DASHBOARD_BUILD__ = APP_BUILD;

function safeSetText(el, text) {
  if (!el) {
    console.warn("[dashboard] missing element for text update");
    return;
  }
  el.textContent = text;
}

function safeSetHTML(el, html) {
  if (!el) {
    console.warn("[dashboard] missing element for html update");
    return;
  }
  el.innerHTML = html;
}

function fmtMoney(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function fmtPct(v) {
  return `${(Number(v || 0) * 100).toFixed(2)}%`;
}

function fmtScore(v) {
  return Number(v || 0).toFixed(4);
}

function fmtAxisMoney(v) {
  const num = Number(v || 0);
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${Math.round(num)}`;
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

function styleClass(style) {
  if (style === "趋势") return "trend";
  if (style === "反转") return "reversal";
  if (style === "高频做市") return "hft-mm";
  if (style === "事件驱动") return "event";
  return "trend";
}

function normalizeAddress(addr) {
  return String(addr || "").toLowerCase();
}

function addrShort(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function toWindowMap(windowPerformances) {
  const map = {};
  for (const [windowName, perf] of windowPerformances || []) {
    map[windowName] = {
      pnl: Number(perf.pnl || 0),
      roi: Number(perf.roi || 0),
      vlm: Number(perf.vlm || 0),
    };
  }
  return map;
}

function percentileRanks(values) {
  const sorted = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const n = values.length;
  const out = new Array(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && sorted[j + 1][0] === sorted[i][0]) j += 1;
    const pct = n <= 1 ? 1 : (i + j) / 2 / (n - 1);
    for (let k = i; k <= j; k += 1) out[sorted[k][1]] = pct;
    i = j + 1;
  }
  return out;
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

function classifyStyle(row) {
  const eff = row.efficiencyRaw;
  const roiM = row.roiM;
  const roiW = row.roiW;
  const roiD = row.roiD;
  const pnlD = row.pnlD;
  const pnlW = row.pnlW;
  const pnlM = row.pnlM;
  const volM = row.vlmM;
  const account = row.accountValue;

  if (eff > 180 && volM > 150_000_000) {
    return { primary: "高频做市", secondary: "反转" };
  }
  if (roiM > 0.25 && pnlM > 400_000 && roiW > 0) {
    return { primary: "趋势", secondary: "事件驱动" };
  }
  if (pnlD < 0 && pnlW > 0 && pnlM > 0 && Math.abs(roiD) > 0.01) {
    return { primary: "反转", secondary: "趋势" };
  }
  if (account > 10_000_000 && (roiD > 0.02 || roiW > 0.04)) {
    return { primary: "事件驱动", secondary: "趋势" };
  }
  return { primary: "趋势", secondary: "高频做市" };
}

function buildChecklistByStyle(row) {
  const style = row.style.primary;
  if (style === "高频做市") {
    return {
      entry: "该地址在近24h ROI转正且成交额>其7日均值的1.2倍时，开启跟踪。",
      follow: "单次跟随仓位不超过组合净值2%，最多并行3笔，滑点容忍<=15bps。",
      stop: "连续2个观察窗口(4h)净值回撤>1.2%或当日PnL转负，立即减半并停跟24h。",
    };
  }
  if (style === "反转") {
    return {
      entry: "当其日PnL由负转正且周PnL仍为正时进场，确认反转延续。",
      follow: "首单1%仓位，盈利>0.8R再加仓0.5%，总风险不超过2.5%。",
      stop: "若价格回撤触发-1R，或该地址日/周PnL同步转负，立即全部退出。",
    };
  }
  if (style === "事件驱动") {
    return {
      entry: "监控其仓位快速变化（30分钟内名义头寸变化>25%）时入场。",
      follow: "只跟随前2次加仓动作，后续不追高；单地址风险上限3%。",
      stop: "事件后波动收敛（ATR回落）且其减仓>30%时，分两次退出。",
    };
  }
  return {
    entry: "该地址周/月ROI同向为正且月成交额维持在阈值以上时进场。",
    follow: "初始仓位1.5%，盈利达到1R再加仓1%，总风险上限3%。",
    stop: "若其周ROI跌破0或本组合回撤达2%，立即降杠杆并退出跟随。",
  };
}

function scoreRows(rows) {
  for (const row of rows) {
    row.profitRoiRaw = 0.45 * row.roiM + 0.2 * row.roiW + 0.2 * row.roiA + 0.15 * row.roiD;
    row.alphaRaw = 0.4 * row.pnlM + 0.3 * row.pnlA + 0.2 * row.pnlW + 0.1 * row.pnlD;
    row.efficiencyRaw =
      10000 *
      (0.65 * (row.pnlM / Math.max(row.vlmM, 1)) +
        0.25 * (row.pnlW / Math.max(row.vlmW, 1)) +
        0.1 * (row.pnlA / Math.max(row.vlmA, 1)));
    const posPnlCount = [row.pnlD, row.pnlW, row.pnlM, row.pnlA].filter((x) => x > 0).length;
    const posRoiCount = [row.roiD, row.roiW, row.roiM, row.roiA].filter((x) => x > 0).length;
    row.consistencyRaw =
      0.6 * (posPnlCount / 4) +
      0.4 * (posRoiCount / 4) -
      0.35 * Math.max(0, -row.roiM) -
      0.2 * Math.max(0, -row.roiW);
    row.capacityRaw = 0.55 * Math.log10(row.accountValue + 1) + 0.45 * Math.log10(row.vlmM + 1);
    row.drawdownRaw = Math.min(row.pnlD, row.pnlW, row.pnlM, 0) / Math.max(row.accountValue, 1);

    const account = Math.max(row.accountValue, 1);
    row.drawdownProxy = Math.max(0, -Math.min(row.pnlD, row.pnlW, row.pnlM, 0) / account);
    row.dailyLossProxy = Math.max(0, -row.pnlD / account);
    row.whipsawProxy =
      (Math.abs(row.roiD) + Math.abs(row.roiW) + Math.abs(row.roiM)) / Math.max(Math.abs(row.roiM), 0.01);
    row.positiveRoiShare = [row.roiD, row.roiW, row.roiM].filter((x) => x > 0).length / 3;

    row.stableReturnRaw = 0.6 * row.roiM + 0.3 * row.roiW + 0.1 * row.roiD + 0.1 * row.positiveRoiShare;
    row.riskControlRaw =
      -0.55 * row.drawdownProxy - 0.3 * row.dailyLossProxy - 0.15 * Math.max(0, row.whipsawProxy - 1);
    row.replicabilityRaw = 0.65 * row.efficiencyRaw + 0.35 * row.consistencyRaw * 100;

    const breaches = [];
    if (row.drawdownProxy > CONFIG.redline.maxDrawdownProxy) breaches.push("mdd30");
    if (row.dailyLossProxy > CONFIG.redline.maxDailyLoss) breaches.push("dailyShock");
    if (row.whipsawProxy > CONFIG.redline.maxWhipsaw) breaches.push("whipsaw");
    row.redlineBreaches = breaches;
    row.isCoreEligible = breaches.length === 0;
  }

  const facMap = [
    ["stableReturnRaw", "stableReturnPct"],
    ["riskControlRaw", "riskControlPct"],
    ["replicabilityRaw", "replicabilityPct"],
    ["alphaRaw", "alphaPct"],
    ["capacityRaw", "capacityPct"],
  ];

  for (const [rawKey, pctKey] of facMap) {
    const pcts = percentileRanks(rows.map((r) => r[rawKey]));
    rows.forEach((row, i) => {
      row[pctKey] = pcts[i];
    });
  }

  for (const row of rows) {
    row.score =
      CONFIG.weights.stableReturn * row.stableReturnPct +
      CONFIG.weights.riskControl * row.riskControlPct +
      CONFIG.weights.replicability * row.replicabilityPct +
      CONFIG.weights.capacity * row.capacityPct +
      CONFIG.weights.alpha * row.alphaPct +
      0;
  }
}

function toRow(raw) {
  const wm = toWindowMap(raw.windowPerformances);
  return {
    address: normalizeAddress(raw.ethAddress),
    displayName: raw.displayName || "",
    accountValue: Number(raw.accountValue || 0),
    pnlD: wm.day?.pnl || 0,
    pnlW: wm.week?.pnl || 0,
    pnlM: wm.month?.pnl || 0,
    pnlA: wm.allTime?.pnl || 0,
    roiD: wm.day?.roi || 0,
    roiW: wm.week?.roi || 0,
    roiM: wm.month?.roi || 0,
    roiA: wm.allTime?.roi || 0,
    vlmD: wm.day?.vlm || 0,
    vlmW: wm.week?.vlm || 0,
    vlmM: wm.month?.vlm || 0,
    vlmA: wm.allTime?.vlm || 0,
  };
}

function renderSummary() {
  const s = state.summary;
  if (!s) return;
  safeSetText(
    els.statusText,
    `最近更新时间：${new Date(state.lastUpdatedAt).toLocaleString()}，核心候选 ${s.coreCount} / ${s.eligibleCount} 个。`
  );
  safeSetHTML(
    els.summaryMetrics,
    `
    <div class="metric-pill">全量地址：<strong>${s.totalRows}</strong></div>
    <div class="metric-pill">过滤后：<strong>${s.filteredRows}</strong></div>
    <div class="metric-pill">可跟踪样本：<strong>${s.eligibleCount}</strong></div>
    <div class="metric-pill">核心池候选：<strong>${s.coreCount}</strong></div>
    <div class="metric-pill">Top10覆盖净值：<strong>${fmtMoney(s.top10TotalAccount)}</strong></div>
  `
  );
}

function renderStrategyCards(rows) {
  return rows
    .map((row, idx) => {
      const c = row.checklist;
      const curve = state.curves[row.address];
      const hasCurve = !!curve && curve.points.length > 1;
      const curveMeta = hasCurve
        ? `${curve.window} / ${fmtPct(curve.changePct)}`
        : state.curveLoading
        ? "资金曲线加载中..."
        : "无可用资金曲线";

      return `
      <article class="strategy-card">
        <div class="strategy-head">
          <div>
            <div class="strategy-title">#${row.rank || idx + 1} ${
              row.displayName || addrShort(row.address)
            }</div>
            <div class="mono muted">${row.address}</div>
          </div>
          <div class="strategy-score">综合分 ${fmtScore(row.score)}</div>
        </div>

        <div class="strategy-style">
          <span class="tag ${styleClass(row.style.primary)}">${row.style.primary}</span>
          <span class="tag ${styleClass(row.style.secondary)}">${row.style.secondary}</span>
        </div>

        <div class="strategy-metrics">
          <div><span>账户净值</span><strong>${fmtMoney(row.accountValue)}</strong></div>
          <div><span>月ROI</span><strong>${fmtPct(row.roiM)}</strong></div>
          <div><span>月PnL</span><strong>${fmtMoney(row.pnlM)}</strong></div>
          <div><span>月成交额</span><strong>${fmtMoney(row.vlmM)}</strong></div>
        </div>

        <div class="strategy-body">
          <div class="strategy-rules">
            <h4>跟踪清单</h4>
            <ul>
              <li><strong>入场：</strong>${c.entry}</li>
              <li><strong>跟随：</strong>${c.follow}</li>
              <li><strong>止损：</strong>${c.stop}</li>
            </ul>
          </div>

          <div class="strategy-curve">
            <div class="curve-head">
              <div class="curve-title">资金曲线</div>
              <div class="curve-meta ${hasCurve ? (curve.changePct >= 0 ? "pos" : "neg") : ""}">${curveMeta}</div>
            </div>
            <canvas class="curve-canvas top10-curve" data-addr="${row.address}"></canvas>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

function renderTop10TemplateCards() {
  safeSetHTML(els.top10TemplateGrid, renderStrategyCards(state.top10));
}

function drawSparkline(canvas, points, positive) {
  if (!canvas || points.length < 2) return;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(220, Math.floor(canvas.clientWidth));
  const height = Math.max(120, Math.floor(canvas.clientHeight));
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
  const leftPad = 64;
  const rightPad = 14;
  const topPad = 12;
  const bottomPad = 34;
  const plotW = width - leftPad - rightPad;
  const plotH = height - topPad - bottomPad;
  if (plotW <= 0 || plotH <= 0) return;
  const bottomY = topPad + plotH;

  const toX = (i) => leftPad + (i / (points.length - 1)) * plotW;
  const toY = (v) => topPad + ((maxV - v) / span) * plotH;

  const yTicks = [maxV, (maxV + minV) / 2, minV];
  ctx.lineWidth = 1.2;
  ctx.font = '12px "Inter", "Segoe UI", sans-serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yTicks.forEach((tick) => {
    const y = toY(tick);
    ctx.strokeStyle = "rgba(184, 196, 216, 0.34)";
    ctx.beginPath();
    ctx.moveTo(leftPad, y);
    ctx.lineTo(width - rightPad, y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(220, 229, 243, 0.95)";
    ctx.beginPath();
    ctx.moveTo(leftPad - 4, y);
    ctx.lineTo(leftPad, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(237, 242, 251, 0.98)";
    ctx.fillText(fmtAxisMoney(tick), leftPad - 6, y);
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
    ctx.lineTo(tick.x, bottomY + 4);
    ctx.stroke();
    ctx.textAlign = tick.align;
    ctx.fillText(tick.label, tick.x, bottomY + 7);
  });

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

function drawEmptyAxes(canvas) {
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(240, Math.floor(canvas.clientWidth));
  const height = Math.max(120, Math.floor(canvas.clientHeight));
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  const leftPad = 64;
  const rightPad = 12;
  const topPad = 14;
  const bottomPad = 28;
  const plotW = width - leftPad - rightPad;
  const plotH = height - topPad - bottomPad;
  if (plotW <= 0 || plotH <= 0) return;
  const bottomY = topPad + plotH;

  const axisGridColor = "rgba(171, 187, 216, 0.38)";
  const axisTextColor = "rgba(236, 242, 255, 0.98)";
  const axisLineColor = "rgba(204, 215, 236, 0.72)";

  const yTicks = [topPad, topPad + plotH / 2, bottomY];
  const yLabels = ["$--", "$--", "$--"];
  ctx.lineWidth = 1.3;
  ctx.font = '12px "Inter", "Segoe UI", sans-serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yTicks.forEach((y, idx) => {
    ctx.strokeStyle = axisGridColor;
    ctx.beginPath();
    ctx.moveTo(leftPad, y);
    ctx.lineTo(width - rightPad, y);
    ctx.stroke();
    ctx.fillStyle = axisTextColor;
    ctx.fillText(yLabels[idx], leftPad - 8, y);
  });

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = axisLineColor;
  ctx.beginPath();
  ctx.moveTo(leftPad, topPad);
  ctx.lineTo(leftPad, bottomY);
  ctx.lineTo(width - rightPad, bottomY);
  ctx.stroke();

  const xTicks = [
    { x: leftPad, label: "--/--", align: "left" },
    { x: leftPad + plotW / 2, label: "--/--", align: "center" },
    { x: width - rightPad, label: "--/--", align: "right" },
  ];
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = axisLineColor;
  ctx.fillStyle = axisTextColor;
  ctx.textBaseline = "top";
  xTicks.forEach((tick) => {
    ctx.beginPath();
    ctx.moveTo(tick.x, bottomY);
    ctx.lineTo(tick.x, bottomY + 5);
    ctx.stroke();
    ctx.textAlign = tick.align;
    ctx.fillText(tick.label, tick.x, bottomY + 7);
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255, 215, 122, 0.96)";
  ctx.fillText("无可用资金曲线数据", leftPad + 8, topPad + 6);
}

function renderCurves() {
  const canvases = document.querySelectorAll("canvas[data-addr]");
  canvases.forEach((canvas) => {
    const addr = canvas.getAttribute("data-addr");
    const curve = state.curves[addr];
    if (!curve || curve.points.length < 2) {
      drawEmptyAxes(canvas);
      return;
    }
    drawSparkline(canvas, curve.points, curve.changePct >= 0);
  });
}

function renderCurveStatus() {
  const p = state.curveProgress;
  if (!state.curveLoading && p.total === 0) {
    safeSetText(els.curveStatus, "等待加载...");
    return;
  }
  if (state.curveLoading) {
    safeSetText(
      els.curveStatus,
      `资金曲线加载中：${p.done}/${p.total}，成功 ${p.success}，失败 ${p.failed}`
    );
  } else {
    safeSetText(els.curveStatus, `资金曲线加载完成：成功 ${p.success}，失败 ${p.failed}`);
  }
}

function renderAll() {
  renderSummary();
  renderTop10TemplateCards();
  renderCurveStatus();
  renderCurves();
}

async function fetchJson(url, options = {}, timeoutMs = 15_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: ctrl.signal, cache: "no-store" });
    if (!resp.ok) throw new Error(`拉取失败：${url} (${resp.status})`);
    return await resp.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchPortfolio(address) {
  return fetchJson(
    INFO_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "portfolio", user: address }),
    },
    20_000
  );
}

function parsePortfolioCurve(portfolioRaw) {
  const map = new Map(Array.isArray(portfolioRaw) ? portfolioRaw : []);
  let chosenWindow = null;
  let series = [];
  for (const w of CONFIG.curveWindows) {
    const hist = map.get(w)?.accountValueHistory || [];
    if (hist.length > 1) {
      chosenWindow = w;
      series = hist;
      break;
    }
  }
  if (!chosenWindow) return null;

  const points = series
    .map((x) => ({ t: Number(x[0]), v: Number(x[1]) }))
    .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.v))
    .sort((a, b) => a.t - b.t);

  if (points.length < 2) return null;
  const sampled = downsamplePoints(points, CONFIG.curveMaxPoints);
  const first = sampled[0].v;
  const last = sampled[sampled.length - 1].v;
  const changePct = first === 0 ? 0 : (last - first) / first;
  return { window: chosenWindow, points: sampled, first, last, changePct };
}

async function loadCurvesForTop10() {
  state.curves = {};
  state.curveLoading = true;
  state.curveProgress = { done: 0, total: state.top10.length, success: 0, failed: 0 };
  renderCurveStatus();
  renderCurves();

  const queue = [...state.top10];
  const workers = Array.from({ length: Math.min(CONFIG.portfolioConcurrency, queue.length) }).map(
    async () => {
      while (queue.length) {
        const row = queue.shift();
        try {
          const raw = await fetchPortfolio(row.address);
          const curve = parsePortfolioCurve(raw);
          if (curve) {
            state.curves[row.address] = curve;
            state.curveProgress.success += 1;
          } else {
            state.curveProgress.failed += 1;
          }
        } catch (err) {
          console.warn(`资金曲线获取失败: ${row.address}`, err);
          state.curveProgress.failed += 1;
        } finally {
          state.curveProgress.done += 1;
          renderCurveStatus();
          renderCurves();
        }
      }
    }
  );

  await Promise.all(workers);
  state.curveLoading = false;
  renderCurveStatus();
}

async function recompute() {
  if (els.refreshBtn) els.refreshBtn.disabled = true;
  safeSetText(els.statusText, "正在更新数据，请稍候...");
  try {
    const leaderboardRaw = await fetchJson(DATA_URLS.leaderboard);
    const rowsAll = (leaderboardRaw.leaderboardRows || []).map(toRow);
    const filtered = rowsAll.filter((r) => r.address && !EXCLUDED_ADDRESSES.has(r.address));
    const eligible = filtered.filter(
      (r) => r.accountValue >= CONFIG.minAccountValue && r.vlmM >= CONFIG.minMonthVolume
    );

    scoreRows(eligible);
    const coreCandidates = eligible.filter((r) => r.isCoreEligible);
    coreCandidates.sort((a, b) => b.score - a.score);
    coreCandidates.forEach((row, i) => {
      row.rank = i + 1;
      row.style = classifyStyle(row);
      row.checklist = buildChecklistByStyle(row);
    });

    state.top10 = coreCandidates.slice(0, CONFIG.topN);
    state.lastUpdatedAt = Date.now();
    state.summary = {
      totalRows: rowsAll.length,
      filteredRows: filtered.length,
      eligibleCount: eligible.length,
      coreCount: coreCandidates.length,
      top10TotalAccount: state.top10.reduce((acc, r) => acc + r.accountValue, 0),
    };

    renderAll();
    await loadCurvesForTop10();
  } catch (err) {
    console.error(err);
    safeSetText(els.statusText, `更新失败：${err.message}`);
  } finally {
    if (els.refreshBtn) els.refreshBtn.disabled = false;
  }
}

function exportJson() {
  const payload = {
    updatedAt: new Date(state.lastUpdatedAt).toISOString(),
    config: CONFIG,
    summary: state.summary,
    top10: state.top10,
    curves: state.curves,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hyperliquid-private-panel-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderCurves();
  }, 120);
});

if (els.refreshBtn) els.refreshBtn.addEventListener("click", recompute);
if (els.exportBtn) els.exportBtn.addEventListener("click", exportJson);

recompute();
