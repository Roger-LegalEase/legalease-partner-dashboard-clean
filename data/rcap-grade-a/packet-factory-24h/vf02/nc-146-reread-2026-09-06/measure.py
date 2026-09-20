#!/usr/bin/env python3
"""Read-only NC fixture measurements; run from repository root, output JSON to stdout.

This checks artifact text, identities and disclosures. Visual findings and source
availability are recorded separately; this script grants no packet acceptance.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path.cwd()
FAMILY = "nc_146_dismissal_petition-set"
ROUTE = "obligation:track-only:NC:nc_146_dismissal_petition"
DIR = ROOT / "data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill"


def read(name):
    return json.loads((DIR / name).read_text())


def digest(data):
    return hashlib.sha256(data).hexdigest()


def norm(text):
    return " ".join(text.split())


def occurrences(page, value):
    words = page.findall("{*}word")
    target = value.split()
    matches = []
    for start in range(len(words) - len(target) + 1):
        selected = words[start:start + len(target)]
        if [w.text for w in selected] == target:
            matches.append({
                "text": value,
                "bboxPointsFromTopLeft": [
                    min(float(w.attrib["xMin"]) for w in selected),
                    min(float(w.attrib["yMin"]) for w in selected),
                    max(float(w.attrib["xMax"]) for w in selected),
                    max(float(w.attrib["yMax"]) for w in selected),
                ],
            })
    return matches


expected = {
    "canonical": ["Jordan Avery Reyes", "42 Larkspur Street", "Raleigh", "NC", "27601", "1991-04-17", "19CR001184", "Wake", "919-555-0142"],
    "boundary": ["Maria-Alejandra O'Shaughnessy-Whitfield", "1188 Upper Yadkin River Crossing Road, Apartment 14B", "Winston-Salem", "NC", "27101-2214", "1968-12-31", "2004CR000000118844-A", "New Hanover", "(336) 555-0199 ext. 4417"],
}
report = {"family": FAMILY, "routeKey": ROUTE, "method": "SHA-256 of current bytes; Poppler pdftotext -bbox current PDF text positions; exact committed object hashing; field-label disclosure comparison", "fixtures": [], "committedObjectBindings": []}
artifacts = read("reports/rendered-artifacts.json")
for fixture, facts in expected.items():
    pdf = DIR / "fixtures" / (fixture + ".pdf")
    raw = pdf.read_bytes()
    recorded = next(row for row in artifacts["pdfs"] if row["fixture"] == fixture)
    assert digest(raw) == recorded["sha256"] and len(raw) == recorded["byteLength"]
    result = subprocess.run(["pdftotext", "-bbox", str(pdf), "-"], capture_output=True, check=True)
    text = result.stdout.decode()
    # Poppler emits source-font BEL characters that XML 1.0 cannot parse.
    # Remove only invalid XML controls, preserving all printable text and positions.
    controls = [character for character in text if ord(character) < 32 and character not in "\t\n\r"]
    text = "".join(character for character in text if ord(character) >= 32 or character in "\t\n\r")
    pages = ET.fromstring(text).findall(".//{*}page")
    assert len(pages) == recorded["pageCount"] == 5
    writes = []
    for page_number in (1, 4):
        for value in facts[:8 if page_number == 1 else 9]:
            matches = occurrences(pages[page_number - 1], value)
            assert len(matches) == 1, (fixture, page_number, value, matches)
            writes.append({"packetPage": page_number, **matches[0]})
    assert len(writes) == 17
    other = expected["boundary" if fixture == "canonical" else "canonical"][0]
    assert not any(occurrences(page, other) for page in pages), "cross-fixture participant name"
    assert all(not occurrences(pages[number - 1], facts[0]) for number in (2, 3, 5))
    report["fixtures"].append({"fixture": fixture, "sha256": digest(raw), "byteLength": len(raw), "pages": 5, "xmlInvalidControlsRemoved": {"count": len(controls), "codepoints": sorted(set(ord(character) for character in controls))}, "expectedKnownWritesLocated": len(writes), "otherParticipantNameAbsent": True, "participantNameAbsentOnCourtInstructionAndJuratPages": True, "writes": writes})

receipt = read("source-receipt.json")
for record in receipt["committedRecords"]:
    obj = record["exactObject"]
    contents = json.loads((ROOT / record["pathInRepository"]).read_text())
    collection, key = ("packetSets", "packetSetId") if obj["kind"] == "packetSet" else ("tracks", "trackId")
    selected = next(row for row in contents[collection] if row[key] == obj["id"])
    raw = (json.dumps(selected, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode()
    actual = digest(raw)
    assert actual == obj["canonicalObjectSha256"]
    report["committedObjectBindings"].append({"path": record["pathInRepository"], "id": obj["id"], "sha256": actual, "exact": True})
    if obj["kind"] == "track":
        report["governedSelfHelpStopConditions"] = selected["selfHelpStopConditions"]

field_map = read("production-field-map.json")
instructions = (DIR / "participant-instructions.md").read_text()
labels = [row["disclosureLabel"] for row in field_map["requiredBeforeFiling"]]
missing = [label for label in labels if norm(label) not in norm(instructions)]
assert len(labels) == 59 and not missing, missing
assert "Write your ZIP code and your date of birth on Side One yourself" not in instructions
assert "Your ZIP code and your date of birth on Side One are filled in" in instructions
report["requiredBeforeFiling"] = {"declared": len(labels), "labelsDisclosed": len(labels), "missingLabels": missing, "falseZipDobStepAbsent": True, "filledZipDobDisclosurePresent": True}
stop_section = instructions.split("## When to stop and get help\n", 1)[1].split("\n## ", 1)[0]
report["selfHelpStopSection"] = stop_section.strip()
report["deferredOrConditionalDismissalMentionedInStopSection"] = any(term in stop_section.lower() for term in ("deferred prosecution", "conditional discharge"))
universe = json.loads((ROOT / "data/rcap-grade-a/route-obligation-census-candidate/canonical-route-universe.json").read_text())
route = next(row for row in universe["canonicalObligations"] if row["routeKey"] == ROUTE)
assert route["jurisdiction"] == "NC"
assert receipt["routeKeys"] == field_map["routeKeys"] == read("product-wiring.json")["routeKeys"] == [ROUTE]
assert receipt["familyId"] == field_map["familyId"] == read("product-wiring.json")["family"] == FAMILY
report["routeIdentityAgrees"] = True
print(json.dumps(report, indent=2) + "\n", end="")
