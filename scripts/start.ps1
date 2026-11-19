# Lance PostgreSQL portable, l'API et l'interface en processus détachés.
# Peut être relancé sans risque : les services déjà actifs sont ignorés.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = 'C:\Program Files\nodejs\node.exe'
$pgCtl = 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe'
$pgData = Join-Path $root '.postgres\data'
$pgLog = Join-Path $root '.postgres\logs\postgres.log'
$tsx = Join-Path $root 'node_modules\tsx\dist\cli.mjs'
$vite = Join-Path $root 'node_modules\vite\bin\vite.js'

function Start-Detached {
  param([string]$CommandLine, [string]$Name)
  $result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $CommandLine }
  if ($result.ReturnValue -ne 0) { throw "Échec du démarrage de $Name (code $($result.ReturnValue))" }
  Write-Host "🚀 $Name démarré (PID $($result.ProcessId))"
}

function Test-Port {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

if (-not (Test-Port 5433)) {
  Start-Detached "cmd.exe /c `"$pgCtl`" -D `"$pgData`" -o `"-p 5433 -h 127.0.0.1`" -l `"$pgLog`" -w start" 'PostgreSQL (5433)'
} else { Write-Host '✅ PostgreSQL déjà actif (5433)' }

if (-not (Test-Port 4000)) {
  Start-Detached "cmd.exe /c cd /d `"$root\server`" && `"$node`" `"$tsx`" watch src/index.ts" 'API StockFlow (4000)'
} else { Write-Host '✅ API déjà active (4000)' }

if (-not (Test-Port 5173)) {
  Start-Detached "cmd.exe /c cd /d `"$root\client`" && `"$node`" `"$vite`" --host 0.0.0.0" 'Interface web (5173)'
} else { Write-Host '✅ Interface déjà active (5173)' }

Start-Sleep -Seconds 3
Write-Host ''
Write-Host 'Application disponible sur http://localhost:5173'
