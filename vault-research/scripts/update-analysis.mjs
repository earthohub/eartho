#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const STATS_URL = "https://stats-data.hyperliquid.xyz/Mainnet/vaults";
const INFO_URL = "https://api.hyperliquid.xyz/info";
const OUTPUT_DIR = path.resolve("vault-research/data");
const WEB_OUTPUT_FILE = path.resolve("vault-research/web/latest-analysis.js");
const JSON_OUTPUT_FILE = path.resolve("vault-research/data/latest-analysis.json");

const CONCURRENCY = Number(process.env.VAULT_CONCURRENCY ?? 20);
const MIN_TVL_USD = Number(process.env.MIN_TVL_USD ?? 250_000);
const MIN_TRACK_DAYS = Number(process.env.MIN_TRACK_DAYS ?? 60);
const MIN_OBSERVATIONS = Number(process.env.MIN_OBSERVATIONS ?? 18);

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((acc, current) => acc + current, 0) / values.length;
}

function std(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, current) => acc + (current - m) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(Math.max(variance, 0));
}

function formatPct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatAnnualizedForHumans(value) {
  if (!Number.isFinite(value)) return "N/A";
  if (value > 5) return ">500%";
  if (value < -0.95) return "<-95%";
  return formatPct(value);
}

async function fetchJson(url, options = {}, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const sleepMs = 400 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }
  }
  throw lastError;
}

function extractPeriodPortfolio(details, period) {
  const portfolio = details?.portfolio ?? [];
  const periodEntry = portfolio.find(([name]) => name === period);
  if (!periodEntry) return null;
  return periodEntry[1];
}

