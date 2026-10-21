// Builds docs/partners/mvlp/MVLP_Volunteer_Guide.pdf: a two-page volunteer
// guide with real screenshots from the implemented product (captured by
// scripts/legal-aid/verify-legal-aid-e2e.mjs) and a simple process diagram.
// Rendered with the bundled Chromium so the layout is exactly what prints.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const shots = path.join(root, "docs/partners/mvlp/screenshots");
const out = path.join(root, "docs/partners/mvlp/MVLP_Volunteer_Guide.pdf");
const logo = fs.readFileSync(path.join(root, "public/assets/partners/mvlp/mvlp-logo.png")).toString("base64");

const img = (name, crop = 520, offsetPercent = 0) => {
  const file = path.join(shots, name);
  if (!fs.existsSync(file)) throw new Error(`missing screenshot ${name}; run the end-to-end verifier first`);
  return `<figure><div class="shot" style="height:${crop}px"><img style="margin-top:-${offsetPercent}%" src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}" alt="" /></div><figcaption>${captions[name]}</figcaption></figure>`;
};
const captions = {
  "participant-register-390.png": "1. Registration on a phone: name, a way to be reached, and help needed. Nothing else.",
  "participant-intake-protected-390.png": "2. The protected step: the Social Security number is saved encrypted and shown masked.",
  "participant-intake-sign-390.png": "3. Review and sign: only the applicant signs, one statement at a time.",
  "staff-review-1440.png": "4. Staff review: requests, decisions, financial summary, answers, documents, next steps.",
  "staff-notary-1440.png": "5. The notary's view: only the documents waiting for notarization."
};

