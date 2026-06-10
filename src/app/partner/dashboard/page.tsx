import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Copy,
  ExternalLink,
  Headphones,
  MessageSquare,
  Route,
  Share2,
  ShieldCheck,
  Sprout
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { productionAppUrl } from "@/lib/app-url";
import { getPartnerDashboardRlsData, type PartnerDashboardRlsData } from "@/lib/partners/partner-dashboard-rls-repository";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const dynamic = "force-dynamic";

const dashboardVars = {
  "--font-dashboard-sans": '"Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  "--font-dashboard-mono": '"Geist Mono", "SF Mono", Menlo, Monaco, Consolas, monospace',
  "--color-warm-bg": "#FBF7F2",
  "--color-card": "#FFFFFF",
  "--color-card-border": "#EEE6DB",
  "--color-inner-tint": "#FBF7F2",
  "--color-navy": "#0F1E3D",
  "--color-text": "#5C5750",
  "--color-muted": "#8A8278",
  "--color-soft-muted": "#9A9288",
  "--color-orange": "#D85A30",
  "--color-teal": "#1D9E75",
  "--color-teal-dark": "#0F6E56",
  "--color-rust": "#A8543A",
  "--color-amber-bg": "#FCEFD9",
  "--color-amber-text": "#8A5A12",
  "--color-empty-zero": "#C9BFB2"
} as CSSProperties;

export default async function PartnerDashboardPage() {
  const dashboard = await loadDashboard();

  if (dashboard.kind === "redirect") {
    redirect(dashboard.href);
  }

  if (dashboard.kind === "denied") {
    return <DeniedDashboard title={dashboard.title} body={dashboard.body} />;
  }

  const storedPartnerLabel = dashboard.partner?.organizationName ?? dashboard.partner?.partnerName ?? toTitleCase(dashboard.partnerSlug);
  const partnerLabel = getPartnerDisplayLabel(dashboard.partnerSlug, storedPartnerLabel);
  const serviceArea = dashboard.partner?.serviceArea ?? "Mississippi";
  const intakeDisplayUrl = getPublicIntakeDisplayUrl(dashboard.partnerSlug);
  const intakeOpenUrl = getPublicIntakeOpenUrl(dashboard.partnerSlug);
  const availability = {
    intake: !hasDashboardWarning(dashboard.warnings, "Intake summary unavailable"),
    documents: !hasDashboardWarning(dashboard.warnings, "Document summary unavailable"),
    briefcase: !hasDashboardWarning(dashboard.warnings, "Briefcase count unavailable")
  };
  const metrics = {
    started: availability.intake ? Math.round(dashboard.intake.totalSessions) : undefined,
    completed: availability.intake ? Math.round(dashboard.intake.completedSessions) : undefined,
    packets: availability.documents ? Math.round(dashboard.documents.totalPackets) : undefined,
    saved: availability.briefcase ? Math.round(dashboard.briefcaseItems) : undefined
  };
  const completionRate =
    metrics.started !== undefined && metrics.completed !== undefined && metrics.started > 0
      ? Math.round((metrics.completed / metrics.started) * 100)
      : metrics.started === 0
        ? 0
        : undefined;
  const allMetricsZero = [metrics.started, metrics.completed, metrics.packets, metrics.saved].every((value) => value === 0);
  const communityMessage = `Have an old Mississippi record and want to see whether record clearing may be an option? ${partnerLabel} and LegalEase have launched a guided intake workflow to help you understand possible next steps. Start here: ${intakeDisplayUrl}`;

  return (
    <main className="min-h-screen bg-[#FBF7F2]" data-partner-dashboard-role={dashboard.role} data-partner-dashboard-slug={dashboard.partnerSlug}>
      <div style={dashboardVars} className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div style={{ padding: "1.25rem", fontFamily: "var(--font-dashboard-sans)", background: "#FBF7F2", borderRadius: 16 }}>
          <style>{`
            @media (max-width: 900px) {
              .partner-dashboard-split { grid-template-columns: 1fr !important; }
            }
          `}</style>

          {dashboard.warnings.length > 0 ? (
            <div style={{ marginBottom: "1rem", background: "#FCEFD9", color: "#8A5A12", borderRadius: 12, padding: "11px 14px", fontSize: 13, lineHeight: 1.5 }}>
              Some partner dashboard data is temporarily unavailable. No broader partner data was used to fill the gap.
            </div>
          ) : null}

          <CopyBehaviorScript />
          <Header partnerLabel={partnerLabel} serviceArea={serviceArea} />
          <IntakeLinkCard intakeDisplayUrl={intakeDisplayUrl} intakeOpenUrl={intakeOpenUrl} />

          {allMetricsZero ? <EmptyState intakeOpenUrl={intakeOpenUrl} /> : <MetricCards metrics={metrics} completionRate={completionRate} />}

          <div className="partner-dashboard-split" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: "1.1rem" }}>
            <Journey metrics={metrics} />
            <Readiness />
          </div>

          <CommunityShare message={communityMessage} />
          <WorkflowSteps />
          <Resources />
          <LegalNote />
        </div>
      </div>
    </main>
  );
}

