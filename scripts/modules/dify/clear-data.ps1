param(
  [switch]$Force
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() { try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 } }

function Confirm-Action($message) {
  if ($Force) { return $true }
  $ans = Read-Host "$message (y/N)"
  return ($ans -eq 'y' -or $ans -eq 'Y')
}

Test-DockerInstalled

if (-not (Confirm-Action 'This will stop and remove Dify containers and related caches. Continue?')) {
  Write-Host '[dify] clear aborted by user'
  exit 1
}

# 优先使用 compose down -v
$composePath = Join-Path $PSScriptRoot '..\\..\\..\\orchestration\\modules\\dify\\docker-compose.feature.yml' | Resolve-Path -ErrorAction SilentlyContinue
if ($composePath -and (Test-Path $composePath)) {
  Write-Host '[dify] docker compose down -v (web/api)'
  docker compose -f $composePath down -v
  if ($LASTEXITCODE -ne 0) { Write-Error 'E_RUNTIME: docker compose down failed'; exit 3 }
} else {
  # 兼容旧路径：直接停止并删除容器
  foreach ($c in @('ai-dify-web','ai-dify-api')) {
    $running = (docker ps --filter "name=^/$c$" --format '{{.ID}}')
    if ($running) { Write-Host "[dify] stopping: $c"; docker stop $c | Out-Null }
    $exists = (docker ps -a --filter "name=^/$c$" --format '{{.ID}}')
    if ($exists) { Write-Host "[dify] removing container: $c"; docker rm $c | Out-Null }
  }
}

# 如有命名卷或宿主目录，可在此处追加清理（当前未声明专属卷）
Write-Host '[dify] clear done'
exit 0
