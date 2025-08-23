param(
  [string]$BindAddress = '127.0.0.1',
  [int]$HostPort = 13306,
  [string]$RootPassword = 'root'
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
function Wait-Port($addr, $port, $retries = 30, $sleepMs = 2000) {
  for ($i=0; $i -lt $retries; $i++) {
    try {
      $ok = Test-NetConnection -ComputerName $addr -Port $port -WarningAction SilentlyContinue
      if ($ok.TcpTestSucceeded) { return $true }
    } catch {}
    Start-Sleep -Milliseconds $sleepMs
  }
  return $false
}

Test-DockerInstalled
New-DockerNetworkIfMissing 'ai-server-net'
New-DockerVolumeIfMissing 'ai-server-mysql-data'

$container = 'ai-mysql'
$running = (docker ps --filter "name=^/$container$" --format '{{.ID}}')
if ($running) {
  Write-Host "[mysql] already running: $container"
  exit 0
}

$exists = (docker ps -a --filter "name=^/$container$" --format '{{.ID}}')
if ($exists) {
  Write-Host "[mysql] start existing container: $container"
  docker start $container | Out-Null
} else {
  Write-Host "[mysql] create and start container: $container"
  docker run -d `
    --name $container `
    --network ai-server-net `
    -p "${BindAddress}:${HostPort}:3306" `
    -e "MYSQL_ROOT_PASSWORD=$RootPassword" `
    -v ai-server-mysql-data:/var/lib/mysql `
    mysql:8.4.6 | Out-Null
}

Write-Host "[mysql] waiting for port ${BindAddress}:$HostPort ..."
if (-not (Wait-Port $BindAddress $HostPort 40 2000)) {
  Write-Error 'E_HEALTH_TIMEOUT: MySQL did not become ready within expected time.'
  exit 3
}
Write-Host '[mysql] ready'
exit 0