function toSeries(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .map(([timestamp, value]) => ({
      timestamp: toNumber(timestamp),
      value: toNumber(value),
    }))
    .filter((point) => point.timestamp > 0 && point.value > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function calcPeriodReturn(history) {
  const series = toSeries(history);
  if (series.length < 2) return null;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  if (first <= 0) return null;
  return last / first - 1;
}

function calcRiskMetrics(allTimeSeries) {
  if (allTimeSeries.length < 2) return null;

  const first = allTimeSeries[0];
  const last = allTimeSeries[allTimeSeries.length - 1];
  const elapsedDays = (last.timestamp - first.timestamp) / (1000 * 60 * 60 * 24);
  if (elapsedDays <= 0) return null;

  const totalReturn = last.value / first.value - 1;
  const annualizedReturn =
    totalReturn <= -1
      ? -1
      : Math.pow(1 + totalReturn, 365 / elapsedDays) - 1;

  const stepReturns = [];
  for (let i = 1; i < allTimeSeries.length; i += 1) {
    const prev = allTimeSeries[i - 1].value;
    const cur = allTimeSeries[i].value;
    if (prev > 0 && cur > 0) {
      stepReturns.push(cur / prev - 1);
    }
  }
  if (stepReturns.length < 2) return null;

  let peak = allTimeSeries[0].value;
  let maxDrawdown = 0;
  for (const point of allTimeSeries) {
    peak = Math.max(peak, point.value);
    if (peak <= 0) continue;
    const drawdown = (peak - point.value) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  const stepsPerYear = (stepReturns.length / elapsedDays) * 365;
  const stepMean = mean(stepReturns);
  const annualizedVolatility = std(stepReturns) * Math.sqrt(Math.max(stepsPerYear, 1));
  const annualizedStepMean = stepMean * stepsPerYear;
  const sharpeProxy =
    annualizedVolatility > 0
      ? annualizedStepMean / annualizedVolatility
      : annualizedStepMean > 0
        ? 5
        : 0;

  const downsideReturns = stepReturns.filter((value) => value < 0);
  const downsideVolatility =
    downsideReturns.length >= 2
      ? std(downsideReturns) * Math.sqrt(Math.max(stepsPerYear, 1))
      : 0;
  const sortinoProxy =
    downsideVolatility > 0
      ? annualizedStepMean / downsideVolatility
      : annualizedStepMean > 0
        ? 5
        : 0;
  const calmarRatio =
    maxDrawdown > 0 ? annualizedReturn / maxDrawdown : annualizedReturn > 0 ? 5 : 0;

  return {
    elapsedDays,
    observations: allTimeSeries.length,
    totalReturn,
    annualizedReturn,
    annualizedVolatility,
    maxDrawdown,
    sharpeProxy,
    sortinoProxy,
    calmarRatio,
  };
}

function percentileRankMap(items, key) {
  const sorted = [...items]
    .map((item) => toNumber(item[key], 0))
    .sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return new Map();

  const map = new Map();
  for (const item of items) {
    const value = toNumber(item[key], 0);
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (sorted[mid] <= value) lo = mid + 1;
      else hi = mid;
    }
    const rank = (lo - 1) / Math.max(1, n - 1);
    map.set(item.vaultAddress, clamp(rank, 0, 1));
  }
  return map;
}

function buildRationale(vault) {
  const reasons = [];
  if (vault.sharpeProxy >= 1.2) {
    reasons.push(
      `风险调整后收益较强（Sharpe 代理 ${vault.sharpeProxy.toFixed(2)}）。`,
    );
  }
  if (vault.maxDrawdown <= 0.15) {
    reasons.push(`历史最大回撤较低（${formatPct(vault.maxDrawdown)}）。`);
  }
  if (vault.annualizedReturn >= 0.3 && vault.annualizedReturn <= 5) {
    reasons.push(`年化收益代理较高（${formatAnnualizedForHumans(vault.annualizedReturn)}）。`);
  }
  if (vault.tvlUsd >= 1_000_000) {
    reasons.push(
      `管理规模较大（TVL ${vault.tvlUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD），容量与稳定性更好。`,
    );
  }
  if (vault.ageDays >= 180) {
    reasons.push(`运行周期较长（${vault.ageDays.toFixed(0)} 天），样本更充分。`);
  }
  if (vault.monthReturn !== null && vault.monthReturn > 0) {
    reasons.push(`近月收益为正（${formatPct(vault.monthReturn)}），近期动量健康。`);
  }
  if (vault.annualizedReturn > 5) {
    reasons.push("收益弹性极高，需重点核查可持续性与容量冲击风险。");
  }
  if (!reasons.length) {
    reasons.push("综合评分在可投策略中位于前列，兼顾收益与回撤。");
  }
  return reasons.slice(0, 3);
}

function computeStyle(vault) {
  if (vault.maxDrawdown < 0.1 && vault.annualizedVolatility < 0.35) {
    return "低波动稳健型";
  }
  if (vault.annualizedReturn > 0.5 && vault.maxDrawdown < 0.25) {
    return "成长进攻型";
  }
  return "均衡配置型";
}

function buildRiskFlags(vault) {
  const flags = [];
  if (vault.maxDrawdown > 0.3) {
    flags.push(`历史回撤偏高（${formatPct(vault.maxDrawdown)}）`);
  }
  if (vault.annualizedVolatility > 1.5) {
    flags.push(`年化波动偏高（${formatPct(vault.annualizedVolatility)}）`);
  }
  if (vault.annualizedReturn > 5) {
    flags.push("年化收益代理异常高，可能受短样本放大");
  }
  if (vault.consistencyScore < 0.34) {
    flags.push("近期日/周/月收益一致性较弱");
  }
  if (vault.ageDays < 120) {
    flags.push(`策略运行时间较短（${vault.ageDays.toFixed(0)} 天）`);
  }
  return flags.slice(0, 3);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) break;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function fetchVaultDetails(vaultAddress) {
  return fetchJson(INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "vaultDetails", vaultAddress }),
  });
}

