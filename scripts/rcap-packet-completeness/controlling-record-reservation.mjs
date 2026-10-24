import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * A FACT THE PLATFORM HOLDS AND THE CONTROLLING RECORD RESERVES FOR THE PARTICIPANT.
 *
 * The committed legal-design track registry can name a blank the participant
 * completes by hand even though the platform holds the fact: Kansas 22-4908's
 * manualCompletionItems leaves "Race and year of birth on the order cover sheet"
 * to the participant "pending the data-protection review". Printing the held
 * date of birth there overrides the controlling record; leaving it blank was a
 * missing known fact, because REQUIRED_BEFORE_FILING rightly refuses a fact the
 * packet writes elsewhere. This is the declared channel for that blank and no
 * other: it never reaches REQUIRED_BEFORE_FILING and never claims the fact is
 * unavailable.
 *
 * A recorded owner decision can reserve a blank the same way (the A28 follow-up
 * extends the restriction to the derived birth year). It binds by its own bytes,
 * which the claim pins, and each entry names the exact document and field.
 *
 * As with the NJ later-completion proof, a map cannot mint the proof: the
 * contract accepts only an object this module verified in this process.
 */
export const RESERVATION_REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/** The digest a reservation claim pins: the entry's three fields, in a fixed order. */
export const reservationEntryDigest = (entry) =>
  sha256(JSON.stringify({ item: entry?.item ?? null, whereInPacket: entry?.whereInPacket ?? null, why: entry?.why ?? null }));

const DECISION_ENTRY_KEYS = ["familyId", "trackId", "componentId", "document", "field", "item", "whereInPacket", "why"];
/** The digest an owner-decision claim pins: every field of the entry, in a fixed order. */
export const decisionReservationEntryDigest = (entry) =>
  sha256(JSON.stringify(Object.fromEntries(DECISION_ENTRY_KEYS.map((k) => [k, entry?.[k] ?? null]))));

const verifiedProofs = new WeakSet();
export const isVerifiedControllingReservationProof = (proof) =>
  Boolean(proof && typeof proof === "object" && verifiedProofs.has(proof));

const records = new Map();
function readRecord(root, rel) {
  const abs = path.join(root, rel);
  if (!records.has(abs)) {
    const bytes = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
    records.set(abs, bytes ? { sha256: sha256(bytes), json: JSON.parse(bytes.toString("utf8")) } : null);
  }
  return records.get(abs);
}

const norm = (value) => String(value ?? "").normalize("NFKC").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Verify one reservation claim.
 *
 *   claim          { trackId, componentId, item, entrySha256 } from the field-map row, plus
 *                  { decisionPath, decisionSha256 } when an owner decision, not the registry, reserves it
 *   blank          { id, name, document, label } of the blank; name is the bare field the writes carry
 *   registrySha256 the registry pin this packet binds (its receipt's committed record)
 *   documentTitle  the official title the packet binds for claim.componentId
 *   fixtureWrites  every write in every fixture, as { document, field }
 *   instructions   participant-instructions.md
 */
export function verifyControllingReservation({ root, claim, blank, registrySha256, documentTitle, fixtureWrites, instructions }) {
  if (!claim) return null;
  const fail = (failure) => ({ ...claim, verified: false, failure });
  let entry;
  let source;
  if (claim.decisionPath) {
    const decision = readRecord(root, claim.decisionPath);
    if (!decision || decision.sha256 !== claim.decisionSha256) return fail("the reservation does not bind the owner-decision bytes it was declared against");
    if (!String(decision.json.verbatim ?? "").trim()) return fail("the owner decision records no verbatim owner text");
    entry = (decision.json.reservations ?? []).find((e) => e.item === claim.item);
    if (!entry) return fail("the bound owner decision has no reservation entry with this item");
    if (decisionReservationEntryDigest(entry) !== claim.entrySha256) return fail("the owner-decision entry's text is not the text this reservation was declared against");
    if (entry.trackId !== claim.trackId || entry.componentId !== claim.componentId || entry.document !== blank.document
      || entry.field !== blank.name || entry.whereInPacket !== documentTitle) {
      return fail("the owner-decision entry reserves a blank on a different component or field than this blank");
    }
    source = `the owner decision ${claim.decisionPath} (${decision.sha256})`;
  } else {
    const registry = readRecord(root, RESERVATION_REGISTRY_PATH);
    if (!registry || registry.sha256 !== registrySha256) return fail("the reservation does not bind the registry bytes this packet pins");
    const track = (registry.json.tracks ?? []).find((t) => t.trackId === claim.trackId);
    entry = (track?.manualCompletionItems ?? []).find((e) => e.item === claim.item);
    if (!entry) return fail("the bound registry has no manualCompletionItems entry for this track with this item");
    if (reservationEntryDigest(entry) !== claim.entrySha256) return fail("the registry entry's text is not the text this reservation was declared against");
    const component = (track.packetSet?.components ?? []).find((c) => c.componentId === claim.componentId);
    if (!component || component.officialFormId !== blank.document || entry.whereInPacket !== documentTitle) {
      return fail("the registry entry reserves a blank on a different component than the one this blank is on");
    }
    source = `the bound registry (${registrySha256})`;
  }
  // Writes carry the bare field; the corpus reader's blank.id is namespaced "<document>:<field>", so compare on name.
  if (!blank.name) return fail("the blank names no field to hold against the fixture writes");
  if ((fixtureWrites ?? []).some((w) => w.document === blank.document && w.field === blank.name)) {
    return fail("a reserved blank is written in at least one fixture");
  }
  const lines = String(instructions ?? "").split(/\r?\n/).map(norm);
  // One disclosure line carries the document, the blank and the entry: a label can be a substring of another blank's label.
  if (!norm(blank.label) || !lines.some((l) => l.includes(norm(blank.document)) && l.includes(norm(blank.label)) && l.includes(norm(entry.item)))) {
    return fail("the reserved blank or its controlling entry is missing from the participant disclosure");
  }
  const proof = {
    ...claim, verified: true,
    basis: `${source} reserves "${entry.item}" on ${entry.whereInPacket} for the participant: ${entry.why}`
  };
  verifiedProofs.add(proof);
  return proof;
}
