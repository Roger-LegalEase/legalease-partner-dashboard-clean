#!/usr/bin/env python3
"""VF47 independent internal-vocabulary scan.

Pattern set derived from first principles before reading FIX146's:
a filed page is read by a clerk, a judge, a district attorney and the
Bureau. Anything on it that comes from the PLATFORM (its brand, its
actors, its build machinery, its record keys, its statuses) rather than
from Louisiana or from the mover is internal vocabulary.
"""
import re, sys, os, json, collections

PATTERNS = [
 # A. vendor / product identity
 ("A1_vendor_name",        r"\bLegalEase\b|\bExpungement\.ai\b|\bExpungement AI\b|\bWilma\b"),
 ("A2_program_name",       r"\bRCAP\b|\bGrade[- ]A\b|\bNationwide Record Clearing\b"),
 # B. platform actor / commerce vocabulary
 ("B1_participant",        r"\bparticipant(s|'s)?\b|\bPARTICIPANT(S)?\b"),
 ("B2_packet",             r"\bpacket(s)?\b|\bPACKET(S)?\b|\bbriefcase\b"),
 ("B3_commerce",           r"\bcheckout\b|\bentitlement\b|\bpacket credit\b|\bsponsored\b|\bfulfilment\b|\bfulfillment\b|\bcustomer\b|\bsubscri(be|ption)\b"),
 ("B4_routing",            r"\broute(s|d|ing)?\b|\btrack(s)?\b|\bregistry\b|\blane\b|\bscreen(ing|ed|er)\b|\btriage\b|\beligibility engine\b|\bintake\b"),
 # C. build / artifact machinery
 ("C1_build",              r"\bbuild(er|s)?\b|\bgenerator\b|\bcompose(r|d from)\b|\brender(er|ed|ing)?\b|\bfactory\b|\bpipeline\b"),
 ("C2_artifact",           r"\bartifact(s)?\b|\bfixture(s)?\b|\bcanonical\b|\bboundary\b|\bmanifest\b|\boverlay\b|\bfield map\b|\bfield-map\b|\bprefill(s|ed)?\b|\bcomponent(s)?\b"),
 ("C3_identity",           r"\bsha256\b|\bdigest\b|\bchecksum\b|\bbyte-identical\b|\bpinned\b|\bcorpus\b|\bmaster library\b"),
 # D. internal record / authority vocabulary
 ("D1_committed_record",   r"\bcommitted (record|authority|source)\b|\bthe committed\b|\brecord binding\b|\bsource receipt\b|\bLA-STATUTORY-FORMS\b|\bstate pack\b"),
 ("D2_record_voice",       r"\bthis record\b|\bthe record says\b|\bour record\b|\brecord of this build\b"),
 # E. internal identifiers leaking as literals
 ("E1_family_id",          r"\bla-9\d{2}[a-z]?-[a-z0-9-]*set\b|\bcensus-v1\b|--custom-pleading\b|--official-pdf-fill\b"),
 ("E2_document_id",        r"\bLA-CCRP-ART-\d+\b"),
 ("E3_component_id",       r"\b[a-z]+(?:-[a-z0-9]+){2,}-\d+\b"),
 ("E4_camel_or_snake_key", r"\b[a-z]+[a-z0-9]*(?:_[a-z0-9]+)+\b|\b[a-z]+[a-z0-9]*[A-Z][A-Za-z0-9]*\b"),
 ("E5_dotted_path",        r"\b(participant|registry|route|track|packet|record)\.[a-z_]+\b"),
 # F. status / obligation vocabulary
 ("F1_status",             r"\bstate_built\b|\bqa_review_pending\b|\bnot_started\b|\bapproved_for_live\b|\bRASTER_\w+\b|\bPASS_\w+\b|\bFAIL_\w+\b"),
 ("F2_obligation_key",     r"\brequiredBeforeFiling\b|\bknownPrefills\b|\bself-help stop\b|\bproof obligation\b|\bknown prefill\b"),
 # G. the document talking about itself as a product
 ("G1_we_the_platform",    r"\bwe (complete|fill|prepare|generate|supply|provide)\b|\bour (system|platform|records|software)\b|\bthe system (fills|writes|completes)\b|\bthis (packet|tool|service|product)\b|\bautomatically (filled|completed|prefilled)\b"),
]
COMPILED = [(n, re.compile(p)) for n, p in PATTERNS]

# Louisiana / court words that E4 would otherwise catch as camelCase noise.
E4_ALLOW = re.compile(r"^(McD|O')", re.I)

def scan(text):
    hits = []
    for name, rx in COMPILED:
        for m in rx.finditer(text):
            s = m.group(0)
            if name == "E4_camel_or_snake_key" and E4_ALLOW.match(s):
                continue
            hits.append((name, s, m.start()))
    return hits

def line_of(text, pos):
    start = text.rfind("\n", 0, pos) + 1
    end = text.find("\n", pos)
    if end < 0: end = len(text)
    return text[start:end].strip()

if __name__ == "__main__":
    d = sys.argv[1]; prefix = sys.argv[2]; lo = int(sys.argv[3]); hi = int(sys.argv[4])
    total = 0
    byclass = collections.Counter()
    sites = collections.Counter()
    for i in range(lo, hi+1):
        p = os.path.join(d, "%s-p%02d.txt" % (prefix, i))
        if not os.path.exists(p): continue
        t = open(p, encoding="utf-8", errors="replace").read()
        for name, s, pos in scan(t):
            total += 1
            byclass[name] += 1
            sites[(i, name, s)] += 1
            print("p%02d  %-24s %-40s | %s" % (i, name, s[:40], line_of(t, pos)[:110]))
    print("---- %s pages %d-%d: %d hits, %d distinct (page,class,token) sites" % (prefix, lo, hi, total, len(sites)))
    for k, v in byclass.most_common():
        print("     %-24s %d" % (k, v))
