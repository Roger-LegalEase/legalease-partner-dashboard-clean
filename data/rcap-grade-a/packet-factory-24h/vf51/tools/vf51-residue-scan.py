#!/usr/bin/env python3
"""VF51 independent residue scan -- the classes VF47's eighteen patterns cannot see.

VF47's set asks "what word on this page comes from the platform rather than from
Louisiana or the mover". It is a WORD scan over pdftotext output. Three classes of
defect are invisible to a word scan of that shape:

  (i)  a token that is not a word -- a hex digest, a timestamp, a file path, a
       markdown marker, a JavaScript sentinel like `undefined` or `[object Object]`;
  (ii) a token pdftotext does not hand back as one word -- an identifier split
       across a line break or drawn as two text runs, so `LA-CCRP-ART-989` reaches
       the scanner as `LA-CCRP-` + `ART-989` and matches nothing;
  (iii) text that is not on a page at all -- Info-dictionary metadata, XMP, outline
       titles, annotation contents, embedded files. pdftotext never emits these and
       a page-text scan can never fail on them.

Plus one substantive class neither prior lane's set carries: CROSS-JURISDICTION
LEAKAGE. These builders are clones of one another across states; a surviving
Nebraska or North Dakota citation on a Louisiana filed page is catastrophic and
matches none of the eighteen patterns.

Usage: vf51-residue-scan.py <txtdir> <prefix> <lo> <hi>
"""
import re, sys, os, collections

PATTERNS = [
 # H. build / test / draft markers
 ("H1_specimen_marker",   r"\bTEST-[A-Z0-9-]+\b|\bSPECIMEN\b|\bSAMPLE\b|\bDRAFT\b|\bDO NOT FILE\b|\bPREVIEW\b|\bFOR TESTING\b"),
 ("H2_placeholder",       r"\bTODO\b|\bTBD\b|\bFIXME\b|\bXXX+\b|\bplaceholder\b|\blorem ipsum\b|\bFOO\b|\bBAR\b|\bexample\.com\b"),
 # I. programming residue reaching the page
 ("I1_js_sentinel",       r"(?<![A-Za-z])undefined(?![A-Za-z])|(?<![A-Za-z])NaN(?![A-Za-z])|\[object Object\]|\bnull\b(?!ity)|\bInfinity\b"),
 ("I2_template_residue",  r"\$\{|\{\{|\}\}|%[sd]\b|<%|%>|\\n\b|\\t\b"),
 ("I3_json_shape",        r'"\w+"\s*:|^\s*[\[\{]\s*$|\bJSON\b'),
 # J. machine identifiers
 ("J1_sha256_literal",    r"\b[0-9a-f]{32,64}\b"),
 ("J2_short_git_sha",     r"\b[0-9a-f]{7,12}\b(?![0-9a-f])"),
 ("J3_iso_timestamp",     r"\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"),
 ("J4_uuid",              r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b"),
 # K. paths, URLs, filenames
 ("K1_file_extension",    r"\.(mjs|json|md|txt|js|ts|py|yaml|yml|pdf|sh)\b"),
 ("K2_path",              r"\bdata/[a-z0-9-]+/|\bscripts/|/home/|\bsrc/lib/|\bprivate/|\.\./"),
 ("K3_url",               r"https?://|\bwww\.[a-z]"),
 # L. markup residue
 ("L1_markdown",          r"\*\*|^#{1,6}\s|```|^\s*[-*]\s\[[ x]\]|\]\(http"),
 ("L2_html_entity",       r"&(amp|lt|gt|quot|#\d+);|<br\s*/?>|</?(p|div|span|b|i)>"),
 # M. cross-jurisdiction leakage -- the class neither prior set carries
 ("M1_other_state_name",  r"\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|Ohio|Oklahoma|Oregon|Pennsylvania|Tennessee|Texas|Utah|Vermont|Virginia|Washington|Wisconsin|Wyoming|District of Columbia|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|South Carolina|South Dakota|Rhode Island|West Virginia)\b"),
 ("M2_other_state_code",  r"\bNeb\. Rev\. Stat\.|\bInd\. Code\b|\bN\.D\.C\.C\.|\bO\.C\.G\.A\.|\bTex\.|\bCal\. Penal\b|\bR\.C\.W\.|\bMinn\. Stat\.|\bC\.R\.S\.|\bMiss\. Code\b|\b\d+ ILCS \d+\b"),
 # N. whitespace/line-break tolerant document identifier -- the split-token blind spot
 ("N1_split_doc_id",      r"LA[\s\-]*C\s*C\s*R\s*P[\s\-]*A\s*R\s*T[\s\-]*\d+"),
 ("N2_split_family_id",   r"la[\s\-]*9\d{2}[a-z]?[\s\-][a-z\s\-]{4,}set\b"),
 # O. commerce / price
 ("O1_price",             r"\$\s?\d|\bper packet\b|\bcredit(s)? remaining\b|\bupgrade\b|\bplan\b(?!ning)"),
 # P. platform actor words for the filer that Louisiana does not use
 ("P1_wrong_actor",       r"\buser(s)?\b|\bclient(s)?\b|\bcustomer(s)?\b|\bapplicant(s)?\b|\bcase manager\b|\badvocate\b|\bour team\b|\bpetitioner\b"),
 # Q. this build talking about its own governance
 ("Q1_governance_voice",  r"\bverif(ied|ication|ier)\b|\bobligation\b|\bgrade[- ]a\b|\bmutation\b|\bindependent lane\b|\bself-verif\w*\b|\bgrant\b(?!ed by law)|\bledger\b|\bqueue\b"),
]
COMPILED = [(n, re.compile(p, re.M)) for n, p in PATTERNS]

def scan(text):
    out = []
    for name, rx in COMPILED:
        for m in rx.finditer(text):
            out.append((name, m.group(0), m.start()))
    return out

def line_of(text, pos):
    s = text.rfind("\n", 0, pos) + 1
    e = text.find("\n", pos)
    if e < 0: e = len(text)
    return text[s:e].strip()

if __name__ == "__main__":
    d, prefix, lo, hi = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    total = 0
    byclass = collections.Counter()
    for i in range(lo, hi + 1):
        p = os.path.join(d, "%s-p%02d.txt" % (prefix, i))
        if not os.path.exists(p): continue
        t = open(p, encoding="utf-8", errors="replace").read()
        for name, s, pos in scan(t):
            total += 1
            byclass[name] += 1
            print("p%02d  %-22s %-30s | %s" % (i, name, s[:30], line_of(t, pos)[:100]))
    print("---- %s pages %d-%d: %d hits" % (prefix, lo, hi, total))
    for k, v in byclass.most_common():
        print("     %-22s %d" % (k, v))
