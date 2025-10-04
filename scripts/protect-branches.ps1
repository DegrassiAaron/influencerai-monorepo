param(
  [Parameter(Mandatory=$true)][string]$Repo,
  [string[]]$Branches=@('main','develop'),
  [string[]]$Checks=@('CI','Build & Test','E2E'),
  [int]$Reviews=1
)
if (-not $env:GH_PAT) { throw "GH_PAT non impostato per questa app/env" }
$headers = @{ Authorization = "token $($env:GH_PAT)"; Accept = 'application/vnd.github+json' }
$base = "https://api.github.com/repos/$Repo/branches"
foreach($b in $Branches){
  $body = @{
    required_status_checks = @{ strict = $true; contexts = $Checks };
    enforce_admins = $true;
    required_pull_request_reviews = @{ required_approving_review_count = $Reviews; dismiss_stale_reviews = $true; require_code_owner_reviews = $false };
    restrictions = $null;
    required_linear_history = $false;
    allow_force_pushes = $false;
    allow_deletions = $false;
    block_creations = $false;
    required_conversation_resolution = $true;
    lock_branch = $false;
    allow_fork_syncing = $true
  } | ConvertTo-Json -Depth 6
  Invoke-RestMethod -Method PUT -Uri "$base/$b/protection" -Headers $headers -Body $body -ContentType 'application/json' | Out-Null
  Write-Host "✅ Protezione applicata a $b"
}
