#!/usr/bin/env bash
#
# Pull the five backup zips out of GitHub Codespaces, no browser downloads.
#
# Run this on a machine with normal outbound internet (your laptop). It cannot
# run inside a Claude Code web/cloud session: that environment's egress proxy
# blocks the GitHub device-login endpoint and the Dev Tunnels hosts that
# `gh codespace cp` relays SSH through.
#
# Usage:
#   bash scripts/fetch-codespace-backups.sh [DEST_DIR]
#
# DEST_DIR defaults to the current directory.

set -uo pipefail

DEST="${1:-$PWD}"
REMOTE_GLOB='/workspaces/backups/*.zip'
SMALL_SRC='rcap-external-inputs-2026-08-10.zip'
SMALL_DST='rcap-external-inputs-small-2026-08-10.zip'
# Byte size that identifies the "small" copy of the colliding filename.
SMALL_BYTES=50576946

say()  { printf '%s\n' "$*"; }
head2() { printf '\n=== %s ===\n' "$*"; }

mkdir -p "$DEST"
DEST="$(cd "$DEST" && pwd)"

# ---------------------------------------------------------------------------
# 0. gh present?
# ---------------------------------------------------------------------------
head2 "Checking for the GitHub CLI"
if command -v gh >/dev/null 2>&1; then
  say "gh is already installed: $(gh --version | head -1)"
else
  say "gh not found. Installing..."
  if command -v brew >/dev/null 2>&1; then
    brew install gh
  elif command -v apt-get >/dev/null 2>&1; then
    sudo mkdir -p -m 755 /etc/apt/keyrings
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
    sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
    sudo apt-get update && sudo apt-get install -y gh
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y gh
  else
    say "Could not pick a package manager. Install gh from https://cli.github.com and re-run."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# 1. Clean out partials and "Not Found" stubs BEFORE downloading
# ---------------------------------------------------------------------------
head2 "Step 1 - clearing partial and placeholder files from $DEST"
removed=0
while IFS= read -r -d '' f; do
  say "  deleting partial: $(basename "$f")"
  rm -f "$f" && removed=$((removed + 1))
done < <(find "$DEST" -maxdepth 1 -type f \( -name '*.part' -o -name '*.part.*' -o -name '*_zip.part*' -o -name '*.part*' \) -print0 2>/dev/null)

# 9-byte files whose entire contents are the text "Not Found"
while IFS= read -r -d '' f; do
  if [ "$(cat "$f")" = "Not Found" ]; then
    say "  deleting 'Not Found' stub: $(basename "$f")"
    rm -f "$f" && removed=$((removed + 1))
  fi
done < <(find "$DEST" -maxdepth 1 -type f -size 9c -print0 2>/dev/null)

[ "$removed" -eq 0 ] && say "  nothing to clean - folder is already clear."

# ---------------------------------------------------------------------------
# 2. Log in
# ---------------------------------------------------------------------------
head2 "Step 2 - GitHub login"
# A repo-scoped CI token in the environment will shadow your real login; drop it.
unset GH_TOKEN GITHUB_TOKEN

if gh auth status >/dev/null 2>&1 && gh auth status 2>&1 | grep -q 'codespace'; then
  say "Already logged in with codespace access."
else
  cat <<'EOF'
You are about to be asked to approve this login. In plain English:

  1. The terminal prints an eight-character code, like ABCD-1234.
     Copy it.
  2. Press Enter. Your browser opens github.com/login/device.
     (No browser? Open that address by hand on any device.)
  3. Paste the code and press Continue.
  4. GitHub shows a green "Authorize" button and lists what is being
     granted - your repositories and your Codespaces. Click it once.
     That single click is the whole approval.
  5. The page says "Congratulations, you're all set." Come back here.
     The terminal will have moved on by itself.

When prompted below, choose: GitHub.com -> HTTPS -> Yes (authenticate Git)
-> Login with a web browser.
EOF
  gh auth login --hostname github.com --git-protocol https --web \
    --scopes "codespace,repo,read:org"
fi

gh auth status

# ---------------------------------------------------------------------------
# 3. List codespaces
# ---------------------------------------------------------------------------
head2 "Step 3 - your codespaces"
gh codespace list

