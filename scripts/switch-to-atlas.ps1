# ============================================================
#  Switch MongoDB connection back to ATLAS (cloud)
# ============================================================
#  After running this, your .env will point to:
#     mongodb+srv://<user>:<pass>@cluster0...
#
#  Use when:  you want to use the production cloud database
#             from local development.
#
#  Note: TLS is automatically relaxed for local dev (see
#  src/config/database.ts -- only cert *verification* is
#  relaxed, data is still encrypted in transit and Atlas
#  username/password auth is still enforced).
# ============================================================

$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\.env'

if (!(Test-Path $envFile)) {
    Write-Host "No .env found. Run switch-to-local.ps1 first or restore .env from .env.example" -ForegroundColor Red
    exit 1
}

$content = Get-Content $envFile -Raw

# Restore Atlas URI
$atlasUri = "mongodb+srv://soniajaiswal2222_db_user:matrixyuvraj_secret_2025_supplier_onboarding_system@cluster0.n0nq90a.mongodb.net/supplier-onboarding?retryWrites=true&w=majority&appName=Cluster0"

if ($content -match '(?m)^MONGODB_URI=.*$') {
    $content = $content -replace '(?m)^MONGODB_URI=.*$', "MONGODB_URI=$atlasUri"
} else {
    $content = "`nMONGODB_URI=$atlasUri`n" + $content
}

# Set NODE_ENV back to production
if ($content -match '(?m)^NODE_ENV=.*$') {
    $content = $content -replace '(?m)^NODE_ENV=.*$', 'NODE_ENV=production'
} else {
    $content = "`nNODE_ENV=production`n" + $content
}

Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Switched to ATLAS MongoDB" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "MONGODB_URI=mongodb+srv://...mongodb.net/..." -ForegroundColor Cyan
Write-Host "NODE_ENV=production" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: TLS cert verification is automatically relaxed for" -ForegroundColor Yellow
Write-Host "local dev (data is still encrypted, only cert is not" -ForegroundColor Yellow
Write-Host "strictly verified). No IP whitelist changes needed." -ForegroundColor Yellow
Write-Host ""
Write-Host "Restart your backend:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
