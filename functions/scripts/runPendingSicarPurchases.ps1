param(
    [int]$Limit = 50
)

$defaultKeyPath = 'C:\Users\Luis Saenz\Downloads\estado-resultados-a0a81-firebase-adminsdk-fbsvc-fecf996544.json'
$serviceKeyPath = if ($env:GOOGLE_APPLICATION_CREDENTIALS) { $env:GOOGLE_APPLICATION_CREDENTIALS } else { $defaultKeyPath }

if (-not (Test-Path -LiteralPath $serviceKeyPath)) {
    throw "No se encontro la llave de servicio en $serviceKeyPath"
}

$env:GOOGLE_APPLICATION_CREDENTIALS = $serviceKeyPath
$nodePath = (Get-Command node -ErrorAction Stop).Source
$functionsRoot = Split-Path -Parent $PSScriptRoot

Push-Location $functionsRoot
try {
    & $nodePath '.\scripts\processPendingSicarPurchases.js' "--limit=$Limit"
}
finally {
    Pop-Location
}
