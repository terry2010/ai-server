param()
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error '未检测到 docker，请安装 Docker Desktop'; exit 2 }
}

Test-DockerInstalled
$container = 'ai-mysql'
$running = (docker ps --filter "name=^/$container$" --format '{{.ID}}')
if (-not $running) {
  Write-Host '[mysql] 容器未运行'
  exit 0
}

Write-Host "[mysql] 停止容器: $container"
docker stop $container | Out-Null
Write-Host '[mysql] 已停止'
exit 0
