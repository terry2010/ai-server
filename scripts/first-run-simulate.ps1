param(
  [switch]$IncludeOneApi,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Test-DockerInstalled {
  try { docker --version | Out-Null } catch { Write-Error '未检测到 docker，请安装 Docker Desktop'; exit 2 }
}

function Remove-ContainerIfExists {
  param([string]$Name)
  $cid = docker ps -a --filter "name=^/$Name$" --format '{{.ID}}'
  if ($cid) {
    $isRunning = docker ps --filter "name=^/$Name$" --format '{{.ID}}'
    if ($isRunning) { docker stop $Name | Out-Null }
    docker rm $Name | Out-Null
    Write-Host "removed container: $Name"
  }
}

function Remove-VolumeIfExists {
  param([string]$Name)
  $exists = docker volume ls --format '{{.Name}}' | Where-Object { $_ -eq $Name }
  if ($exists) {
    docker volume rm $Name | Out-Null
    Write-Host "removed volume: $Name"
  }
}

function Remove-NetworkIfExists {
  param([string]$Name)
  $exists = docker network ls --format '{{.Name}}' | Where-Object { $_ -eq $Name }
  if ($exists) {
    docker network rm $Name | Out-Null
    Write-Host "removed network: $Name"
  }
}

Test-DockerInstalled

if (-not $Force) {
  $ans = Read-Host "此操作将删除 ai-server 相关容器、卷和网络（不会删除镜像）。是否继续？(y/N)"
  if ($ans -ne 'y' -and $ans -ne 'Y') { Write-Host '已取消'; exit 0 }
}

# 停止并删除容器（不删镜像）
Remove-ContainerIfExists -Name 'ai-mysql'
Remove-ContainerIfExists -Name 'ai-redis'
if ($IncludeOneApi) { Remove-ContainerIfExists -Name 'ai-oneapi' }

# 删除命名卷
Remove-VolumeIfExists -Name 'ai-server-mysql-data'
Remove-VolumeIfExists -Name 'ai-server-redis-data'

# 删除网络
Remove-NetworkIfExists -Name 'ai-server-net'

# 重新启动基础服务
$module = Join-Path $PSScriptRoot 'module.ps1'
Write-Host '=== Start MySQL ==='
& $module -Name mysql -Action start
if ($LASTEXITCODE -ne 0) { throw "mysql start failed: $LASTEXITCODE" }

Write-Host '=== Start Redis ==='
& $module -Name redis -Action start
if ($LASTEXITCODE -ne 0) { throw "redis start failed: $LASTEXITCODE" }

if ($IncludeOneApi) {
  Write-Host '=== Start OneAPI ==='
  & $module -Name oneapi -Action start
  if ($LASTEXITCODE -ne 0) { throw "oneapi start failed: $LASTEXITCODE" }
}

Write-Host 'First-run 状态模拟完成（未删除任何镜像）。'
exit 0
