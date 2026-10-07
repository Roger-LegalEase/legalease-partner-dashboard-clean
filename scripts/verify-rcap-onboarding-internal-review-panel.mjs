// WP-03 (HF-003, HF-007, HF-012, HF-014, HF-015, HF-016, HF-018): the internal Phase 1
// review panel reports each action's outcome in its own card, explains every disabled
// action with the actual condition, separates correction requests from approvals behind
// a confirmation, keeps the existing approval path for a section with an outstanding
// correction, advances to the next pending section after a confirmed approval, explains
// commercial evidence, shows the saved effective date beside the date control, and
// presents a completed Phase 1 truthfully. Deterministic and credential-free: the real
// component is server-rendered with synthetic snapshots; the service's snapshot reader
// and error mapper run against a fake Supabase client. Hydrated behaviour (sequential
// approvals, duplicate clicks, conflicts, cancel) is exercised by the hotfix evidence run.
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const panelPath = "src/app/internal/partners/onboarding/[partnerSlug]/Phase1InternalReviewPanel.tsx";
const servicePath = "src/lib/partners/onboarding/service.ts";
const panelSource = fs.readFileSync(path.join(rootDir, panelPath), "utf8");
const serviceSource = fs.readFileSync(path.join(rootDir, servicePath), "utf8");

const uiMocks = {
  "next/link": function Link({ children, href, ...props }) {
    return React.createElement("a", { ...props, href: String(href) }, children);
  },
  "next/navigation": { useRouter: () => ({ push() {}, replace() {}, refresh() {} }) }
};
const { Phase1InternalReviewPanel } = loadTsModule(path.join(rootDir, panelPath), new Map(), uiMocks);

let guarantees = 0;
const guarantee = (name, fn) => {
  fn();
  guarantees += 1;
  console.log(`  ok  ${name}`);
};
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/\s+/g, " ");

// ---------------------------------------------------------------------------------------
// Synthetic snapshots
// ---------------------------------------------------------------------------------------
const SECTION_KEYS = [
  "organization_contacts",
  "program_goals",
  "geography_audience_language_accessibility",
  "access_sponsorship_capacity",
  "brand_public_page",
  "staff_dashboard_plan",
  "support_referrals_reporting",
  "review_authorization"
];
function snapshot({
  status = "ready_for_review",
  gate = "blocked",
  sections = () => "submitted",
  agreements = [],
  payment = "unpaid",
  targetLaunchDate = null
} = {}) {
  return {
    workspace: {
      id: "22222222-2222-4222-8222-222222222222",
      status,
      aggregateVersion: 7,
      targetLaunchDate,
      commercialGateStatus: gate
    },
    sections: SECTION_KEYS.map((key, index) => ({ key, status: sections(key, index) })),
    agreements,
    assets: [],
    commercialEvidence: {
      partnerPaymentStatus: payment,
      paidInvoiceClearable: payment === "paid"
    }
  };
}
function render(props) {
  return renderToStaticMarkup(
    React.createElement(Phase1InternalReviewPanel, { partnerSlug: "synthetic-partner", ...props })
  );
}
function card(html, key) {
  const match = new RegExp(`<div[^>]*data-operation-card="${key}"[^>]*>([\\s\\S]*?)<\\/div>\\s*(?=<div[^>]*data-operation-card=|$)`).exec(html);
  assert.ok(match, `card ${key} not rendered`);
  return match[0];
}
function disabledReasons(html, key) {
  const match = new RegExp(`<ul[^>]*data-disabled-reasons="${key}"[^>]*>([\\s\\S]*?)<\\/ul>`).exec(html);
  return match ? [...match[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]).trim()) : [];
}
function buttonFor(html, action) {
  const match = new RegExp(`<button([^>]*data-action="${action}"[^>]*)>([\\s\\S]*?)<\\/button>`).exec(html);
  assert.ok(match, `button for ${action} not rendered`);
  return { attrs: match[1], label: text(match[2]).trim(), disabled: /\bdisabled\b/.test(match[1]) };
}

