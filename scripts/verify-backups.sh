#!/usr/bin/env bash
#
# Identify, rename and verify the five RCAP backup zips.
#
# Point it at a folder (defaults to ~/Downloads). It hashes every .zip it
# finds, works out which archive each one actually is, renames it to the
# canonical name, and tells you what is still missing.
#
# Filenames do not matter - a browser-mangled "foo-2.zip" is identified by
# content, not by what it is called.
#
#   bash verify-backups.sh [FOLDER]

set -uo pipefail

DIR="${1:-$HOME/Downloads}"
cd "$DIR" 2>/dev/null || { echo "No such folder: $DIR"; exit 1; }

# sha256<SP><SP>bytes<SP>canonical-name
read -r -d '' MANIFEST <<'EOF'
3db5d1e5ff9977bb7350e34561205a794191f9574a4e709d94e30b9606310196 349919063 rcap-external-inputs-2026-08-10.zip
8f462edf405118d57d77fdab7b454e5d2dcf0697a026afb662ab9effa3323079 146608236 nationwide-record-clearing-batch-2-2026-08-10.zip
b1d46271ed03dcde4e85d58121684c79547eefc3207396e2b634168363f8ebd2 116978831 nationwide-record-clearing-document-delivery-2026-08-10.zip
113f7aef8612e5e4b5a0278e2bf554a95076420edc5fdbb20cdfc00fd7afa03d 50576946 rcap-external-inputs-small-2026-08-10.zip
81921208a8b595ffa31f5a34302a477d2c0c8acb9cabc574c0dc1c3f5e891487 902458 nationwide-record-clearing-2026-08-10.zip
EOF

# macOS ships shasum; most Linux boxes ship sha256sum.
if command -v sha256sum >/dev/null 2>&1; then
  hashof() { sha256sum "$1" | awk '{print $1}'; }
else
  hashof() { shasum -a 256 "$1" | awk '{print $1}'; }
fi
sizeof() { stat -c%s "$1" 2>/dev/null || stat -f%z "$1"; }

lookup_name() { awk -v h="$1" '$1==h {print $3}' <<<"$MANIFEST"; }
lookup_size() { awk -v h="$1" '$1==h {print $2}' <<<"$MANIFEST"; }

echo "Looking in: $PWD"
echo

shopt -s nullglob
zips=(*.zip)
if [ "${#zips[@]}" -eq 0 ]; then
  echo "No .zip files here at all."
else
  echo "Checking ${#zips[@]} zip file(s). Hashing the big ones takes a moment..."
  echo
fi

declare -a JUNK=()
for f in "${zips[@]}"; do
  [ -f "$f" ] || continue
  h="$(hashof "$f")"
  want="$(lookup_name "$h")"

  if [ -n "$want" ]; then
    if [ "$f" = "$want" ]; then
      echo "  OK       $f"
    elif [ -e "$want" ] && [ "$(hashof "$want")" = "$h" ]; then
      echo "  OK       $want  (duplicate '$f' can be deleted)"
    else
      mv -f "$f" "$want"
      echo "  RENAMED  $f  ->  $want"
    fi
  else
    sz="$(sizeof "$f")"
    # Is it a short copy of something we know about?
    partial=""
    while read -r mh msz mn; do
      [ -n "$mh" ] || continue
      if [ "$sz" -lt "$msz" ] && [ "${f%%-[0-9].zip}" != "${f}" -o -n "$mn" ]; then
        case "$f" in
          *"${mn%-2026-08-10.zip}"*) partial="$mn ($sz of $msz bytes)"; break;;
        esac
      fi
    done <<<"$MANIFEST"

    if [ -n "$partial" ]; then
      echo "  TRUNCATED $f  - looks like an incomplete $partial"
    else
      echo "  UNKNOWN  $f  ($sz bytes) - not one of the five"
    fi
    JUNK+=("$f")
  fi
done

echo
echo "=== Where you stand ==="
have=0; missing=()
while read -r mh msz mn; do
  [ -n "$mh" ] || continue
  if [ -f "$mn" ] && [ "$(hashof "$mn")" = "$mh" ]; then
    echo "  HAVE     $mn"
    have=$((have + 1))
  else
    echo "  MISSING  $mn  ($msz bytes)"
    missing+=("$mn")
  fi
done <<<"$MANIFEST"

echo
echo "$have of 5 verified."

if [ "${#JUNK[@]}" -gt 0 ]; then
  echo
  echo "These are junk or incomplete - delete them and re-download:"
  for j in "${JUNK[@]}"; do echo "  rm '$j'"; done
fi

if [ "$have" -eq 5 ]; then
  echo
  echo "All five are here and byte-perfect. You are done."
  echo "If one won't open by double-clicking, that's macOS Archive Utility,"
  echo "not the file. Use:  unzip '<name>.zip' -d '<name>'"
  exit 0
fi

echo
echo "Still to get:"
for m in "${missing[@]}"; do echo "  $m"; done
exit 1
