Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\USER\Desktop\CitaCiudadana_Completo\images\sprite_intro2.png"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$w = [int][Math]::Floor($srcImg.Width / 3)
$h = [int]$srcImg.Height

$rect3 = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$dest3 = New-Object System.Drawing.Bitmap($w, $h)
$gfx3 = [System.Drawing.Graphics]::FromImage($dest3)
$gfx3.DrawImage($srcImg, 0, 0, $rect3, [System.Drawing.GraphicsUnit]::Pixel)
$dest3.Save("C:\Users\USER\Desktop\CitaCiudadana_Completo\images\intro3_full.png", [System.Drawing.Imaging.ImageFormat]::Png)
$gfx3.Dispose(); $dest3.Dispose()

$rect2 = New-Object System.Drawing.Rectangle($w, 0, $w, $h)
$dest2 = New-Object System.Drawing.Bitmap($w, $h)
$gfx2 = [System.Drawing.Graphics]::FromImage($dest2)
$gfx2.DrawImage($srcImg, 0, 0, $rect2, [System.Drawing.GraphicsUnit]::Pixel)
$dest2.Save("C:\Users\USER\Desktop\CitaCiudadana_Completo\images\intro2_full.png", [System.Drawing.Imaging.ImageFormat]::Png)
$gfx2.Dispose(); $dest2.Dispose()

$rect1 = New-Object System.Drawing.Rectangle(($w * 2), 0, $w, $h)
$dest1 = New-Object System.Drawing.Bitmap($w, $h)
$gfx1 = [System.Drawing.Graphics]::FromImage($dest1)
$gfx1.DrawImage($srcImg, 0, 0, $rect1, [System.Drawing.GraphicsUnit]::Pixel)
$dest1.Save("C:\Users\USER\Desktop\CitaCiudadana_Completo\images\intro1_full.png", [System.Drawing.Imaging.ImageFormat]::Png)
$gfx1.Dispose(); $dest1.Dispose()

$srcImg.Dispose()