console.log("HF-003: feedback at the action");
guarantee("every operation card carries its own live status region and there is no global success banner", () => {
  const html = render({ snapshot: snapshot() });
  for (const key of ["target_launch_date", "commercial_gate", "agreement", "request_changes", "section_review", "ready_for_launch", "close"]) {
    assert.match(html, new RegExp(`data-card-status="${key}"`), `status region for ${key}`);
    assert.match(html, new RegExp(`data-card-state="idle"[^>]*data-card-status="${key}"|data-card-status="${key}"[^>]*data-card-state="idle"`));
  }
  assert.equal((html.match(/aria-live="polite"/g) ?? []).length, 7);
  assert.doesNotMatch(html, /Persisted status:/, "no success is shown before a confirmed server result");
  assert.doesNotMatch(html, /Operation not confirmed/);
  // Success rendering requires a confirmed result: the only path that writes a success
  // state reads the server body's success flag and persisted snapshot.
  assert.match(panelSource, /body\?\.success !== true/);
  assert.match(panelSource, /kind: "success",\s*action,\s*message: operationSuccessMessage\(action\),\s*detail,\s*status:/);
  assert.match(panelSource, /Persisted status:/);
});

console.log("HF-014: stateful disabled reasons");
guarantee("a blank review reason explains itself and names the section; it is not a permission problem", () => {
  const html = render({ snapshot: snapshot() });
  const button = buttonFor(html, "approve_section");
  assert.equal(button.label, "Approve Organization and contacts");
  assert.ok(button.disabled);
  assert.deepEqual(disabledReasons(html, "section_review"), [
    "Enter a review reason to approve Organization and contacts."
  ]);
  assert.match(button.attrs, /aria-describedby="phase1-section_review-disabled-reasons"/);
  assert.doesNotMatch(text(card(html, "section_review")), /not authorized|permission/i);
});
guarantee("an already approved section, an unsubmitted section and an in-flight save are each named as the condition", () => {
  const approved = render({ snapshot: snapshot({ sections: (key) => (key === "organization_contacts" ? "approved" : "submitted") }) });
  assert.deepEqual(disabledReasons(approved, "section_review"), [
    "Organization and contacts is already approved. No further approval is needed.",
    "Enter a review reason to approve Organization and contacts."
  ]);
  const notStarted = render({ snapshot: snapshot({ sections: (key) => (key === "organization_contacts" ? "in_progress" : "submitted") }) });
  assert.deepEqual(disabledReasons(notStarted, "section_review"), [
    "Organization and contacts has not been submitted by the partner yet (currently in progress).",
    "Enter a review reason to approve Organization and contacts."
  ]);
  assert.match(panelSource, /A save is in progress\. Wait for its result before the next action\./);
  assert.match(panelSource, /Phase 1 controls are read-only while the workspace is \$\{humanize\(workspace\.status\)\}\./);
});
guarantee("waiting-on-partner, not-ready, blocked-gate and unreviewed-section conditions are named on the right cards", () => {
  const waiting = render({ snapshot: snapshot({ status: "waiting_on_partner", sections: (key) => (key === "program_goals" ? "needs_changes" : "submitted") }) });
  assert.deepEqual(disabledReasons(waiting, "request_changes"), [
    "The workspace is already with the partner for corrections. Another request can be sent after the partner responds.",
    "Enter the partner-safe instructions for this correction."
  ]);
  const ready = disabledReasons(render({ snapshot: snapshot({ status: "setup_in_progress", sections: () => "in_progress" }) }), "ready_for_launch");
  assert.equal(ready[0], "The workspace must be ready for review before launch preparation. It is currently Setup In Progress.");
  assert.equal(ready[1], "The commercial gate is still blocked.");
  assert.match(ready[2], /^8 of 8 sections still need a review decision: Organization and contacts, /);
  assert.equal(ready[3], "Enter the review decision reason.");
  const almost = disabledReasons(render({ snapshot: snapshot({ gate: "cleared_by_approved_purchase_order", sections: (key) => (key === "review_authorization" ? "submitted" : "approved") }) }), "ready_for_launch");
  assert.deepEqual(almost, [
    "1 of 8 sections still need a review decision: Review and authorization.",
    "Enter the review decision reason."
  ]);
});
guarantee("live, paused and closed workspaces explain read-only on every action and offer no close", () => {
  for (const status of ["live", "paused", "closed"]) {
    const html = render({ snapshot: snapshot({ status, gate: "cleared_by_paid_invoice", sections: () => "approved", payment: "paid" }) });
    assert.match(html, /Phase 1 controls are read-only/);
    for (const key of ["target_launch_date", "commercial_gate", "agreement", "request_changes", "section_review", "ready_for_launch"]) {
      assert.equal(disabledReasons(html, key)[0], `Phase 1 controls are read-only while the workspace is ${status[0].toUpperCase()}${status.slice(1)}.`, `${status} ${key}`);
    }
    assert.equal(disabledReasons(html, "close")[0], `A ${status} workspace cannot be closed through Phase 1 controls.`);
  }
});

