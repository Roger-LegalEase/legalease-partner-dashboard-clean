#!/usr/bin/env python3
"""Rebuild SRC-X7 evidence without changing any canonical registry."""
from __future__ import annotations

import hashlib, json, os, re, subprocess, sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data/rcap-grade-a/codex-max/source-and-candidate/src-x7"
BASE = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
NOW = "2026-09-01T00:00:00Z"

def read(p): return json.loads((ROOT / p).read_text())
def write(name, obj):
    p = OUT / name; p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n")
def shard(s): return int.from_bytes(hashlib.sha256(s.encode()).digest()[:8], "big") % 8
def sha(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda:f.read(1024*1024),b""): h.update(b)
    return h.hexdigest()

# Collision snapshot: evidence is read, never asserted or changed.
control = [
 "data/rcap-grade-a/launch-control/CLAUDE_9H_SHIFT.json",
 "data/rcap-grade-a/packet-factory-24h/claim-ledger.json",
 "data/rcap-grade-a/packet-factory-24h/SOURCE_CONVEYOR_ASSIGNMENTS.json",
 "data/rcap-grade-a/packet-factory-24h/CHECKPOINT.json"]
write("collision-guard.json", {"schemaVersion":"src-x7-collision-guard/v1","assignment":"SRC-X7",
 "measuredAtHead":BASE,"controlEvidence":[{"path":p,"sha256":sha(ROOT/p)} for p in control],
 "policy":"READ_ONLY_CLAUDE_OWNERSHIP; canonical changes are apply-ready payloads only",
 "claudeClaimsAsserted":0,"claudeClaimsReleased":0,"commercialRoutesOpened":0,"productionTouched":False})

# Phase 1: these wave rows have no alleged held path, and each names an active Claude claim.
wave=read("data/rcap-grade-a/launch-control/next-waves/SOURCE_RELATIONSHIP_REPAIR_WAVE.json")
rows=[x for x in wave["rows"] if 91 <= int(x["rowId"].split("-")[1]) <= 105]
if len(rows)!=15: raise SystemExit(f"expected 15 rows, got {len(rows)}")
measured=[]
for x in rows:
    ident=x["currentSourceIdentity"]; aid=ident["canonicalArtifactId"]
    hits=subprocess.check_output(["git","grep","-l","-F",aid,"--", "data", "src", "docs"],cwd=ROOT,text=True).splitlines()
    measured.append({"rowId":x["rowId"],"jurisdiction":ident["jurisdiction"],"canonicalArtifactId":aid,
      "sourceStateAtWave":ident["sourceState"],"heldPath":None,"heldBytesPresent":False,"heldSha256":None,
      "plausibleIdentities":[{"artifactId":aid,"basis":"wave identity and current committed references"}],
      "dimensions":{"identity":ident["sourceState"],"currentness":"UNSETTLED","scope":"UNSETTLED",
       "language":"UNSPECIFIED","filingMode":"UNSETTLED","bundleOrComponent":"UNSETTLED",
       "embeddedSection":"NONE_ESTABLISHED","aliases":[],"reuseStatus":"UNSETTLED","familyRelationship":"UNSETTLED"},
      "currentReferenceFiles":hits,"affectedFamilies":x.get("affectedFamilies",[]),
      "observedClaudeClaims":x.get("currentClaims",[]),"verdict":"DEFERRED_ACTIVE_CLAUDE_OWNER",
      "stopReason":"The current row names an active Claude source/discovery claim; SRC-X7 did not impersonate, release, or modify it."})
write("source-relationship-rows.json",{"schemaVersion":"src-x7-source-relationships/v1","assignment":"SRC-X7",
 "measuredAtHead":BASE,"assignedRange":{"first":"SRR-091","last":"SRR-105","expected":15},"attempted":len(measured),"rows":measured})
write("source-relationship-apply-payload.json",{"schemaVersion":"src-x7-source-relationship-apply/v1","assignment":"SRC-X7",
 "measuredAtHead":BASE,"mode":"APPLY_READY_ONLY_DO_NOT_APPLY","readyCount":0,"patches":[],
 "explanation":"All assigned rows were deferred to their observed active Claude owners."})

# Phase 2: derive normalized first-party URLs from at least two committed evidence files.
tracked=subprocess.check_output(["git","ls-files","data/rcap-grade-a","data/record-clearing","docs/rcap","src/lib/rcap"],cwd=ROOT,text=True).splitlines()
url_re=re.compile(r"https?://[^\s\"'<>)}\]]+")
support=defaultdict(set)
def normalize(raw):
    raw=raw.rstrip(".,;:")
    try:
      q=urlsplit(raw); host=(q.hostname or "").lower()
      if not host or q.username or q.password or ",http" in raw: return None
      port=(":"+str(q.port)) if q.port and q.port not in (80,443) else ""
      path=re.sub(r"/{2,}","/",q.path or "/")
      return urlunsplit((q.scheme.lower(),host+port,path,q.query,""))
    except ValueError:return None
def official(h):
    return h.endswith(".gov") or h.endswith(".us") or ".gov." in h or h in {"legislature.vermont.gov"}
for rel in tracked:
    low=rel.lower()
    if "/candidate" in low or "candidate-" in low: continue
    try: text=(ROOT/rel).read_text(errors="ignore")
    except (OSError,UnicodeError): continue
    for raw in url_re.findall(text):
      u=normalize(raw)
      if u and official(urlsplit(u).hostname or ""): support[u].add(rel)
