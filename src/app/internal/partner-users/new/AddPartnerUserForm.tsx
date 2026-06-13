"use client";

import { FormEvent, useRef, useState } from "react";

type PartnerOption = {
  partnerSlug: string;
  label: string;
};

type AddPartnerUserFormProps = {
  partners: PartnerOption[];
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string; email: string; partnerSlug: string; role: string }
  | { kind: "error"; message: string };

type InviteResponse = {
  ok?: boolean;
  outcome?: string;
  message?: string;
  email?: string;
  partnerSlug?: string;
  role?: string;
};

const successfulInviteStatuses = new Set([
  "invited_and_mapped",
  "already_mapped",
  "existing_user_mapped",
  "mapped_existing_user"
]);

export function AddPartnerUserForm({ partners }: AddPartnerUserFormProps) {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const isSubmittingRef = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }

    const form = event.currentTarget;
    isSubmittingRef.current = true;
    setState({ kind: "submitting" });

    const formData = new FormData(form);
    const payload = {
      partnerSlug: String(formData.get("partnerSlug") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
      name: String(formData.get("name") ?? "")
    };

    try {
      const response = await fetch("/internal/partner-users/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readInviteResponse(response);
      const isSuccess = response.ok && (result.ok === true || isSuccessfulInviteStatus(result.outcome));

      if (!isSuccess) {
        setState({ kind: "error", message: safeInviteErrorMessage(response.status, result) });
        return;
      }

      setState({
        kind: "success",
        message: result.message ?? successMessage(result.outcome),
        email: result.email ?? payload.email,
        partnerSlug: result.partnerSlug ?? payload.partnerSlug,
        role: result.role ?? payload.role
      });
      form.reset();
    } catch {
      setState({ kind: "error", message: "Unable to add the partner user right now." });
    } finally {
      isSubmittingRef.current = false;
    }
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <label className="grid gap-1.5">
        <span className="text-sm font-black text-navy">Partner</span>
        <select
          className="min-h-11 rounded-md border border-grayWilma-200 bg-white px-3 text-sm font-semibold text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
          name="partnerSlug"
          required
        >
          <option value="">Choose a partner</option>
          {partners.map((partner) => (
            <option key={partner.partnerSlug} value={partner.partnerSlug}>
              {partner.label} ({partner.partnerSlug})
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-black text-navy">Contact email</span>
        <input
          autoComplete="email"
          className="min-h-11 rounded-md border border-grayWilma-200 bg-white px-3 text-sm text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-black text-navy">Name / label</span>
        <input
          autoComplete="name"
          className="min-h-11 rounded-md border border-grayWilma-200 bg-white px-3 text-sm text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
          maxLength={120}
          name="name"
          type="text"
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-black text-navy">Role</legend>
        <label className="flex items-center gap-2 rounded-md border border-grayWilma-200 bg-white px-3 py-3 text-sm font-semibold text-navy">
          <input name="role" required type="radio" value="partner_admin" />
          Partner admin
        </label>
        <label className="flex items-center gap-2 rounded-md border border-grayWilma-200 bg-white px-3 py-3 text-sm font-semibold text-navy">
          <input name="role" required type="radio" value="partner_staff" />
          Partner staff
        </label>
      </fieldset>

      {state.kind === "success" ? (
        <div className="rounded-md border border-teal/25 bg-teal/10 px-4 py-4 text-sm text-teal">
          <p className="font-black">Status: Invitation created</p>
          <dl className="mt-3 grid gap-2 text-grayWilma-800">
            <div className="grid gap-0.5">
              <dt className="text-xs font-black uppercase text-grayWilma-600">Email</dt>
              <dd className="font-semibold">{state.email}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs font-black uppercase text-grayWilma-600">Partner</dt>
              <dd className="font-semibold">{state.partnerSlug}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs font-black uppercase text-grayWilma-600">Role</dt>
              <dd className="font-semibold">{formatRole(state.role)}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs font-black uppercase text-grayWilma-600">Next step</dt>
              <dd className="font-semibold">Ask the user to check their inbox and set their password.</dd>
            </div>
          </dl>
          <p className="sr-only">{state.message}</p>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">{state.message}</div>
      ) : null}

      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid disabled:cursor-not-allowed disabled:opacity-60"
        disabled={state.kind === "submitting" || partners.length === 0}
        type="submit"
      >
        {state.kind === "submitting" ? "Adding partner user..." : "Send invite and create access"}
      </button>
    </form>
  );
}

async function readInviteResponse(response: Response): Promise<InviteResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return (await response.json()) as InviteResponse;
  } catch {
    return {};
  }
}

function isSuccessfulInviteStatus(status: string | undefined) {
  return Boolean(status && successfulInviteStatuses.has(status));
}

function safeInviteErrorMessage(status: number, result: InviteResponse) {
  if (result.message) {
    return result.message;
  }

  if (status === 401) {
    return "Sign in with an internal admin account and try again.";
  }

  if (status === 403) {
    return "Internal admin access is required to add partner users.";
  }

  return "Unable to add the partner user.";
}

function successMessage(outcome: string | undefined) {
  if (outcome === "already_mapped") {
    return "That user already has the requested partner access.";
  }

  if (outcome === "existing_user_mapped" || outcome === "mapped_existing_user") {
    return "Existing user was granted partner access.";
  }

  return "Partner user invitation created.";
}

function formatRole(role: string) {
  if (role === "partner_admin") {
    return "Partner admin";
  }

  if (role === "partner_staff") {
    return "Partner staff";
  }

  return role;
}
