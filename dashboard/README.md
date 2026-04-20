# HyperRanking

这个目录包含一个独立的“私有跟踪网页”，用于展示：

- Top18 地址交易风格画像（趋势 / 反转 / 高频做市 / 事件驱动）
- 可执行跟踪清单（入场条件 / 跟随阈值 / 止损规则）
- Top18 每个地址的资金曲线（从 `info -> portfolio` 拉取）

## 文件说明

- `index.html`：页面结构
- `strategy.html`：单地址策略详情页（收益、因子、持仓）
- `styles.css`：页面样式
- `app.js`：浏览器端实时拉取、计算与绘图逻辑
- `update.js`：本地脚本，按需拉取并生成快照数据 `data/latest.json`
- `data/latest.json`：最近一次更新产出的数据快照（可选）

## 使用方式

### 0) 一键同步（推荐）

网络稳定时自动走 Git；网络不稳定时自动走离线覆盖，并重启本地服务：

```powershell
cd "C:\Users\Zonghu Liao\Desktop\eartho"
powershell -ExecutionPolicy Bypass -File ".\sync-dashboard.ps1"
```

脚本会自动执行：
- 优先尝试 `git ls-remote/fetch/reset` 同步到目标分支
- Git 失败时自动下载分支 zip 离线覆盖 `dashboard/`
- 语法检查 `dashboard/app.js`
- 重启 `http://127.0.0.1:8080`
- 打印关键自检项（Top18 / Quota8 / StrategyLink / SnapshotFallback）

### 1) 直接打开网页

在本地启动静态文件服务（推荐）：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080/dashboard/
```

页面内点击“更新数据”即可实时重算，并自动加载 Top18 资金曲线。

### 2) 生成离线快照（需要时更新）

```bash
node dashboard/update.js
```

脚本会生成：

```text
dashboard/data/latest.json
```

可用于归档、比对或二次处理。

## 可调参数

在 `app.js` / `update.js` 中可调：

- 可跟踪门槛：账户净值、月成交额
- 多因子权重：收益质量 / Alpha / 效率 / 一致性 / 容量 / 回撤代理
- 风格分类阈值与跟踪规则模板
- 资金曲线参数：拉取并发数、窗口优先级、曲线采样点数

## 当前数据源

- `https://stats-data.hyperliquid.xyz/Mainnet/leaderboard`
- `https://api.hyperliquid.xyz/info`（`type: "portfolio"`）

> 已移除对 `https://stats-data.hyperliquid.xyz/Mainnet/vaults` 的依赖。

