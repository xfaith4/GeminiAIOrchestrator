# Agentic Workflow Orchestrator

A production-sane, browser-only demo of a **multi-agent system**: a Supervisor plans, specialist agents execute, a Reviewer enforces quality, and a Synthesizer produces a final multi-file workspace. It’s built for **clarity, observability, and ease of adoption**—all without servers.

## Why this matters (exec summary)

- **Repeatable problem-solving.** Converts vague goals into structured plans and executes them step-by-step with a quality gate on each step.
- **Human-in-the-loop control.** Plans require approval. Every decision is logged. Work is reproducible.
- **Composable architecture.** Agents and steps are explicit types; it’s easy to add or remove capabilities.
- **Safe client-side prototype.** No backend to secure or deploy. The only secret is a Google AI key used in the browser.
- **Low switching cost.** Clean TypeScript, Tailwind UI, and REST calls: trivial to fork, audit, and extend.

> If you need enterprise controls later (key management, rate limiting, logging), swap the browser calls for a tiny API proxy—no UI changes required.

---

## What you get

- **Goal → Plan → Execute → Review → Synthesize** loop with state machine
- **Activity Log** (transparent, timestamped)
- **Scratchpad memory** that grows after each approved step
- **Artifacts workspace** (multiple files: .md, .json, .js/.ts, .txt, etc.)
- **Session history** (view + export JSON)
- **Resilient model selection.** If the chosen model 404s, the client lists available models and retries with a supported one.

---

## Screens at a glance

- **Top:** Goal input + “New Run”
- **Left:** Execution Plan (generate → approve → run)
- **Center:** Activity Log (User, Orchestrator, Agents, Reviewer, Synthesizer)
- **Right:** Session History
- **Bottom-right:** Scratchpad + Artifacts viewer

---

## Architecture (high level)

**React + Vite + TypeScript + Tailwind v3**  
Browser calls **Google Generative Language (Gemini) REST API** directly.

Key modules:
- `geminiService.ts` – REST client, model fallback, robust error messages  
- `App.tsx` – Orchestrator state machine  
- `components/*` – UI panels (Plan, Log, Scratchpad, Sessions, etc.)  
- `types.ts` – Strong types for Agents, PlanStep, Artifact, Session, etc.

> Security note: this demo keeps the API key in the browser (`.env.local` → `import.meta.env`). For production, put the key behind a server and forward requests; UI stays unchanged.

---

## Requirements

- Node.js **≥ 18.18** (LTS recommended)
- A Google Generative Language **API key**
- Network egress to `https://generativelanguage.googleapis.com`

---

## 2-minute setup (Windows) — recommended

Use the bootstrap to do everything for you: create `.env.local`, validate your key, pick a compatible model, install deps, and launch dev.

```powershell
# From the repo root
.ootstrap.ps1 -ApiKey "AIza...your_key..." -Model "gemini-2.5-flash"
```

What it does:
- Writes `.env.local` with:
  - `VITE_GEMINI_API_KEY`
  - `VITE_GEMINI_API_VERSION=v1`
  - `VITE_GEMINI_MODEL` (validated and auto-corrected if needed)
- Calls `ListModels` to ensure the key supports the chosen model
- `npm i` and `npm run dev`
- Prints the env it set and opens http://localhost:5173

> Don’t want validation? Omit `-ApiKey` and edit `.env.local` manually, then run `npm run dev`.

---

## Manual setup (any OS)

1) Create **`.env.local`** in project root:

```
VITE_GEMINI_API_KEY=AIza...your_key...
VITE_GEMINI_API_VERSION=v1
VITE_GEMINI_MODEL=gemini-2.5-flash
```

2) Install & run:

```bash
npm i
npm run dev
```

3) Open **http://localhost:5173**.

### Validate your key (optional)

```powershell
$k="AIza..."; $ver="v1"
(Invoke-RestMethod -Method Get -Uri "https://generativelanguage.googleapis.com/$ver/models?key=$k").models |
  Select-Object name,version,displayName | Format-Table -AutoSize
```

Pick one you actually have (e.g., `gemini-2.5-flash`, `gemini-2.5-pro`), and set `VITE_GEMINI_MODEL` accordingly.

---

## Using the app

1) **Enter a goal** (optional: attach a file for context)  
2) Click **Generate Plan** → Supervisor returns 3–6 steps  
3) **Approve & Run** → each step executes, Reviewer may request one revision  
4) **Artifacts** appear when complete; select to view  
5) Session is saved → **View** to restore, **Export** to download JSON

---

## Operations & behavior you can rely on

- **No backend dependencies.** Pure static assets + outbound HTTPS to Google.
- **Deterministic types.** All external results are normalized to strict local types.
- **Graceful failures.** REST errors are surfaced as `Gemini HTTP {status}: {body}` and logged in the Activity Log.
- **Model fallback.** If your configured model returns 404, the client lists supported models for your key and retries once with the best match.
- **No React list-key warnings.** UI uses stable, unique keys.
- **No Tailwind CDN.** Tailwind v3 via PostCSS; pure `tailwindcss` + `autoprefixer`.

---

## Configuration matrix

| Setting                    | Where        | Default            | Notes                                  |
|---------------------------|--------------|--------------------|----------------------------------------|
| `VITE_GEMINI_API_KEY`     | `.env.local` | (required)         | Browser-exposed in this demo           |
| `VITE_GEMINI_API_VERSION` | `.env.local` | `v1`               | Do not change unless you know you must |
| `VITE_GEMINI_MODEL`       | `.env.local` | `gemini-2.5-flash` | Must be supported by your key          |

---

## Security posture (for execs)

- **This demo** keeps the API key in the browser to eliminate backend deployment.  
- **Production recommendation:** proxy calls through a minimal API (reusing the same request shapes). Move the key to server-side secrets, add auth/rate limits/centralized logging. No UI changes required.

---

## Troubleshooting

- **401 / 403:** bad key or API not enabled. Enable “Generative Language API” for your project.  
- **404 Not Found:** model/version not supported for this key. Use the validation step to list supported models; update `VITE_GEMINI_MODEL`.  
- **HMR WebSocket warning:** harmless when dev server restarts or a tab is stale.  
- **“process is not defined”:** don’t use `process.env` in client code—use `import.meta.env.VITE_*`.

---

## License

MIT (or your internal license)

---

### (Optional) Bootstrap v2 (drop-in replacement)

Replace your existing `bootstrap.ps1` with this slightly harder-wearing version. It detects a running dev server, opens the browser, and returns non-zero on hard failures.

```powershell
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
```
