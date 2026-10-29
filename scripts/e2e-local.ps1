$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$login = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -ContentType 'application/json' -Body (@{ identifier = 'lydev'; password = '123456' } | ConvertTo-Json) -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
"login=$($login.StatusCode)"

$png = Join-Path $env:COMMANDCODE_SCRATCHPAD 'pixel.png'
[IO.File]::WriteAllBytes($png, [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='))
$size = (Get-Item $png).Length
$meta = @{ filename = 'pixel.png'; mimeType = 'image/png'; sizeBytes = $size; folder = 'images' } | ConvertTo-Json
$target = Invoke-RestMethod -Uri "$base/api/cdn/upload" -Method POST -ContentType 'application/json' -Body $meta -WebSession $session
"cdn target=$($target.data.fileKey)"
$cdnPutUrl = $target.data.url
if ($cdnPutUrl -notmatch '^https?://') { $cdnPutUrl = $base + $cdnPutUrl }
$put = Invoke-WebRequest -Uri $cdnPutUrl -Method PUT -InFile $png -ContentType 'image/png' -UseBasicParsing -SkipHttpErrorCheck
"cdn put=$($put.StatusCode)"
$completeBody = @{ fileKey = $target.data.fileKey; uploadToken = $target.data.uploadToken; filename = 'pixel.png'; mimeType = 'image/png'; sizeBytes = $size; folder = 'images' } | ConvertTo-Json
$complete = Invoke-RestMethod -Uri "$base/api/cdn/upload/complete" -Method POST -ContentType 'application/json' -Body $completeBody -WebSession $session
"cdn asset=$($complete.data.asset.id)"
$public = Invoke-WebRequest -Uri $complete.data.asset.publicUrl -UseBasicParsing -SkipHttpErrorCheck
"cdn public=$($public.StatusCode) type=$($public.Headers['Content-Type'])"
$list = Invoke-RestMethod -Uri "$base/api/cdn" -WebSession $session
"cdn list total=$($list.data.total)"
$del = Invoke-WebRequest -Uri "$base/api/cdn/$($complete.data.asset.id)" -Method DELETE -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
"cdn delete=$($del.StatusCode)"
$afterDelete = 0
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep -Milliseconds 500
  $afterDelete = (Invoke-WebRequest -Uri $complete.data.asset.publicUrl -UseBasicParsing -SkipHttpErrorCheck).StatusCode
  if ($afterDelete -eq 404) { break }
}
"cdn after delete=$afterDelete"

$slug = 'e2e-' + (-join ((48..57) + (97..122) | Get-Random -Count 6 | ForEach-Object { [char]$_ }))
$created = Invoke-RestMethod -Uri "$base/api/urls" -Method POST -ContentType 'application/json' -Body (@{ targetUrl = 'https://93.184.215.14/'; slug = $slug; title = 'E2E' } | ConvertTo-Json) -WebSession $session
$urlId = $created.data.shortUrl.id
"short url=$($created.data.shortUrl.shortUrl)"
$redir = curl.exe -s -o NUL -w "%{http_code} %{redirect_url}" "$($created.data.shortUrl.shortUrl)"
"redirect=$redir"
Start-Sleep -Milliseconds 500
$stats = Invoke-RestMethod -Uri "$base/api/urls/$urlId/stats" -WebSession $session
"stats clicks=$($stats.data.shortUrl.clicks)"
$patch = Invoke-RestMethod -Uri "$base/api/urls/$urlId" -Method PATCH -ContentType 'application/json' -Body (@{ isActive = $false } | ConvertTo-Json) -WebSession $session
$redir2 = curl.exe -s -o NUL -w "%{http_code}" "$($created.data.shortUrl.shortUrl)"
"disabled redirect=$redir2"
$delUrl = Invoke-WebRequest -Uri "$base/api/urls/$urlId" -Method DELETE -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
"url delete=$($delUrl.StatusCode)"

$txt = Join-Path $env:COMMANDCODE_SCRATCHPAD 'hello.txt'
Set-Content -Path $txt -Value 'hello lydev' -NoNewline
$tsize = (Get-Item $txt).Length
$dlTarget = Invoke-RestMethod -Uri "$base/api/dl/upload" -Method POST -ContentType 'application/json' -Body (@{ filename = 'hello.txt'; mimeType = 'text/plain'; sizeBytes = $tsize; expiresInDays = 1 } | ConvertTo-Json) -WebSession $session
$dlPutUrl = $dlTarget.data.url
if ($dlPutUrl -notmatch '^https?://') { $dlPutUrl = $base + $dlPutUrl }
$dlPut = Invoke-WebRequest -Uri $dlPutUrl -Method PUT -InFile $txt -ContentType 'text/plain' -UseBasicParsing -SkipHttpErrorCheck
"dl put=$($dlPut.StatusCode)"
$dlComplete = Invoke-RestMethod -Uri "$base/api/dl/upload/complete" -Method POST -ContentType 'application/json' -Body (@{ fileId = $dlTarget.data.fileId; uploadToken = $dlTarget.data.uploadToken; filename = 'hello.txt'; mimeType = 'text/plain'; sizeBytes = $tsize; expiresInDays = 1 } | ConvertTo-Json) -WebSession $session
$fileId = $dlComplete.data.file.id
"dl file=$fileId url=$($dlComplete.data.file.publicUrl)"
$page = Invoke-WebRequest -Uri $dlComplete.data.file.publicUrl -UseBasicParsing -SkipHttpErrorCheck
"download page=$($page.StatusCode) hasButton=$($page.Content -match 'Download file')"
$dl = curl.exe -s -o NUL -w "%{http_code} %{redirect_url}" "$base/api/dl/$fileId/download"
"download redirect=$dl"
$downloadLocation = ($dl -split ' ', 2)[1]
$downloaded = Invoke-WebRequest -Uri $downloadLocation -UseBasicParsing -SkipHttpErrorCheck
"downloaded=$($downloaded.StatusCode) body=$($downloaded.Content)"
$delFile = Invoke-WebRequest -Uri "$base/api/dl/$fileId" -Method DELETE -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
"dl delete=$($delFile.StatusCode)"

$keyResp = Invoke-RestMethod -Uri "$base/api/account/api-keys" -Method POST -ContentType 'application/json' -Body (@{ name = 'e2e' } | ConvertTo-Json) -WebSession $session
$plain = $keyResp.data.plaintext
"api key prefix=$($keyResp.data.key.keyPrefix)"
$overview = Invoke-RestMethod -Uri "$base/api/stats/overview" -Headers @{ Authorization = "Bearer $plain" }
"api key overview assets=$($overview.data.activeAssets) downloads=$($overview.data.totalDownloads)"
$revoke = Invoke-WebRequest -Uri "$base/api/account/api-keys/$($keyResp.data.key.id)" -Method DELETE -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
"revoke=$($revoke.StatusCode)"

$csrf = Invoke-WebRequest -Uri "$base/api/urls" -Method POST -ContentType 'application/json' -Body (@{ targetUrl = 'https://93.184.215.14/' } | ConvertTo-Json) -Headers @{ Origin = 'https://evil.example' } -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
"csrf=$($csrf.StatusCode)"
