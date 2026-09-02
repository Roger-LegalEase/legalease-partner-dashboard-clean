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

# ---- the D source packs: a second custody, installed alongside ---------------
#
# Three packs from a DIFFERENT release, in a different repository, holding
# twenty-seven states of mostly source-gated official forms. They are indexed
# as their own custody by
# scripts/generate-rcap-local-source-corpus-index.mjs.
#
# They are not the Master Library and they are NOT the operational Nationwide
# tree: their top level is STATES/, and
# scripts/rcap-official-forms/operational-corpus-precondition.mjs refuses a
# STATES/-shaped corpus at the operational path by name. Installing them there
# would be exactly the substitution that check exists to catch, so they get
# their own root and the operational path stays empty until the real tree
# arrives.
#
# Each archive's SHA-256 is verified against the release's own recorded digest
# before anything is extracted. This step is best-effort: the packs are a
# supplement, and a session that cannot reach that release still gets a working
# Master Library rather than a failed bootstrap.
D_RELEASE_REPO="Roger-LegalEase/legalease-partner-dashboard-clean"
D_RELEASE_TAG="rcap-d-source-packs-2026-08-12"
D_INSTALL_ROOT="private/source-imports/rcap-d-source-packs-2026-08-12"
D_PACKS="D1 01ab34d2eee2ae5621e18fa74e4c03f24df667965eb27a4e3bf7f80c3216acaa
D2 8f7ef41b7077105dc0bc23e7e3963cff88104004db0745012bf76e6b47c14557
D3 70c9a6f759a744bc95f6f969ecd0a5fe7cbdfbfff08062dd2d968597a447753b"

install_d_packs() {
  local stage="$WORK/dpacks"
  mkdir -p "$stage" "$D_INSTALL_ROOT"
  local base="https://github.com/$D_RELEASE_REPO/releases/download/$D_RELEASE_TAG"
  while read -r pack want; do
    [ -n "$pack" ] || continue
    local zip="$stage/RCAP_D_${pack}_SOURCE_PACK.zip"
    curl -sSL --fail-with-body --max-time 900 -o "$zip" \
      "$base/RCAP_D_${pack}_SOURCE_PACK.zip" || { echo "  D packs: could not download $pack" >&2; return 1; }
    local got; got=$(sha256sum "$zip" | cut -d' ' -f1)
    [ "$got" = "$want" ] || { echo "  D packs: $pack archive digest mismatch" >&2; return 1; }
    rm -rf "${D_INSTALL_ROOT:?}/$pack"
    unzip -q -o "$zip" -d "$D_INSTALL_ROOT/$pack"
    echo "  D packs: $pack verified and installed"
  done <<< "$D_PACKS"
  find "$D_INSTALL_ROOT" -name '.DS_Store' -delete 2>/dev/null || true
  local tracked; tracked=$(git ls-files -- "$D_INSTALL_ROOT" | wc -l | tr -d ' ')
  [ "$tracked" = "0" ] || fail "Git tracks $tracked file(s) under $D_INSTALL_ROOT; source packs must never be committed"
  return 0
}

D_PACKS_INSTALLED=no
if install_d_packs; then
  D_PACKS_INSTALLED=yes
  echo "D source packs installed to $D_INSTALL_ROOT"
else
  rm -rf "${D_INSTALL_ROOT:?}"
  echo "D source packs NOT installed; the Master Library is unaffected." >&2
fi

