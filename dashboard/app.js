const DATA_URLS = {
  leaderboard: "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard",
  vaults: "https://stats-data.hyperliquid.xyz/Mainnet/vaults",
};

const CONFIG = {
  minAccountValue: 500_000,
  minMonthVolume: 50_000_000,
  topN: 30,
  weights: {
    roi: 0.28,
    alpha: 0.22,
    efficiency: 0.2,
    consistency: 0.15,
    capacity: 0.1,
    drawdown: 0.05,
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

const EXCLUDED_VAULT_NAMES = new Set(["Liquidator", "Hyperliquidity Provider (HLP)"]);

const state = {
  lastUpdatedAt: null,
  top10: [],
  top30: [],
  summary: null,
};

const els = {
  refreshBtn: document.getElementById("refreshBtn"),
  exportBtn: document.getElementById("exportBtn"),
  statusText: document.getElementById("statusText"),
  summaryMetrics: document.getElementById("summaryMetrics"),
  top10Body: document.getElementById("top10Body"),
  checklistGrid: document.getElementById("checklistGrid"),
  corePool: document.getElementById("corePool"),
  watchPool: document.getElementById("watchPool"),
  dropPool: document.getElementById("dropPool"),
};

function fmtMoney(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v) {
  return `${(v * 100).toFixed(2)}%`;
}

function fmtScore(v) {
  return v.toFixed(4);
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

function scoreRows(filteredRows) {
  for (const row of filteredRows) {
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
  }

  const facMap = [
    ["profitRoiRaw", "profitRoiPct"],
    ["alphaRaw", "alphaPct"],
    ["efficiencyRaw", "efficiencyPct"],
    ["consistencyRaw", "consistencyPct"],
    ["capacityRaw", "capacityPct"],
    ["drawdownRaw", "drawdownPct"],
  ];

  for (const [rawKey, pctKey] of facMap) {
    const pcts = percentileRanks(filteredRows.map((r) => r[rawKey]));
    filteredRows.forEach((row, i) => {
      row[pctKey] = pcts[i];
    });
  }

  for (const row of filteredRows) {
    row.score =
      CONFIG.weights.roi * row.profitRoiPct +
      CONFIG.weights.alpha * row.alphaPct +
      CONFIG.weights.efficiency * row.efficiencyPct +
      CONFIG.weights.consistency * row.consistencyPct +
      CONFIG.weights.capacity * row.capacityPct +
      CONFIG.weights.drawdown * row.drawdownPct;
  }
}

function renderSummary() {
  const s = state.summary;
  els.statusText.textContent = `最近更新时间：${new Date(state.lastUpdatedAt).toLocaleString()}，候选地址 ${
    s.eligibleCount
  } 个。`;
  els.summaryMetrics.innerHTML = `
    <div class="metric-pill">全量地址：<strong>${s.totalRows}</strong></div>
    <div class="metric-pill">过滤后：<strong>${s.filteredRows}</strong></div>
    <div class="metric-pill">可跟踪样本：<strong>${s.eligibleCount}</strong></div>
    <div class="metric-pill">Top30覆盖净值：<strong>${fmtMoney(s.top30TotalAccount)}</strong></div>
  `;
}

function renderTop10() {
  els.top10Body.innerHTML = state.top10
    .map(
      (row, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td class="mono">${row.address}</td>
      <td><span class="tag ${styleClass(row.style.primary)}">${row.style.primary}</span> / <span class="tag ${styleClass(
        row.style.secondary
      )}">${row.style.secondary}</span></td>
      <td>${fmtMoney(row.accountValue)}</td>
      <td>${fmtPct(row.roiM)}</td>
      <td>${fmtMoney(row.pnlM)}</td>
      <td>${fmtMoney(row.vlmM)}</td>
      <td>${fmtScore(row.score)}</td>
    </tr>`
    )
    .join("");
}

function renderChecklist() {
  els.checklistGrid.innerHTML = state.top10
    .map((row, idx) => {
      const c = row.checklist;
      return `
      <article class="check-item">
        <h4>#${idx + 1} ${row.displayName || row.address.slice(0, 8) + "..."}</h4>
        <div class="style-line">${row.style.primary} / ${row.style.secondary}</div>
        <ul>
          <li><strong>入场：</strong>${c.entry}</li>
          <li><strong>跟随：</strong>${c.follow}</li>
          <li><strong>止损：</strong>${c.stop}</li>
        </ul>
      </article>`;
    })
    .join("");
}

function renderTierList(listEl, rows) {
  listEl.innerHTML = rows
    .map(
      (row, i) =>
        `<li><span>#${row.rank}</span><span class="mono">${row.address.slice(
          0,
          10
        )}...</span><span>${row.style.primary}</span><span>${fmtScore(row.score)}</span></li>`
    )
    .join("");
}

function renderTop30Pools() {
  const core = state.top30.slice(0, 10);
  const watch = state.top30.slice(10, 20);
  const drop = state.top30.slice(20, 30);
  renderTierList(els.corePool, core);
  renderTierList(els.watchPool, watch);
  renderTierList(els.dropPool, drop);
}

function renderAll() {
  renderSummary();
  renderTop10();
  renderChecklist();
  renderTop30Pools();
}

function deriveExcludedSet(vaultRows) {
  const set = new Set(EXCLUDED_ADDRESSES);
  for (const row of vaultRows) {
    const summary = row.summary || {};
    const relationshipType = summary.relationship?.type;
    const vaultName = summary.name;
    if (relationshipType === "child" || EXCLUDED_VAULT_NAMES.has(vaultName)) {
      set.add(normalizeAddress(summary.vaultAddress));
    }
  }
  return set;
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

async function fetchJson(url) {
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`拉取失败：${url} (${resp.status})`);
  }
  return resp.json();
}

async function recompute() {
  els.refreshBtn.disabled = true;
  els.statusText.textContent = "正在更新数据，请稍候...";
  try {
    const [leaderboardRaw, vaultsRaw] = await Promise.all([
      fetchJson(DATA_URLS.leaderboard),
      fetchJson(DATA_URLS.vaults),
    ]);
    const rowsAll = (leaderboardRaw.leaderboardRows || []).map(toRow);
    const excludedSet = deriveExcludedSet(vaultsRaw || []);
    const filtered = rowsAll.filter((r) => !excludedSet.has(r.address));
    const eligible = filtered.filter(
      (r) => r.accountValue >= CONFIG.minAccountValue && r.vlmM >= CONFIG.minMonthVolume
    );

    scoreRows(eligible);
    eligible.sort((a, b) => b.score - a.score);
    eligible.forEach((row, i) => {
      row.rank = i + 1;
      row.style = classifyStyle(row);
      row.checklist = buildChecklistByStyle(row);
    });

    state.top30 = eligible.slice(0, CONFIG.topN);
    state.top10 = state.top30.slice(0, 10);
    state.lastUpdatedAt = Date.now();
    state.summary = {
      totalRows: rowsAll.length,
      filteredRows: filtered.length,
      eligibleCount: eligible.length,
      top30TotalAccount: state.top30.reduce((acc, r) => acc + r.accountValue, 0),
    };
    renderAll();
  } catch (err) {
    console.error(err);
    els.statusText.textContent = `更新失败：${err.message}`;
  } finally {
    els.refreshBtn.disabled = false;
  }
}

function exportJson() {
  const payload = {
    updatedAt: new Date(state.lastUpdatedAt).toISOString(),
    config: CONFIG,
    summary: state.summary,
    top10: state.top10,
    top30: state.top30,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hyperliquid-private-panel-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

els.refreshBtn.addEventListener("click", recompute);
els.exportBtn.addEventListener("click", exportJson);

recompute();