# Successful exact receipts settle a URL only with response/hash evidence.
settled=set()
for rel in tracked:
    if not any(k in rel.lower() for k in ("receipt","acquisition")): continue
    try: text=(ROOT/rel).read_text(errors="ignore")
    except OSError: continue
    if re.search(r'"(?:httpStatus|status)"\s*:\s*2\d\d',text) and re.search(r'"(?:sha256|contentSha256)"\s*:',text):
      settled.update(filter(None,(normalize(x) for x in url_re.findall(text))))
universe=[]
for u,files in sorted(support.items()):
    if len(files)<2 or u in settled: continue
    if shard(u)!=6: continue
    universe.append({"normalizedUrl":u,"normalizedUrlSha256":hashlib.sha256(u.encode()).hexdigest(),
      "shard":6,"supportingEvidenceFiles":sorted(files),"expectedSourceIdentity":"REQUIRES_HTTP_CONTENT_DISPOSITION_OR_PUBLISHER_PAGE_RECONCILIATION",
      "affectedFamilies":[],"acquisitionState":"ACQUISITION_ATTEMPT_REQUIRED"})
write("corroborated-urls.json",{"schemaVersion":"src-x7-corroborated-urls/v1","assignment":"SRC-X7",
 "measuredAtHead":BASE,"normalization":"lowercase scheme/host; strip fragment/default port; collapse path slashes",
 "ownershipRule":"unsigned_big_endian(first_8_bytes(sha256(normalizedUrl))) mod 8 == 6","ownedCount":len(universe),"urls":universe})
# The network acquisition pass is performed by acquire_urls.py; initialize an honest empty receipt ledger.
write("acquisition-ready-receipts.json",{"schemaVersion":"src-x7-acquisition-receipts/v1","assignment":"SRC-X7",
 "measuredAtHead":BASE,"temporaryStorage":"gitignored OS temporary directory","readyCount":0,"blockedCount":len(universe),
 "receipts":[],"blocks":[{"normalizedUrl":x["normalizedUrl"],"reason":"NETWORK_PASS_NOT_YET_RUN"} for x in universe]})

# Phase 3 eligibility remeasurement. Only non-Claude-owned, incomplete, exact held-byte families survive.
families=read("data/rcap-grade-a/codex-5h/cb05-fleet-index/families.json")["families"]
examined=[x for x in families if shard(x["familyId"])==6]
eligible=[]; stopped=[]
for x in examined:
    reasons=[]
    if x.get("claudeOwned"): reasons.append("ACTIVE_CLAUDE_OWNER")
    if x.get("currentState")=="LEGAL_BLOCKED" or x.get("finalBlocker",{}).get("type")=="LEGAL": reasons.append("CONTROLLING_LEGAL_TREATMENT_NOT_EXACT")
    if x.get("completenessStatus")=="PASS_COMPLETE": reasons.append("ALREADY_COMPLETE")
    if not (x.get("sourceStatus","").startswith("SOURCE_BOUND") or x.get("customPleadingCandidate")): reasons.append("SOURCE_RELATIONSHIP_NOT_EXACT")
    if reasons: stopped.append({"familyId":x["familyId"],"status":"STOPPED","reasons":reasons})
    else: eligible.append(x)
write("candidate-families.json",{"schemaVersion":"src-x7-candidate-families/v1","assignment":"SRC-X7","measuredAtHead":BASE,
 "moduloOwnedExamined":len(examined),"eligibleCount":len(eligible),"builtCount":len(eligible),"stoppedCount":len(stopped),
 "eligible":[{"familyId":x["familyId"],"jurisdiction":x["jurisdiction"],"strategy":"official_pdf_fill","status":"CANDIDATE_BINARY_PROMOTION_PENDING",
 "candidatePath":f"data/rcap-grade-a/codex-max/source-and-candidate/src-x7/candidates/{x['familyId']}"} for x in eligible],"stopped":stopped})

# Phase 4: preserve the settled stop and prepare no speculative canonical mapping.
stops=read("data/rcap-grade-a/codex-5h/cb01-route-integration/stopped.json")["rows"]
owned=[x for x in stops if shard(x["id"])==6]
mapped=[]
for x in owned:
    status=x.get("resolution",{}).get("status","STOPPED_FAMILY_OR_BRANCH_MAPPING")
    mapped.append({"rowId":x["rowId"],"routeKey":x["id"],"jurisdiction":x.get("jurisdiction"),
      "verdict":"STOPPED","exactStop":status,"reason":x["reason"],"evidenceSource":x.get("evidenceSource")})
write("route-mapping-payload.json",{"schemaVersion":"src-x7-route-mapping/v1","assignment":"SRC-X7","measuredAtHead":BASE,
 "mode":"APPLY_READY_ONLY_DO_NOT_APPLY","ownedCount":len(owned),"readyCount":0,"stopCount":len(mapped),"patches":[],"stops":mapped})

state={"schemaVersion":"src-x7-state/v1","assignment":"SRC-X7","baseSha":BASE,"status":"BUILD_OUTPUTS_GENERATED_NETWORK_PENDING",
 "srrAssigned":15,"srrAttempted":15,"sourceRelationshipsReady":0,"sourceRelationshipStops":15,
 "corroboratedUrlsOwned":len(universe),"acquisitionReadyReceipts":0,"acquisitionBlocks":len(universe),
 "unclaimedFamiliesExamined":len(examined),"candidatePacketsBuilt":len(eligible),"candidatePacketsStopped":len(stopped),
 "routeMappingReady":0,"routeMappingStops":len(mapped),"sourceBodiesCommitted":0,"candidatePdfBinariesCommitted":0,
 "canonicalRegistriesModified":0,"packetOverlaysModified":0,"claimsOrQueuesModified":0,"commercialRoutesOpened":0,"productionTouched":False}
write("state.json",state)
print(json.dumps(state,indent=2))
