param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start', 'stop', 'status')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $root '.postgres\data'
$log = Join-Path $root '.postgres\logs\postgres.log'
$bin = 'C:\Program Files\PostgreSQL\17\bin'

switch ($Action) {
  'start' {
    if (Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue) {
      Write-Host 'PostgreSQL portable déjà en écoute sur le port 5433.'
      return
    }
    $cmd = "`"$bin\pg_ctl.exe`" -D `"$data`" -o `"-p 5433 -h 127.0.0.1`" -l `"$log`" -w start"
    $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd }
    if ($res.ReturnValue -ne 0) { throw "Échec du démarrage (code $($res.ReturnValue))" }
    Start-Sleep -Seconds 3
    Write-Host '✅ PostgreSQL portable démarré (127.0.0.1:5433).'
  }
  'stop' {
    & "$bin\pg_ctl.exe" -D $data -m fast -w stop
    Write-Host '🛑 PostgreSQL portable arrêté.'
  }
  'status' {
    $conn = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
    if ($conn) { Write-Host "✅ Actif sur 127.0.0.1:5433 (PID $($conn.OwningProcess))" }
    else { Write-Host '❌ Arrêté' }
  }
}
