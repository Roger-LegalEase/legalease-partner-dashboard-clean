#!/usr/bin/env bash
# Recover the pinned private source corpus into the git-ignored private tree.
#
# This is the recovery that was performed by hand during the 72-hour sprint,
# captured so it does not have to be rediscovered. A gitignored corpus behind an
# environment variable means the bytes live in exactly one place at a time, and
# that place has been a Codespace, a session scratchpad and an external drive at
# different points. Each move was invisible to the repository, because the
# repository only ever held receipts.
#
#   bash scripts/rcap-corpus/bootstrap-private-corpus.sh
#
# It refuses rather than guesses. A mismatched archive, a short extract or a
# source hash that does not match is a failure, not a warning, because a corpus
# that looks recovered and is not is worse than no corpus: every field map,
# census and fixture keyed to the old bytes would then describe a document that
# no longer exists.
#
# It never prints a token, and it never commits a byte.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# ---- the pin -----------------------------------------------------------------
RELEASE_REPO="Roger-LegalEase/legalease-source-artifacts"
RELEASE_TAG="source-corpus-2026-08-28"
ASSET_NAME="Expungement_AI_RCAP_Master_Library_Edition_1.zip"
ARCHIVE_SHA256="a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89"

# The Master Library install root. This is NOT the operational Nationwide tree;
# scripts/rcap-official-forms/operational-corpus-precondition.mjs refuses a
# Master Library mounted at the operational path by name, and is right to.
INSTALL_ROOT="private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"

EXPECT_JURISDICTIONS=51
EXPECT_FILES=499
EXPECT_PDFS=329

# Individual source hashes to prove, as "relative/path<TAB>sha256".
REQUESTED_SOURCES=$(cat <<'SOURCES'
STATES/OR/02_PACKET_FORMS/OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf	b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071
STATES/OR/04_SUPPORTING_PROCESS/OR__SUPPORT__OR-OSP-SET-ASIDE-CCH__oregon-state-police-set-aside-criminal-history-request-and-instructions__REV-2022-01__EN.pdf	a523a9ffc3eb0cc35d89e1c81df8eafcd703cf1ffdb4237a0106b72e1e793ac6
STATES/ND/04_SUPPORTING_PROCESS/ND__SUPPORT__SEALING-CRIMINAL-RECORDS-RESEARCH-GUIDE__sealing-criminal-records-or-closing-nonconviction__REV-UNKNOWN__EN.pdf	b39a0c1532bff3381382544a3888478835edb2109af597a2468a34e2a5f19a3c
SOURCES
)

fail() { echo "bootstrap-private-corpus: $*" >&2; exit 1; }

# ---- refuse to run anywhere the bytes could be committed ---------------------
git check-ignore -q private/ || fail "private/ is not git-ignored; refusing to extract source bytes into a tracked tree"

# ---- token, never printed ----------------------------------------------------
# Read from the environment only. Not echoed, not logged, not written to disk,
# and not passed on a command line where it would show up in a process list.
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
[ -n "$TOKEN" ] || fail "no GITHUB_TOKEN or GH_TOKEN in the environment; the release is private"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
ARCHIVE="$WORK/$ASSET_NAME"

echo "Resolving $ASSET_NAME from $RELEASE_REPO@$RELEASE_TAG ..."
ASSET_ID=$(
  curl -sS --fail-with-body \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$RELEASE_REPO/releases/tags/$RELEASE_TAG" \
  | node -e '
      let s = "";
      process.stdin.on("data", (d) => (s += d)).on("end", () => {
        const release = JSON.parse(s);
        const asset = (release.assets || []).find((a) => a.name === process.argv[1]);
        if (!asset) { process.stderr.write("asset not found in release\n"); process.exit(1); }
        process.stdout.write(String(asset.id));
      });
    ' "$ASSET_NAME"
) || fail "could not resolve the release asset (the token may lack access to $RELEASE_REPO)"

echo "Downloading (this is ~140 MB) ..."
curl -sSL --fail-with-body --max-time 900 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/octet-stream" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -o "$ARCHIVE" \
  "https://api.github.com/repos/$RELEASE_REPO/releases/assets/$ASSET_ID" \
  || fail "download failed"
unset TOKEN

# ---- refuse a mismatched archive --------------------------------------------
ACTUAL_ARCHIVE_SHA=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
if [ "$ACTUAL_ARCHIVE_SHA" != "$ARCHIVE_SHA256" ]; then
  fail "archive SHA-256 mismatch
  expected $ARCHIVE_SHA256
  actual   $ACTUAL_ARCHIVE_SHA
