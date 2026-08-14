"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { Check, Copy, Mail, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { FirstAdminAccessView } from "@/lib/partners/first-admin-service";
import { buildFirstAdminProvisioningPresentation } from "@/lib/partners/first-admin-provisioning-presentation";
import type { OnboardingWorkspaceStatus } from "@/lib/partners/onboarding/types";
import type { PartnerProvisioningStatus } from "@/lib/partners/types";

type PartnerSummary = {
  partnerSlug: string;
  publicName: string;
  legalName: string;
  jurisdiction: string;
  selectedPackage: string;
  workspaceStatus?: OnboardingWorkspaceStatus;
  completionPercentage?: number;
  provisioningStatus?: PartnerProvisioningStatus;
  owner?: string;
  dueDate?: string;
};

type Props = {
  partner: PartnerSummary;
  initialAccess: FirstAdminAccessView;
  onboardingEnabled: boolean;
};

type FormValues = {
  fullName: string;
  email: string;
};

type ActionResponse = {
  ok?: boolean;
  message?: string;
  setupLink?: string | null;
  access?: FirstAdminAccessView;
};

const expirationHours = 72;

export function FirstAdminAccessPanel({
  partner,
  initialAccess,
  onboardingEnabled
}: Props) {
  const [access, setAccess] = useState(initialAccess);
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "form" | "review">("idle");
  const [replaceCurrent, setReplaceCurrent] = useState(false);
  const [values, setValues] = useState<FormValues>({
    fullName: initialAccess.invitation?.fullName ?? "",
    email: initialAccess.invitation?.email ?? ""
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  function openForm(replace: boolean) {
    setReplaceCurrent(replace);
    setMode("form");
    setMessage(null);
    setError(null);
    idempotencyKey.current = crypto.randomUUID();
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fullName = values.fullName.trim().replace(/\s+/g, " ");
    const email = values.email.trim().toLowerCase();
    if (fullName.length < 2) {
      setError("Enter the administrator’s full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid work email address.");
      return;
    }
    setValues({ fullName, email });
    setMode("review");
  }

  async function createInvitation() {
    setBusyAction(replaceCurrent ? "replace" : "create");
    setError(null);
    setMessage(null);
    try {
      const result = await postAction(
        replaceCurrent ? "replace" : "create",
        {
          fullName: values.fullName,
          email: values.email,
          expirationHours,
          idempotencyKey:
            idempotencyKey.current ?? crypto.randomUUID()
        }
      );
      if (result.access) setAccess(result.access);
      setSetupLink(result.setupLink ?? null);
      setMode("idle");
      setMessage(
        result.setupLink
          ? "Secure setup link created. Copy it before leaving this page."
          : "The existing request was preserved; no duplicate invitation was created."
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Administrator access could not be created."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function revokeInvitation() {
    const invitationId = access.invitation?.invitationId;
    if (!invitationId) return;
    setBusyAction("revoke");
    setError(null);
    setMessage(null);
    try {
      const result = await postAction("revoke", { invitationId });
      if (result.access) setAccess(result.access);
      setSetupLink(null);
      setMessage("Invitation revoked. Its setup link can no longer be used.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be revoked."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function sendInvitation() {
    const invitationId = access.invitation?.invitationId;
    if (!invitationId || !setupLink) return;
    setBusyAction("send");
    setError(null);
    setMessage(null);
    try {
      const result = await postAction("send", {
        invitationId,
        setupLink
      });
      if (result.access) setAccess(result.access);
      setMessage("Invitation sent through the configured email provider.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The invitation was not sent."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function copySetupLink() {
    if (!setupLink) return;
    try {
      await navigator.clipboard.writeText(setupLink);
      setMessage("Secure setup link copied.");
      setError(null);
    } catch {
      setError("Copy was blocked by the browser. Select and copy the link manually.");
    }
  }

  async function postAction(
    action: string,
    payload: Record<string, unknown>
  ): Promise<ActionResponse> {
    const response = await fetch(
      `/api/internal/partners/first-admin/${encodeURIComponent(
        partner.partnerSlug
      )}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      }
    );
    const result = (await response.json().catch(() => null)) as
      | ActionResponse
      | null;
    if (!response.ok || result?.ok !== true) {
      throw new Error(
        result?.message ?? "Administrator access could not be updated."
      );
    }
    return result;
  }

  const invitation = access.invitation;
  const canCreate =
    access.workspaceExists &&
    access.accessStatus === "no_administrator";
  const canReplace =
    access.workspaceExists &&
    ["invitation_pending", "invitation_expired", "invitation_revoked"].includes(
      access.accessStatus
    );
  const canRevoke =
    access.accessStatus === "invitation_pending" && Boolean(invitation);
  const presentation = buildFirstAdminProvisioningPresentation({
    access,
    jurisdiction: partner.jurisdiction,
    selectedPackage: partner.selectedPackage,
    workspaceStatus: partner.workspaceStatus,
    completionPercentage: partner.completionPercentage,
    provisioningStatus: partner.provisioningStatus,
    owner: partner.owner,
    dueDate: partner.dueDate,
    onboardingHref: `/internal/partners/onboarding/${encodeURIComponent(partner.partnerSlug)}`
  });

  return (
    <section className="mt-8" aria-labelledby="partner-access-heading">
      <Card className="rounded-md p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-grayWilma-600">
              Partner access status
            </p>
            <h2
              className="mt-2 text-2xl font-black text-navy"
              id="partner-access-heading"
            >
              {access.statusLabel}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-grayWilma-700">
              First-administrator access is fixed to this organization and the
              reviewed work email.
            </p>
          </div>
          <Badge tone={statusTone(access.accessStatus)}>
            {access.statusLabel}
          </Badge>
        </div>

        {!access.workspaceExists ? (
          <div className="mt-5 rounded-md border border-orange/30 bg-orange/10 p-4 text-sm text-orange">
            <p className="font-black">Onboarding workspace required</p>
            <p className="mt-1 leading-6">
              Create or locate the onboarding workspace and set its launch
              controls before administrator access is created.
            </p>
            <Link
              className="mt-3 inline-flex min-h-11 items-center font-black underline"
              href={`/internal/partners/onboarding/${encodeURIComponent(
                partner.partnerSlug
              )}`}
            >
              Open partner onboarding workspace
            </Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Detail label="Organization" value={partner.publicName} />
          <Detail label="Role" value="Partner Administrator" />
          <Detail
            label="Full name"
            value={
              access.administrator?.fullName ??
              invitation?.fullName ??
              "Not configured"
            }
          />
          <Detail
            label="Work email"
            value={
              access.administrator?.email ??
              invitation?.email ??
              "Not configured"
            }
          />
          <Detail
            label="Expiration"
            value={
              invitation ? formatDateTime(invitation.expiresAt) : "Not applicable"
            }
          />
          <Detail label="Administrator access" value={presentation.access.label} description={presentation.access.description} />
          <Detail label="Auth account" value={presentation.account} />
          <Detail label="Tenant membership" value={presentation.membership} />
          <Detail label="Program configuration" value={presentation.configuration.label} description={presentation.configuration.description} />
          <Detail label="Publication" value={presentation.publication.label} description={presentation.publication.description} />
          <Detail label="Program activation" value={presentation.activation.label} description={presentation.activation.description} />
          <Detail label="Current next action" value={presentation.nextAction} />
          <Detail label="Owner" value={presentation.owner} />
          <Detail label="Due date" value={presentation.dueDate} />
        </div>

        {presentation.missingInformation.length > 0 ? (
          <div className="mt-5 border-l-4 border-orange bg-[#F7F4EE] p-4">
            <p className="font-black text-navy">Information still required</p>
            <ul className="mt-2 grid gap-2 text-sm leading-6 text-grayWilma-700">
              {presentation.missingInformation.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}

        {access.accessStatus === "administrator_active" && presentation.configuration.label !== "Approved" ? (
          <Link data-primary-action="true" className={`${primaryButton} mt-6`} href={presentation.primaryAction.href}>
            {presentation.primaryAction.label}
          </Link>
        ) : null}

        {message ? (
          <p
            className="mt-5 rounded-md border border-teal/25 bg-teal/10 px-4 py-3 text-sm font-semibold text-teal"
            role="status"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-5 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {setupLink ? (
          <div className="mt-5 rounded-md border border-teal/25 bg-[#F2FBF7] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-teal"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="font-black text-navy">Secure setup link ready</p>
                <p className="mt-1 text-sm leading-6 text-grayWilma-700">
                  Copy this link now. It is not stored in readable form and
                  disappears when you leave this page.
                </p>
                <input
                  aria-label="Secure setup link"
                  className="mt-3 min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 text-sm text-grayWilma-700"
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  value={setupLink}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={primaryButton}
                    onClick={copySetupLink}
                    type="button"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy secure setup link
                  </button>
                  {access.emailDeliveryConfigured ? (
                    <button
                      className={secondaryButton}
                      disabled={Boolean(busyAction)}
                      onClick={sendInvitation}
                      type="button"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {busyAction === "send" ? "Sending…" : "Send invitation"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {mode === "form" ? (
          <form className="mt-6 grid gap-4" onSubmit={review}>
            <h3 className="text-lg font-black text-navy">
              Create administrator access
            </h3>
            <label className="grid gap-1.5">
              <span className="text-sm font-black text-navy">Full name</span>
              <input
                autoComplete="name"
                className={inputClass}
                maxLength={120}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    fullName: event.target.value
                  }))
                }
                required
                value={values.fullName}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-black text-navy">Work email</span>
              <input
                autoComplete="email"
                className={inputClass}
                maxLength={254}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                required
                type="email"
                value={values.email}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className={primaryButton} type="submit">
                Review administrator access
              </button>
              <button
                className={secondaryButton}
                onClick={() => setMode("idle")}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {mode === "review" ? (
          <div
            className="mt-6 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4 md:p-5"
            role="group"
            aria-labelledby="administrator-review-heading"
          >
            <h3
              className="text-lg font-black text-navy"
              id="administrator-review-heading"
            >
              Review administrator access
            </h3>
            <p className="mt-2 text-sm leading-6 text-grayWilma-700">
              Confirm every detail before creating the secure invitation.
            </p>
            <dl className="mt-4 grid gap-3 md:grid-cols-2">
              <Review label="Organization" value={partner.publicName} />
              <Review label="Full name" value={values.fullName} />
              <Review label="Work email" value={values.email} />
              <Review label="Role" value="Partner Administrator" />
              <Review label="Expiration" value={`${expirationHours} hours`} />
              <Review
                label="Post-acceptance destination"
                value={
                  onboardingEnabled
                    ? "Partner onboarding while setup is incomplete; otherwise partner dashboard"
                    : "Partner dashboard"
                }
              />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className={primaryButton}
                disabled={Boolean(busyAction)}
                onClick={createInvitation}
                type="button"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {busyAction
                  ? "Creating…"
                  : replaceCurrent
                    ? "Confirm and replace invitation"
                    : "Confirm and create invitation"}
              </button>
              <button
                className={secondaryButton}
                disabled={Boolean(busyAction)}
                onClick={() => setMode("form")}
                type="button"
              >
                Edit details
              </button>
            </div>
          </div>
        ) : null}

        {mode === "idle" ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {canCreate ? (
              <button
                className={primaryButton}
                onClick={() => openForm(false)}
                type="button"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create administrator invitation
              </button>
            ) : null}
            {canReplace ? (
              <button
                className={secondaryButton}
                onClick={() => openForm(true)}
                type="button"
              >
                Resend / replace invitation
              </button>
            ) : null}
            {canRevoke ? (
              <button
                className={dangerButton}
                disabled={Boolean(busyAction)}
                onClick={revokeInvitation}
                type="button"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {busyAction === "revoke" ? "Revoking…" : "Revoke invitation"}
              </button>
            ) : null}
            <Link className={secondaryButton} href="/partner/dashboard">
              Open partner dashboard
            </Link>
          </div>
        ) : null}

        <details className="mt-6 border-t border-grayWilma-200 pt-5">
          <summary className="cursor-pointer text-sm font-black text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            View invitation history
          </summary>
          {access.history.length > 0 ? (
            <ol className="mt-4 grid gap-3">
              {access.history.map((item) => (
                <li
                  className="rounded-md bg-[#f7f8f6] px-4 py-3 text-sm"
                  key={item.id}
                >
                  <p className="font-black text-navy">{item.label}</p>
                  <p className="mt-1 text-grayWilma-700">
                    {formatDateTime(item.occurredAt)}
                    {item.status ? ` · ${statusLabel(item.status)}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-grayWilma-700">
              No administrator invitation activity yet.
            </p>
          )}
        </details>
      </Card>
    </section>
  );
}

function Detail({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-grayWilma-600">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-navy">{value}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-grayWilma-600">{description}</p> : null}
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase tracking-wide text-grayWilma-600">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-navy">{value}</dd>
    </div>
  );
}

function statusTone(
  status: FirstAdminAccessView["accessStatus"]
): "teal" | "blue" | "orange" | "neutral" {
  if (status === "administrator_active") return "teal";
  if (status === "invitation_pending") return "blue";
  if (
    status === "invitation_expired" ||
    status === "access_needs_attention"
  ) {
    return "orange";
  }
  return "neutral";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    claiming: "Account setup in progress",
    claimed: "Account setup in progress",
    accepting: "Membership setup in progress",
    accepted: "Accepted",
    expired: "Expired",
    revoked: "Revoked",
    superseded: "Replaced",
    sent: "Sent",
    failed: "Delivery failed",
    requested: "Delivery requested"
  };
  return labels[status] ?? "Status recorded";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

const inputClass =
  "min-h-11 rounded-md border border-grayWilma-200 bg-white px-3 text-sm text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25";
const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const dangerButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-orange/40 bg-white px-4 py-2 text-sm font-semibold text-orange transition hover:bg-orange/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
