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
 * As with the NJ later-completion proof, a map cannot mint the proof: the
 * contract accepts only an object this module verified in this process.
 */
export const RESERVATION_REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/** The digest a reservation claim pins: the entry's three fields, in a fixed order. */
export const reservationEntryDigest = (entry) =>
  sha256(JSON.stringify({ item: entry?.item ?? null, whereInPacket: entry?.whereInPacket ?? null, why: entry?.why ?? null }));

const verifiedProofs = new WeakSet();
export const isVerifiedControllingReservationProof = (proof) =>
  Boolean(proof && typeof proof === "object" && verifiedProofs.has(proof));

const registries = new Map();
function readRegistry(root) {
  const abs = path.join(root, RESERVATION_REGISTRY_PATH);
  if (!registries.has(abs)) {
    const bytes = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
    registries.set(abs, bytes ? { sha256: sha256(bytes), json: JSON.parse(bytes.toString("utf8")) } : null);
  }
  return registries.get(abs);
}

const norm = (value) => String(value ?? "").normalize("NFKC").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Verify one reservation claim.
 *
 *   claim          { trackId, componentId, item, entrySha256 } from the field-map row
 *   blank          { id, name, document, label } of the blank; name is the bare field the writes carry
 *   registrySha256 the registry pin this packet binds (its receipt's committed record)
 *   documentTitle  the official title the packet binds for claim.componentId
 *   fixtureWrites  every write in every fixture, as { document, field }
 *   instructions   participant-instructions.md
 */
export function verifyControllingReservation({ root, claim, blank, registrySha256, documentTitle, fixtureWrites, instructions }) {
  if (!claim) return null;
  const fail = (failure) => ({ ...claim, verified: false, failure });
  const registry = readRegistry(root);
  if (!registry || registry.sha256 !== registrySha256) return fail("the reservation does not bind the registry bytes this packet pins");
  const track = (registry.json.tracks ?? []).find((t) => t.trackId === claim.trackId);
  const entry = (track?.manualCompletionItems ?? []).find((e) => e.item === claim.item);
  if (!entry) return fail("the bound registry has no manualCompletionItems entry for this track with this item");
  if (reservationEntryDigest(entry) !== claim.entrySha256) return fail("the registry entry's text is not the text this reservation was declared against");
  const component = (track.packetSet?.components ?? []).find((c) => c.componentId === claim.componentId);
  if (!component || component.officialFormId !== blank.document || entry.whereInPacket !== documentTitle) {
    return fail("the registry entry reserves a blank on a different component than the one this blank is on");
  }
  // Writes carry the bare field; the corpus reader's blank.id is namespaced "<document>:<field>", so compare on name.
  if (!blank.name) return fail("the blank names no field to hold against the fixture writes");
  if ((fixtureWrites ?? []).some((w) => w.document === blank.document && w.field === blank.name)) {
    return fail("a reserved blank is written in at least one fixture");
  }
  const lines = String(instructions ?? "").split(/\r?\n/).map(norm);
  if (!norm(blank.label) || !lines.some((l) => l.includes(norm(blank.label))) || !lines.some((l) => l.includes(norm(entry.item)))) {
    return fail("the reserved blank or the registry entry is missing from the participant disclosure");
  }
  const proof = {
    ...claim, verified: true,
    basis: `the bound registry (${registrySha256}) reserves "${entry.item}" on ${entry.whereInPacket} for the participant: ${entry.why}`
  };
  verifiedProofs.add(proof);
  return proof;
}
