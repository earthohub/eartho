param(
  [string]$Repo = "C:\Users\Zonghu Liao\Desktop\eartho",
  [string]$Branch = "cursor/hyperliquid-tracker-dashboard-3171",
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

function OK($msg) { Write-Host "[OK]  $msg" -ForegroundColor Green }
function WARN($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function FAIL($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }

if (!(Test-Path $Repo)) {
  FAIL "Repo path not found: $Repo"
  exit 1
}

Set-Location $Repo
OK "Entered repo: $Repo"

git config --global http.version HTTP/1.1
git config --global fetch.prune true

$gitReady = $false
foreach ($wait in @(4, 8, 16, 32)) {
  git ls-remote --heads origin $Branch | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $gitReady = $true
    break
  }
  WARN "git ls-remote failed, retry in ${wait}s"
  Start-Sleep -Seconds $wait
}

if ($gitReady) {
  OK "Git reachable, syncing branch"
  git fetch --prune origin
  git checkout $Branch
  git reset --hard "origin/$Branch"
  $head = (git log -1 --oneline).Trim()
  OK "Synced to: $head"
} else {
  WARN "Git still unstable, switching to offline fallback"

  $branchSafe = ($Branch -replace '[\\/:*?"<>|]', "_")
  $zipUrl = "https://codeload.github.com/earthohub/eartho/zip/refs/heads/$Branch"
  $zipPath = Join-Path $env:TEMP ("eartho_" + $branchSafe + ".zip")
  $tmpDir = Join-Path $env:TEMP ("eartho_sync_" + [Guid]::NewGuid().ToString("N"))

  New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
  Invoke-WebRequest $zipUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 90
  Expand-Archive $zipPath $tmpDir -Force

  $srcRoot = Get-ChildItem $tmpDir -Directory | Select-Object -First 1
  if (-not $srcRoot) {
    throw "Offline package extract failed"
  }

  $srcDash = Join-Path $srcRoot.FullName "dashboard"
  if (!(Test-Path $srcDash)) {
    throw "dashboard folder not found in offline package"
  }

  robocopy $srcDash (Join-Path $Repo "dashboard") /E /NFL /NDL /NJH /NJS /NP | Out-Null
  OK "Offline fallback applied: dashboard updated"

  Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
  Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}

node --check ".\dashboard\app.js"
OK "app.js syntax check passed"

Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

if (Get-Command py -ErrorAction SilentlyContinue) {
  Start-Process py -ArgumentList "-m http.server $Port --directory `"$Repo`"" | Out-Null
} else {
  Start-Process python -ArgumentList "-m http.server $Port --directory `"$Repo`"" | Out-Null
}

Start-Sleep -Seconds 2

$h = (Invoke-WebRequest "http://127.0.0.1:$Port/dashboard/index.html?v=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" -UseBasicParsing -TimeoutSec 12).Content
$j = (Invoke-WebRequest "http://127.0.0.1:$Port/dashboard/app.js?v=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" -UseBasicParsing -TimeoutSec 12).Content

OK "Service running: http://127.0.0.1:$Port/dashboard/"
Write-Host ("Top18 marker: " + ($h -match "Top18"))
Write-Host ("Top1-18 marker: " + ($h -match "Top1-18"))
Write-Host ("Quota marker: " + ($j -match "minCountInTopN:\s*8"))
Write-Host ("Link marker: " + ($j -match "strategy-link"))
