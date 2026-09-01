"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PartnerOnboardingView } from "@/lib/partners/partner-onboarding";

const ACCESS_MODES = [
  ["open", "Open Link", "Anyone who enters through the page joins the program."],
  ["optional_code", "Optional Code", "People may enter a code, but it isn't required."],
  ["required_code", "Access Code Required", "Only people with a valid code join the program."],
  ["invite_only", "Invite Only", "Codes work a limited number of times (single-use invites)."]
] as const;

const AGREEMENT_STATUSES = [
  ["not_sent", "Not sent"],
  ["sent", "Sent"],
  ["signed", "Signed"],
  ["waived_internal", "Waived (internal)"]
] as const;

type Materials = {
  landingUrl: string;
  qrCodeSvg: string;
  smsCopy: string;
  emailCopy: string;
  flyerCopy: string;
  accessCodeInstructions: string | null;
};

export function OnboardingWizard({ onboarding }: { onboarding: PartnerOnboardingView }) {
  const router = useRouter();
  const slug = onboarding.partnerSlug;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [materials, setMaterials] = useState<Materials | null>(null);

  async function call(action: string, payload: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/internal/partners/onboarding/${slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That action could not be completed.");
      setMessage({ tone: "ok", text: "Saved." });
      router.refresh();
      return data;
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "That action could not be completed." });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className={`rounded-md px-4 py-3 text-sm font-semibold ${message.tone === "ok" ? "bg-[#E7F7F0] text-[#0F6E56]" : "bg-[#FDF1E8] text-[#9A3412]"}`}>{message.text}</p>
      ) : null}

      <GoLivePanel onboarding={onboarding} busy={busy} onGoLive={() => call("go_live")} onPause={() => call("pause")} />

      <BillingSection onboarding={onboarding} busy={busy} onSave={(p) => call("billing", p)} />
      <AccessSection onboarding={onboarding} busy={busy} onSave={(mode) => call("access_mode", { accessMode: mode })} />
      <BrandingSection onboarding={onboarding} busy={busy} onSave={(p) => call("branding", p)} onMarkReady={() => call("landing_ready")} />
      <AdminSection busy={busy} onInvite={(email, name, role) => call("invite", { email, name, role })} count={onboarding.adminUserCount} />
      <LaunchSection
        busy={busy}
        materials={materials}
        onGenerate={async () => {
          const data = await call("launch_materials");
          if (data?.materials) setMaterials(data.materials as Materials);
        }}
      />
      <ChecklistSection onboarding={onboarding} busy={busy} onTask={(taskKey, status) => call("task", { taskKey, status })} />
    </div>
  );
}

