# Hyperliquid User Vaults 私人投研模块

这个模块用于从 Hyperliquid `user vaults` 全量策略中，按量化基金/投行风格的多因子方法筛选可投策略，并输出可视化网页。

## 功能

- 自动拉取全量 Vault 数据
- 在开放 user vault 中进行可投过滤（`allowDeposits=true`、TVL/跟踪周期阈值）
- 过滤“短期一致性为负”的策略（近1日/1周/1月平均收益为负则排除）
- 计算关键指标：
  - 年化收益代理
  - 最大回撤（MDD）
  - Sharpe 代理
  - Sortino 代理
  - Calmar
  - 日/周/月收益一致性
  - Depositor 体验指标（正收益占比、资金加权正收益占比、长期跟随资金占比、中位日均PnL代理）
- 多因子综合评分（Depositor 因子为主，回撤次之），输出 Top 10 策略
- 年化收益代理只作为正值门槛，不参与主打分
- 输出每个策略的风险提示（回撤、样本长度、一致性、跟随者结构）
- 生成网页数据文件，方便本地打开查看

## 一键更新

在仓库根目录运行：

```bash
node vault-research/scripts/update-analysis.mjs
```

更新后会生成：

- `vault-research/data/latest-analysis.json`
- `vault-research/web/latest-analysis.js`

然后打开 `vault-research/web/index.html` 即可查看结果。

## 可调参数（环境变量）

- `VAULT_CONCURRENCY`：并发抓取详情请求数（默认 `20`）
- `MIN_TVL_USD`：最小 TVL 过滤（默认 `50000`）
- `MIN_TRACK_DAYS`：最小跟踪天数（默认 `60`）
- `MIN_OBSERVATIONS`：最小历史观测点（默认 `18`）

示例：

```bash
VAULT_CONCURRENCY=30 MIN_TVL_USD=500000 node vault-research/scripts/update-analysis.mjs
```

## 注意

- 数据是实时变动的，策略数量和排名会随市场与资金流变化。
- 页面结论仅用于研究辅助，不构成任何投资建议。