type DashboardLoadResult =
  | Extract<PartnerDashboardRlsData, { kind: "partner" }>
  | { kind: "redirect"; href: string }
  | { kind: "denied"; title: string; body: string };

type Metrics = {
  started?: number;
  completed?: number;
  packets?: number;
  saved?: number;
};

async function loadDashboard(): Promise<DashboardLoadResult> {
  try {
    const dashboard = await getPartnerDashboardRlsData();

    if (dashboard.kind === "internal_admin") {
      return { kind: "redirect", href: dashboard.redirectTo };
    }

    return dashboard;
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      if (error.code === "unauthenticated") {
        return { kind: "redirect", href: "/sign-in?next=/partner/dashboard" };
      }

      return {
        kind: "denied",
        title: "Partner dashboard access denied",
        body: "Your authenticated account does not have an active partner dashboard identity."
      };
    }

    throw error;
  }
}

function Header({ partnerLabel, serviceArea }: { partnerLabel: string; serviceArea: string }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#E1F0EC", color: "#0F6E56", fontSize: 13, fontWeight: 500, padding: "5px 13px", borderRadius: 100 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} />
        Your program is live
      </span>
      <p style={{ margin: "14px 0 0", fontSize: 38, fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#0F1E3D" }}>Welcome back, {partnerLabel}</p>
      <p style={{ margin: "10px 0 0", fontSize: 16, color: "#5C5750", lineHeight: 1.6, maxWidth: 540 }}>
        Every person who starts this workflow is taking a step toward record-clearing support. Here&apos;s how your community is doing.
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#9A9288" }}>Record-Clearing Access Program · {serviceArea} workflow active · Public intake accepting submissions</p>
    </div>
  );
}

function IntakeLinkCard({ intakeDisplayUrl, intakeOpenUrl }: { intakeDisplayUrl: string; intakeOpenUrl: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "1.4rem 1.6rem", border: "1px solid #EEE6DB", marginBottom: "1.1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#D85A30" }}>Share your public intake link</p>
          <p style={{ margin: "6px 0 0", fontSize: 17, fontFamily: "var(--font-dashboard-mono)", color: "#0F1E3D", wordBreak: "break-all", letterSpacing: "-0.01em" }}>{intakeDisplayUrl}</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#8A8278" }}>Send this link to community members who want to start the Mississippi record-clearing workflow.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            data-copy-value={intakeDisplayUrl}
            data-copy-default="Copy intake link"
            data-copy-copied="Copied"
            style={{ background: "#D85A30", color: "#fff", border: "none", borderRadius: 12, padding: "11px 18px", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}
          >
            <Copy size={16} aria-hidden="true" />
            <span>Copy intake link</span>
          </button>
          <Link href={intakeOpenUrl} style={{ background: "#fff", color: "#0F1E3D", border: "1px solid #E0D8CC", borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
            <ExternalLink size={16} aria-hidden="true" />
            Open public intake
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricCards({ metrics, completionRate }: { metrics: Metrics; completionRate?: number }) {
  return (
    <>
      <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: "#0F1E3D" }}>Program activity</p>
        <span style={{ fontSize: 13, color: "#9A9288" }}>Showing activity since program launch</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: "1.1rem" }}>
        <MetricCard bg="#FBEAE1" numberColor="#993C1D" labelColor="#A8543A" value={metrics.started} label="people started" />
        <MetricCard bg="#E1F0EC" numberColor="#0F6E56" labelColor="#1D8268" value={metrics.completed} label="completed intake" />
        <CompletionMetricCard started={metrics.started} completed={metrics.completed} completionRate={completionRate} />
        <MetricCard bg="#FCEFD9" numberColor="#8A5A12" labelColor="#A06E1F" value={metrics.packets} label="packets ready" />
      </div>
    </>
  );
}

