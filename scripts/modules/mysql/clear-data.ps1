param(
  [switch]$Force,
  [switch]$All,
  [switch]$Containers,
  [switch]$Volumes,
  [switch]$Networks
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error '未检测到 docker，请安装 Docker Desktop'; exit 2 }
}
function Remove-ContainerIfExists($name) {
  $cid = docker ps -a --filter "name=^/$name$" --format '{{.ID}}'
  if ($cid) {
    $running = docker ps --filter "name=^/$name$" --format '{{.ID}}'
    if ($running) { docker stop $name | Out-Null }
    docker rm $name | Out-Null
    Write-Host "[mysql] removed container: $name"
  }
}
function Remove-VolumeIfExists($name) {
  $exists = docker volume ls --format '{{.Name}}' | Where-Object { $_ -eq $name }
  if ($exists) { docker volume rm $name | Out-Null; Write-Host "[mysql] removed volume: $name" }
}
function Remove-NetworkIfExists($name) {
  $exists = docker network ls --format '{{.Name}}' | Where-Object { $_ -eq $name }
  if ($exists) { docker network rm $name | Out-Null; Write-Host "[mysql] removed network: $name" }
}

Test-DockerInstalled

if (-not $Force) {
  $ans = Read-Host "确认清理 mysql 相关资源？(容器/卷/网络，不删除镜像) (y/N)"
  if ($ans -ne 'y' -and $ans -ne 'Y') { Write-Host '已取消'; exit 0 }
}

$doAll = $All -or (-not $Containers -and -not $Volumes -and -not $Networks)
if ($doAll -or $Containers) { Remove-ContainerIfExists 'ai-mysql' }
if ($doAll -or $Volumes) { Remove-VolumeIfExists 'ai-server-mysql-data' }
if ($doAll -or $Networks) { Remove-NetworkIfExists 'ai-server-net' }

Write-Host '[mysql] 清理完成（未删除任何镜像）'
exit 0
