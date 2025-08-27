param(
  [string]$BindAddress = '127.0.0.1',
  [int]$HostPort = 18600
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() { 
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 } 
}

function Test-HttpOk($url) {
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -Method GET -ErrorAction SilentlyContinue
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $true }
  } catch {}
  return $false
}

function Get-ContainerStatus($containerName) {
  try { 
    return (docker inspect -f "{{.State.Status}}" $containerName 2>$null)
  } catch { 
    return 'not_found' 
  }
}

function Get-ContainerPorts($containerName) {
  try {
    return (docker ps --filter "name=^/$containerName$" --format '{{.Ports}}' 2>$null)
  } catch {
    return '-'
  }
}

Test-DockerInstalled

Write-Host "=== RagFlow Status ===" -ForegroundColor Cyan

# 检查 compose 文件状态
$composePath = Join-Path $PSScriptRoot '..\\..\\..\\orchestration\\modules\\ragflow\\docker-compose.feature.yml' | Resolve-Path -ErrorAction SilentlyContinue
if ($composePath -and (Test-Path $composePath)) {
  Write-Host '[ragflow] status via docker compose'
  docker compose -f $composePath ps
  Write-Host ""
} else {
  Write-Warning "Compose file not found, checking containers directly"
}

# 检查主要容器状态
$containers = @('ai-ragflow', 'ai-ragflow-mysql-init')
foreach ($container in $containers) {
  $status = Get-ContainerStatus $container
  $ports = Get-ContainerPorts $container
  
  $color = switch ($status) {
    'running' { 'Green' }
    'exited' { 'Yellow' }
    'not_found' { 'Red' }
    default { 'Gray' }
  }
  
  Write-Host ("[ragflow] {0}: {1}" -f $container, $status) -ForegroundColor $color
  if ($ports -and $ports -ne '-') {
    Write-Host ("         ports: {0}" -f $ports) -ForegroundColor Gray
  }
}

Write-Host ""

# 检查网络连接
$networkExists = (docker network ls --format '{{.Name}}' | Where-Object { $_ -eq 'ai-server-net' })
if ($networkExists) {
  Write-Host "[ragflow] network: ai-server-net exists" -ForegroundColor Green
} else {
  Write-Host "[ragflow] network: ai-server-net missing" -ForegroundColor Red
}

# HTTP 健康检查
$healthUrl = "http://${BindAddress}:${HostPort}/"
$httpOk = Test-HttpOk $healthUrl
$httpStatus = if ($httpOk) { 'OK' } else { 'FAIL' }
$httpColor = if ($httpOk) { 'Green' } else { 'Red' }

Write-Host ("[ragflow] http check {0}: {1}" -f $healthUrl, $httpStatus) -ForegroundColor $httpColor

# 检查依赖服务状态
Write-Host ""
Write-Host "=== Dependencies Status ===" -ForegroundColor Cyan
$dependencies = @('ai-mysql', 'ai-redis', 'ai-minio', 'ai-elasticsearch')
foreach ($dep in $dependencies) {
  $depStatus = Get-ContainerStatus $dep
  $depColor = if ($depStatus -eq 'running') { 'Green' } else { 'Yellow' }
  Write-Host ("[ragflow] dependency {0}: {1}" -f $dep, $depStatus) -ForegroundColor $depColor
}

# 最终状态总结
Write-Host ""
if ($httpOk) {
  Write-Host "✓ RagFlow is ready and accessible" -ForegroundColor Green
  Write-Host "  Access URL: $healthUrl" -ForegroundColor Cyan
} else {
  Write-Host "✗ RagFlow is not responding" -ForegroundColor Red
  Write-Host "  Check logs: docker logs ai-ragflow" -ForegroundColor Yellow
}

exit 0