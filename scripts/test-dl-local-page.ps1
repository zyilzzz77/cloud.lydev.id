$ProgressPreference = 'SilentlyContinue'
$base = 'http://localhost:3000'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$login = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -ContentType 'application/json' -Body (@{ identifier = 'lydev'; password = '123456' } | ConvertTo-Json) -WebSession $session -UseBasicParsing
"login=$($login.StatusCode)"

$txt = Join-Path $env:COMMANDCODE_SCRATCHPAD 'mediafire-test4.txt'
'hello mediafire four' | Set-Content $txt -NoNewline
$size = (Get-Item $txt).Length

$meta = @{ filename = 'mediafire-test4.txt'; mimeType = 'text/plain'; sizeBytes = $size; expiresInDays = 1 } | ConvertTo-Json
$target = Invoke-RestMethod -Uri "$base/api/dl/upload" -Method POST -ContentType 'application/json' -Body $meta -WebSession $session

$putUrl = $target.data.url
if ($putUrl -notmatch '^https?://') { $putUrl = $base + $putUrl }
$put = Invoke-WebRequest -Uri $putUrl -Method PUT -InFile $txt -ContentType 'text/plain' -UseBasicParsing
"put=$($put.StatusCode)"

$body = @{ fileId = $target.data.fileId; uploadToken = $target.data.uploadToken; filename = 'mediafire-test4.txt'; mimeType = 'text/plain'; sizeBytes = $size; expiresInDays = 1 } | ConvertTo-Json
$complete = Invoke-RestMethod -Uri "$base/api/dl/upload/complete" -Method POST -ContentType 'application/json' -Body $body -WebSession $session
$id = $complete.data.file.id
"id=$id"

$page = Invoke-WebRequest -Uri "$base/d/$id" -UseBasicParsing -SkipHttpErrorCheck
$pc = if ($page.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($page.Content) } else { [string]$page.Content }
"local_page=$($page.StatusCode) downloadButton=$($pc -match 'Download file') filename=$($pc -match 'mediafire-test4.txt') wib=$($pc -match 'WIB')"

Start-Sleep -Seconds 2
$edge = Invoke-WebRequest -Uri "https://dl.lydev.id/$id" -UseBasicParsing -SkipHttpErrorCheck
$ec = if ($edge.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($edge.Content) } else { [string]$edge.Content }
"edge_page=$($edge.StatusCode) downloadButton=$($ec -match 'Download file') filename=$($ec -match 'mediafire-test4.txt') wib=$($ec -match 'WIB')"

$missing = Invoke-WebRequest -Uri "$base/d/mdVgmEiTLC" -UseBasicParsing -SkipHttpErrorCheck
$mc = if ($missing.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($missing.Content) } else { [string]$missing.Content }
"missing_local_page=$($missing.StatusCode) unavailable=$($mc -match 'File unavailable')"

$del = Invoke-WebRequest -Uri "$base/api/dl/$id" -Method DELETE -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
"delete=$($del.StatusCode)"
