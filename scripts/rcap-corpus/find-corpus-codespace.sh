#!/usr/bin/env bash
# Find which Codespace holds the Nationwide Record Clearing corpus.
#
# The corpus is gitignored, so it exists only inside whichever Codespace it was
# assembled in. The repository does however record exactly when that machine was
# alive: nationwide-source-inventory.json was generated at 2026-06-17T12:10:37Z
# and committed as 95ad8a35 two and a half minutes later, on the branch that PR
# #9 merged as feat/rcap-all50-qa-attorney-handoff.
#
# So this ranks your Codespaces by how well they match that fingerprint and
# probes them best-first, rather than making you open each one.
#
#   ./find-corpus-codespace.sh           # list and rank only. Starts nothing.
#   ./find-corpus-codespace.sh --probe   # probe in rank order, stop at first hit
#   ./find-corpus-codespace.sh --probe --fetch   # ...then archive and download it
#
# Probing uses `gh codespace ssh`, which STARTS a stopped Codespace. Listing
# does not. That is why probing is opt-in.

set -uo pipefail

REPO="Roger-LegalEase/legalease-partner-dashboard-clean"
CORPUS="/workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing"
WANT_BRANCH="rcap-all50-qa-attorney-handoff"
PROBE=0; FETCH=0
for a in "$@"; do case "$a" in --probe) PROBE=1;; --fetch) FETCH=1;; esac; done

command -v gh >/dev/null || { echo "gh CLI not found: https://cli.github.com"; exit 2; }
gh auth status >/dev/null 2>&1 || { echo "Not logged in. Run: gh auth login"; exit 2; }

echo "Looking for Codespaces on $REPO"
echo

RAW=$(gh codespace list --json name,displayName,repository,gitStatus,state,lastUsedAt,createdAt 2>/dev/null) \
  || { echo "Could not list Codespaces."; exit 2; }

RANKED=$(printf '%s' "$RAW" | REPO="$REPO" WANT="$WANT_BRANCH" python3 -c '
import json,sys,os
rows=json.load(sys.stdin)
repo=os.environ["REPO"]; want=os.environ["WANT"]
out=[]
for r in rows:
    if (r.get("repository") or "") != repo: continue
    br=(r.get("gitStatus") or {}).get("ref") or ""
    # Rank: exact branch fingerprint first, then anything touching the all50
    # sprint, then remaining Codespaces on this repo by recency.
    score = 100 if want in br else (50 if ("all50" in br or "rcap" in br) else 10)
    out.append((score, r.get("lastUsedAt") or "", r["name"], r.get("displayName") or "", br, r.get("state") or "", r.get("createdAt") or ""))
out.sort(key=lambda x:(-x[0], x[1] or ""))
for score,last,name,disp,br,state,created in out:
    print("\t".join([str(score),name,disp,br,state,created[:10],last[:10]]))
')

[ -z "$RANKED" ] && { echo "No Codespaces found on this repository."; echo "If it was deleted, the gitignored corpus went with it - use the external drive."; exit 1; }

printf "%-28s %-34s %-9s %-11s %s\n" BRANCH NAME STATE CREATED "LAST USED"
while IFS=$'\t' read -r score name disp br state created last; do
  mark=" "; [ "$score" = "100" ] && mark="*"
  printf "%s%-27s %-34s %-9s %-11s %s\n" "$mark" "${br:-?}" "$name" "$state" "$created" "$last"
done <<< "$RANKED"
echo
echo "* = matches the branch the corpus index was committed from (PR #9, 2026-06-17)"

if [ "$PROBE" != "1" ]; then
  echo
  echo "Nothing was started. Re-run with --probe to check them best-first,"
  echo "or --probe --fetch to also archive and download the corpus when found."
  exit 0
fi

echo
while IFS=$'\t' read -r score name disp br state created last; do
  echo "--- probing $name  (branch ${br:-?}, $state)"
  n=$(gh codespace ssh -c "$name" -- "test -d \"$CORPUS\" && find \"$CORPUS\" -type f | wc -l" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$n" ] && [ "$n" -gt 0 ] 2>/dev/null; then
    echo
    echo "FOUND: $name holds $n files at"
    echo "  $CORPUS"
    echo
    gh codespace ssh -c "$name" -- "find \"$CORPUS\" -type f -name '*.pdf' | wc -l | xargs -I{} echo '  PDFs: {}'; du -sh \"$CORPUS\" | cut -f1 | xargs -I{} echo '  size: {}'" 2>/dev/null
    if [ "$FETCH" = "1" ]; then
      echo
      echo "Verifying in place against the committed index..."
      gh codespace ssh -c "$name" -- "cd /workspaces/legalease-partner-dashboard-clean && git fetch -q origin claude/new-session-7rsiqq && git checkout -q FETCH_HEAD -- scripts/rcap-corpus/ 2>/dev/null; node scripts/rcap-corpus/verify-nationwide-corpus.mjs --tar /tmp/nationwide-corpus.tgz"
      echo
      echo "Downloading..."
      gh codespace cp -e -c "$name" "remote:/tmp/nationwide-corpus.tgz" "./nationwide-corpus.tgz" \
        && echo "Saved to ./nationwide-corpus.tgz" && shasum -a 256 ./nationwide-corpus.tgz
    else
      echo "Re-run with --fetch to verify and download it."
    fi
    exit 0
  fi
  echo "    not here"
done <<< "$RANKED"

echo
echo "The corpus is not in any Codespace on this repository."
echo "Fall back to the external drive:"
echo "  node scripts/rcap-corpus/verify-nationwide-corpus.mjs --root '/Volumes/<drive>/Nationwide Record Clearing'"
exit 1
