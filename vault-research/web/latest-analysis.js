window.VAULT_ANALYSIS = {
  "meta": {
    "generatedAt": "2026-04-16T07:59:34.532Z",
    "source": {
      "statsUrl": "https://stats-data.hyperliquid.xyz/Mainnet/vaults",
      "infoUrl": "https://api.hyperliquid.xyz/info"
    },
    "universeCounts": {
      "rawVaultRows": 9447,
      "openUserVaults": 3326,
      "investableAfterFilters": 29
    },
    "filters": {
      "allowDeposits": true,
      "isClosed": false,
      "relationshipType": "normal",
      "minTvlUsd": 250000,
      "minTrackDays": 60,
      "minObservations": 18,
      "minDepositorDays": 30,
      "longDepositorDays": 90
    },
    "methodology": {
      "style": "quant multi-factor ranking",
      "factors": [
        "Sharpe proxy percentile (19%)",
        "Sortino proxy percentile (8%)",
        "Calmar percentile (12%)",
        "Annualized return percentile (13%, winsorized)",
        "Drawdown control percentile (12%)",
        "Volatility control percentile (7%)",
        "TVL robustness percentile (7%)",
        "Track record age percentile (3%)",
        "Recent consistency percentile (3%)",
        "Depositor quality composite (16%)"
      ],
      "depositorComposite": [
        "Depositor 正收益占比（>=30天）",
        "Depositor 资金加权正收益占比",
        "Depositor 长期跟随资金占比（>=90天）",
        "Depositor 中位日收益代理",
        "Depositor 有效样本覆盖度"
      ],
      "normalization": [
        "Sharpe/Sortino/Calmar/Annualized return 因子均做区间封顶，避免异常值主导",
        "年化波动单独作为负向控制因子",
        "Depositor 日收益代理做区间裁剪（-1%~+1%/日）"
      ],
      "penalties": [
        "Max drawdown > 45%",
        "Max drawdown > 30%",
        "Annualized volatility > 250% / 500%",
        "Negative annualized return",
        "Negative all-time return",
        "Negative APR",
        "Leader commission > 20%",
        "Track record age < 120 days",
        "Depositor 有效样本偏少（<10）",
        "Depositor 正收益占比偏低",
        "Depositor 资金加权正收益占比偏低",
        "Depositor 深度亏损占比偏高"
      ]
    }
  },
  "topStrategies": [
    {
      "rank": 1,
      "name": "Bitcoin Moving Average Long/Short",
      "vaultAddress": "0xb1505ad1a4c7755e0eb236aa2f4327bfc3474768",
      "leader": "0x1fa1b4c4cda61b3c1ce805ae82e64a90d8821d08",
      "style": "成长进攻型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 3.26）。",
        "管理规模较大（TVL 3,525,372 USD），容量与稳定性更好。",
        "运行周期较长（196 天），样本更充分。"
      ],
      "riskFlags": [
        "年化收益代理异常高，可能受短样本放大",
        "近期日/周/月收益一致性较弱"
      ],
      "metrics": {
        "score": 0.7305,
        "tvlUsd": 3525371.77,
        "apr": -0.004983,
        "annualizedReturn": 8.507764,
        "annualizedVolatility": 0.790527,
        "maxDrawdown": 0.224268,
        "sharpeProxy": 3.256714,
        "sortinoProxy": 4.952854,
        "calmarRatio": 37.935708,
        "consistencyScore": 0.333333,
        "depositorCompositeScore": 0.708929,
        "dayReturn": -0.010801,
        "weekReturn": -0.045742,
        "monthReturn": 0.033448,
        "trackDays": 189.4,
        "observations": 40,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 95,
        "depositorPositivePnlRatio": 0.926316,
        "depositorEquityWeightedPositiveRatio": 0.973615,
        "depositorLongTenureCapitalShare": 0.963703,
        "depositorMedianDailyPnlUsd": 9.16094,
        "depositorMedianDailyReturnApprox": 0.00063499,
        "depositorDeepLossRatio": 0
      }
    },
    {
      "rank": 2,
      "name": "Archangel Quant Fund I",
      "vaultAddress": "0x8c7bd04cf8d00d68ce8bc7d2f3f02f98d16a5ab0",
      "leader": "0xe2422bca1570e1b1c352164b0b41dae434035f6c",
      "style": "均衡配置型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 2.75）。",
        "运行周期较长（205 天），样本更充分。",
        "近月收益为正（12.16%），近期动量健康。"
      ],
      "riskFlags": [
        "年化波动偏高（312.58%）",
        "年化收益代理异常高，可能受短样本放大",
        "跟随者深度亏损比例偏高（23.53%）"
      ],
      "metrics": {
        "score": 0.5738,
        "tvlUsd": 282354.72,
        "apr": 0.243131,
        "annualizedReturn": 385.238662,
        "annualizedVolatility": 3.125753,
        "maxDrawdown": 0.28345,
        "sharpeProxy": 2.754812,
        "sortinoProxy": 13.814662,
        "calmarRatio": 1359.106015,
        "consistencyScore": 0.666667,
        "depositorCompositeScore": 0.605357,
        "dayReturn": -0.010734,
        "weekReturn": 0.057221,
        "monthReturn": 0.121565,
        "trackDays": 203.39,
        "observations": 40,
        "leaderCommission": 0.1,
        "followerCount": 78,
        "depositorEligibleFollowers": 51,
        "depositorPositivePnlRatio": 0.745098,
        "depositorEquityWeightedPositiveRatio": 0.798284,
        "depositorLongTenureCapitalShare": 0.627632,
        "depositorMedianDailyPnlUsd": 0.162416,
        "depositorMedianDailyReturnApprox": 0.00087207,
        "depositorDeepLossRatio": 0.235294
      }
    },
    {
      "rank": 3,
      "name": "Orbit Value Strategies",
      "vaultAddress": "0x115849ce84370f25cadcf0d348510d73837e1aa5",
      "leader": "0xf292b42e6167e0d591449ebd67d2e989a3479edf",
      "style": "成长进攻型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 1.76）。",
        "历史最大回撤较低（11.09%）。",
        "管理规模较大（TVL 2,998,495 USD），容量与稳定性更好。"
      ],
      "riskFlags": [
        "年化波动偏高（3119.98%）",
        "年化收益代理异常高，可能受短样本放大"
      ],
      "metrics": {
        "score": 0.5138,
        "tvlUsd": 2998495.34,
        "apr": 0.742703,
        "annualizedReturn": 9502.681953,
        "annualizedVolatility": 31.199822,
        "maxDrawdown": 0.110916,
        "sharpeProxy": 1.756226,
        "sortinoProxy": 311.179521,
        "calmarRatio": 85674.738025,
        "consistencyScore": 1,
        "depositorCompositeScore": 0.878571,
        "dayReturn": 0.009114,
        "weekReturn": 0.011491,
        "monthReturn": 0.025301,
        "trackDays": 119.36,
        "observations": 33,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 95,
        "depositorPositivePnlRatio": 1,
        "depositorEquityWeightedPositiveRatio": 1,
        "depositorLongTenureCapitalShare": 0.955013,
        "depositorMedianDailyPnlUsd": 13.488186,
        "depositorMedianDailyReturnApprox": 0.00088801,
        "depositorDeepLossRatio": 0
      }
    },
    {
      "rank": 4,
      "name": "OnlyShorts",
      "vaultAddress": "0x61b1cf5c2d7c4bf6d5db14f36651b2242e7cba0a",
      "leader": "0xdaffbc69a0be655469257b43e1ceffb5eab920c0",
      "style": "成长进攻型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 2.09）。",
        "运行周期较长（184 天），样本更充分。",
        "近月收益为正（20.82%），近期动量健康。"
      ],
      "riskFlags": [
        "年化波动偏高（269.46%）",
        "年化收益代理异常高，可能受短样本放大",
        "近期日/周/月收益一致性较弱"
      ],
      "metrics": {
        "score": 0.4749,
        "tvlUsd": 935446.62,
        "apr": -0.076471,
        "annualizedReturn": 41.713503,
        "annualizedVolatility": 2.694568,
        "maxDrawdown": 0.239442,
        "sharpeProxy": 2.089953,
        "sortinoProxy": 12.302348,
        "calmarRatio": 174.211155,
        "consistencyScore": 0.333333,
        "depositorCompositeScore": 0.348214,
        "dayReturn": -0.15574,
        "weekReturn": -0.011991,
        "monthReturn": 0.20822,
        "trackDays": 182.36,
        "observations": 39,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 53,
        "depositorPositivePnlRatio": 0.169811,
        "depositorEquityWeightedPositiveRatio": 0.771527,
        "depositorLongTenureCapitalShare": 0.898457,
        "depositorMedianDailyPnlUsd": -0.375215,
        "depositorMedianDailyReturnApprox": -0.00121821,
        "depositorDeepLossRatio": 0
      }
    },
    {
      "rank": 5,
      "name": "Overdose",
      "vaultAddress": "0xe67dbf2d051106b42104c1a6631af5e5a458b682",
      "leader": "0xdeb7582b362a752970fbd2507d0fb5dd27ed379a",
      "style": "均衡配置型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 2.83）。",
        "长期跟随资金占比较高（75.09%），资金粘性更好。",
        "收益弹性极高，需重点核查可持续性与容量冲击风险。"
      ],
      "riskFlags": [
        "历史回撤偏高（31.92%）",
        "年化波动偏高（210.89%）",
        "年化收益代理异常高，可能受短样本放大"
      ],
      "metrics": {
        "score": 0.4034,
        "tvlUsd": 377100.76,
        "apr": -0.177709,
        "annualizedReturn": 67.19084,
        "annualizedVolatility": 2.108916,
        "maxDrawdown": 0.319191,
        "sharpeProxy": 2.826834,
        "sortinoProxy": 9.193228,
        "calmarRatio": 210.503324,
        "consistencyScore": 0,
        "depositorCompositeScore": 0.303571,
        "dayReturn": -0.113823,
        "weekReturn": -0.189539,
        "monthReturn": -0.17945,
        "trackDays": 126.34,
        "observations": 34,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 99,
        "depositorPositivePnlRatio": 0.222222,
        "depositorEquityWeightedPositiveRatio": 0.723135,
        "depositorLongTenureCapitalShare": 0.750935,
        "depositorMedianDailyPnlUsd": -0.142944,
        "depositorMedianDailyReturnApprox": -0.01408411,
        "depositorDeepLossRatio": 0.474747
      }
    },
    {
      "rank": 6,
      "name": "[ Systemic Strategies ] ♾️ HyperGrowth ♾️",
      "vaultAddress": "0xd6e56265890b76413d1d527eb9b75e334c0c5b42",
      "leader": "0x2b804617c6f63c040377e95bb276811747006f4b",
      "style": "均衡配置型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 1.95）。",
        "管理规模较大（TVL 11,457,262 USD），容量与稳定性更好。",
        "运行周期较长（229 天），样本更充分。"
      ],
      "riskFlags": [
        "历史回撤偏高（53.88%）",
        "年化波动偏高（250.04%）",
        "年化收益代理异常高，可能受短样本放大"
      ],
      "metrics": {
        "score": 0.381,
        "tvlUsd": 11457262.43,
        "apr": 0.94639,
        "annualizedReturn": 14.305864,
        "annualizedVolatility": 2.500438,
        "maxDrawdown": 0.538835,
        "sharpeProxy": 1.954758,
        "sortinoProxy": 6.615105,
        "calmarRatio": 26.549607,
        "consistencyScore": 1,
        "depositorCompositeScore": 0.860714,
        "dayReturn": 0.003235,
        "weekReturn": 0.061284,
        "monthReturn": 0.368569,
        "trackDays": 224.36,
        "observations": 41,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 72,
        "depositorPositivePnlRatio": 1,
        "depositorEquityWeightedPositiveRatio": 1,
        "depositorLongTenureCapitalShare": 0.326116,
        "depositorMedianDailyPnlUsd": 85.284164,
        "depositorMedianDailyReturnApprox": 0.00454962,
        "depositorDeepLossRatio": 0
      }
    },
    {
      "rank": 7,
      "name": "AIQuantPulse",
      "vaultAddress": "0x8231fdf9997c003a267374b45fb25c0455aa1dcb",
      "leader": "0xcbdf15e12fc3b8e8fc8bacf577c4d1071cf2b4b3",
      "style": "成长进攻型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 8.06）。",
        "历史最大回撤较低（0.23%）。",
        "管理规模较大（TVL 2,273,927 USD），容量与稳定性更好。"
      ],
      "riskFlags": [
        "年化波动偏高（445.06%）",
        "年化收益代理异常高，可能受短样本放大",
        "策略运行时间较短（73 天）"
      ],
      "metrics": {
        "score": 0.3724,
        "tvlUsd": 2273926.5,
        "apr": -0.002916,
        "annualizedReturn": 1739893628653.9785,
        "annualizedVolatility": 4.450583,
        "maxDrawdown": 0.002298,
        "sharpeProxy": 8.064366,
        "sortinoProxy": 1955.446951,
        "calmarRatio": 757242428019968.8,
        "consistencyScore": 1,
        "depositorCompositeScore": 0.1125,
        "dayReturn": 0.200917,
        "weekReturn": 10.101032,
        "monthReturn": 228.939875,
        "trackDays": 70.42,
        "observations": 45,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 1,
        "depositorPositivePnlRatio": 0,
        "depositorEquityWeightedPositiveRatio": 0,
        "depositorLongTenureCapitalShare": 0,
        "depositorMedianDailyPnlUsd": -8.797959,
        "depositorMedianDailyReturnApprox": -0.00005502,
        "depositorDeepLossRatio": 0
      }
    },
    {
      "rank": 8,
      "name": "drkmttr",
      "vaultAddress": "0xc179e03922afe8fa9533d3f896338b9fb87ce0c8",
      "leader": "0xf4f7cebbd2c7b6dee34ab29fa55a116eff25239f",
      "style": "均衡配置型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 1.76）。",
        "管理规模较大（TVL 5,708,070 USD），容量与稳定性更好。",
        "长期跟随资金占比较高（99.78%），资金粘性更好。"
      ],
      "riskFlags": [
        "历史回撤偏高（32.51%）",
        "年化波动偏高（16030.88%）",
        "年化收益代理异常高，可能受短样本放大"
      ],
      "metrics": {
        "score": 0.3484,
        "tvlUsd": 5708070.19,
        "apr": -0.045392,
        "annualizedReturn": 658521656.411533,
        "annualizedVolatility": 160.308824,
        "maxDrawdown": 0.325144,
        "sharpeProxy": 1.757403,
        "sortinoProxy": 531.465209,
        "calmarRatio": 2025324479.216894,
        "consistencyScore": 0.666667,
        "depositorCompositeScore": 0.525,
        "dayReturn": 0.025509,
        "weekReturn": 0.118542,
        "monthReturn": -0.049259,
        "trackDays": 126.36,
        "observations": 34,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 18,
        "depositorPositivePnlRatio": 0.5,
        "depositorEquityWeightedPositiveRatio": 0.94495,
        "depositorLongTenureCapitalShare": 0.997822,
        "depositorMedianDailyPnlUsd": 0.036803,
        "depositorMedianDailyReturnApprox": -0.00001775,
        "depositorDeepLossRatio": 0.055556
      }
    },
    {
      "rank": 9,
      "name": "69 Jump Street",
      "vaultAddress": "0xa844d7ac9fa3424c4fd38a25baa23e460ec3e802",
      "leader": "0x84803dc3df988d5493d9be2ee75e36f0043ee272",
      "style": "均衡配置型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 1.91）。",
        "年化收益代理较高（403.96%）。",
        "运行周期较长（454 天），样本更充分。"
      ],
      "riskFlags": [
        "历史回撤偏高（51.46%）"
      ],
      "metrics": {
        "score": 0.3474,
        "tvlUsd": 583677.38,
        "apr": 0.247851,
        "annualizedReturn": 4.039575,
        "annualizedVolatility": 1.084689,
        "maxDrawdown": 0.514561,
        "sharpeProxy": 1.913824,
        "sortinoProxy": 6.041544,
        "calmarRatio": 7.850531,
        "consistencyScore": 0.666667,
        "depositorCompositeScore": 0.625,
        "dayReturn": -0.000445,
        "weekReturn": 0.011277,
        "monthReturn": 0.106601,
        "trackDays": 448.39,
        "observations": 68,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 88,
        "depositorPositivePnlRatio": 0.693182,
        "depositorEquityWeightedPositiveRatio": 0.967321,
        "depositorLongTenureCapitalShare": 0.95798,
        "depositorMedianDailyPnlUsd": 0.015141,
        "depositorMedianDailyReturnApprox": 0.0001118,
        "depositorDeepLossRatio": 0.022727
      }
    },
    {
      "rank": 10,
      "name": "[ Systemic Strategies ] L/S Grids",
      "vaultAddress": "0x07fd993f0fa3a185f7207adccd29f7a87404689d",
      "leader": "0x2b804617c6f63c040377e95bb276811747006f4b",
      "style": "均衡配置型",
      "investmentThesis": [
        "风险调整后收益较强（Sharpe 代理 1.83）。",
        "管理规模较大（TVL 6,548,132 USD），容量与稳定性更好。",
        "运行周期较长（448 天），样本更充分。"
      ],
      "riskFlags": [
        "历史回撤偏高（80.62%）",
        "年化波动偏高（263.03%）",
        "年化收益代理异常高，可能受短样本放大"
      ],
      "metrics": {
        "score": 0.3412,
        "tvlUsd": 6548132.03,
        "apr": 0.624164,
        "annualizedReturn": 11.301853,
        "annualizedVolatility": 2.630294,
        "maxDrawdown": 0.806169,
        "sharpeProxy": 1.825729,
        "sortinoProxy": 4.742397,
        "calmarRatio": 14.019216,
        "consistencyScore": 0.666667,
        "depositorCompositeScore": 0.767857,
        "dayReturn": -0.000545,
        "weekReturn": 0.324771,
        "monthReturn": 0.792269,
        "trackDays": 441.38,
        "observations": 67,
        "leaderCommission": 0.1,
        "followerCount": 100,
        "depositorEligibleFollowers": 52,
        "depositorPositivePnlRatio": 0.942308,
        "depositorEquityWeightedPositiveRatio": 0.985284,
        "depositorLongTenureCapitalShare": 0.951099,
        "depositorMedianDailyPnlUsd": 16.503779,
        "depositorMedianDailyReturnApprox": 0.00148696,
        "depositorDeepLossRatio": 0.019231
      }
    }
  ]
};
