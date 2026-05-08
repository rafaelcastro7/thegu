$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$port = 3055
$serverLog = Join-Path $root "server-public.log"
$tunnelLog = Join-Path $root "cloudflared-public.log"
$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

if (-not (Test-Path $cloudflared)) {
  throw "cloudflared no esta instalado en la ruta esperada: $cloudflared"
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  Stop-Process -Id $listener.OwningProcess -Force
  Start-Sleep -Seconds 1
}

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

Remove-Item $serverLog -Force -ErrorAction SilentlyContinue
Remove-Item $tunnelLog -Force -ErrorAction SilentlyContinue

$serverCommand = "cd /d $root && set PORT=$port && set NODE_ENV=production && npm start >> server-public.log 2>&1"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $serverCommand -WindowStyle Hidden

Start-Sleep -Seconds 10
$health = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/api/health"
Write-Host "Servidor listo: $($health.Content)"

Start-Process -FilePath $cloudflared -ArgumentList "tunnel", "--url", "http://127.0.0.1:$port", "--no-autoupdate", "--logfile", "cloudflared-public.log" -WindowStyle Hidden

Start-Sleep -Seconds 12
$urlLine = Select-String -Path $tunnelLog -Pattern "https://.*trycloudflare.com" | Select-Object -First 1

if (-not $urlLine) {
  throw "No se pudo detectar la URL publica en $tunnelLog"
}

$publicUrl = ([regex]::Match($urlLine.Line, "https://[A-Za-z0-9.-]+\.trycloudflare\.com")).Value
Set-Content -Path (Join-Path $root "PUBLIC_URL.txt") -Value $publicUrl
Write-Host "URL publica: $publicUrl"
