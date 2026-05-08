# watchdog.ps1 - Monitorea Node y lo reinicia si cae. NUNCA toca cloudflared.
param()
$PORT = 3055
$DIR  = Split-Path -Parent $MyInvocation.MyCommand.Path
$INTERVAL = 15

Write-Host "=== Watchdog activo puerto $PORT ===" -ForegroundColor Cyan
Write-Host "    Check cada $INTERVAL s. Ctrl+C para detener." -ForegroundColor Gray

function Test-Server {
  try {
    $r = Invoke-WebRequest "http://localhost:$PORT/api/health" -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
    return ($r.Content -like "*ok*")
  } catch { return $false }
}

function Restart-Node {
  Set-Location $DIR
  $nodes = Get-Process | Where-Object { $_.ProcessName -eq "node" }
  foreach ($n in $nodes) { Stop-Process -Id $n.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
  Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm start > server.log 2>&1") -WindowStyle Hidden
  Start-Sleep -Seconds 8
}

$fail = 0
while ($true) {
  if (Test-Server) {
    $fail = 0
    Write-Host ((Get-Date -Format "HH:mm:ss") + " [OK] Servidor activo") -ForegroundColor Green
  } else {
    $fail++
    Write-Host ((Get-Date -Format "HH:mm:ss") + " [!!] No responde (intento $fail)") -ForegroundColor Red
    if ($fail -ge 2) {
      Write-Host ((Get-Date -Format "HH:mm:ss") + " [>>] Reiniciando Node (cloudflared intacto)...") -ForegroundColor Yellow
      Restart-Node
      $fail = 0
      if (Test-Server) {
        Write-Host ((Get-Date -Format "HH:mm:ss") + " [OK] Servidor recuperado") -ForegroundColor Green
      } else {
        Write-Host ((Get-Date -Format "HH:mm:ss") + " [ERR] Fallo. Ver server.log") -ForegroundColor Red
      }
    }
  }
  Start-Sleep -Seconds $INTERVAL
}
