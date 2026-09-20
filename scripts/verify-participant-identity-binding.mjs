#!/usr/bin/env node
/**
 * No packet may contain anyone's name but the participant's.
 *
 * THE DEFECT THIS EXISTS FOR
 *
 * The derivation repairs recover approved document text from each family's
 * build host. That host renders with a FIXTURE participant, so its output
 * contains a sample person's completed answers sitting inside the approved
 * template: "1. The defendant, Jordan Avery Reyes, received a suspended
 * imposition of sentence...". Transcribing the output faithfully carries that
 * name in, and it reads as approved legal wording because everything around it
 * is.
 *
 * The result is the worst kind of defect: the caption and the signature block
 * use {{participant_full_legal_name}} and are right, while a numbered paragraph
 * in the same document names a stranger. Nothing refuses, nothing looks broken,
 * and the participant files a sworn document about someone else.
 *
 * It happened in both repaired families -- two sites in South Dakota, five in
 * Wyoming, including a verification oath and a certificate of service.
 *
 * WHAT THIS CHECKS, AND WHY IT RENDERS TWICE
 *
 * Every transcribed route is composed and rendered with TWO different synthetic
 * participants, neither named like any fixture, and the text is read back out
 * of the PDF. One render cannot catch this: a hard-coded name is only visibly
 * wrong when the document is supposed to say something else. Two renders make
 * the leak unmissable -- the same literal appears in both, while everything
 * correctly bound changes.
 *
 * Provenance records are deliberately out of scope. `carriedElsewhere` stores
 * adopted lines verbatim to prove nothing was dropped in migration, so a
 * fixture name there is the record doing its job. This reads what is DRAWN.
 */
import { register } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

/**
 * Names that must never survive into a rendered packet. These are the fixture
 * identities the build hosts render with; add one whenever a family is carried
 * in from a host that uses a different sample person.
 */
const FIXTURE_IDENTITIES = [
  "Jordan Avery Reyes",
  "42 Coteau Street",
  "605-555-0142",
  "jordan.reyes@example.org",
  // Illinois renders with the same sample person at a different address, so the
  // name alone would not have caught a leak from its pages.
  "42 Magnolia Street",
  "Springfield 62704",
  "555-0142",
  "1991-04-17"
];

/** Two participants who share no name part, so a leak cannot hide behind a match. */
const PEOPLE = [
  {
    participant_full_legal_name: "Marisol Okonkwo-Baptiste",
    date_of_birth: "1984-11-02",
    mailing_address: "9 Larkspur Row, Cheyenne, WY 82001",
    phone_number: "307-555-0188",
    email_address: "m.okonkwo@example.test"
  },
  {
    participant_full_legal_name: "Tobias Fenwick Ashgrove",
    date_of_birth: "1977-06-23",
    mailing_address: "1400 Quarry Lane, Rapid City, SD 57701",
    phone_number: "605-555-0433",
    email_address: "t.ashgrove@example.test"
  }
];

function textOf(pdf) {
  const file = path.join(os.tmpdir(), `identity-${process.pid}-${pdf.length}.pdf`);
  fs.writeFileSync(file, pdf);
  try { return execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" }); }
  finally { fs.rmSync(file, { force: true }); }
}

const specDir = path.join(rootDir, "data/record-clearing/packet-specifications");
const specifications = fs.readdirSync(specDir).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(specDir, f), "utf8")))
  // The routes this program carried text into are the ones that can carry a
  // fixture answer. Specification text that predates it is not in scope.
  .filter((spec) => Array.isArray(spec.documents) && spec.documents.some((d) => d.transcriptionProvenance));

check(specifications.length > 0, `there are transcribed routes to check (${specifications.length})`);

