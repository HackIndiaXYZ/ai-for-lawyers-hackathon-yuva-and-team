#!/bin/bash
# Saves every change to BOTH GitHub repos.
# Usage: ./save.sh "short description of what you changed"
set -e
cd "$(dirname "$0")"

if [ -z "$1" ]; then
  echo "Please add a short message, like: ./save.sh \"Add homepage\""
  exit 1
fi

git add -A

# Safety check: never save secret key files
if git diff --cached --name-only | grep -E '(^|/)\.env' ; then
  echo "STOP: a secret .env file is about to be saved. Nothing was saved."
  git reset -q
  exit 1
fi

if git diff --cached --quiet; then
  echo "No new changes to commit."
else
  git commit -m "$1"
fi

git push origin main
git push hackathon main
echo "Done: saved to both repos (ai-lawyer and the hackathon repo)."