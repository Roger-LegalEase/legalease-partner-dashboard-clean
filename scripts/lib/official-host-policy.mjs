/**
 * Which hosts may publish an official source, in one place.
 *
 * This was two places: a list in rcap-acquire-official-source.mjs and a regex
 * that scraped that list out of the acquire script's own text in
 * rcap-plan-source-acquisition-batch.mjs. A policy expressed once as data and
 * once as a regex over source code is a policy that can silently disagree with
 * itself, and neither copy could be tested directly. It is a module now, and
 * both import it.
 *
 * C13 found the substantive defect: `.us` was on the suffix list, under a
 * comment reading "Only first-party government publishers." `.us` is an
 * open-registration TLD -- any US person or entity can register a .us domain in
 * minutes -- so `rcap-forms-mirror.us` was an allowlisted official government
 * publisher. C13 repointed a manifest entry at exactly that shape and the whole
 * gate stayed green.
 *
 * The two legitimate .us hosts in the manifest are www.fdle.state.fl.us and the
 * New Hampshire courts. Both sit under `state.<code>.us`, which the usTLD
 * locality structure delegates to state governments and which is not open for
 * registration. So the rule is that third level, not the TLD.
 */

// Closed namespaces. `.gov` and `.uscourts.gov` are restricted to US
// government; `state.<code>.us` is the delegated state-government namespace.
const ALLOWED_HOST_SUFFIXES = [
  ".gov",
  ".uscourts.gov"
];
const STATE_US = /(^|\.)state\.[a-z]{2}\.us$/;
const COURTS_STATE_US = /(^|\.)courts\.state\.[a-z]{2}\.us$/;

/*
 * Exact hosts, allowed one hostname at a time and never by suffix.
 *
 * The Illinois judiciary publishes some of its own documents from a storage
 * bucket rather than from a .gov name. The document is official; the HOST is
 * not a government name, and `.blob.core.windows.net` is a shared storage
 * suffix anyone in the world can obtain a subdomain of. Allowing the suffix
 * would allow every tenant on that service.
 *
 * So this is an exact-hostname list. A host here is matched by full equality,
 * it carries the jurisdictions it is allowed to serve, and it requires an
 * expected SHA-256 at dispatch: a bucket URL can be repointed without any
 * visible change to the address, and the hash is what makes the substitution
 * detectable.
 */
const ALLOWED_EXACT_HOSTS = new Map([
  ["ilcourtsaudio.blob.core.windows.net", {
    provenance: "Illinois judiciary — documents published by the Illinois Courts from their own storage host",
    jurisdictions: new Set(["IL"]),
    requiresExpectedSha256: true,
    why: "the host is not a government name, so the document's identity rests on the hash rather than on the address"
  }]
]);

// Hosts that are government-adjacent but not first-party publishers. Named
// explicitly so a reviewer sees they were considered and refused.
const REFUSED_HOSTS = new Set([
  "www.formsworkflow.com", "www.uslegalforms.com", "www.pdffiller.com",
  "www.scribd.com", "www.docketbird.com"
]);

export function hostAllowed(host) {
  const h = String(host ?? "").toLowerCase();
  if (REFUSED_HOSTS.has(h)) return false;
  if (ALLOWED_EXACT_HOSTS.has(h)) return true;
  if (STATE_US.test(h) || COURTS_STATE_US.test(h)) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => h === s.replace(/^\./, "") || h.endsWith(s));
}

export function exactHostPolicy(host) {
  return ALLOWED_EXACT_HOSTS.get(String(host ?? "").toLowerCase()) ?? null;
}

export function hostRefused(host) {
  return REFUSED_HOSTS.has(String(host ?? "").toLowerCase());
}

export { ALLOWED_HOST_SUFFIXES, ALLOWED_EXACT_HOSTS, REFUSED_HOSTS };

/*
 * The policy's own test vectors, kept beside it so the checks that consume this
 * module do not have to invent them, and so a future widening has to state
 * which of these it intends to change.
 */
export const HOST_POLICY_VECTORS = [
  { host: "www.fdle.state.fl.us", allowed: true, why: "Florida state government under the delegated state.fl.us namespace" },
  { host: "www.courts.state.nh.us", allowed: true, why: "New Hampshire judiciary" },
  { host: "www.txcourts.gov", allowed: true, why: "restricted .gov" },
  { host: "www.uscourts.gov", allowed: true, why: "federal judiciary" },
  { host: "ilcourtsaudio.blob.core.windows.net", allowed: true, why: "exact host, Illinois judiciary, hash required" },
  { host: "rcap-forms-mirror.us", allowed: false, why: "open-registration .us; this is the host C13 used to walk a poisoned manifest entry through the gate" },
  { host: "forms.us", allowed: false, why: "open-registration .us" },
  { host: "notstate.fl.us.evil.com", allowed: false, why: "the delegated namespace has to end the host, not appear inside it" },
  { host: "othertenant.blob.core.windows.net", allowed: false, why: "a shared storage suffix is never widened from one exact tenant" },
  { host: "www.uslegalforms.com", allowed: false, why: "explicitly refused reseller" },
  { host: "courts.gov.evil.com", allowed: false, why: "lookalike ending outside the closed namespace" }
];
