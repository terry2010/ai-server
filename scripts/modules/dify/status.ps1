param(
  [string]$BindAddress = '127.0.0.1',
  [int]$HostPort = 18090
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() { try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 } }

function Test-HttpOk($url) {
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -Method GET -ErrorAction SilentlyContinue
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $true }
  } catch {}
  return $false
}

Test-DockerInstalled

$composePath = Join-Path $PSScriptRoot '..\\..\\..\\orchestration\\modules\\dify\\docker-compose.feature.yml' | Resolve-Path -ErrorAction SilentlyContinue
if ($composePath -and (Test-Path $composePath)) {
  Write-Host '[dify] status via docker compose (web/api)'
  # 显示 compose 感知的容器
  docker compose -f $composePath ps
} else {
  foreach ($c in @('ai-dify-web','ai-dify-api')) {
    $state = ''
    try { $state = (docker inspect -f "{{.State.Status}}" $c) } catch { $state = 'not_found' }
    Write-Host ("[dify] {0}: {1}" -f $c, $state)
  }
}

$ports = (docker ps --filter "name=^/ai-dify-web$" --format '{{.Ports}}')
if ($ports) { Write-Host ("[dify] web ports: {0}" -f $ports) } else { Write-Host '[dify] web ports: -' }

$healthUrl = "http://${BindAddress}:${HostPort}/"
$ok = Test-HttpOk $healthUrl
Write-Host ("[dify] http check {0}: {1}" -f $healthUrl, ($ok ? 'OK' : 'FAIL'))

exit 0
