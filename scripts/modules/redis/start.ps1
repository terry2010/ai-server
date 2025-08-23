param(
  [string]$BindAddress = '127.0.0.1',
  [int]$HostPort = 16379
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error '未检测到 docker，请安装 Docker Desktop'; exit 2 }
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
New-DockerVolumeIfMissing 'ai-server-redis-data'

$container = 'ai-redis'
$running = (docker ps --filter "name=^/$container$" --format '{{.ID}}')
if ($running) {
  Write-Host "[redis] 已在运行: $container"
  exit 0
}

$exists = (docker ps -a --filter "name=^/$container$" --format '{{.ID}}')
if ($exists) {
  Write-Host "[redis] 启动已存在的容器: $container"
  docker start $container | Out-Null
} else {
  Write-Host "[redis] 创建并启动容器: $container"
  docker run -d `
    --name $container `
    --network ai-server-net `
    -p "${BindAddress}:${HostPort}:6379" `
    -v ai-server-redis-data:/data `
    redis:7.4.1 `
    --save 60 1 --loglevel warning | Out-Null
}

Write-Host "[redis] 等待端口 ${BindAddress}:$HostPort 就绪..."
if (-not (Wait-Port $BindAddress $HostPort 40 2000)) {
  Write-Error 'E_HEALTH_TIMEOUT: Redis 未在预期时间内就绪'
  exit 3
}
Write-Host '[redis] 就绪'
exit 0
