param(
  [string]$ApiKey,
  [string]$Model = "gemini-2.5-flash",
  [string]$ApiVersion = "v1",
  [int]$Port = 5173,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
Write-Host "🚀 Bootstrapping Agentic Workflow Orchestrator..." -ForegroundColor Cyan

# 0) Node/npm
try { $nodeVer = node -v; $npmVer = npm -v; Write-Host "✔ Node $nodeVer, npm $npmVer" }
catch { Write-Error "Node.js is not installed or not on PATH. Install Node LTS and rerun."; exit 1 }

# 1) .env.local
$envPath = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envPath)) {
  $keyValue = if ($ApiKey) { $ApiKey } else { "PASTE_YOUR_KEY_HERE" }
  @"
VITE_GEMINI_API_KEY=$keyValue
VITE_GEMINI_API_VERSION=$ApiVersion
VITE_GEMINI_MODEL=$Model
"@ | Set-Content -Path $envPath -Encoding UTF8
  Write-Host "✔ Wrote .env.local"
} else {
  Write-Host "ℹ .env.local exists; leaving as-is."
}

# 2) Validate key & model (if provided)
if ($ApiKey) {
  try {
    $listUri = "https://generativelanguage.googleapis.com/$ApiVersion/models?key=$ApiKey"
    $resp = Invoke-RestMethod -Method Get -Uri $listUri
    $names = @($resp.models | ForEach-Object { ($_?.name ?? '') -replace '^models/','' }) | Where-Object { $_ }
    if ($names.Count -gt 0) {
      Write-Host "✔ Models available to this key:" -ForegroundColor Green
      $names | ForEach-Object { Write-Host "   - $_" }
      if ($names -notcontains $Model) {
        $prefer = @("gemini-2.5-flash","gemini-2.5-pro","gemini-2.0-flash","gemini-2.0-flash-lite")
        $picked = ($prefer | Where-Object { $names -contains $_ })[0]
        if (-not $picked) { $picked = $names[0] }
        if ($picked -and $picked -ne $Model) {
          Write-Warning "Requested model '$Model' not found. Updating to '$picked'."
          (Get-Content $envPath) -replace 'VITE_GEMINI_MODEL=.*', "VITE_GEMINI_MODEL=$picked" | Set-Content $envPath -Encoding UTF8
          $Model = $picked
        }
      }
    } else {
      Write-Warning "Key validated, but no models returned. Ensure the Generative Language API is enabled."
    }
  } catch {
    Write-Warning "Model validation failed (continuing): $($_.Exception.Message)"
  }
} else {
  Write-Warning "No -ApiKey provided. Update .env.local before running the app."
}

# 3) npm install
Write-Host "📦 Installing npm dependencies..."
npm i | Out-Null

# 4) Show env
Write-Host "`nCurrent env:"
(Get-Content $envPath) | ForEach-Object { Write-Host "  $_" }

# 5) Start dev (reuse running server if present)
$devRunning = $false
try {
  $tcp = New-Object Net.Sockets.TcpClient
  $tcp.Connect('127.0.0.1', $Port)
  if ($tcp.Connected) { $devRunning = $true }
  $tcp.Close()
} catch {}

if ($devRunning) {
  Write-Host "ℹ Dev server already running on http://localhost:$Port"
} else {
  Write-Host "▶ Starting dev server on http://localhost:$Port ..."
  Start-Process -FilePath "npm" -ArgumentList "run","dev" -NoNewWindow
  Start-Sleep -Seconds 2
}

if (-not $NoBrowser) {
  Start-Process "http://localhost:$Port"
}
