param()

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$manifestPath = Join-Path $projectRoot "manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
if (-not $version) {
  throw "manifest.json does not contain a version"
}

$include = @("manifest.json", "icons", "src", "popup", "options", "editor", "vendor")
foreach ($relativePath in $include) {
  $path = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing required release path: $relativePath"
  }
}

$distDir = Join-Path $projectRoot "dist"
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
$outputPath = Join-Path $distDir "gitmark-v$version.zip"
if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

Push-Location $projectRoot
try {
  Compress-Archive -Path $include -DestinationPath $outputPath -CompressionLevel Optimal
} finally {
  Pop-Location
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($outputPath)
try {
  $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })
  if ($entries -notcontains "manifest.json") {
    throw "Invalid package: manifest.json is not at the archive root"
  }
  if ($entries | Where-Object { $_ -like "images/*" -or $_ -like "tests/*" }) {
    throw "Invalid package: store assets or tests were included"
  }
} finally {
  $archive.Dispose()
}

$size = (Get-Item -LiteralPath $outputPath).Length
Write-Output "Built $outputPath ($size bytes)"
