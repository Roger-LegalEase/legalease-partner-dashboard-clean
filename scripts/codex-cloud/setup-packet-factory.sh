#!/usr/bin/env bash
# LegalEase Packet Factory — Codex Cloud environment setup.
#
# This runs in the Codex Cloud SETUP phase, where a token is available and the
# network is open. The agent phase that follows has neither, so everything a
# packet worker needs must exist on disk before this script exits.
#
#   bash scripts/codex-cloud/setup-packet-factory.sh
#
# WHAT IT DELIBERATELY DOES NOT DO
#
# No git fetch, no git pull, no git push, no unshallow, no branch change, and no
# requirement that origin exist. Codex Cloud checks the selected Captain branch
# out as a local branch named `work`, shallow, and removes origin before the
# agent starts; the finished diff returns through the Codex UI rather than
# through a push. A setup script that reached for the network would fail on a
# checkout that is working exactly as designed.
#
# It refuses rather than guesses. A mismatched archive, a short extract or a
# corpus that disagrees with its own governance checksums is a failure, because
# a corpus that looks recovered and is not is worse than no corpus: every field
# map keyed to the old bytes would describe a document that no longer exists.
#
# It never prints the token, and it never commits a byte.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# ---- the pin -----------------------------------------------------------------
RELEASE_REPO="Roger-LegalEase/legalease-source-artifacts"
RELEASE_TAG="source-corpus-2026-08-28"
ASSET_NAME="Expungement_AI_RCAP_Master_Library_Edition_1.zip"
ARCHIVE_SHA256="a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89"

# The Master Library install root. NOT the operational Nationwide tree:
# scripts/rcap-official-forms/operational-corpus-precondition.mjs refuses a
# Master Library mounted at the operational path by name, and is right to.
INSTALL_ROOT="private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"

EXPECT_JURISDICTIONS=51
EXPECT_FILES=499
EXPECT_PDFS=329

HOME_ENV="$HOME/.legalease-corpus-env"

fail() { echo "setup-packet-factory: $*" >&2; exit 1; }

# ---- 1. dependencies ---------------------------------------------------------
echo "Installing dependencies ..."
npm ci --cache /tmp/legalease-npm-cache
node -e 'require.resolve("pdf-lib")' >/dev/null 2>&1 || fail "pdf-lib did not install; the factory cannot fill, measure or raster without it"

# ---- 1b. the browser, provisioned HERE because only here has a network -------
#
# ENV-RAS01. This script printed LEGALEASE_CODEX_CLOUD_READY without ever
# mentioning a browser, and four PF lanes then returned STOPPED after passing
# preflight -- two on `pdftoppm ENOENT`, two on "Playwright cannot find
# Chromium". Rastering is a required build step. A setup phase that leaves the
# agent phase without a browser has not set the environment up.
#
# The agent phase has no network, so provisioning is not available to a worker
# and a worker that reaches for apt-get or `playwright install` is working
# around this omission rather than fixing it. Discovery comes first: a Chromium
# already on the image is the one to use, and "the two RCAP variables are unset"
# is not evidence that none exists.
echo "Resolving a Chromium the packet lanes can rasterize with ..."
CHROMIUM_PATH="$(node --input-type=module -e '
  import { resolveChromium } from "./scripts/lib/pdf-page-raster.mjs";
  const r = resolveChromium();
  process.stdout.write(r.executablePath ?? "");
' 2>/dev/null || true)"

if [ -z "$CHROMIUM_PATH" ]; then
  echo "  none found on the image; provisioning the package-pinned Playwright Chromium"
  # The version comes from the committed package-lock, never from a floating
  # tag, so the browser this container gets is the browser the repository
  # declares. No apt-get: a distribution package is a different build with a
  # different rendering stack, and the calibration tolerances are measured
  # against this one.
  export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
  mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
  npx --yes playwright install chromium || fail "the Playwright CDN is unreachable from the SETUP phase. Provision a governed, pinned Chromium archive through the private release mechanism instead -- exact asset name, exact SHA-256, extracted under a git-ignored path, no browser bytes committed -- and do not fall back to apt-get or pdftoppm."
  CHROMIUM_PATH="$(node --input-type=module -e '
    import { resolveChromium } from "./scripts/lib/pdf-page-raster.mjs";
    const r = resolveChromium();
    process.stdout.write(r.executablePath ?? "");
  ' 2>/dev/null || true)"
fi

[ -n "$CHROMIUM_PATH" ] || fail "no executable Chromium after provisioning; the packet lanes cannot raster and this environment is not ready"
[ -f "$CHROMIUM_PATH" ] && [ -x "$CHROMIUM_PATH" ] || fail "$CHROMIUM_PATH is not an executable file; a directory satisfies the executable bit and is not a program"
CHROMIUM_BROWSERS_ROOT="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
echo "  chromium   $CHROMIUM_PATH"
echo "  registry   $CHROMIUM_BROWSERS_ROOT"

# ---- 2. the token, read from the environment and never printed ---------------
# Setup-phase only. Not echoed, not logged, not written to disk, and not passed
# on a command line where a process list would carry it.
TOKEN="${LEGALEASE_SOURCE_ARTIFACTS_TOKEN:-}"
[ -n "$TOKEN" ] || fail "LEGALEASE_SOURCE_ARTIFACTS_TOKEN is not set; the corpus release is private and this environment cannot reach it"

# ---- refuse to run anywhere the bytes could be committed ---------------------
git check-ignore -q private/ || fail "private/ is not git-ignored; refusing to extract source bytes into a tracked tree"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
ARCHIVE="$WORK/$ASSET_NAME"

# ---- 3. download the governed release ----------------------------------------
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

