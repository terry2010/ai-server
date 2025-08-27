param(
  [string]$BindAddress = '127.0.0.1',
  [int]$HostPort = 18090,
  [int]$ApiPort = 18091,
  [string]$DbHost = '127.0.0.1',
  [int]$DbPort = 13306,
  [string]$DbUser = 'root',
  [string]$DbPass = 'root',
  [string]$DbName = 'dify',
  [string]$RedisHost = '127.0.0.1',
  [int]$RedisPort = 16379,
  [switch]$EnableMigration
)
$ErrorActionPreference = 'Stop'

function Test-DockerInstalled() {
  try { docker --version | Out-Null } catch { Write-Error 'Docker not detected. Please install Docker Desktop.'; exit 2 }
}
function New-DockerNetworkIfMissing($name) {
  $exists = (docker network ls --format '{{.Name}}' | Where-Object { $_ -eq $name })
  if (-not $exists) { docker network create $name | Out-Null }
}

function Wait-Http($url, $retries = 30, $sleepMs = 2000) {
  for ($i=0; $i -lt $retries; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -Method GET -ErrorAction SilentlyContinue
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $true }
    } catch {}
    Start-Sleep -Milliseconds $sleepMs
  }
  return $false
}

Test-DockerInstalled
New-DockerNetworkIfMissing 'ai-server-net'

# Calculate compose path (relative to repo root), compatible with empty $PSScriptRoot
$ThisScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$composeRel = '..\\..\\..\\orchestration\\modules\\dify\\docker-compose.feature.yml'
$composePath = Join-Path -Path $ThisScriptRoot -ChildPath $composeRel
if (-not (Test-Path $composePath)) { Write-Error "E_TEMPLATE_MISSING: compose not found at $composePath"; exit 4 }
try { $composePath = (Resolve-Path $composePath).Path } catch {}

# Set environment variables for compose to parse
$env:BIND_ADDRESS = $BindAddress
$env:DIFY_WEB_PORT = [string]$HostPort
$env:DIFY_API_PORT = [string]$ApiPort

# Compatible with old parameters (if still connecting to external services via local ports)
$env:DIFY_DB_HOST = $DbHost
$env:DIFY_DB_PORT = [string]$DbPort
$env:DIFY_DB_USER = $DbUser
$env:DIFY_DB_PASS = $DbPass
$env:DIFY_DB_NAME = $DbName
$env:DIFY_REDIS_HOST = $RedisHost
$env:DIFY_REDIS_PORT = [string]$RedisPort

# Enable API-side database migration (enabled by default)
if ($EnableMigration -or $true) {
  if (-not $env:DIFY_SECRET_KEY) { $env:DIFY_SECRET_KEY = 'please-change-me' }
  $env:MIGRATION_ENABLED = 'true'
  Write-Host '[dify] MIGRATION_ENABLED=true (Alembic will automatically migrate when api starts)'
}

# Idempotent startup (no recreation)
Write-Host '[dify] starting via docker compose (api/web/plugin-daemon/qdrant)'
docker compose -f $composePath up -d --no-recreate qdrant dify-api dify-web dify-plugin-daemon
if ($LASTEXITCODE -ne 0) { Write-Error 'E_RUNTIME: docker compose up failed'; exit 5 }

$healthUrl = "http://${BindAddress}:${HostPort}/"
Write-Host "[dify] waiting for http: $healthUrl ..."
if (-not (Wait-Http $healthUrl 30 2000)) {
  Write-Error 'E_HEALTH_TIMEOUT: Dify Web did not become ready within expected time.'
  exit 3
}
Write-Host '[dify] ready'
exit 0
