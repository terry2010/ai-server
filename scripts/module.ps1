param(
  [Parameter(Mandatory=$true)][string]$Name,
  [Parameter(Mandatory=$true)][ValidateSet('start','stop','status','clear')][string]$Action,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Invoke-ModuleScript {
  param([string]$ModuleName, [string]$ScriptName, [hashtable]$ScriptArgs)
  $scriptPath = Join-Path -Path $PSScriptRoot -ChildPath "modules/$ModuleName/$ScriptName.ps1"
  if (-not (Test-Path $scriptPath)) {
    Write-Error "Module script not found: $scriptPath"
    exit 2
  }
  if ($null -ne $ScriptArgs -and $ScriptArgs.Count -gt 0) { & $scriptPath @ScriptArgs } else { & $scriptPath }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

switch ($Action) {
  'start' { Invoke-ModuleScript -ModuleName $Name -ScriptName 'start' -ScriptArgs @{} }
  'stop'  { Invoke-ModuleScript -ModuleName $Name -ScriptName 'stop' -ScriptArgs @{} }
  'status'{ Invoke-ModuleScript -ModuleName $Name -ScriptName 'status' -ScriptArgs @{} }
  'clear' {
    if (-not $Force) {
      $ans = Read-Host "确认清除 $Name 的所有数据？此操作不可恢复 (y/N)"
      if ($ans -ne 'y' -and $ans -ne 'Y') { Write-Host '已取消'; exit 0 }
    }
    $clearArgs = @{}
    if ($Force) { $clearArgs.Force = $true }
    Invoke-ModuleScript -ModuleName $Name -ScriptName 'clear-data' -ScriptArgs $clearArgs
  }
}
