# Single-command start of the PRISALY frontend. Never overwrites existing configuration.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Fail([string]$message) {
    Write-Host ""
    Write-Host "ERROR: $message" -ForegroundColor Red
    exit 1
}

function Step([string]$message) {
    Write-Host "==> $message" -ForegroundColor Cyan
}

Step "Comprobando Node.js y npm"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js no está instalado o no está en el PATH." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "npm no está en el PATH." }
$nodeVersion = (node --version).TrimStart("v")
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 22) { Fail "Angular 22 requiere Node.js 22 o superior y se encontró $nodeVersion." }
Write-Host "Node.js $nodeVersion · npm $(npm --version)"

if (-not (Test-Path ".\package.json")) { Fail "No se encontró package.json en $PSScriptRoot." }

Step "Comprobando dependencias"
$installedMarker = ".\node_modules\.package-lock.json"
$needsInstall = -not (Test-Path $installedMarker)
if (-not $needsInstall -and (Test-Path ".\package-lock.json")) {
    $needsInstall = (Get-Item ".\package-lock.json").LastWriteTime -gt (Get-Item $installedMarker).LastWriteTime
}
if ($needsInstall) {
    if (Test-Path ".\package-lock.json") {
        Write-Host "Instalando dependencias exactas del package-lock.json (npm ci)..."
        npm ci --no-fund --no-audit
    } else {
        Write-Host "Instalando dependencias (npm install)..."
        npm install --no-fund --no-audit
    }
    if ($LASTEXITCODE -ne 0) { Fail "La instalación de dependencias falló." }
} else {
    Write-Host "Dependencias ya instaladas."
}

# The API base URL is compiled from src/environments/environment.ts (Angular convention).
Step "Comprobando configuración de la API"
$environmentFile = ".\src\environments\environment.ts"
if (-not (Test-Path $environmentFile)) { Fail "No existe $environmentFile con apiUrl." }
$apiLine = Get-Content $environmentFile | Where-Object { $_ -match "apiUrl\s*:\s*'([^']+)'" } | Select-Object -First 1
if (-not $apiLine) { Fail "$environmentFile no define apiUrl." }
$null = $apiLine -match "apiUrl\s*:\s*'([^']+)'"
Write-Host "API: $($Matches[1])  (configuración: src/environments/environment.ts)"

Step "Iniciando servidor de desarrollo: http://localhost:4200  (Ctrl+C para detener)"
npm start
exit $LASTEXITCODE
