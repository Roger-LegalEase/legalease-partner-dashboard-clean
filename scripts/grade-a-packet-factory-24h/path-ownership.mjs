const normalize = (value) => String(value ?? "").replace(/^\.\//, "").replace(/\/+$/, "");

const concreteRoot = (pattern) => normalize(pattern)
  .replace(/\/\*\*$/, "")
  .replace(/\/\*$/, "");

function globRegex(pattern) {
  const source = normalize(pattern);
  let out = "^";
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === "*" && source[i + 1] === "*") {
      if (source[i + 2] === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else {
        out += ".*";
        i += 1;
      }
    } else if (char === "*") {
      out += "[^/]*";
    } else if (char === "?") {
      out += "[^/]";
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`${out}$`);
}

export function pathsOverlap(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;

  const ra = concreteRoot(a);
  const rb = concreteRoot(b);
  if (ra === rb || ra.startsWith(`${rb}/`) || rb.startsWith(`${ra}/`)) return true;

  return globRegex(a).test(rb) || globRegex(b).test(ra);
}

export function unresolvedHistoricalRepairPaths(assignments, claims) {
  const modernRepairs = new Map();
  for (const claim of claims ?? []) {
    if (claim.operation !== "rapid-repair" || claim.subjectType !== "packet-family") continue;
    const familyId = claim.subjectId ?? claim.familyId;
    if (!familyId) continue;
    if (!modernRepairs.has(familyId)) modernRepairs.set(familyId, []);
    modernRepairs.get(familyId).push(claim);
  }

  const paths = [];
  for (const assignment of assignments ?? []) {
    if (!assignment?.family || !assignment?.ownedPath) continue;
    const repairs = modernRepairs.get(assignment.family) ?? [];
    /* The first modern claim is the durable handoff from the historical wave.
     * While it is live, that claim is the sole owner; after release, its
     * history still proves the handoff occurred. Keeping the Wave-2 pseudo
     * owner beside either form creates two owners for the same family. */
    if (repairs.length) continue;
    paths.push({ lane: `WAVE_2_REPAIR:${assignment.family}`, path: assignment.ownedPath });
  }
  return paths;
}