console.log("HF-015: corrections are not approvals");
guarantee("the correction action is renamed, states its consequence, and never submits from its first stage", () => {
  const html = render({ snapshot: snapshot() });
  const corrections = card(html, "request_changes");
  assert.match(corrections, /<h3[^>]*>Request partner corrections<\/h3>/);
  assert.match(text(corrections), /This returns the workspace to the partner; it is not an approval\./);
  const button = buttonFor(html, "request_changes");
  assert.equal(button.label, "Request partner corrections");
  assert.match(button.attrs, /type="button"/);
  assert.doesNotMatch(corrections, /type="submit"/, "stage one has no submit button, so Enter cannot submit the correction form");
  assert.doesNotMatch(html, /data-correction-confirmation/, "the confirmation is not open before the reviewer asks for it");
  assert.doesNotMatch(html, />Request changes</);
  // Each card is its own <form>: an Enter key in the approval card can only submit the
  // approval card. The confirmation stage shows the section, the instructions and the
  // consequence; Cancel only closes it.
  assert.equal((html.match(/<form\b/g) ?? []).length, 7);
  assert.match(panelSource, /Confirm: return \{sectionLabel\(changeSection\)\} to the partner/);
  assert.match(panelSource, /This returns the workspace to the partner for corrections\./);
  assert.match(panelSource, /if \(!confirmingCorrection\) \{\s*setConfirmingCorrection\(true\);\s*return;\s*\}/);
  assert.match(panelSource, /onClick=\{\(\) => setConfirmingCorrection\(false\)\}/);
  assert.doesNotMatch(panelSource, /window\.confirm\([^)]*approv/i, "approval needs its reason, not a second generic confirm");
});

