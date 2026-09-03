#!/usr/bin/env bash
#
# One-time branch setup. Run this from the repository root AFTER `main` has been
# pushed to the remote. Safe to re-run: existing branches are skipped.
#
#   ./scripts/create-feature-branches.sh
#
set -euo pipefail

FEATURES=(
  "feature/auth-catalog:Evan:Auth, users, categories, products"
  "feature/purchasing:Najmul:Suppliers, purchase orders, goods receipt"
  "feature/inventory-reports:Rukaiya:Stock ledger, sales orders, dashboard, reports"
)

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Not a git repository. Run 'git init' first." >&2
  exit 1
fi

has_remote() { git remote get-url origin > /dev/null 2>&1; }

create_branch() {
  local branch="$1" base="$2"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "  = $branch already exists, skipping"
    return
  fi
  git checkout -q "$base"
  git checkout -q -b "$branch"
  echo "  + $branch created from $base"
  if has_remote; then
    git push -q -u origin "$branch" && echo "    pushed to origin"
  fi
}

echo
echo "Setting up branches..."
echo

git checkout -q main 2>/dev/null || git checkout -q -b main
create_branch "develop" "main"

for entry in "${FEATURES[@]}"; do
  IFS=':' read -r branch owner description <<< "$entry"
  create_branch "$branch" "develop"
  echo "    owner: $owner — $description"
done

git checkout -q develop

echo
echo "Done. Branch layout:"
git branch --list | sed 's/^/  /'
echo
if ! has_remote; then
  echo "No 'origin' remote yet. Add one and push:"
  echo "  git remote add origin <repo-url>"
  echo "  git push -u origin main develop ${FEATURES[*]%%:*}"
  echo
fi
echo "Each member now runs:  git checkout <their branch>"
echo "See docs/WORKFLOW.md for the daily loop."
echo
