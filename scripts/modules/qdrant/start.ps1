param(
  [string]$BindAddress = '127.0.0.1',
  [int]$HostPort = 16333
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 }
}
function New-DockerNetworkIfMissing($name) {
  $exists = (docker network ls --format '{{.Name}}' | Where-Object { $_ -eq $name })
  if (-not $exists) { docker network create $name | Out-Null }
}
function New-DockerVolumeIfMissing($name) {
  $exists = (docker volume ls --format '{{.Name}}' | Where-Object { $_ -eq $name })
  if (-not $exists) { docker volume create $name | Out-Null }
}
function Wait-Http($url, $retries = 30, $sleepMs = 2000) {
  for ($i=0; $i -lt $retries; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -Method GET -ErrorAction SilentlyContinue
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $true }
    } catch {}
    Start-Sleep -Milliseconds $sleepMs
  }
  return $false
}

Test-DockerInstalled
New-DockerNetworkIfMissing 'ai-server-net'
New-DockerVolumeIfMissing 'ai-server-qdrant-data'

$container = 'ai-qdrant'
$running = (docker ps --filter "name=^/$container$" --format '{{.ID}}')
if ($running) {
  Write-Host "[qdrant] already running: $container"
  exit 0
}

$exists = (docker ps -a --filter "name=^/$container$" --format '{{.ID}}')
if ($exists) {
  Write-Host "[qdrant] start existing container: $container"
  docker start $container | Out-Null
} else {
  Write-Host "[qdrant] create and start container: $container"
  docker run -d `
    --name $container `
    --network ai-server-net `
    -p "${BindAddress}:${HostPort}:6333" `
    -v ai-server-qdrant-data:/qdrant/storage `
    -e "QDRANT__SERVICE__HTTP_PORT=6333" `
    -e "QDRANT__SERVICE__GRPC_PORT=6334" `
    qdrant/qdrant:v1.7.4 | Out-Null
}

Write-Host "[qdrant] waiting for http ${BindAddress}:$HostPort ..."
$healthUrl = "http://${BindAddress}:${HostPort}/health"
if (-not (Wait-Http $healthUrl 40 2000)) {
  Write-Error 'E_HEALTH_TIMEOUT: Qdrant did not become ready within expected time.'
  exit 3
}
Write-Host '[qdrant] ready'
exit 0
