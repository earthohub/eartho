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

function renderPositions(chState) {
  const rows = (chState?.assetPositions || []).map((x) => x.position).filter(Boolean);
  if (!rows.length) {
    setText(detailEls.positionStatus, "当前无持仓（或地址无可用持仓数据）。");
    setHTML(detailEls.positionTableBody, "");
    return;
  }

  setText(detailEls.positionStatus, `当前持仓数量：${rows.length}`);
  const html = rows
    .map((p) => {
      const lev = p.leverage?.value != null ? `${p.leverage.value}x` : "-";
      return `
      <tr>
        <td>${p.coin || "-"}</td>
        <td>${sideFromSzi(p.szi)}</td>
        <td>${fmtNum(p.szi, 3)}</td>
        <td>${fmtNum(p.entryPx, 6)}</td>
        <td>${money(p.positionValue)}</td>
        <td>${money(p.unrealizedPnl)}</td>
        <td>${lev}</td>
        <td>${money(p.marginUsed)}</td>
      </tr>`;
    })
    .join("");
  setHTML(detailEls.positionTableBody, html);
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
  } catch (err) {
    console.error(err);
    setText(detailEls.strategyStatus, `加载失败：${err.message}`);
    setText(detailEls.positionStatus, "持仓加载失败。");
  }
}

init();
