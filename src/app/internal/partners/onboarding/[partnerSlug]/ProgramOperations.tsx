"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { getProgramOperations } from "@/lib/partners/onboarding/program-operations-service";
import type { ProgramConfiguration } from "@/lib/partners/onboarding/program-configuration";
import { ArtifactDocumentView } from "@/components/partners/onboarding/ArtifactDocumentView";
import { CoBrandedPageView } from "@/components/partners/onboarding/CoBrandedPageView";
import { ManagedProgramEditor } from "@/components/partners/onboarding/ManagedProgramEditor";

type Operations = Awaited<ReturnType<typeof getProgramOperations>>;
type NextStep = { reason: string; label: string; href?: string; action?: "prepare" | "upgrade_policy" | "reload" };
const button = "inline-flex min-h-11 items-center rounded border px-5 py-2 font-bold disabled:opacity-50";
const documents = [
  { type: "implementation_brief", title: "Program Summary", id: "program-summary-preview" },
  { type: "co_branded_page_configuration", title: "Participant Page", id: "participant-page-preview" }
] as const;
function focusSection(id: string) { document.getElementById(id)?.focus({ preventScroll: true }); }
function NextAction({ step, pending, busy, onAction }: { step: NextStep; pending: boolean; busy: boolean; onAction: (action: string) => void }) {
  return <div className="mt-4 rounded border p-4" aria-label="Next launch step"><p>{step.reason}</p>
    {step.href ? <a className={`mt-3 ${button}`} href={step.href} onClick={() => { if (step.href?.startsWith("#")) focusSection(step.href.slice(1)); }}>{step.label}</a>
      : <button className={`mt-3 ${button}`} disabled={pending} onClick={() => step.action === "reload" ? window.location.reload() : onAction(step.action!)}>{busy ? "Working…" : step.label}</button>}
  </div>;
}

// These destinations explain the server's next requirement; they never grant
// authority. Only the authoritative canStart result permits final confirmation.
function nextStep(ops: Operations, materialsCurrent: boolean): NextStep | null {
  const { view, preflight, launchDecision } = ops;
  if (!view || !preflight || !launchDecision) return { reason: "Current launch conditions could not be loaded.", label: "Reload workspace", action: "reload" };
  const authority = `/internal/partners/onboarding/${ops.identity.partnerSlug}/diagnostics#program-service-authority`;
  const destinations: Record<string, [string, string]> = {
    organization_facts: ["Complete organization details", "#configure-program"],
    program_scope: ["Complete program scope", "#program-field-jurisdictions"],
    support_and_referral_contacts_configured: ["Complete participant support", "#program-field-participant_support_email"],
    operating_authority: ["Review operating authority", "#program-field-operator_authority_reference"],
    packet_entitlement: ["Review packet funding", authority],
    commercial_gate_cleared: ["Review service authority", authority],
    agreements_and_procurement_recorded: ["Review required agreements", authority],
    access_model_and_capacity_present: ["Review access and capacity", authority],
    partner_launch_approval_received: ["Review required partner approval", authority]
  };
  function requirement(blocker: { key: string; label: string }): NextStep {
    const [label, href] = destinations[blocker.key] ?? ["Review program requirements", authority];
    return { reason: blocker.label, label, href };
  }
  if (["paused", "closed"].includes(view.decision.status)) return { reason: `This program is ${view.decision.status}. Publication requires an active program.`, label: "Review program status", href: `/internal/partners/onboarding/${ops.identity.partnerSlug}/diagnostics` };
  if (ops.identity.policyVersion === "legacy") return { reason: "This workspace retains its existing policy and approvals. Use the current setup workflow to continue; existing contracts and consent remain required.", label: "Use five-step setup", action: "upgrade_policy" };
  if (!view.decision.setupComplete && view.decision.blockers.length) return requirement(view.decision.blockers[0]);
  if (!materialsCurrent) return { reason: "Generate the missing or outdated materials from your saved program. Current materials and their approvals are preserved.", label: preflight.reviewedVersions.some(version => version.id) ? "Update Materials" : "Generate Materials", action: "prepare" };
  if (ops.canStart && view.reviewToken) return null;
  if (!preflight.releaseAuthorized) return { reason: "Publication is not authorized for this application release.", label: "Recheck release authorization", action: "reload" };
  if (preflight.latestOperation && !["complete", "failed"].includes(preflight.latestOperation.step)) return { reason: preflight.heldReason ?? "Publication is already in progress.", label: "Check publication status", action: "reload" };
  if (view.version !== ops.identity.version || launchDecision.sourceVersion !== ops.identity.version) return { reason: "The saved program changed. Reload its current materials and launch conditions.", label: "Refresh Preview", action: "reload" };
  // Give the actual external/funding requirement priority over the final review
  // that cannot yet resolve it. No blocker is removed from backend evaluation.
  const blocker = launchDecision.blockers.find(item => ["packet_entitlement", "operating_authority", "program_status"].includes(item.key)) ?? launchDecision.blockers[0];
  return blocker ? requirement(blocker) : { reason: preflight.heldReason ?? "Current launch conditions need to be checked again.", label: "Refresh Preview", action: "reload" };
}

