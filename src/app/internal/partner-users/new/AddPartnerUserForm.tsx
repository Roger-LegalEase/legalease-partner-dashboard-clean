"use client";

import { FormEvent, useState } from "react";

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
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function AddPartnerUserForm({ partners }: AddPartnerUserFormProps) {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });

    const formData = new FormData(event.currentTarget);
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
      const result = (await response.json()) as { ok?: boolean; status?: string; error?: string };

      if (!response.ok || !result.ok) {
        setState({ kind: "error", message: result.error ?? "Unable to add the partner user." });
        return;
      }

      const message =
        result.status === "invited_and_mapped"
          ? "Partner user invitation created."
          : result.status === "already_mapped"
            ? "That user already has the requested partner access."
            : result.status === "existing_user_mapped" || result.status === "mapped_existing_user"
              ? "Existing user was granted partner access."
              : "Partner user invitation created.";

      setState({ kind: "success", message });
      event.currentTarget.reset();
    } catch {
      setState({ kind: "error", message: "Unable to add the partner user right now." });
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
        <div className="rounded-md border border-teal/25 bg-teal/10 px-4 py-3 text-sm font-semibold text-teal">{state.message}</div>
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