function MetricCard({ bg, numberColor, labelColor, value, label }: { bg: string; numberColor: string; labelColor: string; value?: number; label: string }) {
  return (
    <div style={{ background: bg, borderRadius: 18, padding: "1.4rem 1.5rem" }}>
      <p style={{ margin: 0, fontSize: 56, fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.04em", color: numberColor }}>{formatMetric(value)}</p>
      <p style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 500, color: labelColor }}>{label}</p>
    </div>
  );
}

function CompletionMetricCard({ started, completed, completionRate }: { started?: number; completed?: number; completionRate?: number }) {
  const detail = started !== undefined && completed !== undefined ? `${formatMetric(completed)} of ${formatMetric(started)} who started` : "Available when intake data loads";

  return (
    <div style={{ background: "#fff", border: "1px solid #EEE6DB", borderRadius: 18, padding: "1.4rem 1.5rem" }}>
      <p style={{ margin: 0, fontSize: 56, fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.04em", color: "#0F1E3D" }}>{completionRate === undefined ? "-" : `${completionRate}%`}</p>
      <p style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 500, color: "#8A8278" }}>intake completion</p>
      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#A8A096" }}>{detail}</p>
    </div>
  );
}

function EmptyState({ intakeOpenUrl }: { intakeOpenUrl: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EEE6DB", borderRadius: 20, padding: "1.6rem 1.7rem", fontFamily: "var(--font-dashboard-sans)", marginBottom: "1.1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: "#FBEAE1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sprout size={22} color="#993C1D" aria-hidden="true" />
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "#0F1E3D" }}>Your dashboard is ready</p>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "#5C5750", lineHeight: 1.6 }}>
            As people begin the record-clearing workflow, their journey will show up here. Start by sharing your intake link.
          </p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginTop: 18 }}>
        <EmptyMetric label="started" />
        <EmptyMetric label="completed" />
        <EmptyMetric label="packets" />
        <EmptyMetric label="saved" />
      </div>
      <Link href={intakeOpenUrl} style={{ marginTop: 16, background: "#D85A30", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        Share intake link to start
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

function EmptyMetric({ label }: { label: string }) {
  return (
    <div style={{ background: "#FBF7F2", borderRadius: 14, padding: "1rem 1.1rem" }}>
      <p style={{ margin: 0, fontSize: 40, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", color: "#C9BFB2" }}>0</p>
      <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 500, color: "#9A9288" }}>{label}</p>
    </div>
  );
}

function Journey({ metrics }: { metrics: Metrics }) {
  const started = formatMetric(metrics.started);
  const completed = formatMetric(metrics.completed);
  const packets = formatMetric(metrics.packets);
  const saved = formatMetric(metrics.saved);
  const journeySummary =
    metrics.started !== undefined && metrics.completed !== undefined && metrics.packets !== undefined && metrics.saved !== undefined
      ? `${completed} of ${started} people who started the intake completed the screening flow, generated a Mississippi record-clearing packet, and saved their documents to Briefcase.`
      : "Participant progress will show here as intake, packet, and Briefcase data becomes available.";

  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem 1.6rem", border: "1px solid #EEE6DB" }}>
      <p style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: "#0F1E3D" }}>The journey, so far</p>
      <p style={{ margin: "0 0 16px", fontSize: 15, color: "#5C5750", lineHeight: 1.6 }}>{journeySummary}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <JourneyPill label={`Started ${started}`} bg="#FBEAE1" color="#993C1D" />
        <ArrowRight size={14} color="#C9BFB2" aria-hidden="true" />
        <JourneyPill label={`Completed ${completed}`} bg="#E1F0EC" color="#0F6E56" />
        <ArrowRight size={14} color="#C9BFB2" aria-hidden="true" />
        <JourneyPill label={`Packet ${packets}`} bg="#FCEFD9" color="#8A5A12" />
        <ArrowRight size={14} color="#C9BFB2" aria-hidden="true" />
        <JourneyPill label={`Saved ${saved}`} bg="#E4EAF2" color="#1B3A6B" />
      </div>
      <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#8A8278", lineHeight: 1.5 }}>
          <strong style={{ color: "#0F1E3D", fontWeight: 600 }}>Packets ready:</strong> Completed intakes with a generated document packet.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#8A8278", lineHeight: 1.5 }}>
          <strong style={{ color: "#0F1E3D", fontWeight: 600 }}>Saved for return:</strong> Packets saved to the user&apos;s Briefcase so they can come back later.
        </p>
      </div>
    </div>
  );
}

