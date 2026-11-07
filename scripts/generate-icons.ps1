Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Mayn\.gemini\antigravity\brain\1585d55c-42c8-4a20-a29b-60280fa175d8\.user_uploaded\media_1794039188463_26411642.png"
$root = "c:\Users\Mayn\Desktop\HG\HGhub"
$iconsDir = Join-Path $root "src-tauri\icons"
$androidDir = Join-Path $iconsDir "android"
$publicDir = Join-Path $root "public"

$rawImg = [System.Drawing.Bitmap]::FromFile($srcPath)

$cropX = 1
$cropY = 3
$cropW = 494
$cropH = 494
$masterBmp = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$mg = [System.Drawing.Graphics]::FromImage($masterBmp)
$mg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$mg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$mg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$dstRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
$mg.DrawImage($rawImg, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$mg.Dispose()
$rawImg.Dispose()

$cornerThreshold = 225
for ($y = 0; $y -lt $cropH; $y++) {
    for ($x = 0; $x -lt $cropW; $x++) {
        $inCorner = ($x -lt 65 -or $x -gt ($cropW - 65)) -and ($y -lt 65 -or $y -gt ($cropH - 65))
        if ($inCorner) {
            $c = $masterBmp.GetPixel($x, $y)
            if ($c.R -gt $cornerThreshold -and $c.G -gt $cornerThreshold -and $c.B -gt $cornerThreshold) {
                $masterBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            }
        }
    }
}

function Save-ResizedIcon {
    param (
        [string]$OutPath,
        [int]$Dimension,
        [string]$Style
    )
    $parent = Split-Path -Parent $OutPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    $outBmp = New-Object System.Drawing.Bitmap($Dimension, $Dimension, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($outBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($Style -eq "round") {
        $p = New-Object System.Drawing.Drawing2D.GraphicsPath
        $p.AddEllipse(0, 0, $Dimension, $Dimension)
        $g.SetClip($p)
        $scale = 1.12
        $dw = [int]($Dimension * $scale)
        $dh = [int]($Dimension * $scale)
        $dx = [int](($Dimension - $dw) / 2)
        $dy = [int](($Dimension - $dh) / 2)
        $g.DrawImage($masterBmp, $dx, $dy, $dw, $dh)
        $p.Dispose()
    } elseif ($Style -eq "foreground") {
        $fgScale = 0.72
        $dw = [int]($Dimension * $fgScale)
        $dh = [int]($Dimension * $fgScale)
        $dx = [int](($Dimension - $dw) / 2)
        $dy = [int](($Dimension - $dh) / 2)
        $g.DrawImage($masterBmp, $dx, $dy, $dw, $dh)
    } else {
        $g.DrawImage($masterBmp, 0, 0, $Dimension, $Dimension)
    }

    $g.Dispose()
    $outBmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $outBmp.Dispose()
    Write-Host "Generated: $OutPath ($Dimension x $Dimension, $Style)"
}

# Android mipmaps
$dList = @(
    @{ Folder = "mipmap-mdpi";    L = 48;  Fg = 108 },
    @{ Folder = "mipmap-hdpi";    L = 72;  Fg = 162 },
    @{ Folder = "mipmap-xhdpi";   L = 96;  Fg = 216 },
    @{ Folder = "mipmap-xxhdpi";  L = 144; Fg = 324 },
    @{ Folder = "mipmap-xxxhdpi"; L = 192; Fg = 432 }
)

foreach ($entry in $dList) {
    $folderPath = Join-Path $androidDir $entry.Folder
    Save-ResizedIcon -OutPath (Join-Path $folderPath "ic_launcher.png") -Dimension $entry.L -Style "standard"
    Save-ResizedIcon -OutPath (Join-Path $folderPath "ic_launcher_round.png") -Dimension $entry.L -Style "round"
    Save-ResizedIcon -OutPath (Join-Path $folderPath "ic_launcher_foreground.png") -Dimension $entry.Fg -Style "foreground"
}

# Desktop and generic icons
Save-ResizedIcon -OutPath (Join-Path $iconsDir "icon.png") -Dimension 512 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "128x128.png") -Dimension 128 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "128x128@2x.png") -Dimension 256 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "64x64.png") -Dimension 64 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "32x32.png") -Dimension 32 -Style "standard"

# Square icons
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square30x30Logo.png") -Dimension 30 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square44x44Logo.png") -Dimension 44 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square71x71Logo.png") -Dimension 71 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square89x89Logo.png") -Dimension 89 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square107x107Logo.png") -Dimension 107 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square142x142Logo.png") -Dimension 142 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square150x150Logo.png") -Dimension 150 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square284x284Logo.png") -Dimension 284 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "Square310x310Logo.png") -Dimension 310 -Style "standard"
Save-ResizedIcon -OutPath (Join-Path $iconsDir "StoreLogo.png") -Dimension 50 -Style "standard"

# Web logo
Save-ResizedIcon -OutPath (Join-Path $publicDir "logo.png") -Dimension 512 -Style "standard"

$masterBmp.Dispose()
Write-Host "All icons generated successfully!"
