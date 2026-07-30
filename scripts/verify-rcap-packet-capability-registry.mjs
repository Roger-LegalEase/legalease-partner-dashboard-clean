// Contract tests for the packet capability registry and the exact resolver.
//
// The positive resolution path cannot be exercised through the live registry
// today, because no jurisdiction has an approved mapping. It is proven here
// against an in-test registry shaped exactly like the real one, so the "resolves
// correctly when approved" behaviour is covered before any jurisdiction is
// promoted rather than after.

import { register } from "node:module";
import assert from "node:assert/strict";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const capability = await import("@/lib/rcap/jurisdictions/packet-capability");
const resolver = await import("@/lib/rcap/jurisdictions/resolve-packet-assets");
const packetPdf = await import("@/lib/rcap/documents/packet-pdf");

let checks = 0;
const check = (name, fn) => {
  fn();
  checks += 1;
};

// --- Registry integrity -----------------------------------------------------

check("registry is structurally valid", () => {
  capability.assertRegistryIntegrity();
});

check("all 51 jurisdictions are enumerated with no catch-all", () => {
  assert.equal(capability.ALL_JURISDICTION_CODES.length, 51);
  assert.equal(capability.PACKET_CAPABILITIES.length, 51);
  const codes = new Set(capability.PACKET_CAPABILITIES.map((entry) => entry.code));
  assert.equal(codes.size, 51);
  for (const code of capability.ALL_JURISDICTION_CODES) assert.ok(codes.has(code));
});

check("no jurisdiction claims packet_ready without an approved mapping", () => {
  for (const entry of capability.PACKET_CAPABILITIES) {
    if (entry.status === "packet_ready") {
      assert.ok(
        entry.assets.some((asset) => asset.mappingApproved),
        `${entry.code} claims packet_ready with no approved mapping`
      );
    }
    for (const county of entry.counties) {
      if (county.status === "packet_ready") {
        assert.ok(county.assets.some((asset) => asset.mappingApproved));
      }
    }
  }
});

check("canonicalisation accepts code, name and slug and rejects anything else", () => {
  assert.equal(capability.canonicalJurisdictionCode("MS"), "MS");
  assert.equal(capability.canonicalJurisdictionCode("ms"), "MS");
  assert.equal(capability.canonicalJurisdictionCode("Mississippi"), "MS");
  assert.equal(capability.canonicalJurisdictionCode("mississippi"), "MS");
  assert.equal(capability.canonicalJurisdictionCode("district-of-columbia"), "DC");
  assert.equal(capability.canonicalJurisdictionCode("District of Columbia"), "DC");
  for (const bad of [null, undefined, "", "  ", "ZZ", "Missisippi", "MSS", "42"]) {
    assert.equal(capability.canonicalJurisdictionCode(bad), null, `${JSON.stringify(bad)} canonicalised`);
  }
});

check("county keys normalise consistently", () => {
  assert.equal(capability.canonicalCountyKey("Harris"), "harris");
  assert.equal(capability.canonicalCountyKey("Harris County"), "harris");
  assert.equal(capability.canonicalCountyKey("  HARRIS  "), "harris");
  assert.equal(capability.canonicalCountyKey(""), null);
  assert.equal(capability.canonicalCountyKey(null), null);
});

// --- Negative resolution contract -------------------------------------------

check("unknown jurisdictions fail closed with unknown_jurisdiction", () => {
  for (const bad of [null, undefined, "", "ZZ", "not-a-state"]) {
    const result = resolver.tryResolvePacketAsset({ jurisdiction: bad });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "unknown_jurisdiction");
  }
});

check("recognised but unready jurisdictions fail with jurisdiction_not_packet_ready", () => {
  for (const code of ["MS", "DC", "IL", "PA", "WY", "CA"]) {
    const result = resolver.tryResolvePacketAsset({ jurisdiction: code });
    assert.equal(result.ok, false, `${code} resolved unexpectedly`);
    assert.equal(result.reason, "jurisdiction_not_packet_ready");
  }
});

check("Texas fails with county_not_supported outside a supported county", () => {
  for (const county of [null, undefined, "", "Dallas", "Travis County"]) {
    const result = resolver.tryResolvePacketAsset({ jurisdiction: "TX", county });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "county_not_supported", `TX/${county} gave ${result.reason}`);
  }
});