function JourneyPill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 500, color, background: bg, padding: "5px 11px", borderRadius: 100 }}>{label}</span>
  );
}

function Readiness() {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem 1.6rem", border: "1px solid #EEE6DB" }}>
      <p style={{ margin: "0 0 16px", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: "#0F1E3D" }}>Workflow status</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <ReadyItem label="Wilma intake" />
        <ReadyItem label="Document generation" />
        <ReadyItem label="Briefcase outputs" />
        <ReadyItem label="Filing guidance" />
      </div>
    </div>
  );
}

function ReadyItem({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <CheckCircle size={19} color="#1D9E75" aria-hidden="true" />
      <span style={{ fontSize: 14, color: "#3A332C" }}>{label}</span>
    </div>
  );
}

function CommunityShare({ message }: { message: string }) {
  return (
    <div style={{ background: "#0F1E3D", borderRadius: 20, padding: "1.5rem 1.6rem", marginBottom: "1.1rem", color: "#fff" }}>
      <p style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>Share with your community</p>
      <p style={{ margin: "0 0 14px", fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Use this message when promoting the intake link.</p>
      <div style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.92)", lineHeight: 1.6 }}>{message}</p>
      </div>
      <button
        type="button"
        data-copy-value={message}
        data-copy-default="Copy message"
        data-copy-copied="Copied"
        style={{ marginTop: 12, background: "#D85A30", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}
      >
        <Copy size={15} aria-hidden="true" />
        <span>Copy message</span>
      </button>
    </div>
  );
}

function CopyBehaviorScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(() => {
  const fallbackCopy = (value) => {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  };

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-value]");
    if (!button) return;

    const value = button.getAttribute("data-copy-value") || "";
    const label = button.querySelector("span");
    const defaultText = button.getAttribute("data-copy-default") || (label ? label.textContent : "");
    const copiedText = button.getAttribute("data-copy-copied") || "Copied";

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        fallbackCopy(value);
      }
      if (label) {
        label.textContent = copiedText;
        window.setTimeout(() => {
          label.textContent = defaultText;
        }, 1800);
      }
    } catch {
      if (label) label.textContent = defaultText;
    }
  });
})();
`
      }}
    />
  );
}

function WorkflowSteps() {
  const steps = [
    "A community member opens your intake link.",
    "Wilma asks plain-language screening questions.",
    "If the person may be eligible, LegalEase generates a Mississippi record-clearing packet.",
    "The packet and filing guidance are saved in the person's Briefcase.",
    "The person can return later to review, download, or seek legal help."
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem 1.6rem", border: "1px solid #EEE6DB", marginBottom: "1.1rem" }}>
      <p style={{ margin: "0 0 16px", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: "#0F1E3D" }}>How the workflow works</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {steps.map((step, index) => (
          <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#FBEAE1", color: "#993C1D", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {index + 1}
            </span>
            <span style={{ fontSize: 14, color: "#3A332C", lineHeight: 1.5 }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Resources() {
  const runningResources = [
    ["How the workflow works", Route],
    ["Explaining it to your community", MessageSquare],
    ["Sharing your intake link", Share2],
    ["Getting LegalEase support", Headphones]
  ] as const;
  const mississippiResources = [
    ["Mississippi record-clearing guide", "/resources/mississippi/Mississippi-Expungement-Agent-Reference.pdf", "EDUCATIONAL", "#0F6E56", "#E1F0EC"],
    ["Mississippi RCAP knowledge pack", "/resources/mississippi/MISSISSIPPI_RCAP_KNOWLEDGE_PACK.md", "EDUCATIONAL", "#0F6E56", "#E1F0EC"],
    ["Mississippi petition packet source materials", "/resources/mississippi/ms-expungement-petitions.html", "SOURCE", "#8A5A12", "#FCEFD9"]
  ] as const;

  return (
    <div style={{ background: "#fff", border: "1px solid #EEE6DB", borderRadius: 20, overflow: "hidden", marginBottom: "1.1rem" }}>
      <div style={{ padding: "1.3rem 1.6rem 0", display: "flex", alignItems: "center", gap: 10 }}>
        <BookOpen size={20} color="#D85A30" aria-hidden="true" />
        <p style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: "#0F1E3D" }}>Resources</p>
      </div>

      <ResourceSectionTitle title="Running your program" />
      <div style={{ padding: "0 1.6rem 1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 10 }}>
        {runningResources.map(([label, Icon]) => (
          <ResourceCard key={label} icon={<Icon size={18} color="#D85A30" aria-hidden="true" />} label={label} />
        ))}
      </div>

      <ResourceSectionTitle title="Mississippi record-clearing basics" compact />
      <div style={{ padding: "0 1.6rem 1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 10 }}>
        {mississippiResources.map(([label, href, badge, badgeColor, badgeBg]) => (
          <MississippiResource key={href} label={label} href={href} badge={badge} badgeColor={badgeColor} badgeBg={badgeBg} />
        ))}
      </div>

      <ResourceSectionTitle title="Glossary" compact />
      <div style={{ padding: "0 1.6rem 1.5rem" }}>
        <div style={{ border: "1px solid #EFE7DB", borderRadius: 12, overflow: "hidden" }}>
          <GlossaryRow term="Expungement" body="a court process that may limit public access to certain record information." />
          <GlossaryRow term="Sealing" body="a process that may restrict who can see a record." />
          <GlossaryRow term="Petition" body="a formal request filed with a court asking it to take a specific action." last />
          <div style={{ padding: "9px 14px", background: "#F4EDE3", borderTop: "1px solid #EFE7DB" }}>
            <span style={{ fontSize: 12, color: "#9A9288" }}>Plain-language explanations for orientation, not legal definitions.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceSectionTitle({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <div style={{ padding: compact ? "0.25rem 1.6rem 0" : "1.1rem 1.6rem 0" }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#A8543A" }}>{title}</p>
    </div>
  );
}

function ResourceCard({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={{ background: "#FBF7F2", border: "1px solid #EFE7DB", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 500, color: "#23201C" }}>{label}</span>
    </div>
  );
}

function MississippiResource({ label, href, badge, badgeColor, badgeBg }: { label: string; href: string; badge: string; badgeColor: string; badgeBg: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", background: "#FBF7F2", border: "1px solid #EFE7DB", borderRadius: 12, padding: "12px 14px", display: "block" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#23201C" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: badgeColor, background: badgeBg, padding: "2px 7px", borderRadius: 100 }}>{badge}</span>
      </div>
      <span style={{ fontSize: 13, color: "#0F6E56", display: "inline-flex", alignItems: "center", gap: 4 }}>
        Open resource
        <ExternalLink size={13} aria-hidden="true" />
      </span>
    </Link>
  );
}

function GlossaryRow({ term, body, last = false }: { term: string; body: string; last?: boolean }) {
  return (
    <div style={{ padding: "10px 14px", background: "#FBF7F2", borderBottom: last ? undefined : "1px solid #EFE7DB" }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#23201C" }}>{term}</span>
      <span style={{ fontSize: 13, color: "#6B6359" }}> — {body}</span>
    </div>
  );
}

function LegalNote() {
  return (
    <div style={{ padding: "14px 16px", background: "#F4EDE3", borderRadius: 12 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#8A8278", lineHeight: 1.6 }}>
        LegalEase provides general legal information and document automation support. Wilma does not provide legal advice, guarantee eligibility, guarantee filing acceptance, or guarantee court outcomes. A licensed attorney can advise on a person&apos;s specific situation.
      </p>
    </div>
  );
}

function DeniedDashboard({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-[#FBF7F2] text-[#0F1E3D]">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-[#D85A30]" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black text-[#0F1E3D]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">{body}</p>
          <Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#0F1E3D] px-5 py-2 text-sm font-semibold text-white">
            Sign in with another account
          </Link>
        </Card>
      </div>
    </main>
  );
}

function formatMetric(value?: number) {
  return value === undefined ? "-" : Math.round(value).toLocaleString();
}

function hasDashboardWarning(warnings: string[], prefix: string) {
  return warnings.some((warning) => warning.startsWith(prefix));
}

function getPartnerDisplayLabel(partnerSlug: string, storedLabel: string) {
  if (partnerSlug === "we-must-vote") {
    return "We Must Vote";
  }

  return storedLabel;
}

function getPublicIntakeDisplayUrl(partnerSlug: string) {
  return `${getPublicIntakeBaseHost()}/intake/${partnerSlug}`;
}

function getPublicIntakeOpenUrl(partnerSlug: string) {
  return `https://${getPublicIntakeDisplayUrl(partnerSlug)}`;
}

function getPublicIntakeBaseHost() {
  return productionAppUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
