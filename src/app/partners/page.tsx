import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Handshake,
  Landmark,
  Layers3,
  LockKeyhole,
  Map,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";

export const metadata: Metadata = {
  title: "LegalEase Partner Program | Record-Clearing Access Programs",
  description:
    "LegalEase helps civic, workforce, reentry, clinic, funder, and record-clearing partners launch guided workflows, partner dashboards, and impact reporting."
};

const requestHref = "/request-pilot";
const assetBase = "/assets/partner-program";
const imagePath = (name: string) => `${assetBase}/partners/${name}.png`;

const audiences = [
  {
    title: "Community nonprofits",
    body: "Turn community trust into a clear record-clearing support pathway without adding a heavy new intake burden.",
    image: imagePath("community_gathering_in_a_welcoming_space"),
    icon: UsersRound
  },
  {
    title: "Workforce and reentry organizations",
    body: "Help participants address record-related barriers to jobs, housing, licensing, training, and stability.",
    image: imagePath("a_community_of_kindness_and_support"),
    icon: Building2
  },
  {
    title: "Cities and counties",
    body: "Give residents a clear starting point while giving leadership better visibility into demand and next steps.",
    image: imagePath("collaborative_discussion_in_front_of_government_bu"),
    icon: Landmark
  },
  {
    title: "Legal clinics and coalitions",
    body: "Standardize intake, triage demand, and prepare people before clinic review or partner follow-up.",
    image: imagePath("friendly_consultation_with_a_roadmap_of_guidance"),
    icon: ClipboardList
  },
  {
    title: "Funders and foundations",
    body: "Support measurable implementation, not just awareness, with reporting that can inform future investment.",
    image: imagePath("growth_and_progress_dashboard_design"),
    icon: BarChart3
  },
  {
    title: "National organizations",
    body: "Scale record-clearing access across chapters, affiliates, members, or state campaigns with a repeatable workflow.",
    image: imagePath("community_pathway_of_connection_and_support"),
    icon: Network
  }
];

const launchComponents = [
  ["Branded campaign pages", "A public entry point tailored to each partner's audience and geography.", Map],
  ["Wilma eligibility intake", "Plain-language intake that gathers facts and explains possible next steps.", ClipboardList],
  ["RecordShield pathway", "Record review support to help people understand what may appear and what to gather.", ShieldCheck],
  ["Expungement.ai support", "Document automation and guided support where the workflow and jurisdiction allow it.", FileText],
  ["Partner dashboard", "Operational visibility into demand, progress, drop-off, and support needs.", BarChart3],
  ["Impact reports", "Weekly signals and final reporting for leadership, funders, agencies, and coalitions.", Layers3]
] as const;

const steps = [
  ["Days 1-15", "Program setup", "Define audience, geography, workflow boundaries, dashboard needs, and reporting goals."],
  ["Days 16-45", "Pilot launch", "Publish the campaign page, open guided intake, and begin monitoring early participation."],
  ["Days 46-75", "Workflow tuning", "Review drop-off, refine outreach, clarify next steps, and support partner staff."],
  ["Days 76-90", "Impact report", "Summarize demand, usage, lessons, support needs, and expansion recommendations."]
] as const;

const campaignModels = [
  {
    title: "Record-Clearing Access Program",
    body: "For nonprofits, clinics, coalitions, cities, counties, and statewide initiatives.",
    bestFor:
      "Best for identifying demand, guiding intake, and routing people toward possible expungement, sealing, record restriction, or Clean Slate support."
  },
  {
    title: "Workforce and Reentry Campaign",
    body: "For workforce boards, reentry programs, training providers, employers, and community organizations.",
    bestFor:
      "Best for helping participants address record-related barriers to employment, housing, licensing, training, and mobility."
  },
  {
    title: "Clean Slate Implementation Support",
    body: "For policy organizations, state partners, funders, coalitions, and public agencies.",
    bestFor:
      "Best for outreach, notification, backlog triage, public education, and implementation reporting."
  }
];

const partnershipOptions = [
  {
    title: "Starter Launch",
    label: "Focused campaign",
    price: "Scoped after discovery",
    body: "A defined pilot for a smaller audience, event, clinic, or community access campaign."
  },
  {
    title: "Implementation Partnership",
    label: "Most common starting point",
    price: "Often starts with a 90-day pilot",
    body: "A full partner campaign with guided intake, dashboard visibility, reporting, and workflow support."
  },
  {
    title: "Strategic Partnership",
    label: "Multi-site initiative",
    price: "Custom scope",
    body: "A broader implementation for statewide, national, funder-backed, or multi-jurisdiction programs."
  }
];

const trustBoundaries = [
  ["No outcome promises", "LegalEase does not promise eligibility, expungement, sealing, filing acceptance, or court outcomes."],
  ["General legal information", "Program workflows provide guided information and document automation, not legal advice."],
  ["Clear partner boundaries", "Partner teams get workflow visibility without being asked to make legal determinations."],
  ["Privacy-conscious reporting", "Reports are designed to support program learning without making submitted lead data public."]
] as const;

