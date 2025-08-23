param(
  [switch]$Force,
  [switch]$All,
  [switch]$Containers,
  [switch]$Volumes,
  [switch]$Networks
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 }
}
function Remove-ContainerIfExists($name) {
  $cid = docker ps -a --filter "name=^/$name$" --format '{{.ID}}'
  if ($cid) {
    $running = docker ps --filter "name=^/$name$" --format '{{.ID}}'
    if ($running) { docker stop $name | Out-Null }
    docker rm $name | Out-Null
    Write-Host "[redis] removed container: $name"
  }
}
function Remove-VolumeIfExists($name) {
  $exists = docker volume ls --format '{{.Name}}' | Where-Object { $_ -eq $name }
  if ($exists) { docker volume rm $name | Out-Null; Write-Host "[redis] removed volume: $name" }
}
function Remove-NetworkIfExists($name) {
  $exists = docker network ls --format '{{.Name}}' | Where-Object { $_ -eq $name }
  if ($exists) {
    # check if network is still in use by containers other than ai-redis
    $raw = docker network inspect $name --format '{{json .Containers}}'
    $inUseByOthers = $false
    if ($raw -and $raw -ne 'null') {
      try {
        $obj = $raw | ConvertFrom-Json
        $values = @($obj.PSObject.Properties.Value)
        if ($values.Count -gt 0) {
          $names = $values | ForEach-Object { $_.Name }
          $others = $names | Where-Object { $_ -ne 'ai-redis' }
          if ($others -and $others.Count -gt 0) { $inUseByOthers = $true }
        }
      } catch {}
    }
    if ($inUseByOthers) {
      Write-Host "[redis] network in use by other containers, skip: $name"
    } else {
      docker network rm $name | Out-Null
      Write-Host "[redis] removed network: $name"
    }
  }
}

Test-DockerInstalled

if (-not $Force) {
  $ans = Read-Host "Confirm to clear Redis resources? (containers/volumes/networks, images will NOT be removed) (y/N)"
  if ($ans -ne 'y' -and $ans -ne 'Y') { Write-Host 'Canceled'; exit 0 }
}

$doAll = $All -or (-not $Containers -and -not $Volumes -and -not $Networks)
if ($doAll -or $Containers) { Remove-ContainerIfExists 'ai-redis' }
if ($doAll -or $Volumes) { Remove-VolumeIfExists 'ai-server-redis-data' }
if ($doAll -or $Networks) { Remove-NetworkIfExists 'ai-server-net' }

Write-Host '[redis] cleanup done (no images were removed)'
exit 0
