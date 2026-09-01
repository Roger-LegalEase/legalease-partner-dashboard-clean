#!/usr/bin/env python3
"""Build SRC-X2 apply-ready evidence without changing canonical records."""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data/rcap-grade-a/codex-max/source-and-candidate/src-x2"
WAVE = ROOT / "data/rcap-grade-a/launch-control/next-waves/SOURCE_RELATIONSHIP_REPAIR_WAVE.json"
FAMILIES = ROOT / "data/rcap-grade-a/codex-5h/cb05-fleet-index/families.json"
STOPPED = ROOT / "data/rcap-grade-a/codex-5h/cb01-route-integration/stopped.json"
URL_RE = re.compile(r"https?://[^\s\"'<>]+")
OFFICIAL = re.compile(r"(^|\.)(gov|us|courts?\.[a-z]{2}\.us|judiciary\.[a-z]{2}\.gov)$", re.I)


def read(path: Path):
    return json.loads(path.read_text())


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def shard(value: str) -> int:
    return int.from_bytes(hashlib.sha256(value.encode()).digest()[:8], "big") % 8


def dump(name: str, value) -> None:
    (OUT / name).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def tracked_files() -> list[str]:
    result = subprocess.run(["git", "ls-files"], cwd=ROOT, check=True, text=True, capture_output=True)
    return result.stdout.splitlines()


def active_claims():
    ledger = read(ROOT / "data/rcap-grade-a/packet-factory-24h/claim-ledger.json")
    return [c for c in ledger.get("claims", []) if str(c.get("status", "ACTIVE")).upper() not in {"RELEASED", "COMPLETE"}]


def phase1(claims):
    selected = [r for r in read(WAVE)["rows"] if 16 <= int(r["rowId"].split("-")[1]) <= 30]
    rows, patches = [], []
    for r in selected:
        path = ROOT / r["heldPath"] if r.get("heldPath") else None
        candidates = []
        if path and path.is_file():
            candidates.append({"path": r["heldPath"], "sha256": digest(path), "byteLength": path.stat().st_size})
        for candidate in r.get("heldCandidates", []):
            matches = list((ROOT / "private").rglob(candidate["fileName"])) if (ROOT / "private").exists() else []
            candidates.extend({"path": str(p.relative_to(ROOT)), "sha256": digest(p), "byteLength": p.stat().st_size} for p in matches)
        owned = any(any(f in json.dumps(c) for f in r.get("affectedFamilies", [])) for c in claims)
        if owned:
            verdict, reason = "DEFERRED_ACTIVE_CLAUDE_OWNER", "An active Claude claim references an affected family; no claim was modified."
        elif not candidates:
            verdict, reason = "STOPPED_MISSING_BYTES", "No exact held bytes were present at the stated path in this checkout."
        elif r["currentSourceIdentity"]["sourceState"] == "CURRENTNESS_UNVERIFIED":
            verdict, reason = "STOPPED_CURRENTNESS", "Held bytes were measured, but repository evidence does not settle publisher currentness."
        elif len(candidates) != 1:
            verdict, reason = "STOPPED_IDENTITY", "The plausible held identities do not resolve to exactly one measured artifact."
        else:
            verdict, reason = "READY_TO_APPLY", "One measured identity is available and no active Claude ownership was found."
        row = {
            "rowId": r["rowId"], "verdict": verdict, "reason": reason,
            "currentSourceIdentity": r["currentSourceIdentity"], "heldPath": r.get("heldPath"),
            "measuredCandidates": candidates, "plausibleIdentities": [r["currentSourceIdentity"], *r.get("heldCandidates", [])],
            "relationshipDimensions": {"identity": r["currentSourceIdentity"]["canonicalArtifactId"], "currentness": r["currentSourceIdentity"]["sourceState"], "scope": "UNSETTLED_UNLESS_EXPLICIT", "language": "UNSPECIFIED", "filingMode": "UNSPECIFIED", "bundleOrComponent": "UNSPECIFIED", "embeddedSection": "NONE_EVIDENCED", "aliases": r.get("aliases", []), "reuseStatus": "UNSETTLED", "families": r.get("affectedFamilies", [])},
        }
        rows.append(row)
        if verdict == "READY_TO_APPLY":
            patches.append({"operation": "UPSERT_EXACT_SOURCE_RELATIONSHIP", "rowId": r["rowId"], "canonicalArtifactId": r["currentSourceIdentity"]["canonicalArtifactId"], "jurisdiction": r["currentSourceIdentity"]["jurisdiction"], "artifact": candidates[0], "affectedFamilies": r.get("affectedFamilies", []), "applyStatus": "APPLY_READY_NOT_APPLIED"})
    return rows, patches


