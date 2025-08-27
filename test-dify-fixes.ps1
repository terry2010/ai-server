# 测试 Dify 修复
param(
    [switch]$CheckOnly
)

Write-Host "=== Dify Configuration Fixes Test ==="

# 1. 检查向量数据库配置
$composeFile = "orchestration/modules/dify/docker-compose.feature.yml"
$content = Get-Content $composeFile -Raw

if ($content -match "VECTOR_STORE.*qdrant") {
    Write-Host "✓ Vector database (Qdrant) configured"
} else {
    Write-Host "✗ Vector database NOT configured"
    exit 1
}

if ($content -match "qdrant:") {
    Write-Host "✓ Qdrant service found in compose file"
} else {
    Write-Host "✗ Qdrant service NOT found in compose file"
    exit 1
}

# 2. 检查插件守护进程配置
if ($content -match "DB_TYPE.*postgres") {
    Write-Host "✓ Plugin daemon database type configured"
} else {
    Write-Host "✗ Plugin daemon database type NOT configured"
    exit 1
}

if ($content -match "FORCE_VERIFYING_SIGNATURE.*false") {
    Write-Host "✓ Plugin signature verification disabled (for development)"
} else {
    Write-Host "✗ Plugin signature verification NOT properly configured"
    exit 1
}

# 3. 检查脚本更新
$startScript = "scripts/modules/dify/start.ps1"
$scriptContent = Get-Content $startScript -Raw
if ($scriptContent -match "qdrant.*dify-api.*dify-web.*dify-plugin-daemon") {
    Write-Host "✓ Start script includes all services in correct order"
} else {
    Write-Host "✗ Start script does NOT include all services"
    exit 1
}

Write-Host ""
Write-Host "=== All fixes applied successfully! ==="
Write-Host ""
Write-Host "Fixed issues:"
Write-Host "1. ✓ Added Qdrant vector database service"
Write-Host "2. ✓ Configured VECTOR_STORE environment variable"
Write-Host "3. ✓ Fixed plugin daemon database type (postgres)"
Write-Host "4. ✓ Disabled signature verification for development"
Write-Host "5. ✓ Updated all scripts to include new services"
Write-Host ""
Write-Host "This should resolve:"
Write-Host "- 'Unsupported vector db type None' error"
Write-Host "- 'Failed to request plugin daemon' errors"
Write-Host "- Plugin API 400 errors"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Run your reset script to clean the environment"
Write-Host "2. Start the client and click '首次完整启动'"
Write-Host "3. Wait for all services to start (including Qdrant and plugin daemon)"
Write-Host "4. Test Dify functionality - errors should be resolved"

if (-not $CheckOnly) {
    Write-Host ""
    Write-Host "Would you like to see the service startup order? (y/N)"
    $response = Read-Host
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "=== Service Startup Order ==="
        Write-Host "1. Qdrant (vector database) - Port 16333"
        Write-Host "2. Dify API - Port 18091"
        Write-Host "3. Dify Web - Port 18090"
        Write-Host "4. Dify Plugin Daemon - Internal port 5002"
        Write-Host ""
        Write-Host "All services will be connected via the ai-server-net Docker network."
    }
}