export function ProgramOperations({ initial, configuration }: { initial: Operations; configuration?: ProgramConfiguration }) {
  const router = useRouter();
  const [ops, setOps] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmedReview, setConfirmedReview] = useState<string | null>(null);
  const [configurationDirty, setConfigurationDirty] = useState(false);
  const [configurationSaving, setConfigurationSaving] = useState(false);
  const [savedVersion, setSavedVersion] = useState(configuration?.version ?? initial.identity.version);
  const [serverSnapshot, setServerSnapshot] = useState(initial);
  if (initial !== serverSnapshot) {
    setServerSnapshot(initial);
    if (initial.identity.version >= ops.identity.version) { setOps(initial); setConfirmedReview(null); }
  }
  const [refreshing, startRefresh] = useTransition();
  const pendingOperation = busy || refreshing || configurationSaving;
  const request = useRef<{ payload: string; id: string } | null>(null);
  const view = ops.view, managed = view?.decision.operatingModel === "legalease_managed", live = view?.decision.live;
  const snapshotCurrent = !configurationDirty && !configurationSaving && ops.identity.version >= savedVersion && view?.version === ops.identity.version;
  // getProgramExperience supplies only successful, current, fingerprint-checked
  // material versions. Viewing them never needs a prepare operation.
  const materials = snapshotCurrent ? documents.flatMap(doc => {
    const material = view?.materials.find(item => item.type === doc.type);
    return material ? [{ ...doc, material }] : [];
  }) : [];
  const materialsCurrent = materials.length === documents.length;
  const reviewIdentity = JSON.stringify([ops.identity.workspaceId, view?.version, view?.decision.scopeHash, view?.reviewToken, materials.map(({ material }) => [material.id, material.hash, material.version])]);
  const confirmed = confirmedReview === reviewIdentity;
  const readyForConfirmation = snapshotCurrent && materialsCurrent && Boolean(view?.reviewToken) && ops.canStart;
  const resolution: NextStep | null = configurationDirty
    ? { reason: "Save your program changes before reviewing materials or starting the program.", label: "Save program changes", href: "#configure-program" }
    : !snapshotCurrent && view
      ? { reason: configurationSaving ? "Saving your program…" : "Checking material versions against the saved program…", label: "Refresh Preview", action: "reload" }
      : nextStep(ops, materialsCurrent);

  async function run(action: string) {
    if (!view || (action === "start" && (!readyForConfirmation || !confirmed))) return;
    setBusy(true); setMessage("");
    try {
      const payload = JSON.stringify({ action, version: view.version, scopeHash: view.decision.scopeHash, reviewToken: view.reviewToken, confirmed: action === "upgrade_policy" ? true : confirmed, reason: "Platform Admin confirms current program scope and reviewed materials", expiresAt: ops.preflight?.commercialAuthority?.expires_at });
      if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
      const response = await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(ops.identity.partnerSlug)}/program`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: request.current.id }) });
      const body = await response.json();
      if (!response.ok || !body.operations) throw new Error(body.error ?? "This operation could not be completed.");
      setOps(body.operations); request.current = null; setConfirmedReview(null);
      const started = body.operations.view?.decision.live;
      setMessage(started ? "Program is live. Published routing has been verified." : "Program materials and launch conditions have been checked against the saved program.");
      startRefresh(() => router.refresh());
      requestAnimationFrame(() => {
        const target = document.getElementById(started ? "program-dashboard" : "program-materials");
        target?.focus({ preventScroll: true }); target?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Reload and retry."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 space-y-6" aria-label="Program operations">
    <nav className="flex flex-wrap gap-3" aria-label="Program material navigation">
      {materials.map(doc => <a key={doc.type} className={button} href={`#${doc.id}`} onClick={() => focusSection(doc.id)}>View {doc.title}</a>)}
      <a className={button} href="#program-materials" onClick={() => focusSection("program-materials")}>Preview{live ? " program materials" : " & Start Program"}</a>
    </nav>
    {configuration ? <ManagedProgramEditor configuration={configuration} onDraftChange={() => { setConfigurationDirty(true); setConfirmedReview(null); setMessage(""); }} onSavingChange={setConfigurationSaving} onSaved={version => { setSavedVersion(version); setConfigurationDirty(false); setConfirmedReview(null); setMessage(""); }} /> : null}
    {ops.issues.length ? <div role="alert" className="rounded border border-orange p-4">{ops.issues.map(issue => <p key={issue.loader}>{issue.message}</p>)}<button className={button} onClick={() => window.location.reload()}>Reload workspace</button></div> : null}
    <div id="program-dashboard" tabIndex={-1} className="scroll-mt-32 rounded-xl border bg-white p-6"><h2 className="text-2xl font-bold">{live ? "Program dashboard" : "Program status"}</h2>
      <dl className="mt-4 grid gap-5 sm:grid-cols-2" aria-label="Program status">
        <div><dt className="font-bold">Program setup</dt><dd>{configurationDirty ? "Unsaved program changes" : configurationSaving ? "Saving program details…" : view?.decision.configurationComplete ? "Saved program details complete" : "Save the required program details"}</dd></div>
        <div><dt className="font-bold">Operating authority</dt><dd>{managed ? view?.decision.authorityId ? "LegalEase operating decision recorded" : "LegalEase-managed · Confirm with Start Program" : ops.preflight?.commercialValid ? "Current documented partner authority" : "Partner-managed · Existing consent and contract requirements apply"}</dd></div>
        <div><dt className="font-bold">Publication</dt><dd>{live ? "Published and routing verified" : readyForConfirmation ? "Ready for your review and confirmation." : "Complete the next action in Preview"}</dd></div>
        <div><dt className="font-bold">Sponsored packets</dt><dd>{view?.capabilities.issue_sponsored_packet ? `${view.commercial.packets ?? 0} available under funded authority` : "No sponsored packets authorized"}</dd></div>
      </dl>
      {live ? <div className="mt-5 flex flex-wrap gap-4"><a className={button} href={`/p/${ops.identity.partnerSlug}`}>Open participant page</a><a className={button} href={`/internal/clinic?partner=${ops.identity.partnerSlug}`}>Manage program clinics</a><a className={button} href="#program-activity">Program activity</a></div> : null}
    </div>
    <section id="program-materials" tabIndex={-1} className="scroll-mt-32 rounded-xl border bg-white p-6" aria-labelledby="program-materials-heading">
      <h2 id="program-materials-heading" className="text-2xl font-bold">Preview</h2>
      {!live && !materialsCurrent && resolution ? <NextAction step={resolution} pending={pendingOperation} busy={busy} onAction={run} /> : null}
      {materials.length ? <div className="mt-6 space-y-6" aria-label="Current program preview">{materials.map(({ type, title, id, material }) => <article key={material.id} id={id} tabIndex={-1} className="scroll-mt-32" aria-label={`${title} · Version ${material.version}`} data-material-id={material.id} data-material-version={material.version} data-material-hash={material.hash}>
        <h3 className="mb-3 text-xl font-bold">{title} · Version {material.version}</h3>
        {type === "co_branded_page_configuration" && material.document.pagePreview ? <CoBrandedPageView preview={material.document.pagePreview} variant="desktop" logoSrc={material.document.pagePreview.logo.assetId ? `/api/internal/partners/onboarding/phase1/${view!.partnerSlug}/assets/${material.document.pagePreview.logo.assetId}` : null} /> : <ArtifactDocumentView document={material.document} versionNumber={material.version} />}
      </article>)}</div> : null}
      {!live && materialsCurrent && view ? <section className="mt-6 rounded border p-4" aria-labelledby="final-program-review-heading">
        <h3 id="final-program-review-heading" className="text-xl font-bold">Final Review &amp; Start Program</h3>
        {readyForConfirmation ? <>
          <p className="mt-2">Ready for your review and confirmation.</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><dt className="font-bold">Program operator</dt><dd>{managed ? "LegalEase" : view.organizationName}</dd></div>
            <div><dt className="font-bold">Authorized jurisdictions</dt><dd>{view.data.geography_audience_language_accessibility?.jurisdictions?.join(", ")}</dd></div>
            <div><dt className="font-bold">Services</dt><dd>{(view.data.program_goals?.service_mode ?? ops.preflight?.commercialAuthority?.kind ?? "documented services").replaceAll("_", " ")}</dd></div>
            <div><dt className="font-bold">Languages</dt><dd>Primary: {view.data.geography_audience_language_accessibility?.primary_language || "English"} · Spanish {view.data.geography_audience_language_accessibility?.enable_spanish ? "enabled" : "disabled"}</dd></div>
            <div><dt className="font-bold">Participation and Clinic Mode</dt><dd>{{ online: "Online", clinics: "Clinic Mode", both: "Online and Clinic Mode" }[view.data.program_goals?.participation_mode ?? "online"]}</dd></div>
            <div><dt className="font-bold">Current materials</dt><dd>{materials.map(doc => `${doc.title} · Version ${doc.material.version}`).join("; ")}</dd></div>
          </dl>
          <label className="mt-4 flex gap-3"><input aria-label="Confirm operating scope and current materials" aria-describedby="start-program-help" type="checkbox" disabled={pendingOperation} checked={confirmed} onChange={event => setConfirmedReview(event.target.checked ? reviewIdentity : null)} />I confirm the actual operator, authorized jurisdictions, service capabilities and these exact materials. I authorize publication within this scope. This decision does not sign an external agreement, record a payment or create packet funding.</label>
          <p id="start-program-help" className="mt-3">{confirmed ? "Your confirmation is selected. Start Program will publish this reviewed program." : "Confirm the scope and materials above to enable Start Program."}</p>
          <button className={`mt-4 ${button} bg-navy text-white`} disabled={pendingOperation || !confirmed || !ops.canStart} onClick={() => run("start")}>{busy ? "Starting program…" : "Start Program"}</button>
        </> : resolution ? <NextAction step={resolution} pending={pendingOperation} busy={busy} onAction={run} /> : null}
      </section> : null}
    </section>
    <p role="status" className="whitespace-pre-wrap">{message}</p>
    <a className="inline-flex min-h-11 items-center text-sm underline" href={`/internal/partners/onboarding/${ops.identity.partnerSlug}/diagnostics`}>Administrative diagnostics and documented exceptions</a>
  </section>;
}
