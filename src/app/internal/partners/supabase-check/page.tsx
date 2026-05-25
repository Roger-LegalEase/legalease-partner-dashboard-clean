import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getAllPartnerRecords,
  getPartnerRepositoryMode
} from "@/lib/partners/partner-repository";
import {
  internalAdmin,
  internalProvisioning,
  internalSupabaseCheck
} from "@/lib/partners/routes";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

const requiredSeededPartners = ["demo-partner", "we-must-vote", "fulton-county"];

type LiveReadResult = {
  attempted: boolean;
  slugs: string[];
  error: string | null;
};

export const dynamic = "force-dynamic";

export default async function InternalPartnerSupabaseCheckPage() {
  const repositoryMode = await getPartnerRepositoryMode();
  const repositoryPartners = await getAllPartnerRecords();
  const supabaseEnabled = process.env.ENABLE_SUPABASE_PARTNER_DATA === "true";
  const supabaseConfigured = isSupabaseConfigured();
  const liveRead = await readLiveSupabasePartnerSlugs(supabaseEnabled, supabaseConfigured);
  const verificationSlugs = liveRead.attempted && !liveRead.error ? liveRead.slugs : repositoryPartners.map((partner) => partner.partnerSlug);
  const foundSeededPartners = requiredSeededPartners.filter((slug) => verificationSlugs.includes(slug));
  const missingSeededPartners = requiredSeededPartners.filter((slug) => !verificationSlugs.includes(slug));
  const dataSourceLabel = repositoryMode === "supabase" ? "Supabase partner database" : "Local seeded fallback";

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Badge tone="orange">Internal LegalEase operations view. Auth will be added before production.</Badge>

        <section className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <h1 className="text-4xl font-black leading-tight text-navy">Live Supabase Check</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Read-only verification for confirming whether Partner Journey OS records are available through the
              server-side Supabase connection. This page never displays environment variable values or service keys.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <p className="text-sm font-black text-navy">Connection status</p>
            <div className="mt-4 grid gap-2">
              <Badge tone={repositoryMode === "supabase" ? "teal" : "blue"}>Repository mode: {repositoryMode}</Badge>
              <Badge tone={supabaseEnabled ? "teal" : "neutral"}>Supabase enabled: {supabaseEnabled ? "yes" : "no"}</Badge>
              <Badge tone={supabaseConfigured ? "teal" : "neutral"}>
                Supabase configured: {supabaseConfigured ? "yes" : "no"}
              </Badge>
              <Badge tone={liveRead.attempted ? "teal" : "neutral"}>
                Live read attempted: {liveRead.attempted ? "yes" : "no"}
              </Badge>
              <Badge tone="blue">Data source: {dataSourceLabel}</Badge>
              <Badge tone="neutral">Partner count from repository: {repositoryPartners.length}</Badge>
            </div>
          </Card>
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-navy">Verification result</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">{buildStatusMessage({
                repositoryMode,
                supabaseEnabled,
                supabaseConfigured,
                liveRead
              })}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/internal/partners/data" className="text-sm font-semibold text-teal hover:text-navy">
                Data diagnostic
              </Link>
              <Link href={internalAdmin()} className="text-sm font-semibold text-teal hover:text-navy">
                Admin route
              </Link>
              <Link href={internalProvisioning()} className="text-sm font-semibold text-teal hover:text-navy">
                Provisioning route
              </Link>
            </div>
          </div>

          {liveRead.error ? (
            <div className="mt-5 rounded-md border border-orange/30 bg-orange/10 p-4 text-sm leading-6 text-grayWilma-700">
              Live read failed with a Supabase error. Confirm the schema was loaded, the service role key is valid, and
              the project URL points to the same Supabase project used for the seed data.
            </div>
          ) : null}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card className="rounded-md p-5">
            <h2 className="text-lg font-black text-navy">Partner slugs returned</h2>
            <div className="mt-4 grid gap-2">
              {(verificationSlugs.length > 0 ? verificationSlugs : ["No partner slugs returned."]).map((slug) => (
                <div key={slug} className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-3 py-2 text-sm font-semibold text-navy">
                  {slug}
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-md p-5">
            <h2 className="text-lg font-black text-navy">Required seeded partners</h2>
            <div className="mt-4 grid gap-3">
              {requiredSeededPartners.map((slug) => (
                <div key={slug} className="flex items-center justify-between gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-3 py-2">
                  <span className="text-sm font-semibold text-navy">{slug}</span>
                  <Badge tone={foundSeededPartners.includes(slug) ? "teal" : "orange"}>
                    {foundSeededPartners.includes(slug) ? "found" : "missing"}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Badge tone={missingSeededPartners.length === 0 ? "teal" : "orange"}>
                Missing seeded partners: {missingSeededPartners.length > 0 ? missingSeededPartners.join(", ") : "none"}
              </Badge>
            </div>
          </Card>
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-navy">Safe setup instructions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SetupItem label="Schema SQL" value="Run supabase/partner-journey-os.sql in Supabase SQL Editor." />
            <SetupItem label="Seed SQL" value="Run supabase/partner-seed-demo.sql in the same Supabase project." />
            <SetupItem label="Environment" value="Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ENABLE_SUPABASE_PARTNER_DATA=true." />
            <SetupItem label="Restart" value="Restart the dev server after changing environment variables." />
            <SetupItem label="CLI checks" value="Run npm run partners:verify-supabase-live-read and npm run partners:verify-supabase-required-partners." />
            <SetupItem label="Current route" value={internalSupabaseCheck()} />
          </div>
          <p className="mt-5 text-sm font-semibold leading-6 text-grayWilma-700">
            Never paste the service role key into browser code, public pages, screenshots, docs, or GitHub.
          </p>
        </section>
      </div>
    </main>
  );
}

async function readLiveSupabasePartnerSlugs(enabled: boolean, configured: boolean): Promise<LiveReadResult> {
  if (!enabled || !configured) {
    return { attempted: false, slugs: [], error: null };
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return { attempted: false, slugs: [], error: null };
    }

    const { data, error } = await supabase
      .from("partner_records")
      .select("partner_slug")
      .order("partner_slug", { ascending: true });

    if (error) {
      return { attempted: true, slugs: [], error: error.message };
    }

    return {
      attempted: true,
      slugs: (data ?? []).map((row) => row.partner_slug).filter(Boolean),
      error: null
    };
  } catch (error) {
    return {
      attempted: true,
      slugs: [],
      error: error instanceof Error ? error.message : "Unknown Supabase read error."
    };
  }
}

function buildStatusMessage({
  repositoryMode,
  supabaseEnabled,
  supabaseConfigured,
  liveRead
}: {
  repositoryMode: string;
  supabaseEnabled: boolean;
  supabaseConfigured: boolean;
  liveRead: LiveReadResult;
}) {
  if (!supabaseEnabled) {
    return "Supabase partner data is disabled. The app is expected to use local_seeded mode until ENABLE_SUPABASE_PARTNER_DATA=true is set and the dev server is restarted.";
  }

  if (!supabaseConfigured) {
    return "Supabase partner data is enabled, but credentials are incomplete. The app is expected to use local_fallback mode until the project URL and server-only service role key are configured.";
  }

  if (liveRead.error) {
    return "Supabase partner data is enabled and configured, but the live read did not complete successfully. Check the Supabase schema, seed data, and service role key.";
  }

  if (repositoryMode === "supabase" && liveRead.attempted) {
    return "Supabase partner data is enabled, configured, and a live server-side read completed. Confirm the required seeded partners are listed below.";
  }

  return "Review the repository mode, environment configuration, and live read status before treating Supabase as verified.";
}

function SetupItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-3 py-3">
      <p className="text-xs font-black uppercase text-grayWilma-600">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-navy">{value}</p>
    </div>
  );
}
