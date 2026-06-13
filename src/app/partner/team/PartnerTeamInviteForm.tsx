"use client";

import { FormEvent, useRef, useState } from "react";

type PartnerTeamInviteFormProps = {
  partnerSlug: string;
  partnerName: string;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string; email: string; partnerSlug: string; role: "partner_staff" }
  | { kind: "error"; message: string };

type InviteResponse = {
  ok?: boolean;
  outcome?: string;
  message?: string;
  email?: string;
  partnerSlug?: string;
  role?: string;
};

export function PartnerTeamInviteForm({ partnerSlug, partnerName }: PartnerTeamInviteFormProps) {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const isSubmittingRef = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? "")
    };

    isSubmittingRef.current = true;
    setState({ kind: "submitting" });

    try {
      const response = await fetch("/partner/team/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readInviteResponse(response);
      const isSuccess = response.ok && result.ok === true;

      if (isSuccess) {
        setState({
          kind: "success",
          message: result.message ?? successMessage(result.outcome),
          email: result.email ?? payload.email,
          partnerSlug: result.partnerSlug ?? partnerSlug,
          role: "partner_staff"
        });
        safelyResetForm(form);
        return;
      }

      setState({ kind: "error", message: safeInviteErrorMessage(response.status, result) });
    } catch {
      setState({ kind: "error", message: "Unable to invite partner staff right now." });
    } finally {
      isSubmittingRef.current = false;
    }
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <div className="grid gap-1.5">
        <span className="text-sm font-black text-navy">Partner</span>
        <div className="min-h-11 rounded-md border border-grayWilma-200 bg-grayWilma-100 px-3 py-3 text-sm font-semibold text-grayWilma-700">
          {partnerName}
        </div>
      </div>

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

      <div className="grid gap-1.5">
        <span className="text-sm font-black text-navy">Role</span>
        <div className="min-h-11 rounded-md border border-grayWilma-200 bg-grayWilma-100 px-3 py-3 text-sm font-semibold text-grayWilma-700">
          Partner staff
        </div>
      </div>

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
              <dd className="font-semibold">Partner staff</dd>
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
        disabled={state.kind === "submitting"}
        type="submit"
      >
        {state.kind === "submitting" ? "Sending invite..." : "Send partner staff invite"}
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

function safeInviteErrorMessage(status: number, result: InviteResponse) {
  if (result.message) {
    return result.message;
  }

  if (status === 401) {
    return "Sign in with a partner admin account and try again.";
  }

  if (status === 403) {
    return "Partner admin access is required to invite staff.";
  }

  if (status === 429) {
    return "Too many invite attempts. Please try again later.";
  }

  return "Unable to invite partner staff.";
}

function successMessage(outcome: string | undefined) {
  if (outcome === "already_mapped") {
    return "That user already has partner staff access.";
  }

  if (outcome === "existing_user_mapped" || outcome === "mapped_existing_user") {
    return "Existing user was granted partner staff access.";
  }

  return "Partner staff invitation created.";
}

function safelyResetForm(form: HTMLFormElement) {
  try {
    form.reset();
  } catch {
    // Reset is cosmetic; success state is the source of truth.
  }
}
