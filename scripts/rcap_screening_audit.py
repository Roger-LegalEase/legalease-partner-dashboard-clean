#!/usr/bin/env python3
"""
rcap_screening_audit.py
=======================

Rule-grounded screening-friction audit for Expungement.ai / RCAP profiles.

WHAT THIS IS
------------
A standalone, dependency-free script that reads the rule-level jurisdiction profiles and, for
every consumer-facing screening question, decides mechanically whether that question is safe to
move/remove or must stay pre-payment. It exists so that NO question-movement or de-dup decision
is ever made from a question's wording again. The wording lies; the rules don't.

This script was distilled from the analysis that, across review, repeatedly caught errors that
prose-level reasoning missed (e.g. `state_exclusion_categories` looks movable by a naive
fieldsReferenced check but gates exclusions through a separate structure).

WHAT IT CHECKS (profile-level truth)
------------------------------------
For each field it determines whether the field is referenced by ANY condition-bearing structure:
  - orderedDecisionRules  (when.fieldsReferenced / requiredFields)
  - exclusionRules        (eligibility exclusions)
  - waitingPeriodRules    (timing gates)
  - packetPlan / packetGenerator requiredInputIds
It then classifies every consumer question into:
  - ELIGIBILITY      : rule/stage referenced -> MUST stay pre-payment
  - DEDUP_DUPLICATE  : redundant twin of another field collected in the same profile
  - PACKET_DATA      : sole-collection logistics field, not referenced -> possible post-pay (review)
  - READINESS_GAUGE  : "do you have your records" type -> keep pre-payment (paid-wall risk)

WHAT IT CANNOT CHECK (must run in the repo via Codex)
-----------------------------------------------------
This script reads PROFILES only. It cannot see evaluator.ts, packet-generation.ts, field-map
renderers, or any TypeScript that may read an answer id directly. A field can be unreferenced in
every profile structure and STILL be consumed by code. The repo-native twin of this script
(scripts/audit-all51-rule-grounded-screening-friction.mjs) must add that evaluator/packet-code
read-path check. Fields this script marks PACKET_DATA or DEDUP_DUPLICATE are therefore
"profile-clean", not "proven safe": the code read-path is the final gate.

USAGE
-----
  python3 rcap_screening_audit.py /path/to/profiles            # full report
  python3 rcap_screening_audit.py /path/to/profiles --json     # machine-readable
  python3 rcap_screening_audit.py /path/to/profiles --check county_or_filing_location,case_identifier
        # CI mode: exit non-zero if any named field is rule-referenced anywhere (i.e. NOT safe to move)

EXIT CODES
----------
  0  ok / all --check fields are unreferenced (profile-level safe)
  1  a --check field is rule-referenced in at least one state (NOT safe; see output)
  2  bad usage / no profiles found
"""

import json
import os
import re
import sys
import glob

# --- configuration: which stages are eligibility-bearing vs potentially-movable ---------------

ELIGIBILITY_STAGES = {
    "scope", "pathway_routing", "state_specific_eligibility", "special_pathways",
    "timing_and_completion", "timing", "exclusion_screen", "exclusions",
    "legal_eligibility", "automatic_relief",
}
LOGISTICS_STAGES = {
    "case_details", "record_readiness", "filing_details",
    "packet_preparation", "form_details", "document_collection",
}

# Scope gates we never move regardless of stage.
NEVER_MOVE = {"ownership_scope", "jurisdiction_scope"}

# Readiness gauges: ask whether the user HAS records / can proceed. Not packet-data values.
# Moving these after payment creates a "paid, then hit a wall" failure. Keep pre-payment.
READINESS_FIELDS = {"record_documents", "criminal_history"}

# Known duplicate-fact pairs: movable field -> the eligibility-named twin of the same fact.
TWIN = {
    "county_or_filing_location": "county",
    "case_identifier": "case_number",
}

# Structures that can make a field eligibility-bearing.
RULE_KEYS = ["orderedDecisionRules", "exclusionRules", "waitingPeriodRules"]

BLOCKING_OUTCOMES = {
    "hard_stop", "guidance_only", "not_yet", "likely_not_eligible",
    "needs_review", "needs_more_info", "not_covered_yet",
}
RESULT_CODE_RE = re.compile(
    r"(packet_ready_with_caution|packet_ready|needs_more_info|not_yet|guidance_only|"
    r"not_covered_yet|likely_not_eligible|needs_review|hard_stop)"
)