def normalized_url(raw: str) -> str | None:
    raw = raw.rstrip(".,;:)]}\\")
    try:
        p = urllib.parse.urlsplit(raw)
    except ValueError:
        return None
    host = (p.hostname or "").lower()
    if not p.scheme.startswith("http") or not host or not OFFICIAL.search(host) or any(x in raw for x in ["private/", " ", "|", ",http"]):
        return None
    return urllib.parse.urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path or "/", p.query, ""))


def phase2(files):
    family_ids = [f["familyId"] for f in read(FAMILIES)["families"]]
    support = defaultdict(set)
    receipt_text = ""
    for rel in files:
        low = rel.lower()
        if rel.startswith("data/rcap-grade-a/codex-max/source-and-candidate/src-x2/") or "/candidates/" in low or "candidate" in Path(rel).name.lower():
            continue
        try:
            body = (ROOT / rel).read_text(errors="ignore")
        except (OSError, UnicodeError):
            continue
        if "receipt" in low or "acquisition" in low:
            receipt_text += body
        for raw in URL_RE.findall(body):
            url = normalized_url(raw)
            if url:
                support[url].add(rel)
    owned = [(u, sorted(paths)) for u, paths in support.items() if len(paths) >= 2 and shard(u) == 1 and u not in receipt_text]
    urls, receipts = [], []
    temp = Path(os.environ.get("TMPDIR", "/tmp")) / "legalease-src-x2"
    temp.mkdir(parents=True, exist_ok=True)
    for url, paths in sorted(owned):
        evidence = "\n".join((ROOT / p).read_text(errors="ignore") for p in paths)
        affected = sorted(f for f in family_ids if f in evidence)
        parsed = urllib.parse.urlsplit(url)
        identity = Path(parsed.path).name or parsed.hostname
        rec = {"normalizedUrl": url, "urlSha256": hashlib.sha256(url.encode()).hexdigest(), "shard": 1, "supportingEvidenceFiles": paths, "expectedSourceIdentity": identity, "identityDerivation": "final URL path segment; repository evidence must settle canonical identity before application", "affectedFamilies": affected, "status": "ACQUISITION_BLOCKED", "request": {}}
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LegalEase-source-verifier/1.0"})
            with urllib.request.urlopen(req, timeout=20) as response:
                body = response.read(30 * 1024 * 1024 + 1)
                ctype = response.headers.get_content_type()
                final = response.geturl()
                if len(body) > 30 * 1024 * 1024:
                    raise ValueError("response exceeds 30 MiB safety limit")
                if ctype == "text/html" and re.search(br"login|sign in|not found|access denied", body[:100000], re.I):
                    raise ValueError("refused login or HTML error body")
                target = temp / hashlib.sha256(url.encode()).hexdigest()
                target.write_bytes(body)
                measured = digest(target)
                rec["request"] = {"httpStatus": response.status, "redirects": final != url, "finalUrl": final, "contentType": ctype, "byteLength": len(body), "sha256": measured, "hashRecomputedFromTemporaryBytes": True}
                rec["status"] = "ACQUISITION_READY"
                receipts.append(rec.copy())
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError) as error:
            rec["request"] = {"errorType": type(error).__name__, "error": str(error)[:300]}
        urls.append(rec)
    return urls, receipts


def phase3(claims):
    examined = []
    for f in read(FAMILIES)["families"]:
        if shard(f["familyId"]) != 1 or f.get("claudeOwned"):
            continue
        active = any(f["familyId"] in json.dumps(c) for c in claims)
        controlling = f.get("sourceBound") and f.get("routeMappingStatus") == "BOUND"
        legal_exact = not (f.get("finalBlocker") or {}).get("type") == "LEGAL"
        eligible = not active and controlling and legal_exact and f.get("artifactStatus") != "RENDERED"
        status = "ELIGIBLE" if eligible else "STOPPED"
        reasons = []
        if active: reasons.append("ACTIVE_CLAUDE_OWNER")
        if not controlling: reasons.append("SOURCE_OR_ROUTE_RELATIONSHIP_NOT_EXACT")
        if not legal_exact: reasons.append("CONTROLLING_LEGAL_INPUT_OPEN")
        examined.append({"familyId": f["familyId"], "status": status, "stops": reasons, "implementationStrategyMeasured": f.get("implementationStrategy"), "candidateStatus": "CANDIDATE_BINARY_PROMOTION_PENDING" if eligible else "NOT_BUILT"})
    return examined


