param(
  [string]$BindAddress = '127.0.0.1',
  [int]$HostPort = 18600,
  [string]$DocEngine = 'elasticsearch',
  [string]$MySQLHost = '127.0.0.1',
  [int]$MySQLPort = 13306,
  [string]$MySQLUser = 'root',
  [string]$MySQLPass = 'root',
  [string]$RedisHost = '127.0.0.1',
  [int]$RedisPort = 16379,
  [string]$MinioHost = '127.0.0.1',
  [int]$MinioPort = 19000,
  [string]$ESHost = '127.0.0.1',
  [int]$ESPort = 19200
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

function Test-ServiceHealth($serviceName, $hostAddress, $port, $protocol = 'tcp') {
  try {
    if ($protocol -eq 'http') {
      $url = "http://${hostAddress}:${port}/"
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 -Method GET -ErrorAction SilentlyContinue
      return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500)
    } else {
      $tcpClient = New-Object System.Net.Sockets.TcpClient
      $tcpClient.ConnectAsync($hostAddress, $port).Wait(3000)
      $result = $tcpClient.Connected
      $tcpClient.Close()
      return $result
    }
  } catch {
    return $false
  }
}

Test-DockerInstalled
New-DockerNetworkIfMissing 'ai-server-net'

# 计算 compose 路径
$ThisScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$composeRel = '..\\..\\..\\orchestration\\modules\\ragflow\\docker-compose.feature.yml'
$composePath = Join-Path -Path $ThisScriptRoot -ChildPath $composeRel
if (-not (Test-Path $composePath)) { Write-Error "E_TEMPLATE_MISSING: compose not found at $composePath"; exit 4 }
try { $composePath = (Resolve-Path $composePath).Path } catch {}

# 检查依赖服务健康状态
Write-Host '[ragflow] checking dependencies...'
$dependencies = @(
  @{ name = 'MySQL'; hostAddress = $MySQLHost; port = $MySQLPort },
  @{ name = 'Redis'; hostAddress = $RedisHost; port = $RedisPort },
  @{ name = 'MinIO'; hostAddress = $MinioHost; port = $MinioPort; protocol = 'http' },
  @{ name = 'Elasticsearch'; hostAddress = $ESHost; port = $ESPort; protocol = 'http' }
)

$unhealthy = @()
foreach ($dep in $dependencies) {
  $isHealthy = Test-ServiceHealth -serviceName $dep.name -hostAddress $dep.hostAddress -port $dep.port -protocol ($dep.protocol ?? 'tcp')
  if ($isHealthy) {
    Write-Host ("[ragflow] ✓ {0} ({1}:{2}) - healthy" -f $dep.name, $dep.hostAddress, $dep.port) -ForegroundColor Green
  } else {
    Write-Warning ("[ragflow] ✗ {0} ({1}:{2}) - not responding" -f $dep.name, $dep.hostAddress, $dep.port)
    $unhealthy += $dep.name
  }
}

if ($unhealthy.Count -gt 0) {
  Write-Warning "Dependencies not ready: $($unhealthy -join ', '). RagFlow may fail to start properly."
  Write-Host "Consider starting infrastructure services first (MySQL, Redis, MinIO, Elasticsearch)"
}

# 设置环境变量
$env:BIND_ADDRESS = $BindAddress
$env:RAGFLOW_PORT = [string]$HostPort
$env:DOC_ENGINE = $DocEngine

# 依赖服务连接配置
$env:MYSQL_HOST = "ai-mysql"  # 使用容器网络内的服务名
$env:MYSQL_PORT = "3306"
$env:MYSQL_USER = $MySQLUser
$env:MYSQL_PASSWORD = $MySQLPass
$env:MYSQL_DBNAME = "rag_flow"

$env:RAGFLOW_REDIS_HOST = "ai-redis"
$env:RAGFLOW_REDIS_PORT = "6379"

$env:MINIO_HOST = "ai-minio"
$env:MINIO_PORT = "9000"
$env:MINIO_USER = "rag_flow"
$env:MINIO_PASSWORD = "infini_rag_flow"

$env:ES_HOST = "ai-elasticsearch"
$env:ES_PORT = "9200"
$env:ELASTIC_PASSWORD = "infini_rag_flow"

$env:TIMEZONE = "Asia/Shanghai"

# 启动 RagFlow 服务（包括 mysql-init 和 ragflow）
Write-Host '[ragflow] starting via docker compose (mysql-init + ragflow)'
docker compose -f $composePath up -d --no-recreate mysql-init ragflow
if ($LASTEXITCODE -ne 0) { Write-Error 'E_RUNTIME: docker compose up failed'; exit 5 }

# 等待服务就绪
$healthUrl = "http://${BindAddress}:${HostPort}/"
Write-Host "[ragflow] waiting for http: $healthUrl ..."
if (-not (Wait-Http $healthUrl 60 3000)) {
  Write-Error 'E_HEALTH_TIMEOUT: RagFlow did not become ready within expected time.'
  Write-Host 'Check container logs: docker logs ai-ragflow'
  exit 3
}

Write-Host '[ragflow] ready' -ForegroundColor Green
Write-Host "Access RagFlow at: $healthUrl" -ForegroundColor Cyan
exit 0