mapfile -t CS < <(gh codespace list --json name,state --jq '.[].name')
if [ "${#CS[@]}" -eq 0 ]; then
  say "No codespaces found on this account. Nothing to copy."
  exit 1
fi
say ""
say "Found ${#CS[@]} codespace(s): ${CS[*]}"

# ---------------------------------------------------------------------------
# 4. Wake each codespace, then copy its zips into a per-codespace staging dir
# ---------------------------------------------------------------------------
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/cs-zips-XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

for cs in "${CS[@]}"; do
  head2 "Step 4 - codespace: $cs"

  state="$(gh codespace list --json name,state --jq ".[] | select(.name==\"$cs\") | .state")"
  say "current state: ${state:-unknown}"
  if [ "$state" != "Available" ]; then
    say "waking it up (this can take a minute)..."
    # Any SSH command forces a resume; -- keeps the arg out of gh's parser.
    gh codespace ssh -c "$cs" -- true 2>&1 | tail -2 || true
    for _ in $(seq 1 30); do
      state="$(gh codespace list --json name,state --jq ".[] | select(.name==\"$cs\") | .state")"
      [ "$state" = "Available" ] && break
      sleep 5
    done
    say "state now: ${state:-unknown}"
  fi

  say "listing $REMOTE_GLOB ..."
  gh codespace ssh -c "$cs" -- "ls -la $REMOTE_GLOB" 2>&1 | tail -10 || \
    say "  (could not list; will still attempt the copy)"

  mkdir -p "$STAGE/$cs"
  say "copying zips out (-e expands the glob on the remote side)..."
  # Retry: large copies over the tunnel occasionally drop.
  for attempt in 1 2 3; do
    if gh codespace cp -e -c "$cs" "remote:$REMOTE_GLOB" "$STAGE/$cs/"; then
      break
    fi
    say "  copy attempt $attempt failed; retrying in $((attempt * 5))s"
    sleep $((attempt * 5))
  done

  say "pulled from $cs:"
  ls -la "$STAGE/$cs/" 2>/dev/null | tail -n +2 || say "  (nothing)"
done

# ---------------------------------------------------------------------------
# 5. Move into place, resolving the duplicate filename by size
# ---------------------------------------------------------------------------
head2 "Step 5 - moving files into $DEST (renaming the small duplicate)"

fsize() { stat -c%s "$1" 2>/dev/null || stat -f%z "$1"; }

# Handle the colliding name first. Both codespaces hold a file called
# rcap-external-inputs-2026-08-10.zip; the smaller (~49 MB) becomes
# rcap-external-inputs-small-2026-08-10.zip. Decide by comparing the copies
# to each other rather than against a fixed threshold, so this still does the
# right thing if the files are regenerated at different sizes.
dupes=()
for cs in "${CS[@]}"; do
  [ -e "$STAGE/$cs/$SMALL_SRC" ] && dupes+=("$STAGE/$cs/$SMALL_SRC")
done

if [ "${#dupes[@]}" -gt 1 ]; then
  # Sort the copies by size, descending: biggest keeps the original name.
  mapfile -t sorted < <(for f in "${dupes[@]}"; do printf '%s\t%s\n' "$(fsize "$f")" "$f"; done | sort -rn | cut -f2-)
  big="${sorted[0]}"; small="${sorted[-1]}"
  say "  $SMALL_SRC appears in ${#dupes[@]} codespaces:"
  say "    $(fsize "$big") bytes -> $SMALL_SRC  (larger, keeps its name)"
  say "    $(fsize "$small") bytes -> $SMALL_DST  (smaller, renamed)"
  mv -f "$big"   "$DEST/$SMALL_SRC"
  mv -f "$small" "$DEST/$SMALL_DST"
  if [ "${#sorted[@]}" -gt 2 ]; then
    say "  WARNING: more than two copies found; only the largest and smallest were kept."
  fi
elif [ "${#dupes[@]}" -eq 1 ]; then
  # Only one copy showed up - place it by matching the known expected sizes.
  sz=$(fsize "${dupes[0]}")
  if [ "$sz" -eq "$SMALL_BYTES" ]; then
    say "  only one $SMALL_SRC found ($sz bytes); it is the small one -> $SMALL_DST"
    mv -f "${dupes[0]}" "$DEST/$SMALL_DST"
  else
    say "  only one $SMALL_SRC found ($sz bytes); treating it as the large one"
    mv -f "${dupes[0]}" "$DEST/$SMALL_SRC"
  fi
