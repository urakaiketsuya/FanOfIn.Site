#!/usr/bin/env bash
# Only for a disposable Actions checkout: rejected generated commits are rebuilt,
# so manifest entries from concurrent publishers are never resolved by overwriting them.
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" != "true" ]] || [[ -n "$(git status --porcelain)" ]]; then
  echo "Requires a clean, disposable GitHub Actions checkout" >&2
  exit 1
fi

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git fetch origin main
git merge --ff-only origin/main
npm ci

for attempt in 1 2 3 4 5; do
  base=$(git rev-parse HEAD)
  npm run pipeline:simulator
  # Never discard unrelated tracked changes if the generator's output scope changes.
  unexpected=$(git diff --name-only -- . ':!data/simulator/summary.json' ':!data/manifest.json')
  if [[ -n "$unexpected" ]]; then
    echo "Unexpected generated changes; refusing to publish or reset: $unexpected" >&2
    exit 1
  fi
  git add data/simulator/summary.json data/manifest.json
  if git diff --cached --quiet; then
    echo "No simulator analytics changes this run"
    exit 0
  fi
  git commit -m "chore: daily simulator analytics refresh $(date -u +%Y-%m-%d)"
  if git push origin HEAD:main; then
    exit 0
  fi
  git fetch origin main
  if [[ "$(git rev-parse origin/main)" == "$base" ]]; then
    echo "Push failed without a remote update; check permissions or branch rules" >&2
    exit 1
  fi
  if [[ "$attempt" == 5 ]]; then
    echo "Analytics publication failed after five attempts" >&2
    exit 1
  fi
  echo "Remote advanced; rebuilding analytics and manifest on latest main (attempt $attempt/5)"
  # Drop only this attempt's generated commit in the disposable checkout.
  git reset --hard "$base"
  git merge --ff-only origin/main
  npm ci
done
