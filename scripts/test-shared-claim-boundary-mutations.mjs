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
const PRODUCTION_SCHEMA = "supabase/migrations/20260728213131_remote_schema.sql";
const PACKET_INFORMATION = "src/lib/expungement-ai/packet-information.ts";

const claimMigration = path.join(root, CLAIM_MIGRATION);
const productionSchema = path.join(root, PRODUCTION_SCHEMA);
const packetInformation = path.join(root, PACKET_INFORMATION);

const claimDbVerifier = path.join(root, "scripts/verify-shared-claim-boundary-db.mjs");
const reviewEditVerifier = path.join(root, "scripts/test-lane-e-review-edit-ownership.mjs");

registerTrackedMutation("test-shared-claim-boundary-mutations.mjs", [
  CLAIM_MIGRATION,
  PRODUCTION_SCHEMA,
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

  // 7. The owner column in the schema the fixture stands in for. Every
  //    behavioural check above runs against the transcribed fixture, so
  //    dropping NOT NULL in production is invisible to all of them; only the
  //    fidelity comparison can see it.
  [
    "production owner column made nullable: an anonymous matter becomes storable",
    productionSchema,
    claimDbVerifier,
    (source) => source.replace(
      '    "user_id" "uuid" NOT NULL,',
      '    "user_id" "uuid",'
    )
  ],

  // 8. Payment history. Review and Edit is confined to commercialFlow, so a
  //    fact change structurally cannot reach the payment columns. Widening the
  //    patch by one payment field is the whole defect, and it is invisible to
  //    every check that only reads verification state.
  [
    "edit patch reaches payment history: a fact change rewrites payment status",
    packetInformation,
    reviewEditVerifier,
    (source) => source.replace(
      "    patch: {\n      commercialFlow: {\n        packetInformation,\n        verification: nextVerification\n      }\n    },",
      "    patch: {\n      paymentStatus: \"unpaid\",\n      commercialFlow: {\n        packetInformation,\n        verification: nextVerification\n      }\n    },"
    )
  ],

  // 6. Invalidation after a material edit. With no material change ever
  //    detected, Review and Edit takes the preserving branch and a verification
  //    taken against the old facts survives the edit that contradicted it.
  [
    "material edit does not invalidate: a stale verification survives a fact change",
    packetInformation,
    reviewEditVerifier,
    (source) => source.replace(
      "  const materialFactChange = Object.keys(answerDelta).length > 0;",
      "  const materialFactChange = false;"
    )
  ]
];

// A mutation is only evidence if the verifier judging it is green before the
// mutation is applied. Without this gate a verifier that is already failing --
// for an unrelated reason, on clean source -- reports every mutation as caught
// and the whole run becomes a green light that means nothing. So each distinct
// verifier is required to pass first, and the run stops if one does not.
const baselineVerifiers = [...new Set(mutations.map(([, , verifier]) => verifier))];
const notGreen = [];
for (const verifier of baselineVerifiers) {
  try {
    execFileSync(process.execPath, [verifier], { cwd: root, stdio: "pipe" });
  } catch {
    notGreen.push(path.relative(root, verifier));
  }
}
if (notGreen.length) {
  console.error("test-shared-claim-boundary-mutations FAILED: verifier not green on clean source");
  for (const verifier of notGreen) console.error(`  - ${verifier}`);
  console.error("A mutation judged by an already-failing verifier is not evidence.");
  process.exit(1);
}

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
