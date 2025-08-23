param()
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 }
}

Test-DockerInstalled
$container = 'ai-mysql'
$running = (docker ps --filter "name=^/$container$" --format '{{.ID}}')
if (-not $running) {
  Write-Host '[mysql] container not running'
  exit 0
}

Write-Host "[mysql] stopping container: $container"
docker stop $container | Out-Null
Write-Host '[mysql] stopped'
exit 0
