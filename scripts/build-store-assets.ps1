param()

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $projectRoot "images"
$outputDir = Join-Path $sourceDir "store"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function New-Canvas([int]$width, [int]$height, [string]$color) {
  $bitmap = New-Object System.Drawing.Bitmap($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($color))
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Canvas($canvas, [string]$path) {
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

function Draw-ContainedImage($graphics, $image, [int]$x, [int]$y, [int]$width, [int]$height) {
  $scale = [Math]::Min($width / $image.Width, $height / $image.Height)
  $drawWidth = [int][Math]::Round($image.Width * $scale)
  $drawHeight = [int][Math]::Round($image.Height * $scale)
  $drawX = $x + [int](($width - $drawWidth) / 2)
  $drawY = $y + [int](($height - $drawHeight) / 2)
  $graphics.DrawImage($image, $drawX, $drawY, $drawWidth, $drawHeight)
}

$popupSource = [System.Drawing.Image]::FromFile((Join-Path $sourceDir "cover.png"))
$editorSource = [System.Drawing.Image]::FromFile((Join-Path $sourceDir "editor.png"))
$iconSource = [System.Drawing.Image]::FromFile((Join-Path $projectRoot "icons\icon128.png"))

try {
  $white = [System.Drawing.Brushes]::White
  $muted = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#8B949E"))
  $green = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#3FB950"))
  $darkText = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#24292F"))
  $lightMuted = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#57606A"))
  $borderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#D0D7DE"), 2)
  $titleFont = New-Object System.Drawing.Font("Segoe UI", 46, [System.Drawing.FontStyle]::Bold)
  $subtitleFont = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Regular)
  $editorTitleFont = New-Object System.Drawing.Font("Segoe UI", 32, [System.Drawing.FontStyle]::Bold)
  $editorSubtitleFont = New-Object System.Drawing.Font("Segoe UI", 17, [System.Drawing.FontStyle]::Regular)
  $promoTitleFont = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
  $promoSubtitleFont = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Regular)

  $popup = New-Canvas 1280 800 "#0D1117"
  $popup.Graphics.DrawString("GitMark", $titleFont, $white, 76, 205)
  $popup.Graphics.DrawString("Edit Markdown on GitHub", $subtitleFont, $green, 80, 280)
  $popup.Graphics.DrawString("Create or update files with live preview`nand atomic commits.", $subtitleFont, $muted, 80, 340)
  Draw-ContainedImage $popup.Graphics $popupSource 720 55 500 690
  Save-Canvas $popup (Join-Path $outputDir "01-popup.png")

  $editor = New-Canvas 1280 800 "#F6F8FA"
  $editor.Graphics.DrawString("Write and preview side by side", $editorTitleFont, $darkText, 48, 35)
  $editor.Graphics.DrawString("Format Markdown, add images, and commit directly to GitHub.", $editorSubtitleFont, $lightMuted, 50, 88)
  $editor.Graphics.DrawRectangle($borderPen, 47, 139, 1185, 566)
  Draw-ContainedImage $editor.Graphics $editorSource 48 140 1184 564
  Save-Canvas $editor (Join-Path $outputDir "02-editor.png")

  $promo = New-Canvas 440 280 "#0D1117"
  $promo.Graphics.DrawImage($iconSource, 32, 76, 128, 128)
  $promo.Graphics.DrawString("GitMark", $promoTitleFont, $white, 178, 68)
  $promo.Graphics.DrawString("Markdown editing`nfor GitHub", $promoSubtitleFont, $green, 181, 122)
  $promo.Graphics.DrawString("Live preview", $promoSubtitleFont, $muted, 181, 184)
  $promo.Graphics.DrawString("Atomic commits", $promoSubtitleFont, $muted, 181, 211)
  Save-Canvas $promo (Join-Path $outputDir "promo-440x280.png")
} finally {
  $popupSource.Dispose()
  $editorSource.Dispose()
  $iconSource.Dispose()
  foreach ($resource in @(
    $muted, $green, $darkText, $lightMuted, $borderPen, $titleFont,
    $subtitleFont, $editorTitleFont, $editorSubtitleFont, $promoTitleFont,
    $promoSubtitleFont
  )) {
    if ($null -ne $resource) { $resource.Dispose() }
  }
}

Write-Output "Generated Chrome Web Store assets in $outputDir"
