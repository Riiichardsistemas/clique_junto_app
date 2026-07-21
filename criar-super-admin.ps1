param(
  [string]$Email = 'ricahrdfbpa@hotmail.com',
  [string]$Name = 'Richard'
)

$ErrorActionPreference = 'Stop'
$backendPath = Join-Path $PSScriptRoot 'backend'
$nodeScript = Join-Path $backendPath 'scripts\createSuperAdmin.js'

if (-not (Test-Path -LiteralPath $nodeScript)) {
  throw "Script do backend não encontrado em: $nodeScript"
}

$securePassword = Read-Host "Senha do super administrador $Email" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$hadPreviousPassword = Test-Path Env:SUPER_ADMIN_PASSWORD
$previousPassword = $env:SUPER_ADMIN_PASSWORD

try {
  $env:SUPER_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  Push-Location $backendPath
  try {
    & node $nodeScript $Email $Name
    if ($LASTEXITCODE -ne 0) {
      throw "Não foi possível criar o super administrador. Código: $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  if ($hadPreviousPassword) {
    $env:SUPER_ADMIN_PASSWORD = $previousPassword
  } else {
    Remove-Item Env:SUPER_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  }
}
