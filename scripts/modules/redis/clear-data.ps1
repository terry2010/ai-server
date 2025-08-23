param([switch]$Force)
$ErrorActionPreference = 'Stop'
if (-not $Force) {
  $ans = Read-Host "确认清除 redis 数据？此操作不可恢复 (y/N)"
  if ($ans -ne 'y' -and $ans -ne 'Y') { Write-Host '已取消'; exit 0 }
}
Write-Host '[redis] clear-data (stub)'
# TODO: docker compose down -v，删除命名卷/宿主目录
exit 0