for (const specification of specifications) {
  const where = specification.routeKey;

  // Every component the route can ship, including conditionals, because a
  // component the participant reaches only at an escalation stage carries the
  // same risk and would otherwise go unrendered.
  const everyComponent = structuredClone(specification);
  for (const document of everyComponent.documents) {
    if (document.requirement === "conditional") document.requirement = "required";
  }

  /*
   * AND: the substance actually reaches the page.
   *
   * South Dakota's guidance components were transcribed with `pleading_paragraph`
   * sections, which only the pleading path draws. The packet rendered, the page
   * carried its title, and every step beneath it was missing -- with nothing
   * reporting it. A control that stops at "a PDF was produced" cannot see that,
   * so every transcribed section's own words are looked for in the drawn text.
   */
  const rendered = [];
  for (const [index, person] of PEOPLE.entries()) {
    /*
     * Route-specific facts are supplied from the route's OWN declaration, with
     * a value distinct per participant, so this control stays generic and a new
     * family needs no entry here. A distinct value matters as much as a present
     * one: a fact that happened to be identical for both people would hide a
     * hard-coded literal in exactly the place this is looking.
     */
    const facts = { ...person };
    for (const required of everyComponent.requiredFacts ?? []) {
      if (facts[required.factId]) continue;
      facts[required.factId] = /date/i.test(required.factId)
        ? ["2019-03-14", "2021-08-02"][index]
        : `${required.factId.replace(/_/g, " ")} ${index + 1}`;
    }
    const matter = {
      routeKey: where,
      verificationHash: `identity-binding-proof-${index}`,
      facts
    };
    let text;
    try {
      const packet = composeGradeAPacket(everyComponent, matter, {});
      text = textOf(await renderGradeAPacketPdf(packet));
    } catch (error) {
      check(false, `${where}: composes and renders for participant ${index + 1} (${error.message.slice(0, 120)})`);
      continue;
    }
    rendered.push({ person, text });
  }
  if (rendered.length !== PEOPLE.length) continue;
  check(true, `${where}: composes and renders for both participants`);

  for (const { person, text } of rendered) {
    const leaked = FIXTURE_IDENTITIES.filter((value) => text.includes(value));
    check(
      leaked.length === 0,
      `${where}: no fixture identity survives into the packet for ${person.participant_full_legal_name}${
        leaked.length ? ` (found: ${leaked.join(", ")})` : ""}`
    );
    check(
      text.includes(person.participant_full_legal_name),
      `${where}: the packet names ${person.participant_full_legal_name}`
    );
    const others = PEOPLE.filter((p) => p !== person);
    const crossed = others.filter((p) => text.includes(p.participant_full_legal_name));
    check(
      crossed.length === 0,
      `${where}: and names nobody else${crossed.length ? ` (found ${crossed[0].participant_full_legal_name})` : ""}`
    );
    const tokens = text.match(/\{\{[a-z0-9_]+\}\}/g);
    check(!tokens, `${where}: no unsubstituted binding is printed${tokens ? ` (${[...new Set(tokens)].join(", ")})` : ""}`);
  }

  // Every transcribed section's substance is on the page, not merely composed.
  {
    const drawn = rendered[0].text;
    const missing = [];
    for (const document of everyComponent.documents) {
      if (!document.transcriptionProvenance) continue;
      for (const section of document.sections ?? []) {
        const body = String(section.body ?? "").trim();
        if (body.length < 40) continue;
        // A distinctive run from the middle, past any heading the page prints
        // regardless, and clear of the fact bindings that differ per participant.
        const probe = body.split(/\s+/).slice(4, 14).join(" ");
        if (probe.length < 25 || /\{\{/.test(probe)) continue;
        if (!drawn.replace(/\s+/g, " ").includes(probe.replace(/\s+/g, " "))) {
          missing.push(`${document.documentId}/"${section.heading}"`);
        }
      }
    }
    check(
      missing.length === 0,
      `${where}: every transcribed section's substance reaches the rendered page${
        missing.length ? ` (${missing.length} drawn nowhere, first: ${missing[0]})` : ""}`
    );
  }

  /*
   * STRUCTURE, not just words.
   *
   * "Every word is on the page somewhere" passes a document that flattened six
   * adopted paragraphs into one wall of text. A blank line in a transcribed
   * body is a paragraph boundary the adopted document has, and a list is a
   * list; both are structure, and `sanitize()` was deciding them by deleting
   * newlines.
   *
   * So each boundary is checked where it actually shows: the last words of one
   * paragraph must never be drawn immediately followed by the first words of
   * the next. If they are, the boundary is gone however complete the text is.
   *
   * SCOPE. This is ACCEPTANCE EVIDENCE, not the document contract. The
   * authoritative invariant is that adopted semantic boundaries survive --
   * paragraph, recital, numbered assertion, list introduction, list item,
   * caption, signature and execution structure -- and those live in the section
   * and block model. How a boundary is DRAWN is the adopted template's
   * business: spacing, indentation, a numbered block or a rule are all
   * legitimate. A line break is simply what these templates use, so it is what
   * proves they were not flattened here. Do not normalise a future official
   * form or a differently laid out pleading to satisfy this pattern; where a
   * template separates blocks another way, prove it another way.
   */
  {
    /*
     * Line by line, NOT over the flowed page.
     *
     * A first version of this normalised all whitespace and then looked for
     * "tail head" -- which is exactly what two correctly separated paragraphs
     * also collapse to, so it reported every boundary flattened, including the
     * ones that were fine. A boundary shows as a LINE break: the tail and the
     * head are never on the same drawn line.
     */
    const lines = rendered[0].text.split("\n").map((line) => line.replace(/\s+/g, " ").trim());
    const joined = [];
    for (const document of everyComponent.documents) {
      if (!document.transcriptionProvenance) continue;
      for (const section of document.sections ?? []) {
        const parts = String(section.body ?? "").split(/\n\s*\n/)
          .map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
        if (parts.length < 2) continue;
        for (let index = 0; index + 1 < parts.length; index += 1) {
          const tail = parts[index].split(" ").slice(-4).join(" ");
          const head = parts[index + 1].split(" ").slice(0, 4).join(" ");
          if (tail.length < 12 || head.length < 12 || /\{\{/.test(tail + head)) continue;
          if (lines.some((line) => line.includes(`${tail} ${head}`))) {
            joined.push(`${document.documentId}/"${section.heading}" after "${tail}"`);
          }
        }
      }
    }
    check(
      joined.length === 0,
      `${where}: every adopted paragraph boundary survives into the drawn page${
        joined.length ? ` (${joined.length} flattened, first: ${joined[0]})` : ""}`
    );
  }

  /*
   * The decisive test: a literal that survived transcription appears IDENTICALLY
   * in both renders, while everything correctly bound differs. Comparing the two
   * outputs finds a hard-coded identity even if it is a name nobody listed above.
   */
  const [first, second] = rendered;
  const namePart = (person) => person.participant_full_legal_name.split(/[\s-]+/);
  const firstParts = namePart(first.person);
  const shared = firstParts.filter((part) => part.length > 3 && second.text.includes(part));
  check(
    shared.length === 0,
    `${where}: no part of one participant's name appears in the other's packet${
      shared.length ? ` (${shared.join(", ")})` : ""}`
  );
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
