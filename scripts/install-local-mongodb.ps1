# ============================================================
#  Install Local MongoDB - Permanent Fix for Atlas TLS Issues
# ============================================================
#  This script installs MongoDB Community Edition locally so you
#  never have Atlas TLS / IP whitelist problems again.
#
#  Usage (PowerShell as Administrator):
#     powershell -ExecutionPolicy Bypass -File scripts\install-local-mongodb.ps1
#
#  After install:
#     1. Run scripts\switch-to-local.ps1
#     2. Restart your backend: npm run dev
# ============================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installing Local MongoDB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is already installed
$mongoPath = Get-Command mongod -ErrorAction SilentlyContinue
if ($mongoPath) {
    Write-Host "MongoDB is already installed at: $($mongoPath.Source)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run scripts\switch-to-local.ps1 to use it." -ForegroundColor Yellow
    exit 0
}

# Try winget first (recommended)
Write-Host "Attempting to install via winget..." -ForegroundColor Yellow
try {
    winget install --id MongoDB.Server --accept-package-agreements --accept-source-agreements
    Write-Host ""
    Write-Host "✅ MongoDB installed via winget!" -ForegroundColor Green
} catch {
    Write-Host "winget install failed, falling back to direct download..." -ForegroundColor Yellow
    Write-Host ""

    # Fallback: Direct download from MongoDB
    $installerUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.14-signed.msi"
    $installerPath = "$env:TEMP\mongodb-installer.msi"

    Write-Host "Downloading MongoDB installer..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing

    Write-Host "Running installer (silent)..." -ForegroundColor Yellow
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$installerPath`" /quiet ADDLOCAL=ALL"

    Remove-Item $installerPath -Force
    Write-Host "✅ MongoDB installed!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setting up data directories" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create data and log directories
$dataDir = "C:\data\db"
$logDir = "C:\data\log"

if (!(Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "Created: $dataDir" -ForegroundColor Green
}
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "Created: $logDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start MongoDB:    mongod --dbpath C:\data\db --logpath C:\data\log\mongod.log" -ForegroundColor White
Write-Host "  2. Or run:           scripts\start-local-mongodb.ps1" -ForegroundColor White
Write-Host "  3. Switch to local:  scripts\switch-to-local.ps1" -ForegroundColor White
Write-Host "  4. Restart backend:  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or to use Atlas (with relaxed TLS), just run: npm run dev" -ForegroundColor Gray
