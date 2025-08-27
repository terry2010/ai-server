$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 }
}

Test-DockerInstalled

$container = 'ai-qdrant'
$running = (docker ps --filter "name=^/$container$" --format '{{.ID}}')
if ($running) {
  Write-Host "[qdrant] stopping container: $container"
  docker stop $container | Out-Null
  Write-Host "[qdrant] stopped"
} else {
  Write-Host "[qdrant] container not running: $container"
}
exit 0