const html = `<!doctype html><html><head><meta charset="utf-8"><title>MVLP Volunteer Guide</title>
<style>
  @page { size: Letter; margin: 0.42in 0.5in; }
  * { box-sizing: border-box; }
  body { font-family: "Sora", "Helvetica Neue", Arial, sans-serif; color: #1E1129; font-size: 9.6pt; line-height: 1.34; margin: 0; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #6D378F; padding-bottom: 8px; margin-bottom: 12px; }
  header img { height: 34px; }
  header .kicker { font-size: 9pt; color: #5B4E66; text-align: right; }
  h1 { font-size: 16pt; margin: 0 0 4px; color: #3A1E52; }
  h2 { font-size: 10.5pt; margin: 8px 0 4px; color: #6D378F; text-transform: uppercase; letter-spacing: 0.06em; }
  p { margin: 0 0 6px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .box { border: 1px solid #E8E1EE; border-radius: 8px; padding: 9px 11px; background: #FBFAFC; }
  ul { margin: 0; padding-left: 16px; } li { margin-bottom: 3px; }
  .diagram { margin: 6px 0 4px; }
  .page-break { page-break-after: always; }
  .shots { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .shots.wide { grid-template-columns: 1fr 1fr; }
  figure { margin: 0; }
  .shot { overflow: hidden; border: 1px solid #D9CFE2; border-radius: 6px; background: #fff; }
  .shot img { width: 100%; display: block; }
  figcaption { font-size: 8.6pt; color: #5B4E66; margin-top: 4px; line-height: 1.3; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; } td, th { border: 1px solid #E8E1EE; padding: 4px 6px; text-align: left; vertical-align: top; } th { background: #F3ECF8; }
  footer { margin-top: 10px; font-size: 8.4pt; color: #7A6E85; border-top: 1px solid #E8E1EE; padding-top: 5px; }
  strong { color: #3A1E52; }
</style></head><body>
<header><img src="data:image/png;base64,${logo}" alt="MVLP" /><div class="kicker">Self-Representation Expungement Clinics<br/>Volunteer guide · Clinic Mode</div></header>
<h1>Helping a participant through an MVLP clinic</h1>
<p>MVLP decides who it can help and its attorneys give the legal advice. The screens keep the work organized. Your job is to help the person move through the steps below, ask rather than guess, and hand the right questions to the right MVLP reviewer.</p>

<h2>How a clinic runs</h2>
<svg class="diagram" viewBox="0 0 1000 118" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">
  ${["Register", "Apply and sign", "MVLP review", "Court documents", "Sign and notarize", "Next steps"].map((label, index) => {
    const x = 8 + index * 166; const sub = ["a place at the clinic", "the private application", "program decision", "attorney prepares", "on paper, recorded", "owner and due date"][index];
    return `<rect x="${x}" y="14" width="150" height="66" rx="10" fill="${index === 2 || index === 3 ? "#6D378F" : "#F3ECF8"}" stroke="#6D378F" stroke-width="2"/>
      <text x="${x + 75}" y="42" text-anchor="middle" font-size="15" font-weight="700" fill="${index === 2 || index === 3 ? "#fff" : "#3A1E52"}">${label}</text>
      <text x="${x + 75}" y="62" text-anchor="middle" font-size="11" fill="${index === 2 || index === 3 ? "#EFE3F6" : "#5B4E66"}">${sub}</text>
      ${index < 5 ? `<path d="M${x + 152} 47 L${x + 164} 47" stroke="#6D378F" stroke-width="3" marker-end="url(#arrow)"/>` : ""}`;
  }).join("")}
  <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#6D378F"/></marker></defs>
  <text x="8" y="106" font-size="11" fill="#5B4E66">Registration is not acceptance. MVLP's program decision is not a ruling on legal eligibility. A prepared document is not filed or granted until those steps really happen.</text>
</svg>

<div class="cols">
  <div class="box"><h2 style="margin-top:0">Do</h2><ul>
    <li><strong>Start on the MVLP page</strong> (<span style="white-space:nowrap">legaleasepartner.com/p/mvlp</span>): <strong>Register for a clinic</strong>, or <strong>Continue my application</strong> for a return visit.</li>
    <li>Let the participant sign in with <strong>their own</strong> account. Help them type if they ask; the answers and signatures are theirs.</li>
    <li>Use <strong>I don't know this amount</strong> when a money answer is unknown. A blank is not zero.</li>
    <li>Explain the <strong>Protected information</strong> step: the Social Security number is stored encrypted, shown masked, and only the MVLP attorney or coordinator can reveal it, with the reason recorded.</li>
    <li>Point to <strong>Saved</strong> at the top of the application: they can stop and come back.</li>
    <li>At <strong>Review and sign</strong>, the participant reads each statement and chooses <strong>Sign this statement</strong>, then <strong>Submit my application</strong>.</li>
    <li>Before they leave, show them their next steps at <strong>Continue my application</strong> and who to contact.</li>
    <li>Sign the participant out of a shared device, then sign out of your own staff account.</li>
  </ul></div>
  <div class="box"><h2 style="margin-top:0">Do not</h2><ul>
    <li>Do not create an application under your staff login, and never sign for the participant.</li>
    <li>Do not answer questions about income, citizenship, an existing attorney, or legal eligibility. Send them to the program reviewer or attorney through the coordinator.</li>
    <li>Do not tell someone they are accepted, or that a document is filed, because a screen was printed. The screen shows the real status.</li>
    <li>Do not write financial details or the protected number into messages, notes, or email.</li>
    <li>Do not create a second account or change an answer to get past a screen. Ask the coordinator.</li>
    <li>Do not share staff links, invitations, or passwords.</li>
  </ul></div>
</div>

<h2>Who does what</h2>
<table><tr><th>Role on the screen</th><th>What they see and do</th></tr>
<tr><td>Intake volunteer</td><td>Sees the application; helps identify missing information; cannot reveal the protected number or record a decision.</td></tr>
<tr><td>Program reviewer</td><td>Records MVLP's <strong>Program eligibility</strong> decision with a reason.</td></tr>
<tr><td>Attorney</td><td>Takes the assignment, reviews the matter, prepares the <strong>Court documents</strong>, prints the unsigned copy.</td></tr>
<tr><td>Notary</td><td>Sees only <strong>Notarization</strong>; uploads the signed copy and records it received.</td></tr>
<tr><td>Follow-up volunteer</td><td>Adds <strong>Participant next steps</strong> and uses <strong>Contact the participant</strong>.</td></tr></table>
<footer>Questions on clinic day: the coordinator named in your briefing. General MVLP contact: 601-960-9577 · mvlp@mvlp.org. Application technology provided by LegalEase.</footer>
<div class="page-break"></div>

<header><img src="data:image/png;base64,${logo}" alt="MVLP" /><div class="kicker">Volunteer guide · page 2<br/>What the screens look like</div></header>
<h2 style="margin-top:0">The participant's screens (phone)</h2>
<div class="shots">${img("participant-register-390.png", 410, 14)}${img("participant-intake-protected-390.png", 410, 14)}${img("participant-intake-sign-390.png", 410, 14)}</div>
<h2>The clinic team's screens (computer)</h2>
<div class="shots wide">${img("staff-review-1440.png", 250, 7)}${img("staff-notary-1440.png", 250, 7)}</div>
<h2>Links</h2>
<table><tr><th>Purpose</th><th>Address</th></tr>
<tr><td>MVLP page, open clinics, registration</td><td>legaleasepartner.com/p/mvlp → <strong>Register for a clinic</strong></td></tr>
<tr><td>Participant return visits</td><td>legaleasepartner.com/p/mvlp/continue</td></tr>
<tr><td>Staff sign-in and applications</td><td>legaleasepartner.com/sign-in, then the clinic's applications list from your coordinator</td></tr></table>
<footer>Screens shown are from the MVLP training clinic with synthetic people. Statuses on the real screen always win over this guide.</footer>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium", headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({ path: out, format: "Letter", printBackground: true, preferCSSPageSize: true, scale: 0.9 });
} finally { await browser.close(); }
const pages = (await PDFDocument.load(fs.readFileSync(out))).getPageCount();
if (pages !== 2) { console.error(`volunteer guide must be two pages, rendered ${pages}`); process.exit(1); }
console.log(`wrote ${path.relative(root, out)} (2 pages, ${Math.round(fs.statSync(out).size / 1024)} KB)`);
