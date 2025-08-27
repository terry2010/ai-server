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

# Prefer using compose down
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

# Manual container cleanup (fallback)
$containers = @('ai-ragflow', 'ai-ragflow-mysql-init')
foreach ($container in $containers) {
  Remove-ContainerIfExists $container | Out-Null
}

# Clean up possible related data volumes (use with caution)
Write-Host ""
Write-Host "=== Checking for RagFlow-specific volumes ===" -ForegroundColor Cyan

# Check for RagFlow-specific volumes
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

# Note: Do not clean shared infrastructure volumes (like ai-server-mysql-data)
Write-Host ""
Write-Host "Note: Shared infrastructure volumes (mysql, redis, etc.) are preserved" -ForegroundColor Green
Write-Host "Use reset-first-run.ps1 to clean all infrastructure if needed" -ForegroundColor Gray

Write-Host ""
Write-Host '✓ RagFlow cleanup completed' -ForegroundColor Green
exit 0