function GoLivePanel({ onboarding, busy, onGoLive, onPause }: { onboarding: PartnerOnboardingView; busy: boolean; onGoLive: () => void; onPause: () => void }) {
  return (
    <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black">Go live</h2>
          <p className="mt-1 text-sm text-[#5C5750]">A partner can only go live when every required step is complete or skipped.</p>
        </div>
        <div className="flex gap-2">
          <button disabled={busy || !onboarding.readiness.ready || onboarding.status === "live"} onClick={onGoLive} className="rounded-md bg-[#1D9E75] px-5 py-2.5 text-sm font-black text-white hover:bg-[#0F6E56] disabled:opacity-50">
            Mark Live
          </button>
          <button disabled={busy || onboarding.status === "paused"} onClick={onPause} className="rounded-md border border-[#D7DEE8] px-5 py-2.5 text-sm font-bold hover:border-[#CBD5E1] disabled:opacity-50">
            Pause Partner
          </button>
        </div>
      </div>
      {!onboarding.readiness.ready && onboarding.readiness.blockers.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#9A3412]">
          {onboarding.readiness.blockers.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm font-bold text-[#0F6E56]">Ready to Launch.</p>
      )}
    </section>
  );
}

function BillingSection({ onboarding, busy, onSave }: { onboarding: PartnerOnboardingView; busy: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const [packetCap, setPacketCap] = useState(String(onboarding.packetCap));
  const [packageName, setPackageName] = useState(onboarding.packageName ?? "");
  const [overageEnabled, setOverageEnabled] = useState(onboarding.overageEnabled);
  const [pauseAtCap, setPauseAtCap] = useState(onboarding.pauseAtCap);
  const [agreementStatus, setAgreementStatus] = useState(onboarding.agreementStatus);
  const [billingContactName, setBillingContactName] = useState(onboarding.billingContactName ?? "");
  const [billingContactEmail, setBillingContactEmail] = useState(onboarding.billingContactEmail ?? "");

  return (
    <Section title="Agreement + billing">
      <p className="mb-4 text-xs leading-5 text-[#8A8278]">
        Packet credits are only used when Expungement.ai successfully generates a personalized record-clearing packet.
        Screenings, account creation, ineligible results, and failed packet generations do not use packet credits.
        After the included allocation is used, additional successfully generated packets are billed at $50 each unless
        this partner is set to pause sponsored packet generation at the cap.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Packet Cap"><input value={packetCap} onChange={(e) => setPacketCap(e.target.value.replace(/[^0-9]/g, ""))} className="in" /></Field>
        <Field label="Upfront package / tier"><input value={packageName} onChange={(e) => setPackageName(e.target.value)} className="in" /></Field>
        <Field label="Agreement status">
          <select value={agreementStatus} onChange={(e) => setAgreementStatus(e.target.value as typeof agreementStatus)} className="in">
            {AGREEMENT_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={overageEnabled} onChange={(e) => setOverageEnabled(e.target.checked)} /> Allow $50 Overages</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={pauseAtCap} onChange={(e) => setPauseAtCap(e.target.checked)} /> Pause at Cap</label>
        </div>
        <Field label="Billing Contact name"><input value={billingContactName} onChange={(e) => setBillingContactName(e.target.value)} className="in" /></Field>
        <Field label="Billing Contact email"><input value={billingContactEmail} onChange={(e) => setBillingContactEmail(e.target.value)} className="in" /></Field>
      </div>
      <SaveButton busy={busy} onClick={() => onSave({ packetCap: Number(packetCap || 0), packageName, overageEnabled, pauseAtCap, agreementStatus, billingContactName, billingContactEmail })} />
      <InlineStyle />
    </Section>
  );
}

function AccessSection({ onboarding, busy, onSave }: { onboarding: PartnerOnboardingView; busy: boolean; onSave: (mode: string) => void }) {
  return (
    <Section title="Access controls">
      <p className="mb-4 text-xs leading-5 text-[#8A8278]">
        Access codes help partners control who uses their sponsored packet allocation. Partners can use one shared code,
        multiple campaign codes, single-use invite codes, or no codes at all.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACCESS_MODES.map(([v, l, help]) => (
          <button key={v} type="button" disabled={busy} onClick={() => onSave(v)} className={`rounded-md border p-4 text-left ${onboarding.accessMode === v ? "border-[#1D9E75] bg-[#E7F7F0]" : "border-[#EEE6DB] hover:border-[#CBD5E1]"}`}>
            <span className="block text-sm font-black">{l}</span>
            <span className="mt-1 block text-xs text-[#8A8278]">{help}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-[#8A8278]">Create the actual codes in the partner&rsquo;s Access Codes screen. Active codes: {onboarding.activeCodeCount}.</p>
    </Section>
  );
}

function BrandingSection({ onboarding, busy, onSave, onMarkReady }: { onboarding: PartnerOnboardingView; busy: boolean; onSave: (p: Record<string, unknown>) => void; onMarkReady: () => void }) {
  const [headline, setHeadline] = useState(onboarding.publicHeadline ?? "");
  const [subheadline, setSubheadline] = useState(onboarding.publicSubheadline ?? "");
  const [support, setSupport] = useState(onboarding.supportInstructions ?? "");
  const [logoUrl, setLogoUrl] = useState(onboarding.logoUrl ?? "");
  const [showLogo, setShowLogo] = useState(onboarding.showPartnerLogo);
  const [showPoweredBy, setShowPoweredBy] = useState(onboarding.showPoweredBy);

  return (
    <Section title="Branding + landing page">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Landing page headline" full><input value={headline} onChange={(e) => setHeadline(e.target.value)} className="in" /></Field>
        <Field label="Landing page subheadline" full><input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} className="in" /></Field>
        <Field label="Contact / support instructions" full><input value={support} onChange={(e) => setSupport(e.target.value)} className="in" /></Field>
        <Field label="Logo URL"><input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="in" /></Field>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} /> Show partner logo</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={showPoweredBy} onChange={(e) => setShowPoweredBy(e.target.checked)} /> Show Expungement.ai branding</label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SaveButton busy={busy} onClick={() => onSave({ publicHeadline: headline, publicSubheadline: subheadline, supportInstructions: support, logoUrl, showPartnerLogo: showLogo, showPoweredBy })} />
        <a href={`/p/${onboarding.partnerSlug}`} target="_blank" rel="noreferrer" className="rounded-md border border-[#D7DEE8] px-4 py-2 text-sm font-bold hover:border-[#CBD5E1]">Preview landing page</a>
        <button disabled={busy} onClick={onMarkReady} className="rounded-md border border-[#1D9E75] px-4 py-2 text-sm font-bold text-[#0F6E56] hover:bg-[#E7F7F0] disabled:opacity-50">Mark landing page reviewed</button>
        {onboarding.sections.landingPageReady ? <span className="text-sm font-bold text-[#0F6E56]">Reviewed ✓</span> : null}
      </div>
      <InlineStyle />
    </Section>
  );
}

function AdminSection({ busy, onInvite, count }: { busy: boolean; onInvite: (email: string, name: string, role: string) => void; count: number }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("partner_admin");
  return (
    <Section title="Partner admins">
      <p className="mb-3 text-xs text-[#8A8278]">Invite the people who will manage this partner. Active partner users: {count}.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="in" />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="in" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="in">
          <option value="partner_admin">Partner admin</option>
          <option value="partner_staff">Partner staff</option>
          <option value="partner_viewer">Partner viewer</option>
        </select>
        <button disabled={busy || !email} onClick={() => onInvite(email, name, role)} className="rounded-md bg-[#D85A30] px-4 py-2 text-sm font-black text-white hover:bg-[#BF4B25] disabled:opacity-50">Invite user</button>
      </div>
      <InlineStyle />
    </Section>
  );
}

function LaunchSection({ busy, materials, onGenerate }: { busy: boolean; materials: Materials | null; onGenerate: () => void }) {
  return (
    <Section title="Launch materials">
      <button disabled={busy} onClick={onGenerate} className="rounded-md bg-[#D85A30] px-5 py-2.5 text-sm font-black text-white hover:bg-[#BF4B25] disabled:opacity-50">Generate launch materials</button>
      {materials ? (
        <div className="mt-5 grid gap-5 md:grid-cols-[200px_1fr]">
          <div>
            <div className="rounded-md border border-[#EEE6DB] bg-white p-3" dangerouslySetInnerHTML={{ __html: materials.qrCodeSvg }} />
            <a href={materials.landingUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-bold text-[#1D9E75]">{materials.landingUrl}</a>
          </div>
          <div className="space-y-3 text-sm">
            <CopyBlock label="Text message" text={materials.smsCopy} />
            <CopyBlock label="Email" text={materials.emailCopy} />
            <CopyBlock label="Flyer" text={materials.flyerCopy} />
            {materials.accessCodeInstructions ? <CopyBlock label="Access code instructions" text={materials.accessCodeInstructions} /> : null}
          </div>
        </div>
      ) : null}
    </Section>
  );
}

function ChecklistSection({ onboarding, busy, onTask }: { onboarding: PartnerOnboardingView; busy: boolean; onTask: (taskKey: string, status: string) => void }) {
  return (
    <Section title="Training + review checklist">
      <div className="space-y-2">
        {onboarding.tasks.map((t) => (
          <div key={t.taskKey} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#F3EEE5] px-3 py-2">
            <div>
              <p className="text-sm font-bold">{t.title} {t.required ? null : <span className="text-xs font-normal text-[#8A8278]">(optional)</span>}</p>
              <p className="text-xs text-[#8A8278]">{t.description} · Owner: {t.owner === "legalease" ? "LegalEase" : "Partner"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-[#8A8278]">{t.status.replace(/_/g, " ")}</span>
              <select disabled={busy} value={t.status} onChange={(e) => onTask(t.taskKey, e.target.value)} className="in" style={{ width: 140 }}>
                {["not_started", "in_progress", "complete", "blocked", "skipped"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
      <InlineStyle />
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-[#8A8278]">{label}</span>
      {children}
    </label>
  );
}

function SaveButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button disabled={busy} onClick={onClick} className="mt-4 rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-black text-white hover:bg-[#1a2f5c] disabled:opacity-50">Save</button>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-[#8A8278]">{label}</p>
      <pre className="mt-1 whitespace-pre-wrap rounded-md border border-[#EEE6DB] bg-[#FBF7F2] p-3 text-[13px] leading-5">{text}</pre>
    </div>
  );
}

function InlineStyle() {
  return <style>{`.in{width:100%;border:1px solid #D7DEE8;border-radius:8px;padding:8px 12px;font-size:14px}`}</style>;
}
