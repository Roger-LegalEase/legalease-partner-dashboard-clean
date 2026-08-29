#!/usr/bin/env bash
# Recover the immutable Colorado supplement into the git-ignored private tree.
#
# The base corpus arrives through bootstrap-private-corpus.sh and is pinned to
# source-corpus-2026-08-28. That release is incomplete for Colorado: JDF 611 and
# JDF 416 each name four filings and the corpus holds two of each, JDF 205 and
# JDF 206 are named by both guides and absent, and JDF 302 is the juvenile
# remedy's only petition and absent. Adding them to the base release would mean
# republishing its tag, moving the pin underneath every field map keyed to it.
#
# So they arrive here instead, with their own tag and their own archive digest,
# installed into their own root. The base tree is never touched, which is why the
# two bootstraps can run in either order and the base still verifies at exactly
# 51 jurisdictions, 499 files and 329 PDFs.
#
#   bash scripts/rcap-corpus/bootstrap-colorado-supplement.sh
#
# Like its sibling it refuses rather than guesses, and for the same reason: a
# supplement that looks recovered and is not is worse than no supplement, because
# a packet built from a plausible-looking document is a packet the clerk rejects.
#
# It never prints a token, and it never commits a byte.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

INDEX="scripts/rcap-corpus/colorado-supplement-index.json"

fail() { echo "bootstrap-colorado-supplement: $*" >&2; exit 1; }

command -v node >/dev/null || fail "node is required to read $INDEX"
[ -f "$INDEX" ] || fail "$INDEX not found"

# ---- the pin, read from the committed index rather than duplicated here ------
# Two copies of a digest are two chances to disagree.
read_index() { node -e '
  const i = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const get = (p) => p.split(".").reduce((o, k) => (o == null ? o : o[k]), i);
  process.stdout.write(String(get(process.argv[2]) ?? ""));
' "$INDEX" "$1"; }

RELEASE_REPO="$(read_index release.repository)"
RELEASE_TAG="$(read_index release.tag)"
ASSET_NAME="$(read_index release.assetName)"
ARCHIVE_SHA256="$(read_index release.archiveSha256)"
TOP_LEVEL="$(read_index archiveContract.topLevelDirectory)"
BASE_TAG="$(read_index relationshipToBaseCorpus.baseReleaseTag)"

INSTALL_ROOT="private/source-imports/$TOP_LEVEL"
BASE_ROOT="private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"

# ---- refuse while the supplement is unpublished ------------------------------
# An absent digest is the honest state before acquisition, and it is also the
# state in which nothing can be verified. Downloading anything here would mean
# trusting whatever the tag happens to hold.
if [ -z "$ARCHIVE_SHA256" ] || [ "$ARCHIVE_SHA256" = "null" ]; then
  cat >&2 <<MSG
bootstrap-colorado-supplement: $INDEX records no archive digest, so $RELEASE_TAG
has nothing this script could verify. Nothing was downloaded.

The seven Colorado filings have not been retrieved. The blocker is recorded in
  $INDEX  ->  acquisition
  data/rcap-all50/candidate-evidence/colorado/co-official-source-acquisition.json

To produce the supplement once official sources are reachable:
  node scripts/rcap-corpus/acquire-colorado-supplement.mjs --write-index
then publish the staged archive as the sole asset of tag $RELEASE_TAG and run
this script again.
MSG
  exit 3
fi

# ---- refuse to run anywhere the bytes could be committed ---------------------
git check-ignore -q private/ || fail "private/ is not git-ignored; refusing to extract source bytes into a tracked tree"

# ---- never touch the base release -------------------------------------------
[ "$RELEASE_TAG" != "$BASE_TAG" ] || fail "the supplement tag equals the base tag $BASE_TAG; that would republish the pinned release"
case "$INSTALL_ROOT" in
  "$BASE_ROOT"|"$BASE_ROOT"/*) fail "the supplement would install inside the base corpus at $BASE_ROOT" ;;
esac

# ---- token, never printed ----------------------------------------------------
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

echo "Downloading ..."
curl -sSL --fail-with-body --max-time 600 \
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
tar -xzf "$ARCHIVE" -C "$STAGE"
SRC="$STAGE/$TOP_LEVEL"
[ -d "$SRC" ] || fail "the archive did not contain the expected top-level directory $TOP_LEVEL"

mkdir -p "$(dirname "$INSTALL_ROOT")"
rm -rf "${INSTALL_ROOT:?}"
mv "$SRC" "$INSTALL_ROOT"
find "$INSTALL_ROOT" -name '.DS_Store' -delete 2>/dev/null || true
echo "Extracted to $INSTALL_ROOT"

# ---- verify the shape and every hash from disk ------------------------------
if [ -f "$INSTALL_ROOT/00_GOVERNANCE/CO_SUPPLEMENT_CHECKSUMS.sha256" ]; then
  ( cd "$INSTALL_ROOT" && sha256sum -c 00_GOVERNANCE/CO_SUPPLEMENT_CHECKSUMS.sha256 >/dev/null 2>&1 ) \
    && echo "Supplement checksums verified." \
    || fail "the supplement does not verify against its own 00_GOVERNANCE/CO_SUPPLEMENT_CHECKSUMS.sha256"
else
  fail "the supplement carries no 00_GOVERNANCE/CO_SUPPLEMENT_CHECKSUMS.sha256"
fi

# The committed index is the second, independent record. Agreement between it and
# the archive's own governance file is what makes either one evidence.
node scripts/rcap-corpus/verify-colorado-supplement.mjs --root "$INSTALL_ROOT" --base "$BASE_ROOT" \
  || fail "the installed supplement does not verify against $INDEX"

# ---- prove the base tree was not disturbed ----------------------------------
if [ -d "$BASE_ROOT" ]; then
  JURISDICTIONS=$(find "$BASE_ROOT/STATES" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
  FILES=$(find "$BASE_ROOT" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')
  PDFS=$(find "$BASE_ROOT" -type f -iname '*.pdf' | wc -l | tr -d ' ')
  [ "$JURISDICTIONS" = "51" ] && [ "$FILES" = "499" ] && [ "$PDFS" = "329" ] \
    || fail "the base corpus is no longer 51/499/329 (found $JURISDICTIONS/$FILES/$PDFS); the supplement must never modify it"
  echo "Base corpus untouched: 51 jurisdictions / 499 files / 329 PDFs."
fi

# ---- record the environment (git-ignored, no secrets) -----------------------
cat >> private/source-corpus-environment.txt <<ENVEOF

# --- Colorado supplement: the seven filings the base release does not carry
#   release   $RELEASE_TAG
#   repo      $RELEASE_REPO
#   asset     $ASSET_NAME
#   archive   $ARCHIVE_SHA256  (VERIFIED)
#   base      $BASE_TAG  (untouched, not republished)
export RCAP_CO_SUPPLEMENT_EXTRACT="\$PWD/$INSTALL_ROOT"
ENVEOF
echo "Appended the supplement record to private/source-corpus-environment.txt"

# ---- never commit private bytes ---------------------------------------------
TRACKED=$(git ls-files -- "$INSTALL_ROOT" | wc -l | tr -d ' ')
[ "$TRACKED" = "0" ] || fail "Git tracks $TRACKED file(s) under $INSTALL_ROOT; the supplement must never be committed"

echo
echo "Colorado supplement bootstrap complete."
echo "  export RCAP_CO_SUPPLEMENT_EXTRACT=\"\$PWD/$INSTALL_ROOT\""