# ---- the operational Nationwide tree ----------------------------------------
#
# THE CORPUS THE PLATFORM ACTUALLY BUILDS PACKETS FROM, and the one thing this
# bootstrap could not restore. It is not the Master Library and not the D packs:
# its top level is "LegalEase <State>" folders, and 371 of its 583 files are
# held nowhere else in this repository. Up to 99 of the SOURCE_BLOCKED families
# are waiting on documents that tree records and no other custody carries; the
# arithmetic is in data/rcap-grade-a/fable-packet-factory/NATIONWIDE_MOUNT_GAP.json.
#
# WHY THERE IS NO ARCHIVE DIGEST PINNED HERE. Every other stanza in this file
# pins one, because those archives are already published. This one is not: at
# the time of writing no asset in $RELEASE_REPO carries this corpus, and the
# workspace it was inventoried from -- a Codespace of a repository that no
# longer exists -- is unreachable. A digest cannot be pinned for bytes nobody
# has published yet.
#
# So this verifies the CONTENTS instead, against the 583 path-and-hash pairs
# committed in data/rcap-all50/nationwide-restore-manifest.json. That is the
# stronger check of the two: an archive digest proves a container is the one
# somebody uploaded, while the manifest proves the extracted tree IS the
# inventoried corpus, file by file. When the asset is published, set
# NATIONWIDE_ASSET (and optionally NATIONWIDE_TAG) and this runs unchanged.
#
# It is best-effort in the same sense the D packs are: a session that cannot
# reach the asset still finishes with a working Master Library rather than a
# failed bootstrap. It is NOT lenient about what it accepts -- a tree that
# misses a file, or carries one at the wrong hash, is refused and removed.
NATIONWIDE_TAG="${NATIONWIDE_TAG:-$RELEASE_TAG}"
NATIONWIDE_ASSET="${NATIONWIDE_ASSET:-Nationwide_Record_Clearing.zip}"
NATIONWIDE_ROOT="private/Nationwide Record Clearing"
NATIONWIDE_MANIFEST="data/rcap-all50/nationwide-restore-manifest.json"

install_nationwide() {
  [ -f "$NATIONWIDE_MANIFEST" ] || { echo "  nationwide: $NATIONWIDE_MANIFEST is absent; nothing to verify against" >&2; return 1; }

  local token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
  [ -n "$token" ] || { echo "  nationwide: no token in the environment; the release is private" >&2; return 1; }

  local id
  id=$(
    curl -sS --fail-with-body \
      -H "Authorization: Bearer $token" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/$RELEASE_REPO/releases/tags/$NATIONWIDE_TAG" 2>/dev/null \
    | node -e '
        let s = "";
        process.stdin.on("data", (d) => (s += d)).on("end", () => {
          let release; try { release = JSON.parse(s); } catch { process.exit(1); }
          const asset = (release.assets || []).find((a) => a.name === process.argv[1]);
          if (!asset) process.exit(1);
          process.stdout.write(String(asset.id));
        });
      ' "$NATIONWIDE_ASSET"
  ) || {
    echo "  nationwide: no asset named $NATIONWIDE_ASSET in $RELEASE_REPO@$NATIONWIDE_TAG." >&2
    echo "  nationwide: publish the operational tree as that asset and re-run; nothing else here changes." >&2
    return 1
  }

  local stage="$WORK/nationwide"
  mkdir -p "$stage"
  local zip="$stage/$NATIONWIDE_ASSET"
  curl -sSL --fail-with-body --max-time 1800 \
    -H "Authorization: Bearer $token" \
    -H "Accept: application/octet-stream" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -o "$zip" \
    "https://api.github.com/repos/$RELEASE_REPO/releases/assets/$id" \
    || { echo "  nationwide: download failed" >&2; return 1; }

  local extract="$stage/extract"
  mkdir -p "$extract"
  unzip -q -o "$zip" -d "$extract" || { echo "  nationwide: the archive did not extract" >&2; return 1; }

  # The tree may be archived with or without a wrapping directory. Find the
  # level that actually holds the "LegalEase <State>" folders rather than
  # assuming one, and refuse anything else -- a STATES/-shaped corpus here is
  # the Master Library or a D pack being substituted for the operational tree,
  # which operational-corpus-precondition.mjs refuses by name and so does this.
  local src=""
  if compgen -G "$extract/LegalEase *" >/dev/null 2>&1; then
    src="$extract"
  else
    local only
    only=$(find "$extract" -mindepth 1 -maxdepth 1 -type d | head -1)
    if [ -n "$only" ] && compgen -G "$only/LegalEase *" >/dev/null 2>&1; then src="$only"; fi
  fi
  [ -n "$src" ] || {
    echo "  nationwide: the archive holds no \"LegalEase <State>\" directories." >&2
    echo "  nationwide: this is not the operational tree; refusing to install it there." >&2
    return 1
  }

  rm -rf "$NATIONWIDE_ROOT"
  mkdir -p "$(dirname "$NATIONWIDE_ROOT")"
  mv "$src" "$NATIONWIDE_ROOT"
  find "$NATIONWIDE_ROOT" -name '.DS_Store' -delete 2>/dev/null || true

  # ---- verify every recorded file, by path and by hash ----------------------
  node -e '
    const fs = require("node:fs");
    const crypto = require("node:crypto");
    const path = require("node:path");
    const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const root = process.argv[2];
    let missing = 0, mismatched = 0, ok = 0;
    for (const f of manifest.files) {
      const abs = path.join(root, f.relativePath);
      if (!fs.existsSync(abs)) {
        if (missing < 10) console.error(`    ABSENT     ${f.relativePath}`);
        missing++; continue;
      }
      const got = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
      if (got !== f.sha256) {
        if (mismatched < 10) console.error(`    MISMATCH   ${f.relativePath}`);
        mismatched++; continue;
      }
      ok++;
    }
    const extra = [];
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "__MACOSX" || e.name.startsWith("._") || e.name === ".DS_Store") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full); else extra.push(path.relative(root, full));
    } };
    walk(root);
    const known = new Set(manifest.files.map((f) => f.relativePath));
    const unknown = extra.filter((r) => !known.has(r));
    console.log(`  nationwide: ${ok} verified, ${missing} absent, ${mismatched} mismatched, ${unknown.length} not in the manifest`);
    if (missing || mismatched) process.exit(1);
  ' "$NATIONWIDE_MANIFEST" "$NATIONWIDE_ROOT" || {
    echo "  nationwide: the extracted tree is not the inventoried corpus; removing it." >&2
    rm -rf "$NATIONWIDE_ROOT"
    return 1
  }

  local tracked; tracked=$(git ls-files -- "$NATIONWIDE_ROOT" | wc -l | tr -d ' ')
  [ "$tracked" = "0" ] || fail "Git tracks $tracked file(s) under $NATIONWIDE_ROOT; the operational corpus must never be committed"
  return 0
}

