param(
    [string]$ConfigPath = 'C:\csm-integrador\accounting-evidence\bridge.env',
    [int]$Limit = 30,
    [switch]$Preview,
    [switch]$Force
)

function Import-EnvFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "No se encontro la configuracion local en $Path"
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        $separator = $line.IndexOf('=')
        if ($separator -lt 1) { return }
        $key = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1).Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

Import-EnvFile -Path $ConfigPath
$env:CSM_ACCOUNTING_EVIDENCE_ENV = $ConfigPath

if (-not $env:GOOGLE_APPLICATION_CREDENTIALS -or -not (Test-Path -LiteralPath $env:GOOGLE_APPLICATION_CREDENTIALS)) {
    throw 'No se encontro la credencial Firebase contable configurada en GOOGLE_APPLICATION_CREDENTIALS.'
}

$nodePath = if ($env:NODE_EXE_PATH) {
    $env:NODE_EXE_PATH
} else {
    (Get-Command node -ErrorAction Stop).Source
}
$scriptPath = Join-Path $PSScriptRoot 'syncSicarPurchaseEvidence.js'
$arguments = @($scriptPath, "--limit=$([Math]::Max(1, [Math]::Min($Limit, 100)))")
if ($Preview) { $arguments += '--preview' }
if ($Force) { $arguments += '--force' }

& $nodePath @arguments
exit $LASTEXITCODE