# ---- 4. verify the archive before anything is extracted ----------------------
ACTUAL_ARCHIVE_SHA=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
if [ "$ACTUAL_ARCHIVE_SHA" != "$ARCHIVE_SHA256" ]; then
  fail "archive SHA-256 mismatch
  expected $ARCHIVE_SHA256
  actual   $ACTUAL_ARCHIVE_SHA
Nothing was extracted."
fi
echo "Archive SHA-256 verified: $ARCHIVE_SHA256"

# ---- 5. extract, only into the git-ignored private location ------------------
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

# ---- 6. verify the shape from disk -------------------------------------------
JURISDICTIONS=$(find "$INSTALL_ROOT/STATES" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
FILES=$(find "$INSTALL_ROOT" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')
PDFS=$(find "$INSTALL_ROOT" -type f -iname '*.pdf' | wc -l | tr -d ' ')
echo "Verifying: jurisdictions=$JURISDICTIONS files=$FILES pdfs=$PDFS"
[ "$JURISDICTIONS" = "$EXPECT_JURISDICTIONS" ] || fail "expected $EXPECT_JURISDICTIONS jurisdictions, found $JURISDICTIONS"
[ "$FILES" = "$EXPECT_FILES" ] || fail "expected $EXPECT_FILES files, found $FILES"
[ "$PDFS" = "$EXPECT_PDFS" ] || fail "expected $EXPECT_PDFS PDFs, found $PDFS"

if [ -f "$INSTALL_ROOT/00_GOVERNANCE/CHECKSUMS.sha256" ]; then
  ( cd "$INSTALL_ROOT" && sha256sum -c 00_GOVERNANCE/CHECKSUMS.sha256 >/dev/null 2>&1 ) \
    && echo "Governance checksums verified." \
    || fail "the corpus does not verify against its own 00_GOVERNANCE/CHECKSUMS.sha256"
fi

# ---- 7. the corpus environment, in both places -------------------------------
# Two copies on purpose. The repo-local file is what a worker sources and what
# the preflight looks for; the home copy survives a change of working directory,
# which is where a mounted corpus was lost before.
write_env() {
  cat <<ENVEOF
# LegalEase source corpus environment
# Written by scripts/codex-cloud/setup-packet-factory.sh
# Written: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Git-ignored where it sits in the repository. It contains no secrets.

# --- Master Library (Edition 1): the authoritative archive of official binaries
#   release   $RELEASE_TAG
#   repo      $RELEASE_REPO
#   asset     $ASSET_NAME
#   archive   $ARCHIVE_SHA256  (VERIFIED)
#   verified  $JURISDICTIONS jurisdictions / $FILES files / $PDFS PDFs
export RCAP_BUNDLE_EXTRACT="$REPO_ROOT/$INSTALL_ROOT"
export MASTER_LIBRARY_SOURCE_DIR="$REPO_ROOT/$INSTALL_ROOT"

# --- The packet rasterizer's browser, resolved and PROVEN during setup.
# Both are exported because they answer different questions: the registry root
# is where Playwright's own resolver looks, and the exact executable is what
# the render launches. A worker that has to discover either one is a worker
# reaching for a network it does not have.
export PLAYWRIGHT_BROWSERS_PATH="$CHROMIUM_BROWSERS_ROOT"
export RCAP_CHROMIUM_PATH="$CHROMIUM_PATH"

# --- Operational Nationwide tree: what the platform builds packets from
# A DIFFERENT corpus, not carried by this release. Do not substitute the Master
# Library for it; the operational-corpus precondition refuses that by name.
# export OFFICIAL_FORMS_SOURCE_DIR="$REPO_ROOT/private/Nationwide Record Clearing"
ENVEOF
}
mkdir -p private
write_env > private/source-corpus-environment.txt
write_env > "$HOME_ENV"
echo "Wrote private/source-corpus-environment.txt and $HOME_ENV"

# ---- 8. private/ stays ignored, and tracks nothing ---------------------------
git check-ignore -q private/ || fail "private/ stopped being git-ignored during setup"
TRACKED=$(git ls-files -- private/ | wc -l | tr -d ' ')
[ "$TRACKED" = "0" ] || fail "Git tracks $TRACKED path(s) under private/; the corpus must never be committed"

# ---- 8b. the runtime, proven by running it -----------------------------------
#
# A path-only check is insufficient and this is the evidence for that: the
# preflight passed on any path satisfying the executable bit, and both a
# headless_shell (which has no PDF viewer) and a directory passed it. The probe
# launches the resolved browser, rasterizes a synthetic one-page PDF through the
# lanes' own code path, and requires a PNG, paper bounds and a calibration
# residual inside tolerance. If it refuses, this setup refuses: a container that
# says ready and cannot raster costs a whole lane.
echo
echo "Proving the packet runtime ..."
PLAYWRIGHT_BROWSERS_PATH="$CHROMIUM_BROWSERS_ROOT" RCAP_CHROMIUM_PATH="$CHROMIUM_PATH" \
  node scripts/codex-cloud/verify-packet-runtime.mjs \
  || fail "the resolved Chromium cannot rasterize a PDF page. This environment is not ready and no packet may be built in it."

# ---- 9. say so ---------------------------------------------------------------
echo
echo "  corpus     $INSTALL_ROOT"
echo "  verified   $JURISDICTIONS jurisdictions / $FILES files / $PDFS PDFs"
echo "  chromium   $CHROMIUM_PATH (rasterized a page)"
echo "  env        private/source-corpus-environment.txt, $HOME_ENV"
echo "  git        untouched — no fetch, no pull, no push, no unshallow, no branch change"
echo
echo "LEGALEASE_CODEX_CLOUD_READY"
