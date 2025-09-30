#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: bash tools/create_issues.sh <issues_yaml>" >&2
  exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
  echo "Input file not found: $INPUT_FILE" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Missing dependency: GitHub CLI (gh)" >&2
  exit 1
fi

if ! command -v yq >/dev/null 2>&1; then
  echo "Missing dependency: yq" >&2
  exit 1
fi

count=$(yq eval '.issues | length' "$INPUT_FILE")
if [ "$count" = "null" ] || [ "$count" -eq 0 ]; then
  echo "No issues found in $INPUT_FILE" >&2
  exit 1
fi

DRY_RUN=${DRY_RUN:-0}
TARGET_REPO=${GH_ISSUES_REPO:-${GITHUB_REPOSITORY:-}}

for (( idx=0; idx<count; idx++ )); do
  title=$(yq eval -r ".issues[$idx].title" "$INPUT_FILE")
  if [ "$title" = "null" ] || [ -z "$title" ]; then
    echo "Skipping issue at index $idx: missing title" >&2
    continue
  fi

  body_tmp=$(mktemp)
  trap 'rm -f "$body_tmp"' EXIT
  yq eval -r ".issues[$idx].body" "$INPUT_FILE" > "$body_tmp"

  labels=$(yq eval -r ".issues[$idx].labels // [] | join(\",\")" "$INPUT_FILE")
  assignees=$(yq eval -r ".issues[$idx].assignees // [] | join(\",\")" "$INPUT_FILE")
  milestone=$(yq eval -r ".issues[$idx].milestone // \"\"" "$INPUT_FILE")

  cmd=(gh issue create --title "$title" --body-file "$body_tmp")
  if [ -n "$TARGET_REPO" ]; then
    cmd+=(--repo "$TARGET_REPO")
  fi
  if [ -n "$labels" ]; then
    cmd+=(--label "$labels")
  fi
  if [ -n "$assignees" ]; then
    cmd+=(--assignee "$assignees")
  fi
  if [ -n "$milestone" ]; then
    cmd+=(--milestone "$milestone")
  fi

  echo "Creating issue $((idx + 1))/$count: $title"
  if [ "$DRY_RUN" = "1" ]; then
    printf 'DRY-RUN: %q ' "${cmd[@]}"
    printf '\n'
  else
    "${cmd[@]}"
  fi

  rm -f "$body_tmp"
  trap - EXIT
  sleep 1

done
