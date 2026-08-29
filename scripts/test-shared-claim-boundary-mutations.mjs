#!/usr/bin/env node

// Mutation proof for the atomic claim and participant-ownership boundary.
//
// Contract §7, ADR-0002. scripts/verify-shared-claim-boundary-db.mjs measures the
// real migration against a real PostgreSQL cluster, and
// scripts/verify-screening-verification-finetune.mjs measures verification
// invalidation. Both pass today. That is not by itself evidence that either one
// is load-bearing: a proof that never goes red when the thing it guards is
// removed is decoration.
//
// So each mutation below deletes exactly one guarantee the claim boundary is
// supposed to provide, and the run fails unless the corresponding verifier
// notices. The six mutations are the ones the ownership boundary cannot survive:
//
//   1. the claim condition          -- an already-claimed result claimed again
//   2. the owner check              -- a conflicting insert handed to the loser
//   3. one matter per pending result-- a second matter for one screening
//   4. same-owner-only replay       -- a stranger replaying an owner's token
//   5. the authenticated-caller gate-- an anonymous matter and Briefcase
//   6. invalidation on material edit-- a stale verification surviving a fact change
//
// Sources are restored through the journal guard, so an interrupted run cannot
// strand a mutation in a migration or in application source.
//
// Usage: node scripts/test-shared-claim-boundary-mutations.mjs

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CLAIM_MIGRATION = "supabase/migrations/20260828100000_shared_pending_result_and_atomic_claim.sql";
const PACKET_INFORMATION = "src/lib/expungement-ai/packet-information.ts";

const claimMigration = path.join(root, CLAIM_MIGRATION);
const packetInformation = path.join(root, PACKET_INFORMATION);

const claimDbVerifier = path.join(root, "scripts/verify-shared-claim-boundary-db.mjs");
const invalidationVerifier = path.join(root, "scripts/verify-screening-verification-finetune.mjs");

registerTrackedMutation("test-shared-claim-boundary-mutations.mjs", [
  CLAIM_MIGRATION,
  PACKET_INFORMATION
]);

const mutations = [
  // 1. The claim condition. Without the already-CLAIMED branch a replay falls
  //    through to the insert path and reports a fresh claim, so "claimed once"
  //    stops being observable to the caller that has to decide what to show.
  [
    "claim condition removed: an already-claimed result is claimed again",
    claimMigration,
    claimDbVerifier,
    (source) => source.replace(
      "  if v_pending.status = 'CLAIMED' then",
      "  if false then"
    )
  ],

  // 2. The owner check on the conflict path. ON CONFLICT DO NOTHING means the
  //    loser of a race re-reads the winner's row; without this check it is
  //    handed somebody else's matter as its own successful claim.
  [
    "owner check removed: a conflicting insert returns another participant's matter",
    claimMigration,
    claimDbVerifier,
    (source) => source.replace(
      "    if v_owner is distinct from p_user_id then",
      "    if false then"
    )
  ],

  // 3. One matter per pending result. The UNIQUE constraint is what makes two
  //    tabs, two auth callbacks and a refresh mid-claim converge; widening it to
  //    include the primary key leaves a constraint that can never fire.
  [
    "second matter allowed: one pending result produces two matters",
    claimMigration,
    claimDbVerifier,
    (source) => source.replace(
      "      unique (source_pending_result_id);",
      "      unique (source_pending_result_id, id);"
    )
  ],

  // 4. Same-owner-only replay. Turning the owner comparison into an
  //    unconditional branch hands the owner's matter id to whoever presents the
  //    token, which is the exact disclosure the denial exists to prevent.
  [
    "different-owner replay allowed: a stranger replaying the token gets the matter",
    claimMigration,
    claimDbVerifier,
    (source) => source.replace(
      "    if v_pending.claimed_user_id = p_user_id then",
      "    if true then"
    )
  ],

  // 5. The authenticated-participant gate. Screening may be anonymous; a matter
  //    and a Briefcase may not. Removing the gate is the anonymous-Briefcase
  //    defect in its most direct form.
  [
    "anonymous claim allowed: the authenticated-participant gate is removed",
    claimMigration,
    claimDbVerifier,
    (source) => source.replace(
      "  if p_user_id is null then\n    raise exception 'claim_requires_authenticated_participant' using errcode = '28000';\n  end if;",
      "  if false then\n    raise exception 'claim_requires_authenticated_participant' using errcode = '28000';\n  end if;"
    )
  ],

  // 6. Invalidation after a material edit. With no material change ever
  //    detected, Review and Edit takes the preserving branch and a verification
  //    taken against the old facts survives the edit that contradicted it.
  [
    "material edit does not invalidate: a stale verification survives a fact change",
    packetInformation,
    invalidationVerifier,
    (source) => source.replace(
      "  const materialFactChange = Object.keys(answerDelta).length > 0;",
      "  const materialFactChange = false;"
    )
  ]
];

const originals = new Map(mutations.map(([, file]) => [file, fs.readFileSync(file, "utf8")]));
function restore() {
  for (const [file, source] of originals) fs.writeFileSync(file, source);
}
registerMutationRestore(restore);

let caught = 0;
const survived = [];
try {
  for (const [name, file, verifier, mutate] of mutations) {
    const original = originals.get(file);
    const changed = mutate(original);
    if (changed === original) {
      survived.push(`${name} (mutation matched nothing)`);
      continue;
    }
    fs.writeFileSync(file, changed);
    try {
      execFileSync(process.execPath, [verifier], { cwd: root, stdio: "pipe" });
      survived.push(name);
    } catch {
      caught += 1;
      console.log(`  caught   ${name}`);
    } finally {
      fs.writeFileSync(file, original);
    }
  }
} finally {
  restore();
}

if (survived.length) {
  console.error(`test-shared-claim-boundary-mutations FAILED: ${survived.length} survived`);
  for (const name of survived) console.error(`  - ${name}`);
  process.exit(1);
}
console.log(`test-shared-claim-boundary-mutations: ${caught}/${mutations.length} mutations red; sources restored.`);
