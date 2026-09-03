$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $repoRoot 'wordpress-plugin\seokav-wordpress-connector'
$destination = Join-Path $repoRoot 'seokav-connector.zip'

if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
    throw "Connector source directory was not found: $sourceRoot"
}

if (Test-Path -LiteralPath $destination) {
    Remove-Item -LiteralPath $destination -Force
}

Compress-Archive -LiteralPath $sourceRoot -DestinationPath $destination -CompressionLevel Optimal
Write-Host "Built $destination"
