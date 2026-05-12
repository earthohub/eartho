#Requires -Version 5.0
# 在仓库根目录执行： .\run_polymarket_web.ps1
# 可选参数传给 monitor.py： .\run_polymarket_web.ps1 --web-port 9000 --no-browser

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$monitor = Join-Path $root "polymarket_monitor\monitor.py"
if (-not (Test-Path $monitor)) {
    Write-Host ""
    Write-Host "未找到 polymarket_monitor\monitor.py — 当前仓库还没有监测工具代码。" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请先拉取包含该目录的分支，例如：" -ForegroundColor White
    Write-Host "  git fetch origin" -ForegroundColor Cyan
    Write-Host "  git checkout cursor/polymarket-btc-monitor-b093" -ForegroundColor Cyan
    Write-Host "  git pull" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "若已合并到 main，则：" -ForegroundColor White
    Write-Host "  git checkout main" -ForegroundColor Cyan
    Write-Host "  git pull origin main" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "启动本地监测页（Ctrl+C 停止）…" -ForegroundColor Green
if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 $monitor --web @args
    exit $LASTEXITCODE
}
if (Get-Command python -ErrorAction SilentlyContinue) {
    & python $monitor --web @args
    exit $LASTEXITCODE
}
if (Get-Command python3 -ErrorAction SilentlyContinue) {
    & python3 $monitor --web @args
    exit $LASTEXITCODE
}

Write-Host "未找到 Python（py / python / python3）。请先安装并加入 PATH。" -ForegroundColor Red
exit 1
