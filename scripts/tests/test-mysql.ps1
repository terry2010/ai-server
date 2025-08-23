$ErrorActionPreference = 'Stop'

$module = Join-Path $PSScriptRoot '..' 'module.ps1'

Write-Host '=== MySQL: start ==='
& $module -Name mysql -Action start
if ($LASTEXITCODE -ne 0) { throw "mysql start failed: $LASTEXITCODE" }

Write-Host '=== MySQL: probe ==='
$ok = $false
try {
  $probe = Test-NetConnection -ComputerName '127.0.0.1' -Port 13306 -WarningAction SilentlyContinue
  $ok = $probe.TcpTestSucceeded
} catch {}
if (-not $ok) { throw 'mysql port 13306 not ready' }
Write-Host 'probe ok.'

Write-Host '=== MySQL: stop ==='
& $module -Name mysql -Action stop
if ($LASTEXITCODE -ne 0) { throw "mysql stop failed: $LASTEXITCODE" }

Write-Host 'All OK.'
exit 0
