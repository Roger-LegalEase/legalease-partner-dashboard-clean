#!/usr/bin/env python3
"""Finish the existing staged factory correction; no packet or legal-hold edits."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'scripts/grade-a-packet-factory-24h'

def replace_once(text: str, before: str, after: str) -> str:
    if after in text:
        return text
    if text.count(before) != 1:
        raise RuntimeError('Expected exactly one unchanged anchor: ' + before[:100])
    return text.replace(before, after, 1)

g = (D / 'generate.mjs').read_text()
g = replace_once(g,
    '          disposition: sourceReconciliation.disposition,',
    '          disposition: sourceReconciliation.disposition,\n'
    '          unresolvedObligations: [...(sourceReconciliation.unresolvedObligations ?? [])],')
v = (D / 'verify.mjs').read_text()
v = replace_once(v,
    'import { pathsOverlap } from "./path-ownership.mjs";',
    'import { pathsOverlap } from "./path-ownership.mjs";\n'
    'import { boundedRepairAuthorization } from "./bounded-repair-authorization.mjs";')
v = replace_once(v,
    '      if (repairers.has(f)) legalProblems.push(`${f} was found BLOCKED_LEGAL_INPUT by a lane and is granted to a repairer`);',
    '''      const relatedRepairClaims = liveClaims.filter((c) =>
        ["repair", "shared-host-repair"].includes(c.laneKind)
        && (c.familyIds ?? (c.familyId ? [c.familyId] : [])).includes(f));
      const boundedOnly = relatedRepairClaims.length === 1
        && boundedRepairAuthorization(familyById.get(f), relatedRepairClaims[0], read(LEDGER), read);
      if (repairers.has(f) && !boundedOnly)
        legalProblems.push(`${f} was found BLOCKED_LEGAL_INPUT by a lane and is granted to a repairer without recorded bounded-work authority`);''')
v = replace_once(v,
    '  console.log("\\nmutations:");\n  const targets =',
    '''  console.log("\\nmutations:");
  const rereadMaster = read(MASTER);
  const rereadReturns = read(`${DIR}/VERIFIER_RETURNS.json`);
  const rereadCompletions = readRepairCompletions(ROOT);
  const rereadSubject = rereadMaster.families
    .filter((family) => family.state === "VERIFY_PENDING"
      && family.selectedIndependentVerdict?.verdict === "FAIL_REPAIR_REQUIRED")
    .map((family) => {
      const verdict = rereadReturns.rows.find((r) => r.familyId === family.familyId
        && r.isIndependentVerification && !r.superseded && r.verdict === "FAIL_REPAIR_REQUIRED");
      return verdict ? repairCompletionAfterVerdict(ROOT, rereadCompletions, verdict) : null;
    }).find(Boolean);
  if (!rereadSubject) throw new Error("F35 requires a current causal post-repair return; use isolated reader fixtures when the live queue has none");
  const targets =''')
v = replace_once(v,
    '    fix02Rows: path.join(ROOT, DIR, "fix02/rows.json"),',
    '    causalRepairRows: path.join(ROOT, rereadSubject.evidencePath),')
v = replace_once(v,
    '{ on: "fix02Rows", id: "F35",',
    '{ on: "causalRepairRows", id: "F35",')
v = v.replace('F35 repair-return mutation requires a live post-failure reread completed by FIX02',
              'F35 selected causal repair return does not contain its completed family row')
v = replace_once(v,
    '          liveRereads.has(candidate.itemId ?? candidate.familyId)\n          && candidate.status === "COMPLETED"',
    '          liveRereads.has(candidate.itemId ?? candidate.familyId)\n'
    '          && (candidate.itemId ?? candidate.familyId) === (rereadSubject.row.itemId ?? rereadSubject.row.familyId)\n'
    '          && candidate.status === "COMPLETED"')
(D / 'generate.mjs').write_text(g)
(D / 'verify.mjs').write_text(v)
for name in ['generate.mjs', 'verify.mjs']:
    subprocess.run(['node', '--check', str(D / name)], check=True)
print('Consumed source-wait projection, existing bounded-work authority, and actual causal mutation target. No packet bytes or legal decision changed.')
