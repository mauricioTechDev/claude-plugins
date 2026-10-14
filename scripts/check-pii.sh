#!/usr/bin/env bash
# Keeps personal data out of this repository. The pre-commit hook runs it on staged files;
# `scripts/check-pii.sh --all` scans every tracked and unignored file.
set -uo pipefail

root=$(git rev-parse --show-toplevel) || exit 1
cd "$root" || exit 1

mode=${1:-staged}
if [ "$mode" = "--all" ]; then
  files=$(git ls-files --cached --others --exclude-standard)
  show() { cat -- "$1"; }
else
  files=$(git diff --cached --name-only --diff-filter=ACMR)
  # The staged blob is what the commit will carry, whatever the working copy holds.
  show() { git show ":$1"; }
fi

# Shapes of personal data and secrets, one extended regex per line.
shapes='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}
/(Users|home)/[A-Za-z0-9._-]+
(^|[^0-9])(\+?1[ .-]?)?\(?[0-9]{3}\)?[ .-][0-9]{3}[ .-][0-9]{4}([^0-9]|$)
sk-ant-[A-Za-z0-9_-]{10,}
(ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{20,}
github_pat_[A-Za-z0-9_]{20,}
AKIA[0-9A-Z]{16}
-----BEGIN [A-Z ]*PRIVATE KEY-----
xox[abprs]-[A-Za-z0-9-]{10,}'

# Matches that are meant to be there: placeholder paths and no-reply addresses.
allowed='noreply@anthropic\.com|users\.noreply\.github\.com|/(Users|home)/(me|you|user|name)([^A-Za-z0-9._-]|$)|@example\.(com|org)'

# This machine's own identity, read at run time so the values themselves never enter the repo.
mine=$({
  git config --global user.name
  git config --global user.email
  printf '%s\n' "${USER:-}"
  id -F 2>/dev/null
} | awk 'length($0) >= 3' | sort -u)

found=0
flag() { printf '  %s\n' "$1" >&2; found=1; }

while IFS= read -r f; do
  [ -n "$f" ] || continue
  body=$(show "$f" 2>/dev/null) || continue
  hits=$(printf '%s\n' "$body" | grep -I -n -E -f <(printf '%s\n' "$shapes") | grep -v -E "$allowed")
  if [ -n "$mine" ]; then
    hits=$(printf '%s\n%s\n' "$hits" "$(printf '%s\n' "$body" | grep -I -n -i -F -f <(printf '%s\n' "$mine"))")
  fi
  while IFS= read -r h; do
    [ -n "$h" ] && flag "$f:$h"
  done <<< "$(printf '%s\n' "$hits" | sort -t: -k1,1n -u)"
done <<< "$files"

if [ "$mode" != "--all" ]; then
  email=$(git config user.email || true)
  case "$email" in
    *@users.noreply.github.com) ;;
    *) flag "commit identity: '$email' is not a GitHub noreply address (git config user.email <id>+<login>@users.noreply.github.com)" ;;
  esac
fi

if [ "$found" -ne 0 ]; then
  echo "check-pii: found possible personal data above. Remove it, or commit with --no-verify if it is meant to be public." >&2
  exit 1
fi