# --- core extraction ---------------------------------------------------------------------------

def consumer_questions(profile):
    """Questions shown to the user (raw source_question_* eval rows are not screens)."""
    return [q for q in profile.get("questions", [])
            if not q.get("id", "").startswith("source_question_")]


def referenced_fields(profile):
    """
    Return {field_id: set(outcome_codes)} for every field that appears in a condition-bearing
    structure. Scans orderedDecisionRules + exclusionRules + waitingPeriodRules, reading both
    fieldsReferenced and requiredFields (top-level or under .when). Exclusion/waiting rules are
    inherently blocking even if no explicit code string is present.
    """
    ref = {}
    for rk in RULE_KEYS:
        for rule in profile.get(rk, []):
            cond = rule.get("when", {}) if isinstance(rule.get("when"), dict) else {}
            fields = set()
            for key in ("fieldsReferenced", "requiredFields"):
                for src in (rule.get(key), cond.get(key)):
                    if isinstance(src, list):
                        fields.update(x for x in src if isinstance(x, str))
            if not fields:
                continue
            blob = json.dumps(rule)
            codes = set(RESULT_CODE_RE.findall(blob))
            if rk == "exclusionRules":
                codes.add("likely_not_eligible")
            if rk == "waitingPeriodRules":
                codes.add("not_yet")
            for f in fields:
                ref.setdefault(f, set()).update(codes)
    return ref