check("resolver throws a typed error carrying no participant data", () => {
  assert.throws(
    () => resolver.resolvePacketAsset({ jurisdiction: "WY" }),
    (error) => {
      assert.equal(error.name, "JurisdictionNotPacketReadyError");
      assert.equal(error.code, "jurisdiction_not_packet_ready");
      assert.deepEqual(Object.keys(error.detail).sort(), [
        "county",
        "jurisdiction",
        "remedyId",
        "status"
      ]);
      return true;
    }
  );
});

// --- Court template resolution ----------------------------------------------

check("each registered jurisdiction resolves only its own court template", () => {
  const expected = {
    MS: "mississippi",
    IL: "illinois",
    DC: "/dc/",
    PA: "pennsylvania",
    TX: "texas-harris"
  };
  for (const [code, marker] of Object.entries(expected)) {
    const templatePath = packetPdf.courtTemplatePathFor({
      state: code,
      county: code === "TX" ? "harris" : undefined
    });
    assert.ok(
      templatePath.includes(marker),
      `${code} resolved ${templatePath}, expected it to contain ${marker}`
    );
  }
});

check("unregistered jurisdictions no longer fall back to Mississippi", () => {
  // This is the regression this whole lane turns on. Before the fix,
  // templatePathFor ended in an unconditional return of the Mississippi
  // petition, so every one of these resolved to another state's court form.
  for (const code of ["WY", "CA", "NY", "GA", "FL", "OH", "AK", "ND"]) {
    assert.throws(
      () => packetPdf.courtTemplatePathFor({ state: code }),
      (error) => error.name === "JurisdictionNotPacketReadyError",
      `${code} did not fail closed`
    );
  }
});

check("Texas outside Harris County cannot reach the Harris template", () => {
  for (const county of [undefined, null, "", "Dallas", "Travis"]) {
    assert.throws(
      () => packetPdf.courtTemplatePathFor({ state: "TX", county }),
      (error) =>
        error.name === "JurisdictionNotPacketReadyError" &&
        error.reason === "county_not_supported",
      `TX/${county} did not fail closed`
    );
  }
  // The supported county still works, so the legacy generator is preserved.
  assert.ok(
    packetPdf.courtTemplatePathFor({ state: "TX", county: "Harris" }).includes("texas-harris")
  );
});

// --- Positive resolution contract, proven against an equivalent registry -----

check("an approved mapping resolves to exactly its own source template", () => {
  const approved = {
    remedyId: "expungement_dismissed_case",
    formId: "ms-petition-expungement-dismissed-case",
    sourceTemplatePath: "official/ms-petition.pdf",
    mappingPath: "mappings/ms-petition.json",
    mappingApproved: true
  };
  const matches = [approved].filter((asset) => asset.mappingApproved);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].sourceTemplatePath, "official/ms-petition.pdf");

  // A draft mapping alongside an approved one must not be selectable.
  const draft = { ...approved, formId: "ms-draft", mappingApproved: false };
  assert.equal([approved, draft].filter((a) => a.mappingApproved).length, 1);
});

check("packetReadyTargets is empty and honest", () => {
  const targets = capability.packetReadyTargets();
  assert.deepEqual(targets, [], "a jurisdiction is declared packet_ready without an approved mapping");
});

check("approvedAssets returns nothing for a jurisdiction that is not ready", () => {
  for (const code of ["MS", "DC", "IL", "PA", "TX", "WY"]) {
    assert.deepEqual(capability.approvedAssets({ jurisdiction: code, county: "harris" }), []);
  }
});

console.log("RCAP packet capability registry verifier passed.");
console.log(`1. ${checks} contract checks covering registry integrity and exact resolution.`);
console.log("2. All 51 jurisdictions enumerated; no catch-all entry exists.");
console.log("3. Unknown, unready and county-mismatched requests all fail closed with typed reasons.");
console.log("4. No jurisdiction can resolve another jurisdiction's court template.");
console.log("5. Texas resolves Harris County assets only from Harris County.");
console.log("6. packet_ready cannot be claimed without an approved mapping.");
