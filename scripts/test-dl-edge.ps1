$ProgressPreference = 'SilentlyContinue'
$base = 'http://localhost:3000'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$login = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -ContentType 'application/json' -Body (@{ identifier = 'lydev'; password = '123456' } | ConvertTo-Json) -WebSession $session -UseBasicParsing
"login=$($login.StatusCode)"

$txt = Join-Path $env:COMMANDCODE_SCRATCHPAD 'mediafire-test3.txt'
'hello mediafire three' | Set-Content $txt -NoNewline
$size = (Get-Item $txt).Length

$meta = @{ filename = 'mediafire-test3.txt'; mimeType = 'text/plain'; sizeBytes = $size; expiresInDays = 1 } | ConvertTo-Json
$target = Invoke-RestMethod -Uri "$base/api/dl/upload" -Method POST -ContentType 'application/json' -Body $meta -WebSession $session

$putUrl = $target.data.url
if ($putUrl -notmatch '^https?://') { $putUrl = $base + $putUrl }
$put = Invoke-WebRequest -Uri $putUrl -Method PUT -InFile $txt -ContentType 'text/plain' -UseBasicParsing
"put=$($put.StatusCode)"

$body = @{ fileId = $target.data.fileId; uploadToken = $target.data.uploadToken; filename = 'mediafire-test3.txt'; mimeType = 'text/plain'; sizeBytes = $size; expiresInDays = 1 } | ConvertTo-Json
$complete = Invoke-RestMethod -Uri "$base/api/dl/upload/complete" -Method POST -ContentType 'application/json' -Body $body -WebSession $session
$id = $complete.data.file.id
"id=$id url=$($complete.data.file.publicUrl)"

Start-Sleep -Seconds 2
$cfg = Get-Content "$env:APPDATA\xdg.config\cloudflare\config\default.json" -Raw | ConvertFrom-Json
$h = @{ Authorization = "Bearer $($cfg.oauth_token)" }
$acct = '35e5e2aeda35512c4edfb8eced06db50'
$ns = '63411f5966ff4ba99f024e4508e2895f'

try {
  $kv = Invoke-WebRequest -Uri "https://api.cloudflare.com/client/v4/accounts/$acct/storage/kv/namespaces/$ns/values/file%3A$id" -Headers $h
  "kv=$([Text.Encoding]::UTF8.GetString($kv.Content))"
} catch {
  "kv_error=$($_.Exception.Message)"
}

$pageStatus = 0
$page = $null
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 1
  $page = Invoke-WebRequest -Uri "https://dl.lydev.id/$id" -UseBasicParsing -SkipHttpErrorCheck
  $pageStatus = $page.StatusCode
  if ($pageStatus -eq 200) { break }
}
$pc = if ($page.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($page.Content) } else { [string]$page.Content }
$title = [regex]::Match($pc, '<title>(.*?)</title>').Groups[1].Value
"page=$pageStatus title=$title downloadButton=$($pc -match 'Download file') filename=$($pc -match 'mediafire-test3.txt')"

$dl = Invoke-WebRequest -Uri "https://dl.lydev.id/$id/download" -UseBasicParsing -SkipHttpErrorCheck
$dc = if ($dl.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($dl.Content) } else { [string]$dl.Content }
"download=$($dl.StatusCode) body=$dc"

$del = Invoke-WebRequest -Uri "$base/api/dl/$id" -Method DELETE -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
"delete=$($del.StatusCode)"

$afterStatus = 0
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 1
  $after = Invoke-WebRequest -Uri "https://dl.lydev.id/$id" -UseBasicParsing -SkipHttpErrorCheck
  $afterStatus = $after.StatusCode
  if ($afterStatus -eq 404) { break }
}
"afterDelete=$afterStatus"
