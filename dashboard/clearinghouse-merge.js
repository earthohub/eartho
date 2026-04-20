/**
 * Merge Hyperliquid clearinghouseState across all perp DEX books (default + HIP-3).
 * Querying only the default dex misses positions opened on builder markets.
 */
(function () {
  const INFO_URL = "https://api.hyperliquid.xyz/info";

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  async function postInfo(body, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetch(INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!resp.ok) throw new Error(`info ${body.type} (${resp.status})`);
      return await resp.json();
    } finally {
      clearTimeout(t);
    }
  }

  async function fetchPerpDexKeys() {
    try {
      const list = await postInfo({ type: "perpDexs" }, 12_000);
      if (!Array.isArray(list)) return [""];
      const keys = [];
      for (const item of list) {
        if (item && typeof item.name === "string" && item.name) keys.push(item.name);
      }
      return keys.length ? ["", ...keys] : [""];
    } catch {
      return [""];
    }
  }

  async function fetchClearinghouseForDex(addr, dex) {
    const body = { type: "clearinghouseState", user: addr };
    if (dex !== "") body.dex = dex;
    return postInfo(body, 22_000);
  }

  window.fetchMergedClearinghouseState = async function fetchMergedClearinghouseState(addr) {
    const dexKeys = await fetchPerpDexKeys();
    const results = await Promise.all(dexKeys.map((dex) => fetchClearinghouseForDex(addr, dex)));
    const byDex = new Map();
    dexKeys.forEach((dex, i) => byDex.set(dex, results[i]));

    const mergedPositions = [];
    for (const dex of dexKeys) {
      const ch = byDex.get(dex);
      const rows = ch?.assetPositions || [];
      for (const ap of rows) {
        const pos = ap?.position;
        if (!pos) continue;
        mergedPositions.push({
          dex: dex === "" ? "主所" : dex,
          position: pos,
        });
      }
    }

    let accountValue = 0;
    const primary = byDex.get("");
    if (primary?.marginSummary?.accountValue != null) {
      accountValue = num(primary.marginSummary.accountValue);
    }
    if (accountValue <= 0) {
      for (const ch of results) {
        const v = num(ch?.marginSummary?.accountValue);
        if (v > accountValue) accountValue = v;
      }
    }

    return {
      marginSummary: {
        accountValue: String(accountValue),
        totalMarginUsed: primary?.marginSummary?.totalMarginUsed ?? "0",
        totalNtlPos: primary?.marginSummary?.totalNtlPos ?? "0",
        totalRawUsd: primary?.marginSummary?.totalRawUsd ?? "0",
      },
      crossMarginSummary: primary?.crossMarginSummary,
      assetPositions: mergedPositions,
      time: primary?.time ?? results[0]?.time,
      _mergedDexCount: dexKeys.length,
    };
  };
})();