export default function PartnersLandingPage() {
  return (
    <main className="min-h-screen bg-[#fbf6ee] text-[#102033]">
      <SiteHeader />
      <section className="border-b border-[#e3d8c8] bg-[#fffaf2]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">LegalEase Partner Program</p>
            <h1 className="mt-4 max-w-4xl font-serif text-5xl font-black leading-[0.97] tracking-normal text-[#102d4a] md:text-7xl">
              Launch a record-clearing program your community can actually use.
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-[#526173]">
              LegalEase helps trusted partners launch guided intake, record-clearing support, document automation,
              partner dashboards, and impact reports so more people can move from awareness to action.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href={requestHref}>Request a pilot</PrimaryLink>
              <SecondaryLink href="#how">See how it works</SecondaryLink>
            </div>
            <div className="mt-6 flex flex-wrap gap-2" aria-label="Program highlights">
              {["90-day launch", "Guided workflow", "Partner dashboard", "Impact reporting"].map((chip) => (
                <span key={chip} className="rounded-full border border-[#dacdbb] bg-white px-3 py-1.5 text-sm font-bold text-[#31465b]">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-md border border-[#decfbb] bg-white p-3 shadow-sm">
            <Image
              src={imagePath("community_pathway_of_connection_and_support")}
              alt="Illustration of a connected community pathway"
              width={1400}
              height={1050}
              priority
              className="h-auto w-full rounded-md"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f4eadc] py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="The partnership model"
            title="Your organization brings the trust. LegalEase brings the system."
            body="Together, we turn record-clearing interest into a structured pathway people can understand and complete."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={Handshake}
              title="Partner trust"
              body="Your referrals, relationships, events, staff, and mission create the bridge to the community."
            />
            <FeatureCard
              icon={Route}
              title="LegalEase workflow"
              body="Guided intake, possible eligibility routing, record-clearing support, dashboards, and reporting."
            />
            <FeatureCard
              icon={Sparkles}
              title="Shared proof"
              body="A 90-day pilot creates usage signals, lessons, and a practical case for expansion."
            />
          </div>
        </div>
      </section>

      <section id="who" className="py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="Who this is for"
            title="Built for organizations already serving justice-impacted people."
            body="LegalEase adds the intake, screening, support, and reporting layer needed to move people from outreach to next steps."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {audiences.map((audience) => (
              <article key={audience.title} className="rounded-md border border-[#e0d4c4] bg-white p-5 shadow-sm">
                <Image
                  src={audience.image}
                  alt=""
                  width={1400}
                  height={1400}
                  className="mb-4 aspect-[4/3] w-full rounded-md object-cover"
                />
                <audience.icon className="h-6 w-6 text-[#0f7f80]" aria-hidden="true" />
                <h3 className="mt-3 text-xl font-black text-[#102d4a]">{audience.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#526173]">{audience.body}</p>
                <Link href={requestHref} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#c84f2b]">
                  Explore a pilot
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#e1d3c1] bg-white py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-6 lg:grid-cols-[0.92fr_1.08fr]">
          <ImagePanel
            src={imagePath("overwhelmed_by_chaos_and_confusion")}
            alt="Illustration of a fragmented process"
          />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">The implementation gap</p>
            <h2 className="mt-3 max-w-3xl font-serif text-4xl font-black leading-tight text-[#102d4a] md:text-5xl">
              The law opened the door. Most people still never make it through.
            </h2>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[#526173]">
              Possible eligibility is only the beginning. Without intake, document collection, follow-up, and reporting,
              record-clearing programs lose people before they reach meaningful support.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Disconnected intake", "Manual follow-up", "Missing documents", "Unclear next steps", "Hard-to-track outcomes", "Limited reporting"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-md border border-[#e0d4c4] bg-[#fbf6ee] px-3 py-2 text-sm font-bold text-[#31465b]">
                  <CheckCircle2 className="h-4 w-4 text-[#0f7f80]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="What you can launch"
            title="A complete record-clearing support workflow."
            body="Give your community a clear place to start while your team gets the visibility to manage demand and report progress."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {launchComponents.map(([title, body, Icon]) => (
              <FeatureCard key={title} icon={Icon} title={title} body={body} />
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-[#e1d3c1] bg-[#f4eadc] py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="From program design to impact report."
            body="Most partnerships begin with a 90-day pilot designed to validate demand, workflow, and reporting needs."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {steps.map(([days, title, body]) => (
              <article key={days} className="rounded-md border border-[#ddcfbd] bg-white p-5 shadow-sm">
                <span className="inline-flex rounded-full bg-[#102d4a] px-3 py-1 text-xs font-black text-white">{days}</span>
                <h3 className="mt-4 text-xl font-black text-[#102d4a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#526173]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="programs" className="py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="Campaign models"
            title="Choose the model that fits your mission."
            body="Each model is scoped around audience, geography, partner capacity, reporting needs, and workflow boundaries."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {campaignModels.map((model) => (
              <article key={model.title} className="rounded-md border border-[#e0d4c4] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-[#102d4a]">{model.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#526173]">{model.body}</p>
                <p className="mt-4 rounded-md bg-[#fbf6ee] p-3 text-sm leading-6 text-[#31465b]">{model.bestFor}</p>
                <Link href={requestHref} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#c84f2b]">
                  Design this campaign
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#e1d3c1] bg-white py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-6 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">Dashboard and reporting</p>
            <h2 className="mt-3 max-w-3xl font-serif text-4xl font-black leading-tight text-[#102d4a] md:text-5xl">
              Show what happened after outreach.
            </h2>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[#526173]">
              Partners can see participation, workflow progress, drop-off, and support needs in a format that is stronger
              than anecdotes and safer than public lead lists.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Screenings started", "Possible pathways identified", "Document support activity", "Reports delivered"].map((metric) => (
                <div key={metric} className="rounded-md border border-[#e0d4c4] bg-[#fbf6ee] px-4 py-3">
                  <p className="text-sm font-black text-[#102d4a]">{metric}</p>
                  <p className="mt-1 text-xs font-semibold text-[#526173]">Tracked for partner learning and program planning.</p>
                </div>
              ))}
            </div>
          </div>
          <ImagePanel src={imagePath("growth_and_progress_dashboard_design")} alt="Illustration of dashboard reporting" />
        </div>
      </section>

      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="Partnership options"
            title="Start with the scope that matches your reach."
            body="Pilot structure depends on geography, audience size, partner capacity, support needs, integrations, and reporting requirements."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {partnershipOptions.map((option, index) => (
              <article
                key={option.title}
                className={`rounded-md border p-6 shadow-sm ${
                  index === 1 ? "border-[#0f7f80] bg-white ring-2 ring-[#0f7f80]/10" : "border-[#e0d4c4] bg-white"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0f7f80]">{option.label}</p>
                <h3 className="mt-3 text-2xl font-black text-[#102d4a]">{option.title}</h3>
                <p className="mt-3 text-lg font-black text-[#c84f2b]">{option.price}</p>
                <p className="mt-4 text-sm leading-6 text-[#526173]">{option.body}</p>
                <PrimaryLink href={requestHref} className="mt-6 w-full">
                  Request this scope
                </PrimaryLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#e1d3c1] bg-[#f4eadc] py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="Trust and boundaries"
            title="Built for guided access, not legal overreach."
            body="LegalEase supports general legal information, workflow clarity, document automation, and reporting. It does not replace legal advice or court review."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {trustBoundaries.map(([title, body]) => (
              <article key={title} className="rounded-md border border-[#ddcfbd] bg-white p-5 shadow-sm">
                <LockKeyhole className="h-5 w-5 text-[#0f7f80]" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-black text-[#102d4a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#526173]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#102d4a] py-16 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-6 lg:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b44b]">Ready to launch</p>
            <h2 className="mt-3 max-w-4xl font-serif text-4xl font-black leading-tight md:text-5xl">
              Ready to turn record-clearing access into a measurable pilot?
            </h2>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-white/78">
              Tell us about your organization, audience, and goals. LegalEase will help identify whether a pilot makes
              sense and what structure is appropriate.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href={requestHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#d96c3b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#c84f2b]"
            >
              Request a Partner Program pilot
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
            >
              Review partnership options
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#e3d8c8] bg-[#fbf6ee]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/partners" className="flex items-center gap-3" aria-label="LegalEase Partner Program">
          <Image
            src={`${assetBase}/brand/legalease-logo.png`}
            alt="LegalEase"
            width={1920}
            height={1080}
            className="h-9 w-auto"
          />
          <span className="hidden border-l border-[#d6c7b5] pl-3 text-xs font-black uppercase tracking-wide text-[#526173] sm:inline">
            Partner Program
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-bold text-[#31465b] lg:flex" aria-label="Primary navigation">
          <Link href="#who">Who it is for</Link>
          <Link href="#how">How it works</Link>
          <Link href="#programs">Campaign models</Link>
          <Link href="#pricing">Options</Link>
        </nav>
        <Link
          href={requestHref}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#d96c3b] px-4 text-sm font-black text-white transition hover:bg-[#c84f2b]"
        >
          Request pilot
        </Link>
      </div>
    </header>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-4xl font-black leading-tight text-[#102d4a] md:text-5xl">{title}</h2>
      <p className="mt-4 text-base font-semibold leading-7 text-[#526173]">{body}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-md border border-[#e0d4c4] bg-white p-5 shadow-sm">
      <Icon className="h-6 w-6 text-[#0f7f80]" aria-hidden="true" />
      <h3 className="mt-4 text-xl font-black text-[#102d4a]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#526173]">{body}</p>
    </article>
  );
}

function ImagePanel({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-[#e0d4c4] bg-[#fbf6ee] p-3 shadow-sm">
      <Image src={src} alt={alt} width={1400} height={1400} className="aspect-square w-full rounded-md object-cover" />
    </div>
  );
}

function PrimaryLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#d96c3b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#c84f2b] ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#d8c9b7] bg-white px-5 py-3 text-sm font-black text-[#102d4a] transition hover:bg-[#f4eadc]"
    >
      {children}
    </Link>
  );
}
