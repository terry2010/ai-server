$ErrorActionPreference = 'Stop'

$module = Join-Path $PSScriptRoot '..' 'module.ps1'

Write-Host '=== Redis: start ==='
& $module -Name redis -Action start
if ($LASTEXITCODE -ne 0) { throw "redis start failed: $LASTEXITCODE" }

Write-Host '=== Redis: probe ==='
$ok = $false
try {
  $probe = Test-NetConnection -ComputerName '127.0.0.1' -Port 16379 -WarningAction SilentlyContinue
  $ok = $probe.TcpTestSucceeded
} catch {}
if (-not $ok) { throw 'redis port 16379 not ready' }
Write-Host 'probe ok.'

Write-Host '=== Redis: stop ==='
& $module -Name redis -Action stop
if ($LASTEXITCODE -ne 0) { throw "redis stop failed: $LASTEXITCODE" }

Write-Host 'All OK.'
exit 0
