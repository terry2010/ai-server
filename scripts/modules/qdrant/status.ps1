param(
  [string]$BindAddress = '127.0.0.1',
  [int]$HostPort = 16333
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 }
}

Test-DockerInstalled

$container = 'ai-qdrant'
$running = (docker ps --filter "name=^/$container$" --format '{{.ID}}')
$exists = (docker ps -a --filter "name=^/$container$" --format '{{.ID}}')

if ($running) {
  Write-Host "[qdrant] Container Status: Running" -ForegroundColor Green
  
  # Display port information
  $ports = docker port $container 2>$null
  if ($ports) {
    Write-Host "[qdrant] Port Mappings:"
    $ports | ForEach-Object { Write-Host "  $_" }
  }
  
  # Check HTTP health status
  try {
    $healthUrl = "http://${BindAddress}:${HostPort}/health"
    $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -Method GET -ErrorAction SilentlyContinue
    if ($resp.StatusCode -eq 200) {
      Write-Host "[qdrant] HTTP Health: OK" -ForegroundColor Green
    } else {
      Write-Host "[qdrant] HTTP Health: Unhealthy (Status: $($resp.StatusCode))" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "[qdrant] HTTP Health: Unreachable" -ForegroundColor Red
  }
  
} elseif ($exists) {
  Write-Host "[qdrant] Container Status: Stopped" -ForegroundColor Yellow
} else {
  Write-Host "[qdrant] Container Status: Not Found" -ForegroundColor Red
}

exit 0