fi

# Everything else moves across under its own name.
for cs in "${CS[@]}"; do
  for f in "$STAGE/$cs"/*.zip; do
    [ -e "$f" ] || continue
    base="$(basename "$f")"
    [ "$base" = "$SMALL_SRC" ] && continue   # already placed above
    if [ -e "$DEST/$base" ]; then
      say "  WARNING: $base already exists in the destination; overwriting"
    fi
    say "  $base -> $DEST/"
    mv -f "$f" "$DEST/$base"
  done
done

# ---------------------------------------------------------------------------
# 6. Verify size + sha256, then integrity-test each archive
# ---------------------------------------------------------------------------
head2 "Step 6 - verification"

# name<TAB>bytes<TAB>sha256
read -r -d '' EXPECTED <<'TSV'
rcap-external-inputs-2026-08-10.zip	349919063	3db5d1e5ff9977bb7350e34561205a794191f9574a4e709d94e30b9606310196
nationwide-record-clearing-batch-2-2026-08-10.zip	146608236	8f462edf405118d57d77fdab7b454e5d2dcf0697a026afb662ab9effa3323079
nationwide-record-clearing-document-delivery-2026-08-10.zip	116978831	b1d46271ed03dcde4e85d58121684c79547eefc3207396e2b634168363f8ebd2
rcap-external-inputs-small-2026-08-10.zip	50576946	113f7aef8612e5e4b5a0278e2bf554a95076420edc5fdbb20cdfc00fd7afa03d
nationwide-record-clearing-2026-08-10.zip	902458	81921208a8b595ffa31f5a34302a477d2c0c8acb9cabc574c0dc1c3f5e891487
TSV

pass=0; fail=0
declare -a REPORT=()

while IFS=$'\t' read -r name want_size want_sha; do
  [ -n "$name" ] || continue
  path="$DEST/$name"
  printf '\n--- %s ---\n' "$name"

  if [ ! -f "$path" ]; then
    say "MISSING - the file never arrived."
    REPORT+=("MISMATCH  $name - file is missing")
    fail=$((fail + 1))
    continue
  fi

  got_size=$(stat -c%s "$path" 2>/dev/null || stat -f%z "$path")
  if [ "$got_size" = "$want_size" ]; then
    say "size    OK   $got_size bytes"
    size_ok=yes
  else
    say "size    BAD  got $got_size, expected $want_size"
    size_ok=no
  fi

  say "hashing (large files take a moment)..."
  got_sha=$(sha256sum "$path" | awk '{print $1}')
  if [ "$got_sha" = "$want_sha" ]; then
    say "sha256  OK   $got_sha"
    sha_ok=yes
  else
    say "sha256  BAD  got      $got_sha"
    say "             expected $want_sha"
    sha_ok=no
  fi

  if unzip -t "$path" >/dev/null 2>&1; then
    say "zip test OK  archive opens and every entry passes its CRC"
    zip_ok=yes
  else
    say "zip test BAD archive is corrupt or truncated"
    zip_ok=no
  fi

  if [ "$size_ok$sha_ok$zip_ok" = "yesyesyes" ]; then
    REPORT+=("MATCH     $name - size, checksum and integrity all good")
    pass=$((pass + 1))
  else
    reasons=""
    [ "$size_ok" = no ] && reasons="${reasons}wrong size; "
    [ "$sha_ok"  = no ] && reasons="${reasons}checksum differs; "
    [ "$zip_ok"  = no ] && reasons="${reasons}failed integrity test; "
    REPORT+=("MISMATCH  $name - ${reasons%; }")
    fail=$((fail + 1))
  fi
done <<< "$EXPECTED"

head2 "Plain English summary"
for line in "${REPORT[@]}"; do say "$line"; done
say ""
say "$pass of 5 files are exactly right; $fail need attention."
if [ "$fail" -eq 0 ]; then
  say "All five zips transferred intact. You are good to go."
else
  say "Re-run this script to retry the ones that failed - it re-copies everything"
  say "and overwrites in place, so a second pass usually clears a dropped transfer."
fi

exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
