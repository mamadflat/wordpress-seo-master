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

# Build from normalized UTF-8 bytes so a Windows CRLF checkout produces the
# same archive contents as the LF checkout used by GitHub Actions.
Add-Type -AssemblyName System.IO.Compression
$zipStream = [System.IO.File]::Open($destination, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)
$utf8 = New-Object System.Text.UTF8Encoding($false, $true)
try {
    foreach ($name in @('readme.txt', 'seokav-connector.php')) {
        $path = Join-Path $sourceRoot $name
        $text = [System.IO.File]::ReadAllText($path, $utf8)
        $normalized = $text.Replace("`r`n", "`n").Replace("`r", "`n")
        $bytes = $utf8.GetBytes($normalized)
        $entry = $archive.CreateEntry("seokav-wordpress-connector/$name", [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        try {
            $entryStream.Write($bytes, 0, $bytes.Length)
        } finally {
            $entryStream.Dispose()
        }
    }
} finally {
    $archive.Dispose()
    $zipStream.Dispose()
}

Write-Host "Built $destination"
