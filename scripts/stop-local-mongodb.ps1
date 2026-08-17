# ============================================================
#  Stop local MongoDB
# ============================================================

$running = Get-Process -Name mongod -ErrorAction SilentlyContinue
if (!$running) {
    Write-Host "MongoDB is not running." -ForegroundColor Yellow
    exit 0
}

Write-Host "Stopping MongoDB (PID: $($running.Id))..." -ForegroundColor Cyan
Stop-Process -Name mongod -Force
Start-Sleep -Seconds 1

$check = Get-Process -Name mongod -ErrorAction SilentlyContinue
if (!$check) {
    Write-Host "✅ MongoDB stopped." -ForegroundColor Green
} else {
    Write-Host "❌ Failed to stop MongoDB." -ForegroundColor Red
}
