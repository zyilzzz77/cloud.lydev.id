$ErrorActionPreference = 'Stop'
$bucket = 'archive-jkt48'
$keys = [System.Collections.Generic.HashSet[string]]::new()
$startAfter = $null

do {
  $listArgs = @('r2', 'buckets', 'objects', 'list', '--bucket-name', $bucket, '--per-page', '1000')
  if ($startAfter) {
    $listArgs += @('--start-after', $startAfter)
  }

  $page = (& cf @listArgs 2>$null) | ConvertFrom-Json

  if (-not $page -or $page.Count -eq 0) {
    break
  }

  foreach ($object in $page) {
    [void]$keys.Add($object.key)
  }

  $startAfter = $page[-1].key
  Write-Output "listed $($keys.Count) objects"
} while ($page.Count -ge 1000)

$allKeys = @($keys)
Write-Output "total objects: $($allKeys.Count)"

for ($offset = 0; $offset -lt $allKeys.Count; $offset += 500) {
  $end = [Math]::Min($offset + 499, $allKeys.Count - 1)
  $batch = $allKeys[$offset..$end]
  $bodyFile = Join-Path $env:COMMANDCODE_SCRATCHPAD "r2-delete-$offset.json"
  $batch | ConvertTo-Json -Compress | Set-Content -Path $bodyFile -Encoding utf8
  Write-Output "deleting $($batch.Count) objects from offset $offset"
  & cf r2 buckets objects bulk-delete --bucket-name $bucket --body "@$bodyFile" --force 2>&1 |
    Select-Object -Last 5
}

$remaining = (& cf r2 buckets objects list --bucket-name $bucket --per-page 10 2>$null) | ConvertFrom-Json
Write-Output "remaining objects: $(@($remaining).Count)"
