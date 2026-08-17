# ============================================================
#  Start local MongoDB (background)
# ============================================================
#  Starts mongod in the background and writes logs to
#  C:\data\log\mongod.log
# ============================================================

$ErrorActionPreference = 'Stop'

$mongoExe = (Get-Command mongod -ErrorAction SilentlyContinue)
if (!$mongoExe) {
    Write-Host "mongod not found. Run scripts\install-local-mongodb.ps1 first." -ForegroundColor Red
    exit 1
}

$dataDir = "C:\data\db"
$logFile = "C:\data\log\mongod.log"

if (!(Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}
$logDir = Split-Path $logFile -Parent
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Check if already running
$running = Get-Process -Name mongod -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "MongoDB is already running (PID: $($running.Id))" -ForegroundColor Yellow
    exit 0
}

Write-Host "Starting MongoDB..." -ForegroundColor Cyan
Write-Host "  Data:   $dataDir" -ForegroundColor Gray
Write-Host "  Logs:   $logFile" -ForegroundColor Gray
Write-Host "  URL:    mongodb://localhost:27017" -ForegroundColor Gray
Write-Host ""

Start-Process -FilePath $mongoExe.Source `
              -ArgumentList "--dbpath `"$dataDir`" --logpath `"$logFile`" --bind_ip 127.0.0.1" `
              -WindowStyle Hidden

Start-Sleep -Seconds 2

$check = Get-Process -Name mongod -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "✅ MongoDB started (PID: $($check.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now run: scripts\switch-to-local.ps1" -ForegroundColor Yellow
    Write-Host "Then:    npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "❌ MongoDB failed to start. Check $logFile" -ForegroundColor Red
}