console.log("HF-015/HF-016: approval of a mistaken correction and advancing after approval");
guarantee("a needs-changes section keeps its approval path and explains that approval resolves the correction", () => {
  const html = render({ snapshot: snapshot({ status: "waiting_on_partner", sections: (key) => (key === "organization_contacts" ? "needs_changes" : "submitted") }) });
  assert.deepEqual(disabledReasons(html, "section_review"), ["Enter a review reason to approve Organization and contacts."]);
  assert.match(text(card(html, "section_review")), /Organization and contacts has an outstanding correction request\. Approving it records that you verified no correction is needed and resolves that request through the same server action; the request, your reason, the request ID and the audit history are kept\./);
  // No new API: the only endpoint is the existing phase1 route and the only actions are
  // the existing ones; nothing deletes or rewrites a request.
  assert.equal((panelSource.match(/\/api\//g) ?? []).length, 1);
  assert.match(panelSource, /`\/api\/internal\/partners\/onboarding\/phase1\/\$\{encodeURIComponent\(partnerSlug\)\}`/);
  assert.doesNotMatch(panelSource, /undo|delete_request|withdraw/i);
});
guarantee("after a confirmed approval the card reports it, counts once, clears only its reason and selects the next pending section in canonical order", () => {
  assert.match(panelSource, /reviewDecision === "approve_section"\s*\?\s*`\$\{decidedName\} approved\.`\s*:\s*`\$\{decidedName\} waived\.`/);
  assert.match(panelSource, /if \(!ok\) return; \/\/ selection and reason stay for the retry/);
  assert.match(panelSource, /focusAfterReview\.current = true;\s*setReviewReason\(""\);\s*const sections = next\?\.sections \?\? current\.sections;\s*const nextPending = nextSectionAwaitingDecision\(sections, decidedSection\);\s*if \(nextPending\) setReviewSection\(nextPending\);/);
  assert.match(panelSource, /useLayoutEffect\(\(\) => \{\s*if \(focusAfterReview\.current && !controlsDisabled\)/);
  assert.match(panelSource, /reviewReasonRef\.current\?\.focus\(\)/);
  assert.match(panelSource, /const order = ONBOARDING_SECTION_ORDER as readonly OnboardingSectionKey\[\];/);
  const html = render({ snapshot: snapshot({ sections: (key, index) => (index < 3 ? "approved" : "submitted") }) });
  assert.match(html, /data-review-progress="3\/8"/);
  assert.match(text(card(html, "section_review")), /3 of 8 sections reviewed\./);
  const done = render({ snapshot: snapshot({ sections: () => "approved" }) });
  assert.match(text(card(done, "section_review")), /8 of 8 sections reviewed\. All sections have a review decision\./);
  // Other cards' unsaved input is never reset by this card's save: field re-sync is
  // per action, not global.
  assert.doesNotMatch(panelSource, /setAgreementEffectiveDate\([^)]*\)\s*;\s*\}\s*retryAttemptRef\.current = null/);
  assert.match(panelSource, /\/\/ Only this card's fields follow the confirmed save; other cards keep their unsaved input\./);
});

console.log("HF-007: commercial outcomes explain evidence");
guarantee("the saved gate is shown separately and the paid-invoice choice is disabled with the actual payment read", () => {
  const html = render({ snapshot: snapshot({ gate: "blocked", payment: "unpaid" }) });
  const commercial = card(html, "commercial_gate");
  assert.match(commercial, /data-saved-commercial-gate="blocked"/);
  assert.match(text(commercial), /Saved commercial gate Blocked/);
  assert.match(commercial, /data-partner-payment-status="unpaid"/);
  assert.match(commercial, /<option disabled="" value="cleared_by_paid_invoice">Cleared By Paid Invoice \(unavailable: partner not paid\)<\/option>/);
  assert.doesNotMatch(text(commercial), /Use a bounded approved purchase-order reference/, "the PO helper appears only for the PO outcome");
  assert.doesNotMatch(text(commercial), /Authorized override reason/);
  const unknown = render({ snapshot: snapshot({ gate: "blocked", payment: null }) });
  assert.match(card(unknown, "commercial_gate"), /data-partner-payment-status="unknown"/);
  assert.match(card(unknown, "commercial_gate"), /Unknown \(not readable\)/);
  const legacy = render({ snapshot: { ...snapshot(), commercialEvidence: undefined } });
  assert.match(card(legacy, "commercial_gate"), /<option disabled="" value="cleared_by_paid_invoice">/, "an older snapshot without the read never enables paid invoice");
  const paid = render({ snapshot: snapshot({ gate: "blocked", payment: "paid" }) });
  assert.match(card(paid, "commercial_gate"), /<option value="cleared_by_paid_invoice">Cleared By Paid Invoice<\/option>/);
});
guarantee("a paid-invoice gate selected against an unpaid read is refused in the card before any request, and the override copy asks for the internal reason", () => {
  const html = render({ snapshot: snapshot({ gate: "cleared_by_paid_invoice", payment: "unpaid" }) });
  assert.deepEqual(disabledReasons(html, "commercial_gate"), [
    "The paid-invoice outcome is unavailable: the partner's authoritative payment status is Unpaid, not Paid. Typed text cannot clear this gate; use an approved purchase order or an authorized internal override with its reason."
  ]);
  const override = render({ snapshot: snapshot({ gate: "cleared_by_authorized_internal_override", payment: "unpaid" }) });
  const commercial = card(override, "commercial_gate");
  assert.match(text(commercial), /Give the internal reason for clearing the gate without paid or purchase-order evidence\. It is kept on the audit record\./);
  assert.match(text(commercial), /The authorized override and its internal reason are on the saved record\. A blank reason field below is the edit form, not the saved override\./);
  assert.deepEqual(disabledReasons(override, "commercial_gate"), ["Enter the internal reason for the authorized override."]);
  const po = render({ snapshot: snapshot({ gate: "cleared_by_approved_purchase_order", payment: "unpaid" }) });
  assert.match(text(card(po, "commercial_gate")), /Approved purchase-order reference/);
  assert.deepEqual(disabledReasons(po, "commercial_gate"), ["Enter the approved purchase-order reference."]);
});

console.log("HF-012: the effective date is inspected, not guessed");
guarantee("a blank date renders an empty control with the saved date named beside it; a saved date renders as the date-only string", () => {
  const blank = render({ snapshot: snapshot({ agreements: [{ type: "order_form", status: "requested", required: true, partnerSafeDetail: null, finalizedAssetId: null, effectiveDate: null }] }) });
  const blankCard = card(blank, "agreement");
  assert.match(blankCard, /<input[^>]*data-saved-effective-date=""[^>]*type="date"[^>]*value=""/);
  assert.match(text(blankCard), /Saved effective date for Order Form: none saved\. Leave the field blank to save no date; a greyed date is the browser's placeholder, not a saved value\./);
  const dated = render({ snapshot: snapshot({ agreements: [{ type: "order_form", status: "approved", required: true, partnerSafeDetail: null, finalizedAssetId: null, effectiveDate: "2026-10-06" }] }) });
  const datedCard = card(dated, "agreement");
  assert.match(datedCard, /<input[^>]*data-saved-effective-date="2026-10-06"[^>]*type="date"[^>]*value="2026-10-06"/);
  assert.match(text(datedCard), /Saved effective date for Order Form: Oct 6, 2026\./);
  assert.match(text(dated), /Order Form Approved · Required · Effective Oct 6, 2026/);
  // The payload carries the control's date-only string or null; no Date conversion.
  assert.match(panelSource, /effectiveDate: agreementEffectiveDate \|\| null/);
  assert.doesNotMatch(panelSource.slice(panelSource.indexOf("async function saveAgreement"), panelSource.indexOf("async function requestChanges")), /new Date|toISOString|getTimezoneOffset/);
  // A backwards status move is flagged for deliberate correction, never rewritten.
  const backwards = render({ snapshot: snapshot({ agreements: [{ type: "order_form", status: "approved", required: true, partnerSafeDetail: null, finalizedAssetId: null, effectiveDate: null }] }) });
  assert.doesNotMatch(text(card(backwards, "agreement")), /moves it backwards/, "no warning while the edit form still holds the saved status");
  assert.match(panelSource, /Saving \{humanize\(agreementStatus\)\} moves it\s*backwards; confirm that is the deliberate correction before saving\./);
});

console.log("HF-018: completed Phase 1 is a completed state");
guarantee("ready_to_launch shows the completion message, no obsolete prerequisite, and a truthful continuation", () => {
  const complete = snapshot({ status: "ready_to_launch", gate: "cleared_by_approved_purchase_order", sections: () => "approved" });
  const html = render({ snapshot: complete });
  const ready = card(html, "ready_for_launch");
  assert.match(ready, /data-phase1-complete/);
  assert.match(text(ready), /Phase 1 complete\. All eight sections have been reviewed\./);
  assert.match(text(ready), /The ready-for-launch decision is saved once and is not repeated here\. Nothing has been published or activated\./);
  assert.doesNotMatch(text(ready), /Requires a commercially cleared|Mark ready for launch preparation|Review decision reason/);
  assert.match(ready, /data-launch-continuation-unavailable/);
  assert.match(text(ready), /The launch-preparation stage is not available for this workspace yet/);
  assert.doesNotMatch(text(html), /is now live|has launched|now published|program is live/i, "no real public launch is reported");
  const wired = render({ snapshot: complete, launchPreparation: { href: "#launch-prep-heading" } });
  assert.match(card(wired, "ready_for_launch"), /<a[^>]*data-launch-continuation(?:="[^"]*")?[^>]*href="#launch-prep-heading"[^>]*>Continue to launch preparation<\/a>/);
  assert.doesNotMatch(card(wired, "ready_for_launch"), /data-launch-continuation-unavailable/);
  assert.match(panelSource, /router\.refresh\(\);/);
});

console.log("Guards preserved");
guarantee("per-action form identity, in-flight guard, unchanged-request retry ID and workspace-version conflict handling are intact", () => {
  assert.match(panelSource, /if \(inFlightRef\.current\) return \{ ok: false, snapshot: null \};/);
  assert.match(panelSource, /retryAttemptRef\.current\?\.signature === signature\s*\? retryAttemptRef\.current\.requestId\s*: crypto\.randomUUID\(\)/);
  assert.match(panelSource, /expectedWorkspaceVersion,\s*payload\s*\}\)\s*\}\s*\)/);
  assert.match(panelSource, /body\?\.code === "revision_conflict"/);
  assert.match(panelSource, /Not saved: a newer workspace version exists/);
  assert.match(panelSource, /Reload current workspace/);
  assert.match(panelSource, /retryAttemptRef\.current = null;/);
});

// ---------------------------------------------------------------------------------------
// Service support: the authoritative payment read and the specific paid-invoice denial
// ---------------------------------------------------------------------------------------
console.log("Service support (narrow)");
function fakeSupabase(tables, rpcHandler) {
  const log = [];
  function builder(table) {
    const query = { table, filters: [] };
    log.push(query);
    const api = {
      select() { return api; },
      eq(column, value) { query.filters.push([column, value]); return api; },
      is() { return api; },
      in() { return api; },
      order() { return api; },
      maybeSingle() {
        const rows = resolve();
        return Promise.resolve(rows.error ? rows : { data: rows.data[0] ?? null, error: null });
      },
      then(resolve_, reject) { return Promise.resolve(resolve()).then(resolve_, reject); }
    };
    function resolve() {
      const configured = tables[table];
      if (configured && !Array.isArray(configured) && configured.error) return { data: null, error: configured.error };
      let rows = Array.isArray(configured) ? configured : [];
      for (const [column, value] of query.filters) rows = rows.filter((row) => row[column] === value);
      return { data: rows, error: null };
    }
    return api;
  }
  return { client: { from: builder, rpc: async (name, params) => rpcHandler(name, params) }, log };
}
function loadService(tables, rpcHandler = async () => ({ data: null, error: null })) {
  const fake = fakeSupabase(tables, rpcHandler);
  const service = loadTsModule(path.join(rootDir, servicePath), new Map(), {
    "server-only": {},
    "@/lib/supabase/auth-server": { createServerSupabaseAuthClient: async () => ({}) },
    "@/lib/supabase/server": { getSupabaseAdminClient: () => fake.client }
  });
  return { service, fake };
}
const context = { authUserId: "33333333-3333-4333-8333-333333333333", partnerSlug: "synthetic-partner", role: "internal_admin" };
const workspaceRow = { id: "22222222-2222-4222-8222-222222222222", partner_slug: "synthetic-partner", status: "ready_for_review", aggregate_version: 7, target_launch_date: null, commercial_gate_status: "blocked", completion_percentage: 100, blocker_code: null, next_action_code: null };
await (async () => {
  for (const [payment, expected] of [["paid", { partnerPaymentStatus: "paid", paidInvoiceClearable: true }], ["unpaid", { partnerPaymentStatus: "unpaid", paidInvoiceClearable: false }], ["demo_paid", { partnerPaymentStatus: "demo_paid", paidInvoiceClearable: false }]]) {
    const { service, fake } = loadService({
      partner_onboarding_workspace_safe: [workspaceRow],
      partner_onboarding_sections: [],
      partner_onboarding_agreements_safe: [],
      partner_onboarding_assets_safe: [],
      partner_records: [{ partner_slug: "synthetic-partner", payment_status: payment }, { partner_slug: "other", payment_status: "paid" }]
    });
    const result = await service.getInternalOnboardingSnapshot(context);
    assert.deepEqual(result.commercialEvidence, expected, payment);
    const read = fake.log.find((q) => q.table === "partner_records");
    assert.deepEqual(read.filters, [["partner_slug", "synthetic-partner"]], "the read is keyed by the context's partner slug");
  }
  guarantees += 1;
  console.log("  ok  the internal snapshot carries the partner's authoritative payment status; only exactly 'paid' clears the paid-invoice outcome");

  const unreadable = loadService({
    partner_onboarding_workspace_safe: [workspaceRow],
    partner_onboarding_sections: [],
    partner_onboarding_agreements_safe: [],
    partner_onboarding_assets_safe: [],
    partner_records: { error: { message: "permission denied" } }
  });
  const unknown = await unreadable.service.getInternalOnboardingSnapshot(context);
  assert.deepEqual(unknown.commercialEvidence, { partnerPaymentStatus: null, paidInvoiceClearable: false });
  const missing = loadService({ partner_onboarding_workspace_safe: [] });
  const none = await missing.service.getInternalOnboardingSnapshot(context);
  assert.deepEqual(none, { workspace: null, sections: [], agreements: [], assets: [], commercialEvidence: { partnerPaymentStatus: null, paidInvoiceClearable: false } });
  guarantees += 1;
  console.log("  ok  an unreadable or absent payment record reads as unknown, never as paid");

  const { service: refusing } = loadService({}, async () => ({ data: null, error: { code: "23514", message: "Paid-invoice outcome requires authoritative paid partner status" } }));
  await assert.rejects(
    () => refusing.applyInternalOnboardingReview(context, { workspaceId: workspaceRow.id, expectedWorkspaceVersion: 7, requestId: "99999999-9999-4999-8999-999999999999", operation: { action: "approve_section", sectionKey: "organization_contacts", reason: "synthetic" } }),
    (error) => error.code === "commercially_blocked" && /authoritative payment status is not paid/.test(error.message) && /authorized internal override/.test(error.message)
  );
  const { service: generic } = loadService({}, async () => ({ data: null, error: { code: "XX000", message: "something else" } }));
  await assert.rejects(
    () => generic.applyInternalOnboardingReview(context, { workspaceId: workspaceRow.id, expectedWorkspaceVersion: 7, requestId: "99999999-9999-4999-8999-999999999999", operation: { action: "approve_section", sectionKey: "organization_contacts", reason: "synthetic" } }),
    (error) => error.code === "persistence_failed"
  );
  assert.match(serviceSource, /paid-invoice outcome requires authoritative paid partner status/i);
  guarantees += 1;
  console.log("  ok  the database's paid-invoice refusal is reported specifically; every other refusal keeps its existing mapping");
})();

console.log(`RCAP onboarding internal review panel verifier passed: ${guarantees} guarantees.`);

function loadTsModule(filePath, cache, mocks) {
  const resolved = path.resolve(filePath);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  if (resolved.endsWith(".json")) return require(resolved);
  const transpiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022
    },
    fileName: resolved
  });
  const mod = new Module(resolved);
  cache.set(resolved, mod);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (request) => {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    const next = request.startsWith("@/")
      ? resolveExisting(path.join(rootDir, "src", request.slice(2)))
      : request.startsWith(".")
        ? resolveExisting(path.resolve(path.dirname(resolved), request))
        : null;
    return next ? loadTsModule(next, cache, mocks) : require(request);
  };
  mod._compile(transpiled.outputText, mod.filename);
  return mod.exports;
}

function resolveExisting(candidate) {
  for (const ext of [".ts", ".tsx", ".js", ".json"]) if (fs.existsSync(candidate + ext)) return candidate + ext;
  for (const index of ["/index.ts", "/index.tsx"]) if (fs.existsSync(candidate + index)) return candidate + index;
  return fs.existsSync(candidate) ? candidate : null;
}
