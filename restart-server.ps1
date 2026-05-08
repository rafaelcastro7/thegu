# restart-server.ps1 - Reinicia SOLO Node, nunca cloudflared
param()
$ErrorActionPreference = "Continue"

Write-Host "=== Reinicio seguro del servidor ===" -ForegroundColor Cyan

$cf = Get-Process | Where-Object { $_.Path -like "*cloudflared*" -or $_.ProcessName -like "*cloudflared*" }
if (-not $cf) {
  Write-Host "[AVISO] cloudflared no esta corriendo. La URL del tunel se perdera." -ForegroundColor Yellow
  exit 1
}
Write-Host ("[OK] cloudflared activo PID " + $cf.Id + " - URL preservada") -ForegroundColor Green

$nodes = Get-Process | Where-Object { $_.ProcessName -eq "node" }
if ($nodes) {
  foreach ($n in $nodes) { Stop-Process -Id $n.Id -Force -ErrorAction SilentlyContinue }
  $cnt = @($nodes).Count
  Write-Host ("[OK] Node detenido (" + $cnt + " proceso(s))") -ForegroundColor Green
  Start-Sleep -Seconds 2
}

Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm start > server.log 2>&1") -WindowStyle Hidden
Start-Sleep -Seconds 8

try {
  $r = Invoke-WebRequest "http://localhost:3055/api/health" -UseBasicParsing -TimeoutSec 5
  if ($r.Content -like "*ok*") {
    Write-Host "[OK] Servidor activo en http://localhost:3055" -ForegroundColor Green
    Write-Host "[OK] Tunel sigue en pie - URL inalterada" -ForegroundColor Green
  }
} catch {
  Write-Host "[ERROR] El servidor no respondio. Revisa server.log" -ForegroundColor Red
}

Get-Content (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "server.log") | Select-Object -Last 3
