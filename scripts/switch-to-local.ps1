# ============================================================
#  Switch MongoDB connection to LOCAL (offline, no Atlas TLS)
# ============================================================
#  After running this, your .env will point to:
#     mongodb://localhost:27017/supplier-onboarding
#
#  Use when:  local network can't reach Atlas, or you want
#             zero network dependency for development.
#
#  To go back to Atlas, run:  scripts\switch-to-atlas.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\.env'
$envExample = Join-Path $PSScriptRoot '..\.env.example'

if (!(Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host "Created .env from .env.example" -ForegroundColor Yellow
    } else {
        Write-Host "No .env or .env.example found" -ForegroundColor Red
        exit 1
    }
}

$content = Get-Content $envFile -Raw

# Replace MONGODB_URI line
if ($content -match '(?m)^MONGODB_URI=.*$') {
    $content = $content -replace '(?m)^MONGODB_URI=.*$', 'MONGODB_URI=mongodb://localhost:27017/supplier-onboarding'
} else {
    $content += "`nMONGODB_URI=mongodb://localhost:27017/supplier-onboarding`n"
}

# Also set NODE_ENV to development (local dev, not production)
if ($content -match '(?m)^NODE_ENV=.*$') {
    $content = $content -replace '(?m)^NODE_ENV=.*$', 'NODE_ENV=development'
} else {
    $content = "`nNODE_ENV=development`n" + $content
}

Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Switched to LOCAL MongoDB" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "MONGODB_URI=mongodb://localhost:27017/supplier-onboarding" -ForegroundColor Cyan
Write-Host "NODE_ENV=development" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure MongoDB is running:" -ForegroundColor Yellow
Write-Host "  mongod --dbpath C:\data\db" -ForegroundColor White
Write-Host ""
Write-Host "Then restart your backend:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "To go back to Atlas, run:  scripts\switch-to-atlas.ps1" -ForegroundColor Gray
