param(
  [switch]$Force
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() { 
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 } 
}

function Confirm-Action($message) {
  if ($Force) { return $true }
  $ans = Read-Host "$message (y/N)"
  return ($ans -eq 'y' -or $ans -eq 'Y')
}

function Remove-ContainerIfExists($containerName) {
  try {
    $exists = (docker ps -a --filter "name=^/$containerName$" --format '{{.ID}}')
    if ($exists) {
      $running = (docker ps --filter "name=^/$containerName$" --format '{{.ID}}')
      if ($running) { 
        Write-Host "[ragflow] stopping: $containerName"
        docker stop $containerName | Out-Null 
      }
      Write-Host "[ragflow] removing container: $containerName"
      docker rm $containerName | Out-Null
      return $true
    }
    return $false
  } catch {
    Write-Warning "Failed to remove container: $containerName"
    return $false
  }
}

function Remove-VolumeIfExists($volumeName) {
  try {
    $exists = (docker volume ls --format '{{.Name}}' | Where-Object { $_ -eq $volumeName })
    if ($exists) {
      Write-Host "[ragflow] removing volume: $volumeName"
      docker volume rm $volumeName | Out-Null
      return $true
    }
    return $false
  } catch {
    Write-Warning "Failed to remove volume: $volumeName (may be in use)"
    return $false
  }
}

Test-DockerInstalled

if (-not (Confirm-Action 'This will stop and remove RagFlow containers and related data. Continue?')) {
  Write-Host '[ragflow] clear aborted by user'
  exit 1
}

Write-Host "=== Cleaning RagFlow ===" -ForegroundColor Yellow

# 优先使用 compose down
$composePath = Join-Path $PSScriptRoot '..\\..\\..\\orchestration\\modules\\ragflow\\docker-compose.feature.yml' | Resolve-Path -ErrorAction SilentlyContinue
if ($composePath -and (Test-Path $composePath)) {
  Write-Host '[ragflow] docker compose down -v (ragflow + mysql-init)'
  docker compose -f $composePath down -v
  if ($LASTEXITCODE -ne 0) { 
    Write-Warning 'docker compose down failed, trying manual cleanup'
  } else {
    Write-Host '[ragflow] compose cleanup completed'
  }
} else {
  Write-Warning "Compose file not found, performing manual cleanup"
}

# 手动清理容器（兜底）
$containers = @('ai-ragflow', 'ai-ragflow-mysql-init')
foreach ($container in $containers) {
  Remove-ContainerIfExists $container | Out-Null
}

# 清理可能的相关数据卷（谨慎操作）
Write-Host ""
Write-Host "=== Checking for RagFlow-specific volumes ===" -ForegroundColor Cyan

# 检查是否有 RagFlow 专用的数据卷
$ragflowVolumes = docker volume ls --format '{{.Name}}' | Where-Object { $_ -like '*ragflow*' -or $_ -like '*rag-flow*' }
if ($ragflowVolumes) {
  Write-Host "Found potential RagFlow volumes:"
  foreach ($vol in $ragflowVolumes) {
    Write-Host "  - $vol"
  }
  
  if (Confirm-Action "Remove these RagFlow-specific volumes?") {
    foreach ($vol in $ragflowVolumes) {
      Remove-VolumeIfExists $vol
    }
  }
} else {
  Write-Host "No RagFlow-specific volumes found"
}

# 注意：不要清理共享的基础设施卷（如 ai-server-mysql-data）
Write-Host ""
Write-Host "Note: Shared infrastructure volumes (mysql, redis, etc.) are preserved" -ForegroundColor Green
Write-Host "Use reset-first-run.ps1 to clean all infrastructure if needed" -ForegroundColor Gray

Write-Host ""
Write-Host '✓ RagFlow cleanup completed' -ForegroundColor Green
exit 0