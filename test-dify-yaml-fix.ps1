# 测试 Dify YAML 修复
Write-Host "=== Testing Dify YAML Configuration ==="

$composeFile = "orchestration/modules/dify/feature-dify.compose.yml"

# 1. 检查文件存在
if (Test-Path $composeFile) {
    Write-Host "✓ Compose file exists: $composeFile"
} else {
    Write-Host "✗ Compose file not found: $composeFile"
    exit 1
}

# 2. 验证 YAML 语法
Write-Host "Validating YAML syntax..."
try {
    $result = docker compose -f $composeFile config 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ YAML syntax is valid"
    } else {
        Write-Host "✗ YAML syntax error:"
        Write-Host $result
        exit 1
    }
} catch {
    Write-Host "✗ Error validating YAML: $_"
    exit 1
}

# 3. 检查服务配置
$content = Get-Content $composeFile -Raw

$services = @("dify-api", "dify-web", "dify-plugin-daemon", "qdrant")
foreach ($service in $services) {
    if ($content -match "$service:") {
        Write-Host "✓ Service found: $service"
    } else {
        Write-Host "✗ Service missing: $service"
        exit 1
    }
}

# 4. 检查网络配置
if ($content -match "networks:\s*ai-server-net:\s*external:\s*true") {
    Write-Host "✓ Network configuration is correct"
} else {
    Write-Host "✗ Network configuration error"
    exit 1
}

# 5. 检查卷配置
$volumes = @("ai-dify-data", "ai-dify-plugin-data", "ai-qdrant-data")
foreach ($volume in $volumes) {
    if ($content -match "$volume:") {
        Write-Host "✓ Volume found: $volume"
    } else {
        Write-Host "✗ Volume missing: $volume"
        exit 1
    }
}

Write-Host ""
Write-Host "=== All YAML configuration checks passed! ==="
Write-Host ""
Write-Host "The Docker Compose file is now valid and should work correctly."
Write-Host ""
Write-Host "Services that will be started:"
Write-Host "1. qdrant (Vector database) - Port 16333"
Write-Host "2. dify-api (Backend API) - Port 18091"
Write-Host "3. dify-web (Frontend) - Port 18090"
Write-Host "4. dify-plugin-daemon (Plugin service) - Internal"
Write-Host ""
Write-Host "You can now test the complete flow:"
Write-Host "1. Run reset script"
Write-Host "2. Start client and click '首次完整启动'"
Write-Host "3. All services should start successfully"