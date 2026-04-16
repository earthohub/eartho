# Hyperliquid User Vaults 私人投研模块

这个模块用于从 Hyperliquid `user vaults` 全量策略中，按量化基金/投行风格的多因子方法筛选可投策略，并输出可视化网页。

## 功能

- 自动拉取全量 Vault 数据
- 在开放 user vault 中进行可投过滤（`allowDeposits=true`、TVL/跟踪周期阈值）
- 计算关键指标：
  - 年化收益代理
  - 年化波动
  - 最大回撤（MDD）
  - Sharpe 代理
  - Sortino 代理
  - Calmar
  - 日/周/月收益一致性
- 多因子综合评分，输出 Top 10 策略
- 对异常高收益/比率进行稳健化封顶（winsorized），降低短样本噪声影响
- 输出每个策略的风险提示（波动、回撤、样本长度、一致性）
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

## 网页按钮自动更新（推荐）

如果你希望在网页里点击按钮自动执行更新并刷新页面，请启动本地控制服务：

```bash
node vault-research/scripts/web-control-server.mjs
```

启动后访问：

`http://localhost:8787`

页面中会出现“设置与更新”区域，点击“更新数据并刷新页面”即可自动执行：

`node vault-research/scripts/update-analysis.mjs`

并在完成后自动刷新页面数据。

## 可调参数（环境变量）

- `VAULT_CONCURRENCY`：并发抓取详情请求数（默认 `20`）
- `MIN_TVL_USD`：最小 TVL 过滤（默认 `250000`）
- `MIN_TRACK_DAYS`：最小跟踪天数（默认 `60`）
- `MIN_OBSERVATIONS`：最小历史观测点（默认 `18`）

示例：

```bash
VAULT_CONCURRENCY=30 MIN_TVL_USD=500000 node vault-research/scripts/update-analysis.mjs
```

## 注意

- 数据是实时变动的，策略数量和排名会随市场与资金流变化。
- 页面结论仅用于研究辅助，不构成任何投资建议。
