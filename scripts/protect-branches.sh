#!/usr/bin/env bash
set -euo pipefail
REPO="${1:?org/repo}"
BRANCHES=(${2:-main develop})
CHECKS_CSV=${3:-CI,Build & Test,E2E}
REVIEWS=${4:-1}
: "${GH_PAT:?GH_PAT non impostato per questa app/env}"
HDR=( -H "Authorization: token $GH_PAT" -H "Accept: application/vnd.github+json" )
for B in "${BRANCHES[@]}"; do
  BODY=$(jq -n --argjson reviews "$REVIEWS" --arg checks "$CHECKS_CSV" '
    {required_status_checks:{strict:true,contexts:($checks|split(","))},
     enforce_admins:true,
     required_pull_request_reviews:{required_approving_review_count:($reviews|tonumber),dismiss_stale_reviews:true,require_code_owner_reviews:false},
     restrictions:null,
     required_linear_history:false,
     allow_force_pushes:false,
     allow_deletions:false,
     block_creations:false,
     required_conversation_resolution:true,
     lock_branch:false,
     allow_fork_syncing:true}
  ')
  curl -sSf -X PUT "https://api.github.com/repos/$REPO/branches/$B/protection" "${HDR[@]}" -d "$BODY" >/dev/null
  echo "✅ Protezione applicata a $B"
done