async function main() {
  const generatedAt = new Date().toISOString();
  console.log(`Fetching summaries from ${STATS_URL} ...`);
  const summaries = await fetchJson(STATS_URL);
  console.log(`Fetched ${summaries.length} vault rows.`);

  const userUniverse = summaries.filter((row) => {
    const summary = row.summary ?? {};
    return !summary.isClosed && summary.relationship?.type === "normal";
  });

  console.log(`Open "user vault" universe size: ${userUniverse.length}`);
  console.log(`Fetching details for ${userUniverse.length} vaults ...`);

  let completed = 0;
  const detailRows = await mapWithConcurrency(
    userUniverse,
    CONCURRENCY,
    async (row, index) => {
      const summary = row.summary ?? {};
      try {
        const details = await fetchVaultDetails(summary.vaultAddress);
        return { row, details };
      } catch (error) {
        return { row, details: null, error: error.message };
      } finally {
        completed += 1;
        if (completed % 250 === 0 || completed === userUniverse.length) {
          console.log(`Progress: ${completed}/${userUniverse.length}`);
        }
      }
    },
  );

  const modeled = [];
  for (const entry of detailRows) {
    const summary = entry.row.summary ?? {};
    const details = entry.details;
    if (!details) continue;
    if (details.isClosed || !details.allowDeposits) continue;

    const tvlUsd = toNumber(summary.tvl);
    if (tvlUsd < MIN_TVL_USD) continue;

    const allTime = extractPeriodPortfolio(details, "allTime");
    const allTimeSeries = toSeries(allTime?.accountValueHistory);
    const risk = calcRiskMetrics(allTimeSeries);
    if (!risk) continue;
    if (risk.elapsedDays < MIN_TRACK_DAYS || risk.observations < MIN_OBSERVATIONS) {
      continue;
    }

    const daySeries = extractPeriodPortfolio(details, "day");
    const weekSeries = extractPeriodPortfolio(details, "week");
    const monthSeries = extractPeriodPortfolio(details, "month");
    const dayReturn = calcPeriodReturn(daySeries?.accountValueHistory);
    const weekReturn = calcPeriodReturn(weekSeries?.accountValueHistory);
    const monthReturn = calcPeriodReturn(monthSeries?.accountValueHistory);

    const consistencySignals = [dayReturn, weekReturn, monthReturn].filter(
      (value) => value !== null,
    );
    const positiveSignals = consistencySignals.filter((value) => value > 0).length;
    const consistencyScore =
      consistencySignals.length > 0 ? positiveSignals / consistencySignals.length : 0.5;

    const commission = toNumber(details.leaderCommission);

    modeled.push({
      name: summary.name ?? details.name ?? "Unknown Vault",
      vaultAddress: summary.vaultAddress ?? details.vaultAddress,
      leader: summary.leader ?? details.leader,
      tvlUsd,
      apr: toNumber(details.apr, toNumber(entry.row.apr)),
      ageDays:
        (Date.now() - toNumber(summary.createTimeMillis, Date.now())) /
        (1000 * 60 * 60 * 24),
      followers: Array.isArray(details.followers) ? details.followers.length : 0,
      leaderCommission: commission,
      dayReturn,
      weekReturn,
      monthReturn,
      consistencyScore,
      ...risk,
    });
  }

  if (!modeled.length) {
    throw new Error("No investable vault passed the filters.");
  }

  const scoringBase = modeled.map((item) => ({
    ...item,
    sharpeForScore: clamp(item.sharpeProxy, -2, 5),
    sortinoForScore: clamp(item.sortinoProxy, -2, 8),
    calmarForScore: clamp(item.calmarRatio, -2, 10),
    annualizedForScore: clamp(item.annualizedReturn, -0.8, 3),
    volatilityControl: 1 - clamp(item.annualizedVolatility / 2.5, 0, 1),
  }));

  const percentileMaps = {
    sharpe: percentileRankMap(scoringBase, "sharpeForScore"),
    sortino: percentileRankMap(scoringBase, "sortinoForScore"),
    calmar: percentileRankMap(scoringBase, "calmarForScore"),
    annualizedReturn: percentileRankMap(scoringBase, "annualizedForScore"),
    drawdownInverse: percentileRankMap(
      scoringBase.map((item) => ({
        ...item,
        drawdownInverse: 1 - item.maxDrawdown,
      })),
      "drawdownInverse",
    ),
    volatilityControl: percentileRankMap(scoringBase, "volatilityControl"),
    tvl: percentileRankMap(
      scoringBase.map((item) => ({
        ...item,
        tvlLog: Math.log10(Math.max(item.tvlUsd, 1)),
      })),
      "tvlLog",
    ),
    age: percentileRankMap(scoringBase, "ageDays"),
    consistency: percentileRankMap(scoringBase, "consistencyScore"),
  };

  for (const vault of modeled) {
    const score =
      0.22 * percentileMaps.sharpe.get(vault.vaultAddress) +
      0.1 * percentileMaps.sortino.get(vault.vaultAddress) +
      0.14 * percentileMaps.calmar.get(vault.vaultAddress) +
      0.16 * percentileMaps.annualizedReturn.get(vault.vaultAddress) +
      0.14 * percentileMaps.drawdownInverse.get(vault.vaultAddress) +
      0.08 * percentileMaps.volatilityControl.get(vault.vaultAddress) +
      0.08 * percentileMaps.tvl.get(vault.vaultAddress) +
      0.04 * percentileMaps.age.get(vault.vaultAddress) +
      0.04 * percentileMaps.consistency.get(vault.vaultAddress);

    let penalty = 1;
    if (vault.maxDrawdown > 0.45) penalty *= 0.7;
    if (vault.maxDrawdown > 0.3) penalty *= 0.85;
    if (vault.annualizedVolatility > 2.5) penalty *= 0.85;
    if (vault.annualizedVolatility > 5) penalty *= 0.75;
    if (vault.annualizedReturn < 0) penalty *= 0.5;
    if (vault.totalReturn < 0) penalty *= 0.7;
    if (vault.apr < 0) penalty *= 0.9;
    if (vault.leaderCommission > 0.2) penalty *= 0.9;
    if (vault.ageDays < 120) penalty *= 0.9;

    vault.compositeScore = score * penalty;
  }

  const ranked = modeled
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 10)
    .map((vault, index) => ({
      rank: index + 1,
      name: vault.name,
      vaultAddress: vault.vaultAddress,
      leader: vault.leader,
      style: computeStyle(vault),
      investmentThesis: buildRationale(vault),
      riskFlags: buildRiskFlags(vault),
      metrics: {
        score: Number(vault.compositeScore.toFixed(4)),
        tvlUsd: Number(vault.tvlUsd.toFixed(2)),
        apr: Number(vault.apr.toFixed(6)),
        annualizedReturn: Number(vault.annualizedReturn.toFixed(6)),
        annualizedVolatility: Number(vault.annualizedVolatility.toFixed(6)),
        maxDrawdown: Number(vault.maxDrawdown.toFixed(6)),
        sharpeProxy: Number(vault.sharpeProxy.toFixed(6)),
        sortinoProxy: Number(vault.sortinoProxy.toFixed(6)),
        calmarRatio: Number(vault.calmarRatio.toFixed(6)),
        consistencyScore: Number(vault.consistencyScore.toFixed(6)),
        dayReturn: vault.dayReturn === null ? null : Number(vault.dayReturn.toFixed(6)),
        weekReturn: vault.weekReturn === null ? null : Number(vault.weekReturn.toFixed(6)),
        monthReturn:
          vault.monthReturn === null ? null : Number(vault.monthReturn.toFixed(6)),
        trackDays: Number(vault.elapsedDays.toFixed(2)),
        observations: vault.observations,
        leaderCommission: Number(vault.leaderCommission.toFixed(4)),
        followerCount: vault.followers,
      },
    }));

  const output = {
    meta: {
      generatedAt,
      source: {
        statsUrl: STATS_URL,
        infoUrl: INFO_URL,
      },
      universeCounts: {
        rawVaultRows: summaries.length,
        openUserVaults: userUniverse.length,
        investableAfterFilters: modeled.length,
      },
      filters: {
        allowDeposits: true,
        isClosed: false,
        relationshipType: "normal",
        minTvlUsd: MIN_TVL_USD,
        minTrackDays: MIN_TRACK_DAYS,
        minObservations: MIN_OBSERVATIONS,
      },
      methodology: {
        style: "quant multi-factor ranking",
        factors: [
          "Sharpe proxy percentile (22%)",
          "Sortino proxy percentile (10%)",
          "Calmar percentile (14%)",
          "Annualized return percentile (16%, winsorized)",
          "Drawdown control percentile (14%)",
          "Volatility control percentile (8%)",
          "TVL robustness percentile (8%)",
          "Track record age percentile (4%)",
          "Recent consistency percentile (4%)",
        ],
        normalization: [
          "Sharpe/Sortino/Calmar/Annualized return 因子均做区间封顶，避免异常值主导",
          "年化波动单独作为负向控制因子",
        ],
        penalties: [
          "Max drawdown > 45%",
          "Max drawdown > 30%",
          "Annualized volatility > 250% / 500%",
          "Negative annualized return",
          "Negative all-time return",
          "Negative APR",
          "Leader commission > 20%",
          "Track record age < 120 days",
        ],
      },
    },
    topStrategies: ranked,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(JSON_OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await writeFile(
    WEB_OUTPUT_FILE,
    `window.VAULT_ANALYSIS = ${JSON.stringify(output, null, 2)};\n`,
    "utf8",
  );

  console.log(`Saved analysis JSON: ${JSON_OUTPUT_FILE}`);
  console.log(`Saved web data JS: ${WEB_OUTPUT_FILE}`);
  console.log("Top 10 selected:");
  for (const row of ranked) {
    console.log(
      `${row.rank}. ${row.name} | score=${row.metrics.score} | TVL=${row.metrics.tvlUsd.toFixed(
        0,
      )} | Sharpe=${row.metrics.sharpeProxy.toFixed(2)} | MDD=${formatPct(
        row.metrics.maxDrawdown,
      )}`,
    );
  }
}

main().catch((error) => {
  console.error("Failed to update vault analysis:", error);
  process.exitCode = 1;
});