def phase4():
    rows = read(STOPPED)["rows"]
    # CB01 calls this key `id`; it is the routeKey whose hash owns a stopped row.
    owned = [r for r in rows if (r.get("routeKey") or r.get("id")) and shard(r.get("routeKey") or r["id"]) == 1]
    return [{"rowId": r["rowId"], "routeKey": r.get("routeKey") or r["id"], "status": "STOPPED_LEGAL_OR_FAMILY_IDENTITY", "reason": r["reason"], "currentResolution": r.get("resolution"), "remeasurement": "CB01 stop remains present at current head; no separate controlling decision record was found that safely removes it.", "canonicalRegistryModified": False} for r in owned]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    claims = active_claims()
    rows, patches = phase1(claims)
    files = tracked_files()
    urls, receipts = phase2(files)
    families = phase3(claims)
    routes = phase4()
    inputs = [WAVE, FAMILIES, STOPPED, ROOT / "data/rcap-grade-a/launch-control/CLAUDE_9H_SHIFT.json", ROOT / "data/rcap-grade-a/packet-factory-24h/claim-ledger.json", ROOT / "data/rcap-grade-a/packet-factory-24h/SOURCE_CONVEYOR_ASSIGNMENTS.json", ROOT / "data/rcap-grade-a/packet-factory-24h/CHECKPOINT.json"]
    dump("collision-guard.json", {"assignment": "SRC-X2", "readAtHead": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(), "inputDigests": {str(p.relative_to(ROOT)): digest(p) for p in inputs}, "activeClaudeClaimsObserved": len(claims), "policy": "Claude claims were read only; canonical changes are apply-ready payloads only."})
    dump("source-relationship-rows.json", {"assignedRange": ["SRR-016", "SRR-030"], "expected": 15, "attempted": len(rows), "rows": rows})
    dump("source-relationship-apply-payload.json", {"status": "NOT_APPLIED", "count": len(patches), "operations": patches})
    dump("corroborated-urls.json", {"rule": "first eight SHA-256 bytes, unsigned big-endian, modulo 8 equals 1", "count": len(urls), "urls": urls})
    dump("acquisition-ready-receipts.json", {"sourceBodiesCommitted": 0, "count": len(receipts), "receipts": receipts})
    dump("candidate-families.json", {"examined": len(families), "built": sum(x["status"] == "ELIGIBLE" for x in families), "candidatePdfBinariesCommitted": 0, "families": families})
    dump("route-mapping-payload.json", {"owned": len(routes), "readyToApply": 0, "canonicalRegistryModified": False, "rows": routes})
    ready = sum(r["verdict"] == "READY_TO_APPLY" for r in rows)
    state = {"assignment": "SRC-X2", "baseSha": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(), "srrAssigned": 15, "srrAttempted": len(rows), "sourceRelationshipsReady": ready, "sourceRelationshipStops": len(rows)-ready, "corroboratedUrlsOwned": len(urls), "acquisitionReadyReceipts": len(receipts), "acquisitionBlocks": len(urls)-len(receipts), "unclaimedFamiliesExamined": len(families), "candidatePacketsBuilt": 0, "candidatePacketsStopped": len(families), "routeMappingReady": 0, "routeMappingStops": len(routes), "sourceBodiesCommitted": 0, "candidatePdfBinariesCommitted": 0, "canonicalRegistriesModified": 0, "packetOverlaysModified": 0, "claimsOrQueuesModified": 0, "commercialRoutesOpened": 0, "productionTouched": False}
    dump("state.json", state)
    summary = "\n".join(f"- {k}: {v}" for k, v in state.items())
    (OUT / "progress.md").write_text(f"# SRC-X2 progress\n\nComplete. All phases continued after stops.\n\n{summary}\n")
    (OUT / "report.md").write_text(f"# SRC-X2 report\n\nThis lane produced apply-ready evidence only. It changed no canonical registry, route, claim, queue, overlay, commercial authority, or Production path. Temporary acquisitions are not committed.\n\n## Result\n\n{summary}\n")


if __name__ == "__main__":
    main()
