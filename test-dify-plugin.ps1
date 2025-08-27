# 测试 Dify 插件守护进程配置
param(
    [switch]$CheckOnly
)

Write-Host "=== Dify Plugin Daemon Configuration Test ==="

# 1. 检查 docker-compose 文件
$composeFile = "orchestration/modules/dify/docker-compose.feature.yml"
if (Test-Path $composeFile) {
    Write-Host "✓ Docker compose file exists: $composeFile"
    
    # 检查是否包含插件守护进程
    $content = Get-Content $composeFile -Raw
    if ($content -match "dify-plugin-daemon") {
        Write-Host "✓ Plugin daemon service found in compose file"
    } else {
        Write-Host "✗ Plugin daemon service NOT found in compose file"
        exit 1
    }
    
    # 检查环境变量
    if ($content -match "PLUGIN_DAEMON_URL") {
        Write-Host "✓ PLUGIN_DAEMON_URL environment variable configured"
    } else {
        Write-Host "✗ PLUGIN_DAEMON_URL environment variable NOT configured"
        exit 1
    }
} else {
    Write-Host "✗ Docker compose file not found: $composeFile"
    exit 1
}

# 2. 检查注册表配置
$registryFile = "src/main/config/registry/dify.json"
if (Test-Path $registryFile) {
    Write-Host "✓ Registry file exists: $registryFile"
    
    $registryContent = Get-Content $registryFile -Raw
    if ($registryContent -match "DIFY_PLUGIN_INNER_API_KEY") {
        Write-Host "✓ Plugin API key configured in registry"
    } else {
        Write-Host "✗ Plugin API key NOT configured in registry"
        exit 1
    }
} else {
    Write-Host "✗ Registry file not found: $registryFile"
    exit 1
}

# 3. 检查脚本更新
$startScript = "scripts/modules/dify/start.ps1"
if (Test-Path $startScript) {
    $scriptContent = Get-Content $startScript -Raw
    if ($scriptContent -match "dify-plugin-daemon") {
        Write-Host "✓ Start script includes plugin daemon"
    } else {
        Write-Host "✗ Start script does NOT include plugin daemon"
        exit 1
    }
} else {
    Write-Host "✗ Start script not found: $startScript"
    exit 1
}

Write-Host ""
Write-Host "=== All checks passed! ==="
Write-Host "The Dify plugin daemon configuration has been successfully updated."
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Run your reset script to clean the environment"
Write-Host "2. Start the client and click '首次完整启动'"
Write-Host "3. The plugin daemon should now be available and prevent the toast errors"

if (-not $CheckOnly) {
    Write-Host ""
    Write-Host "Would you like to see the plugin daemon service configuration? (y/N)"
    $response = Read-Host
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "=== Plugin Daemon Service Configuration ==="
        $lines = Get-Content $composeFile
        $inPluginSection = $false
        foreach ($line in $lines) {
            if ($line -match "dify-plugin-daemon:") {
                $inPluginSection = $true
            } elseif ($line -match "^\s*\w+:" -and $inPluginSection) {
                $inPluginSection = $false
            }
            
            if ($inPluginSection) {
                Write-Host $line
            }
        }
    }
}