param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('amparito', 'masaya')]
    [string]$Company,

    [Parameter(Mandatory = $true)]
    [string]$FirebaseKeyPath,

    [string]$InstallRoot = 'C:\csm-integrador\accounting-evidence',
    [string]$QueueDirectory = 'C:\SICAR\state\sicar-purchase-accounting',
    [int]$IntervalMinutes = 1
)

$ErrorActionPreference = 'Stop'
$profiles = @{
    amparito = @{
        CompanyId = 'carnes_amparito'
        BranchId = 'amparito'
        BranchName = 'CARNES AMPARITO'
        TaskName = 'CSM Amparito Facturas a Contabilidad'
    }
    masaya = @{
        CompanyId = 'carnes_san_martin_masaya'
        BranchId = 'san_martin_masaya'
        BranchName = 'CARNES SAN MARTIN MASAYA'
        TaskName = 'CSM Masaya Facturas a Contabilidad'
    }
}

$profile = $profiles[$Company]
$resolvedKeyPath = (Resolve-Path -LiteralPath $FirebaseKeyPath).Path
$keyProjectId = (Get-Content -LiteralPath $resolvedKeyPath -Raw | ConvertFrom-Json).project_id
if ($keyProjectId -ne 'estado-resultados-a0a81') {
    throw "La llave pertenece a '$keyProjectId'. Se requiere una llave Admin del proyecto contable estado-resultados-a0a81."
}
$sourceWorker = Join-Path $PSScriptRoot 'syncSicarPurchaseEvidence.js'
$sourceRunner = Join-Path $PSScriptRoot 'runSicarPurchaseEvidence.ps1'
if (-not (Test-Path -LiteralPath $sourceWorker) -or -not (Test-Path -LiteralPath $sourceRunner)) {
    throw 'No se encontraron los archivos del puente junto al instalador.'
}

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
New-Item -ItemType Directory -Path $QueueDirectory -Force | Out-Null
Copy-Item -LiteralPath $sourceWorker -Destination (Join-Path $InstallRoot 'syncSicarPurchaseEvidence.js') -Force
Copy-Item -LiteralPath $sourceRunner -Destination (Join-Path $InstallRoot 'runSicarPurchaseEvidence.ps1') -Force

$packageJson = @'
{
  "name": "csm-accounting-evidence-bridge",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "firebase-admin": "^12.7.0"
  }
}
'@
$packagePath = Join-Path $InstallRoot 'package.json'
[System.IO.File]::WriteAllText($packagePath, $packageJson, [System.Text.UTF8Encoding]::new($false))

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$configPath = Join-Path $InstallRoot 'bridge.env'
$configLines = @(
    'FIREBASE_PROJECT_ID=estado-resultados-a0a81'
    'FIREBASE_STORAGE_BUCKET=estado-resultados-a0a81.firebasestorage.app'
    "GOOGLE_APPLICATION_CREDENTIALS=$resolvedKeyPath"
    "CSM_ACCOUNTING_COMPANY_ID=$($profile.CompanyId)"
    "SICAR_BRANCH_ID=$($profile.BranchId)"
    "SICAR_BRANCH_NAME=$($profile.BranchName)"
    "SICAR_PURCHASE_ACCOUNTING_METADATA_DIRECTORY=$QueueDirectory"
    "NODE_EXE_PATH=$nodePath"
)
[System.IO.File]::WriteAllLines($configPath, $configLines, [System.Text.UTF8Encoding]::new($false))

$npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
Push-Location $InstallRoot
try {
    & $npmPath install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm no pudo instalar firebase-admin.' }
}
finally {
    Pop-Location
}

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $configPath /inheritance:r /grant:r "SYSTEM:(R)" "$currentUser`:(R)" | Out-Null
& icacls.exe $resolvedKeyPath /inheritance:r /grant:r "SYSTEM:(R)" "$currentUser`:(R)" | Out-Null

$runnerPath = Join-Path $InstallRoot 'runSicarPurchaseEvidence.ps1'
$safeInterval = [Math]::Max(1, [Math]::Min($IntervalMinutes, 60))
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`" -ConfigPath `"$configPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $safeInterval) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $profile.TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Adjunta fotos de compras de CSM Operaciones al sistema contable.' -Force | Out-Null

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runnerPath -ConfigPath $configPath -Preview
$previewExitCode = $LASTEXITCODE

[pscustomobject]@{
    Company = $Company
    CompanyId = $profile.CompanyId
    BranchId = $profile.BranchId
    FirebaseProject = 'estado-resultados-a0a81'
    QueueDirectory = $QueueDirectory
    TaskName = $profile.TaskName
    TaskState = (Get-ScheduledTask -TaskName $profile.TaskName).State
    PreviewExitCode = $previewExitCode
    WritesEnabled = $true
}