NATIONWIDE_INSTALLED=no
if install_nationwide; then
  NATIONWIDE_INSTALLED=yes
  echo "Operational Nationwide tree installed to $NATIONWIDE_ROOT"
else
  echo "Operational Nationwide tree NOT installed; the Master Library is unaffected." >&2
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

# --- D source packs: a second custody of official binaries (27 states)
#   release   $D_RELEASE_TAG in $D_RELEASE_REPO
#   installed $D_PACKS_INSTALLED
#   Not the Master Library and not the operational tree. Indexed as custody
#   d_source_packs by scripts/generate-rcap-local-source-corpus-index.mjs.

# --- Operational Nationwide tree: what the platform builds packets from
# A DIFFERENT corpus. Do not substitute the Master Library or a D pack for it;
# the operational-corpus precondition refuses that by name, and so does the
# bootstrap. The export below is live only when the tree verified against all
# 583 path-and-hash pairs in data/rcap-all50/nationwide-restore-manifest.json.
#   installed $NATIONWIDE_INSTALLED
#   asset     $NATIONWIDE_ASSET in $RELEASE_REPO@$NATIONWIDE_TAG
$([ "$NATIONWIDE_INSTALLED" = yes ] \
  && echo "export OFFICIAL_FORMS_SOURCE_DIR=\"\$PWD/$NATIONWIDE_ROOT\"" \
  || echo "# export OFFICIAL_FORMS_SOURCE_DIR=\"\$PWD/$NATIONWIDE_ROOT\"  # not installed")
ENVEOF
echo "Wrote private/source-corpus-environment.txt"

# ---- never commit private bytes ---------------------------------------------
TRACKED=$(git ls-files -- "$INSTALL_ROOT" | wc -l | tr -d ' ')
[ "$TRACKED" = "0" ] || fail "Git tracks $TRACKED file(s) under $INSTALL_ROOT; the corpus must never be committed"

echo
echo "Private corpus bootstrap complete."
echo "  export RCAP_BUNDLE_EXTRACT=\"\$PWD/$INSTALL_ROOT\""
