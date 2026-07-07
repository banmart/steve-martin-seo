# Extract the hero orbit clip into a JPG frame sequence for canvas scrubbing.
# Requires ffmpeg on PATH. Run from the project root:
#   powershell -File tools\extract-frames.ps1
param(
  [string]$Clip = "assets\clips\hero.mp4",
  [string]$OutDir = "assets\frames\hero",
  [int]$Fps = 24,
  [int]$Width = 1600,
  [int]$Quality = 4   # ffmpeg -q:v (2 best .. 31 worst)
)
if (-not (Test-Path $Clip)) { Write-Error "Clip not found: $Clip"; exit 1 }
New-Item -ItemType Directory -Force $OutDir | Out-Null
ffmpeg -y -i $Clip -vf "fps=$Fps,scale=${Width}:-2" -q:v $Quality "$OutDir\frame_%04d.jpg"
$count = (Get-ChildItem $OutDir -Filter *.jpg).Count
Write-Host "Extracted $count frames to $OutDir"
Write-Host "If count != 192, update FRAME_COUNT in js/main.js to $count"
