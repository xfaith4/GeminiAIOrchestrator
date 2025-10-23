$k = $env:GEMINI_API_KEY     # or $env:GEMINI_API_KEY
$ver = "v1"          # try v1 first
(Invoke-RestMethod -Method Get -Uri "https://generativelanguage.googleapis.com/$ver/models?key=$k").models `
| Select-Object name, version, displayName `
| Format-Table -AutoSize
