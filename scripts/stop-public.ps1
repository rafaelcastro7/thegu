$ErrorActionPreference = "SilentlyContinue"

$listener = Get-NetTCPConnection -LocalPort 3055 -State Listen | Select-Object -First 1
if ($listener) {
  Stop-Process -Id $listener.OwningProcess -Force
}

Get-Process cloudflared | Stop-Process -Force

Write-Host "Servicios publicos detenidos."
