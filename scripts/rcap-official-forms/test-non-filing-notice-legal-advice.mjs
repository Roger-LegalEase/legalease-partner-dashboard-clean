#!/usr/bin/env node
// "For informational purposes only" is a non-filing notice only when the
// document says it about ITSELF.
//
// North Dakota's SFN 61663 IS the Pardon Advisory Board application — the
// filing document and nothing else. Its explanatory page ends: "This is
// provided for informational purposes only and not for the purpose of
// providing legal advice. You should contact your attorney to obtain advice
// with respect to any particular issue or problem." That is a lawyer's
// disclaimer about the paragraph above it, and the gate read it as the form
// disclaiming its own filing status, so nd-summary-marijuana-pardon-set
// stopped with a source that binds exactly, at three paths.
//
// The lane that hit it refused the two routes past it available from inside
// its own paths — trimming the document text, or passing a falsy notice —
// because both weaken the safeguard instead of correcting it. This narrows the
// pattern instead, and every case below that MUST fire is why: the exclusion
// is written to name legal advice as the thing disclaimed, so the
// reference-copy notice the pattern exists for still fires, and a document
// that disclaims advice AND separately says do not file still fires on the
// other pattern.
//
//   node scripts/rcap-official-forms/test-non-filing-notice-legal-advice.mjs

import { detectNonFilingNotice } from "./rcap-source-notice.mjs";

const cases = [
  { name: "ND SFN 61663's own legal-advice disclaimer is not a non-filing notice",
    lines: ["This is provided for informational purposes only and not for the purpose of providing legal advice. You should contact your attorney to obtain advice with respect to any particular issue or problem."],
    expect: null },
  { name: "the shorter 'this is not legal advice' shape is excused too",
    lines: ["Provided for informational purposes only; this is not legal advice."],
    expect: null },
  // Everything below MUST still fire. If any of these stops firing, the
  // exclusion has grown into a hole and the safeguard is gone.
  { name: "a translation reference copy still fires",
    lines: ["This translation is for informational purposes only.", "Use the English version to file with the court."],
    expect: "informational_purposes_only" },
  { name: "a notice split across printed lines still fires",
    lines: ["DO NOT COMPLETE THIS FORM", "FOR FILING."],
    expect: "do_not_complete_for_filing" },
  { name: "an explicit do-not-file still fires",
    lines: ["Do not file this form with the clerk."],
    expect: "do_not_file_this_form" },
  { name: "a specimen copy still fires",
    lines: ["SPECIMEN COPY - not for use."],
    expect: "specimen_copy" },
  { name: "an advice disclaimer beside a real non-filing notice still fires on the real one",
    lines: ["This is provided for informational purposes only and not for the purpose of providing legal advice.", "Do not file this form."],
    expect: "do_not_file_this_form" }
];

let failed = 0;
console.log("non-filing notice — the legal-advice disclaimer exclusion\n");
for (const c of cases) {
  const got = detectNonFilingNotice(c.lines)?.matched ?? null;
  const ok = got === c.expect;
  if (!ok) failed += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${c.name}${ok ? "" : ` — expected ${c.expect}, got ${got}`}`);
}
console.log(`\n${failed === 0 ? "all controls pass" : `${failed} control(s) FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
