param(
  [switch]$IncludeModules,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

function Test-DockerInstalled {
  try { docker --version | Out-Null } catch { Write-Error 'Docker is not detected. Please install Docker Desktop first.'; exit 2 }
}

function Stop-ContainerByName {
  param([string]$Name)
  $cid = docker ps -a --filter "name=^/$Name$" --format '{{.ID}}'
  if ($cid) {
    $isRunning = docker ps --filter "name=^/$Name$" --format '{{.ID}}'
    if ($isRunning) { docker stop $Name | Out-Null }
    docker rm $Name | Out-Null
    Write-Host "removed container: $Name"
  }
}

function Remove-ContainersByPrefix {
  param([string]$Prefix)
  $names = docker ps -a --format '{{.Names}}' | Where-Object { $_ -like "$Prefix*" }
  foreach ($n in $names) { Stop-ContainerByName -Name $n }
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
  $ans = Read-Host "This will DELETE ai-server related containers, named volumes and network (images will NOT be removed) to simulate a first-run environment. Continue? (y/N)"
  if ($ans -ne 'y' -and $ans -ne 'Y') { Write-Host 'Canceled'; exit 0 }
}

# 1) stop and remove containers
Stop-ContainerByName -Name 'ai-mysql'
Stop-ContainerByName -Name 'ai-redis'
if ($IncludeModules) {
  Remove-ContainersByPrefix -Prefix 'ai-'
}

# 2) remove named volumes (aligned with infra compose)
$volumes = @(
  'ai-server-mysql-data',
  'ai-server-redis-data',
  'ai-server-minio-data',
  'ai-server-es-data',
  'ai-server-logs'
)
foreach ($v in $volumes) { Remove-VolumeIfExists -Name $v }

# 3) remove external network
Remove-NetworkIfExists -Name 'ai-server-net'

Write-Host 'Cleanup completed: containers/volumes/network removed. The host is now in a simulated first-run state.'
exit 0