Nothing was extracted."
fi
echo "Archive SHA-256 verified: $ARCHIVE_SHA256"

# ---- extract only into the git-ignored private location ----------------------
STAGE="$WORK/extract"
mkdir -p "$STAGE"
unzip -q -o "$ARCHIVE" -d "$STAGE"
SRC="$STAGE/Expungement_AI_RCAP_Master_Library_Edition_1"
[ -d "$SRC" ] || fail "the archive did not contain the expected top-level directory"

mkdir -p "$(dirname "$INSTALL_ROOT")"
rm -rf "${INSTALL_ROOT:?}"
mv "$SRC" "$INSTALL_ROOT"
find "$INSTALL_ROOT" -name '.DS_Store' -delete 2>/dev/null || true
echo "Extracted to $INSTALL_ROOT"

# ---- verify the shape from disk ---------------------------------------------
JURISDICTIONS=$(find "$INSTALL_ROOT/STATES" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
FILES=$(find "$INSTALL_ROOT" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')
PDFS=$(find "$INSTALL_ROOT" -type f -iname '*.pdf' | wc -l | tr -d ' ')
echo "Verifying: jurisdictions=$JURISDICTIONS files=$FILES pdfs=$PDFS"
[ "$JURISDICTIONS" = "$EXPECT_JURISDICTIONS" ] || fail "expected $EXPECT_JURISDICTIONS jurisdictions, found $JURISDICTIONS"
[ "$FILES" = "$EXPECT_FILES" ] || fail "expected $EXPECT_FILES files, found $FILES"
[ "$PDFS" = "$EXPECT_PDFS" ] || fail "expected $EXPECT_PDFS PDFs, found $PDFS"

# ---- verify individual requested source hashes ------------------------------
MISSING=0
while IFS=$'\t' read -r rel want; do
  [ -n "$rel" ] || continue
  target="$INSTALL_ROOT/$rel"
  if [ ! -f "$target" ]; then
    echo "  NOT INSTALLED   $rel" >&2; MISSING=1; continue
  fi
  got=$(sha256sum "$target" | cut -d' ' -f1)
  if [ "$got" != "$want" ]; then
    echo "  SOURCE_MISMATCH $rel" >&2
    echo "                  expected $want" >&2
    echo "                  installed $got" >&2
    MISSING=1
  else
    echo "  verified        ${rel##*/}"
  fi
done <<< "$REQUESTED_SOURCES"
[ "$MISSING" = "0" ] || fail "one or more requested sources are absent or mismatched"

# ---- verify against the corpus's own governance checksums, when present ------
if [ -f "$INSTALL_ROOT/00_GOVERNANCE/CHECKSUMS.sha256" ]; then
  ( cd "$INSTALL_ROOT" && sha256sum -c 00_GOVERNANCE/CHECKSUMS.sha256 >/dev/null 2>&1 ) \
    && echo "Governance checksums verified." \
    || fail "the corpus does not verify against its own 00_GOVERNANCE/CHECKSUMS.sha256"
fi

# ---- write the environment record (git-ignored, no secrets) -----------------
cat > private/source-corpus-environment.txt <<ENVEOF
# LegalEase source corpus environment
# Written by scripts/rcap-corpus/bootstrap-private-corpus.sh
# Written: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# This file lives under private/ and is git-ignored. It contains no secrets.

# --- Master Library (Edition 1): the authoritative archive of official binaries
#   release   $RELEASE_TAG
#   repo      $RELEASE_REPO
#   asset     $ASSET_NAME
#   archive   $ARCHIVE_SHA256  (VERIFIED)
#   verified  $JURISDICTIONS jurisdictions / $FILES files / $PDFS PDFs
export RCAP_BUNDLE_EXTRACT="\$PWD/$INSTALL_ROOT"

# --- Operational Nationwide tree: what the platform builds packets from
# A DIFFERENT corpus, not carried by this release. Do not substitute the Master
# Library for it; the operational-corpus precondition refuses that by name.
# export OFFICIAL_FORMS_SOURCE_DIR="\$PWD/private/Nationwide Record Clearing"
ENVEOF
echo "Wrote private/source-corpus-environment.txt"

# ---- never commit private bytes ---------------------------------------------
TRACKED=$(git ls-files -- "$INSTALL_ROOT" | wc -l | tr -d ' ')
[ "$TRACKED" = "0" ] || fail "Git tracks $TRACKED file(s) under $INSTALL_ROOT; the corpus must never be committed"

echo
echo "Private corpus bootstrap complete."
echo "  export RCAP_BUNDLE_EXTRACT=\"\$PWD/$INSTALL_ROOT\""
