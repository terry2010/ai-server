$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() { try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 } }

Test-DockerInstalled

# Prefer using compose to stop services
$ThisScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$composeRel = '..\\..\\..\\orchestration\\modules\\dify\\docker-compose.feature.yml'
$composePath = Join-Path -Path $ThisScriptRoot -ChildPath $composeRel
try { $composePath = (Resolve-Path -ErrorAction SilentlyContinue $composePath).Path } catch {}
if ($composePath -and (Test-Path $composePath)) {
  Write-Host '[dify] stopping via docker compose (web/api/plugin-daemon/qdrant)'
  docker compose -f $composePath stop dify-web dify-api dify-plugin-daemon qdrant
  if ($LASTEXITCODE -ne 0) { Write-Error 'E_RUNTIME: docker compose stop failed'; exit 3 }

  # Fallback verification: ensure all target containers are actually stopped
  foreach ($c in @('ai-dify-web','ai-dify-api','ai-dify-plugin-daemon','ai-qdrant')) {
    $running = (docker ps --filter "name=^/$c$" --format '{{.ID}}')
    if ($running) {
      Write-Warning "[dify] compose stop did not stop $c, stopping directly..."
      docker stop $c | Out-Null
      if ($LASTEXITCODE -ne 0) { Write-Error "E_RUNTIME: failed to stop $c"; exit 3 }
    }
  }
} else {
  # Fallback: directly stop containers for compatibility
  foreach ($c in @('ai-dify-web','ai-dify-api','ai-dify-plugin-daemon','ai-qdrant')) {
    $running = (docker ps --filter "name=^/$c$" --format '{{.ID}}')
    if ($running) {
      Write-Host "[dify] stopping container: $c"
      docker stop $c | Out-Null
      if ($LASTEXITCODE -ne 0) { Write-Error "E_RUNTIME: failed to stop $c"; exit 3 }
    } else {
      Write-Host "[dify] not running: $c"
    }
  }
}
exit 0
