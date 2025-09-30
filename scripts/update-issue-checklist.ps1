<#
.SYNOPSIS
  Spunta automaticamente i checkbox in una issue GitHub.

.PARAMETER IssueNumber
  Numero dell'issue da aggiornare.

.EXAMPLE
  ./scripts/update-issue-checklist.ps1 -IssueNumber 1
#>

param(
  [Parameter(Mandatory=$true)]
  [int]$IssueNumber
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error 'GitHub CLI (gh) is required'
}

$tmp = New-TemporaryFile
try {
  gh issue view $IssueNumber --json body --jq .body | Out-File -FilePath $tmp -Encoding utf8
  if ((Get-Item $tmp).Length -eq 0) { throw "Failed to read issue body for #$IssueNumber" }

  $content = Get-Content $tmp -Raw
  $updated = $content -replace "(?m)^- \[ \] ", "- [x] "
  if ($updated -ne $content) {
    $updated | Out-File -FilePath $tmp -Encoding utf8
    gh issue edit $IssueNumber --body-file $tmp | Out-Null
    Write-Host "Updated checkboxes for issue #$IssueNumber"
  } else {
    Write-Host "No unchecked boxes to update for issue #$IssueNumber"
  }
}
finally {
  Remove-Item $tmp -ErrorAction SilentlyContinue
}

