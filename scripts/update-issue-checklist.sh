#!/usr/bin/env bash
set -euo pipefail

# Usage: GH_TOKEN=... bash scripts/update-issue-checklist.sh <issue_number>

if [ $# -ne 1 ]; then
  echo "Usage: $0 <issue_number>" >&2
  exit 1
fi

issue_number="$1"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required" >&2
  exit 1
fi

tmp=$(mktemp)
gh issue view "$issue_number" --json body --jq .body > "$tmp"
if [ ! -s "$tmp" ]; then
  echo "Failed to read issue body for #$issue_number" >&2
  exit 1
fi

sed -i.bak -E 's/^- \[ \] /- [x] /g' "$tmp" || true
gh issue edit "$issue_number" --body-file "$tmp"
rm -f "$tmp" "$tmp.bak"
echo "Updated checkboxes for issue #$issue_number"

