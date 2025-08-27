$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() { 
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 } 
}

Test-DockerInstalled

# 优先使用 compose 停止服务
$ThisScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$composeRel = '..\\..\\..\\orchestration\\modules\\ragflow\\docker-compose.feature.yml'
$composePath = Join-Path -Path $ThisScriptRoot -ChildPath $composeRel
try { $composePath = (Resolve-Path -ErrorAction SilentlyContinue $composePath).Path } catch {}

if ($composePath -and (Test-Path $composePath)) {
  Write-Host '[ragflow] stopping via docker compose (ragflow + mysql-init)'
  docker compose -f $composePath stop ragflow mysql-init
  if ($LASTEXITCODE -ne 0) { Write-Error 'E_RUNTIME: docker compose stop failed'; exit 3 }
} else {
  # 兼容旧路径：直接停止容器
  foreach ($c in @('ai-ragflow','ai-ragflow-mysql-init')) {
    $running = (docker ps --filter "name=^/$c$" --format '{{.ID}}')
    if ($running) {
      Write-Host "[ragflow] stopping container: $c"
      docker stop $c | Out-Null
      if ($LASTEXITCODE -ne 0) { Write-Error "E_RUNTIME: failed to stop $c"; exit 3 }
    } else {
      Write-Host "[ragflow] not running: $c"
    }
  }
}

Write-Host '[ragflow] stopped' -ForegroundColor Yellow
exit 0