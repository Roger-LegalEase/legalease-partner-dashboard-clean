"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  buildPartnerProvisioningPreview,
  validatePartnerProvisioningInput,
  type PartnerProvisioningPreview
} from "@/lib/partners/partner-provisioning-domain";

type Values = {
  organizationName: string;
  legalOrganizationName: string;
  partnerSlug: string;
  programName: string;
  programPurpose: string;
  administratorName: string;
  administratorEmail: string;
  clearanceReason: string;
};

type ProvisioningResult = {
  created: boolean;
  replayed: boolean;
  partnerSlug: string;
  organizationName: string;
  sectionCount: number;
  milestoneCount: number;
};

const emptyValues: Values = {
  organizationName: "",
  legalOrganizationName: "",
  partnerSlug: "",
  programName: "",
  programPurpose: "",
  administratorName: "",
  administratorEmail: "",
  clearanceReason: ""
};

/**
 * Three steps, one primary action.
 *
 * The review step exists because provisioning is the one moment where an
 * operator can create a tenant that a partner will later see. Showing exactly
 * what will and will not be created — before the single "Provision" button —
 * is what keeps "provisioned" from reading as "launched".
 */
export function ProvisionPartnerForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values>(emptyValues);
  const [preview, setPreview] = useState<PartnerProvisioningPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProvisioningResult | null>(null);
  // One key per reviewed request. A retry after a network failure reuses it, so
  // the retry can only ever return the first outcome.
  const idempotencyKey = useRef<string | null>(null);

  function set<K extends keyof Values>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const key = idempotencyKey.current ?? crypto.randomUUID();
    const validated = validatePartnerProvisioningInput({
      ...values,
      idempotencyKey: key
    });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    idempotencyKey.current = key;
    setPreview(buildPartnerProvisioningPreview(validated.value));
  }

  async function provision() {
    if (!preview || !idempotencyKey.current) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/internal/partners/provisioning", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, idempotencyKey: idempotencyKey.current })
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        result?: ProvisioningResult;
      } | null;
      if (!response.ok || data?.ok !== true || !data.result) {
        setError(
          data?.message ??
            "Provisioning did not complete. Nothing was created."
        );
        setBusy(false);
        return;
      }
      setResult(data.result);
      setBusy(false);
    } catch {
      setError(
        "Provisioning could not be confirmed. Retrying with this same request will not create a second partner."
      );
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Card className="rounded-md p-6" data-provisioning-state="complete">
        <Badge tone="teal">Provisioned</Badge>
        <h2 className="mt-4 flex items-center gap-2 text-2xl font-black text-navy">
          <CheckCircle2 className="h-6 w-6 text-teal" aria-hidden="true" />
          {result.organizationName} is provisioned
        </h2>
        <p className="mt-3 text-sm leading-6 text-grayWilma-700">
          {result.replayed
            ? "This request was already processed. The original partner was returned and nothing was created a second time."
            : `One partner tenant, one program, one onboarding workspace, ${result.sectionCount} onboarding sections, ${result.milestoneCount} implementation milestones, and one private participant page configuration were created.`}
        </p>
        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          <ResultState label="Administrator access" value="Not invited" />
          <ResultState label="Program configuration" value="Not started" />
          <ResultState label="Publication" value="Private" />
          <ResultState label="Program activation" value="Inactive" />
        </dl>
        <p className="mt-5 text-sm leading-6 text-grayWilma-700">
          Provisioning is not launch. The next step is inviting the first
          administrator; publication and activation stay separate decisions after
          that.
        </p>
        <div className="mt-6">
          <Button
            className="min-h-11"
            onClick={() =>
              router.push(
                `/internal/partners/provisioning/${encodeURIComponent(result.partnerSlug)}`
              )
            }
            type="button"
          >
            Continue to first administrator invitation
          </Button>
        </div>
      </Card>
    );
  }

  if (preview) {
    return (
      <Card className="rounded-md p-6" data-provisioning-state="review">
        <Badge tone="orange">Review before provisioning</Badge>
        <h2 className="mt-4 text-2xl font-black text-navy">
          {preview.organizationName}
        </h2>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <ResultState label="Legal organization name" value={preview.legalOrganizationName} />
          <ResultState label="Page address" value={preview.partnerSlug} />
          <ResultState label="Program name" value={preview.programName} />
          <ResultState
            label="First administrator"
            value={`${preview.administratorName} · ${preview.administratorEmail}`}
          />
        </dl>

        {error ? <ErrorNote message={error} /> : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-navy">
              Records this creates
            </h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-grayWilma-700">
              {preview.recordsCreated.map((record) => (
                <li key={record.key}>
                  <span className="font-bold text-navy">{record.label}.</span>{" "}
                  {record.detail}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-navy">
              Records this does not create
            </h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-grayWilma-700">
              {preview.recordsNotCreated.map((record) => (
                <li key={record.key}>
                  <span className="font-bold text-navy">{record.label}.</span>{" "}
                  {record.detail}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-6 rounded-md border border-grayWilma-200 bg-grayWilma-100 p-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-navy">
            State immediately after provisioning
          </h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {preview.initialStates.map((state) => (
              <ResultState key={state.key} label={state.label} value={state.value} />
            ))}
          </dl>
        </section>

        <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-grayWilma-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
          Provisioning is one operation. If it fails partway, nothing is created.
          If you submit this same reviewed request twice, the second submission
          returns the first result instead of creating a second partner.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="min-h-11" disabled={busy} onClick={provision} type="button">
            {busy ? "Provisioning…" : "Provision partner"}
          </Button>
          <button
            className="min-h-11 rounded-md border border-grayWilma-200 bg-white px-5 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100 disabled:opacity-60"
            disabled={busy}
            onClick={() => {
              setPreview(null);
              setError(null);
            }}
            type="button"
          >
            Edit details
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-md p-6" data-provisioning-state="details">
      <Badge tone="blue">Partner details</Badge>
      <h2 className="mt-4 flex items-center gap-2 text-2xl font-black text-navy">
        <Building2 className="h-6 w-6 text-teal" aria-hidden="true" />
        Provision a new partner
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
        This creates the partner tenant, its program, and its private
        implementation workspace. It does not invite anyone, publish anything, or
        activate participant intake.
      </p>
      {error ? <ErrorNote message={error} /> : null}
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={review}>
        <Field label="Public organization name" required>
          <input
            autoComplete="off"
            className="provision-input"
            maxLength={200}
            name="organizationName"
            onChange={(event) => set("organizationName", event.target.value)}
            required
            value={values.organizationName}
          />
        </Field>
        <Field label="Legal organization name" required>
          <input
            autoComplete="off"
            className="provision-input"
            maxLength={200}
            name="legalOrganizationName"
            onChange={(event) => set("legalOrganizationName", event.target.value)}
            required
            value={values.legalOrganizationName}
          />
        </Field>
        <Field
          hint="Reserved now. The public page stays private and returns 404 until publication is authorized separately."
          label="Partner page address"
          required
        >
          <input
            autoComplete="off"
            className="provision-input font-mono"
            maxLength={120}
            name="partnerSlug"
            onChange={(event) =>
              set("partnerSlug", event.target.value.trim().toLowerCase())
            }
            pattern="[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?"
            required
            value={values.partnerSlug}
          />
        </Field>
        <Field label="Program name" required>
          <input
            autoComplete="off"
            className="provision-input"
            maxLength={200}
            name="programName"
            onChange={(event) => set("programName", event.target.value)}
            required
            value={values.programName}
          />
        </Field>
        <Field full label="Program purpose" required>
          <textarea
            className="provision-input"
            maxLength={2000}
            name="programPurpose"
            onChange={(event) => set("programPurpose", event.target.value)}
            required
            rows={2}
            value={values.programPurpose}
          />
        </Field>
        <Field label="First administrator name" required>
          <input
            autoComplete="off"
            className="provision-input"
            maxLength={120}
            name="administratorName"
            onChange={(event) => set("administratorName", event.target.value)}
            required
            value={values.administratorName}
          />
        </Field>
        <Field
          hint="Recorded now. The invitation is sent from the administrator access panel afterwards."
          label="First administrator work email"
          required
        >
          <input
            autoComplete="off"
            className="provision-input"
            maxLength={254}
            name="administratorEmail"
            onChange={(event) =>
              set("administratorEmail", event.target.value.trim().toLowerCase())
            }
            required
            type="email"
            value={values.administratorEmail}
          />
        </Field>
        <Field
          full
          hint="Never shown to the partner. Recorded on the provisioning audit event."
          label="Authorized internal clearance reason"
          required
        >
          <textarea
            className="provision-input"
            maxLength={2000}
            name="clearanceReason"
            onChange={(event) => set("clearanceReason", event.target.value)}
            required
            rows={2}
            value={values.clearanceReason}
          />
        </Field>
        <div className="sm:col-span-2">
          <Button className="min-h-11" type="submit">
            Review what will be created
          </Button>
        </div>
      </form>
      <style>{`.provision-input{width:100%;border:1px solid #D7DEE8;border-radius:8px;padding:10px 12px;font-size:14px;min-height:44px;background:#fff}`}</style>
    </Card>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      className="mt-5 flex items-start gap-2 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function ResultState({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase tracking-wide text-grayWilma-600">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-navy">{value}</dd>
    </div>
  );
}

function Field({
  children,
  full,
  hint,
  label,
  required
}: {
  children: React.ReactNode;
  full?: boolean;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-grayWilma-600">
        {label}
        {required ? <span className="text-orange"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] leading-4 text-grayWilma-600">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