def packet_input_ids(profile):
    """Field ids the packet layer declares it needs (requiredInputIds etc.) at PROFILE level."""
    ids = set()

    def walk(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if k in ("requiredInputIds", "requiredInputs", "inputs") and isinstance(v, list):
                    ids.update(str(x) for x in v if isinstance(x, str))
                walk(v)
        elif isinstance(node, list):
            for x in node:
                walk(x)

    walk(profile.get("packetGenerator", {}))
    walk(profile.get("pathways", []))
    return ids


def classify(profile):
    """Classify every consumer question in one profile."""
    ref = referenced_fields(profile)
    refset = set(ref)
    pkt = packet_input_ids(profile)
    qids = {q["id"] for q in consumer_questions(profile)}

    rows = []
    for q in consumer_questions(profile):
        fid = q["id"]
        stage = q.get("stage", "")
        out = {
            "field": fid, "stage": stage, "prompt": q.get("prompt", ""),
            "referenced": fid in refset, "outcomes": sorted(ref.get(fid, [])),
            "packet_required": fid in pkt,
            # readiness is an ORTHOGONAL property, not a track. A field can be a readiness
            # gauge AND eligibility-blocked at once. Record it independently so the report
            # never loses the readiness nature behind an ELIGIBILITY label.
            "readiness": fid in READINESS_FIELDS,
        }
        # Ruthless default: anything referenced, packet-required, scope-gated, in an
        # eligibility stage, or in an unrecognized stage is ELIGIBILITY (must stay pre-payment).
        if (fid in NEVER_MOVE or fid in refset or fid in pkt
                or stage in ELIGIBILITY_STAGES or stage not in LOGISTICS_STAGES):
            out["track"] = "ELIGIBILITY"
        elif fid in READINESS_FIELDS:
            out["track"] = "READINESS_GAUGE"
        else:
            twin = TWIN.get(fid)
            if twin and twin in qids:
                out["track"] = "DEDUP_DUPLICATE"
                out["twin"] = twin
                out["twin_referenced"] = twin in refset
            else:
                out["track"] = "PACKET_DATA"
        rows.append(out)
    return rows


# --- reporting ---------------------------------------------------------------------------------

def load_profiles(path):
    files = sorted(glob.glob(os.path.join(path, "*.json")))
    profiles = []
    for fp in files:
        try:
            p = json.load(open(fp))
            if "jurisdiction" in p and "questions" in p:
                profiles.append((fp, p))
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


def code_of(p):
    return p.get("jurisdiction", {}).get("code", "??")


def run_report(path, as_json=False):
    profiles = load_profiles(path)
    if not profiles:
        print(f"No profiles found in {path}", file=sys.stderr)
        return 2

    all_rows = {}
    for _, p in profiles:
        all_rows[code_of(p)] = classify(p)

    if as_json:
        print(json.dumps(all_rows, indent=1, default=list))
        return 0

    # human report
    tracks = ("ELIGIBILITY", "DEDUP_DUPLICATE", "PACKET_DATA", "READINESS_GAUGE")
    totals = {t: 0 for t in tracks}
    states_with = {t: set() for t in tracks}
    # readiness is orthogonal: count fields that are readiness gauges AND blocked elsewhere
    readiness_blocked = []  # (state, field) where readiness=True but track=ELIGIBILITY

    print("=" * 78)
    print("RCAP SCREENING-FRICTION AUDIT  (profile-level; code read-path NOT checked here)")
    print("=" * 78)
    hdr = f"{'ST':<4}{'DEDUP':<8}{'PACKET':<8}{'READY':<7}{'ELIG':<6}"
    print(hdr)
    print("-" * 78)
    for code in sorted(all_rows):
        rows = all_rows[code]
        c = {t: [r for r in rows if r["track"] == t] for t in tracks}
        for t in tracks:
            totals[t] += len(c[t])
            if c[t]:
                states_with[t].add(code)
        for r in rows:
            if r.get("readiness") and r["track"] == "ELIGIBILITY":
                readiness_blocked.append((code, r["field"]))
        print(f"{code:<4}{len(c['DEDUP_DUPLICATE']):<8}{len(c['PACKET_DATA']):<8}"
              f"{len(c['READINESS_GAUGE']):<7}{len(c['ELIGIBILITY']):<6}")

    print("-" * 78)
    print("TOTALS")
    print(f"  Track 1 de-dup duplicates : {totals['DEDUP_DUPLICATE']:>4}  "
          f"across {len(states_with['DEDUP_DUPLICATE'])} states  (REMOVE — redundant)")
    print(f"  Track 2 packet-data       : {totals['PACKET_DATA']:>4}  "
          f"across {len(states_with['PACKET_DATA'])} states  (post-pay candidate, review first)")
    print(f"  Track 3 readiness gauges  : {totals['READINESS_GAUGE']:>4}  "
          f"across {len(states_with['READINESS_GAUGE'])} states  (KEEP pre-payment)")
    print(f"  Eligibility (must stay)   : {totals['ELIGIBILITY']:>4}")
    if readiness_blocked:
        print()
        print(f"  NOTE: {len(readiness_blocked)} readiness-gauge field(s) are ALSO eligibility/"
              f"rule-blocked")
        print(f"        (readiness nature retained for drop-point analysis; still stay pre-payment):")
        for code, f in readiness_blocked:
            print(f"          {code}: {f}  — readiness gauge, but also rule/stage blocked")
    print()
    print("REMINDER: PACKET_DATA and DEDUP_DUPLICATE are profile-clean, not proven safe.")
    print("The evaluator/packet-generation code read-path is the final gate and must be checked")
    print("in the repo (see scripts/audit-all51-rule-grounded-screening-friction.mjs).")
    return 0


def run_check(path, fields):
    """
    CI gate: exit 1 if any named field is rule-referenced (or packet-required) in any state.
    Use this on PRs that change screening order: it proves a field you intend to move is not
    eligibility-bearing at the profile level.
    """
    profiles = load_profiles(path)
    if not profiles:
        print(f"No profiles found in {path}", file=sys.stderr)
        return 2

    bad = []
    for _, p in profiles:
        ref = set(referenced_fields(p))
        pkt = packet_input_ids(p)
        for f in fields:
            if f in ref or f in pkt:
                why = "rule-referenced" if f in ref else "packet-required"
                bad.append((code_of(p), f, why))

    if bad:
        print("CHECK FAILED — these fields are eligibility-bearing and must stay pre-payment:")
        for code, f, why in bad:
            print(f"  {code}: {f}  ({why})")
        print("\nThese fields are NOT safe to move/remove. (Code read-path still also applies.)")
        return 1

    print(f"CHECK PASSED — none of {sorted(fields)} is rule-referenced at the profile level.")
    print("Profile-clean only. The evaluator/packet-code read-path must still be verified in-repo.")
    return 0


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    path = argv[1]
    if "--json" in argv:
        return run_report(path, as_json=True)
    if "--check" in argv:
        i = argv.index("--check")
        if i + 1 >= len(argv):
            print("--check requires a comma-separated field list", file=sys.stderr)
            return 2
        fields = {f.strip() for f in argv[i + 1].split(",") if f.strip()}
        return run_check(path, fields)
    return run_report(path)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
