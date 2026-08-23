import { CheckCircle2, PlugZap, XCircle } from "lucide-react";

import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { EmptyState, Panel, Pill, humanize } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { isContentStorageConfigured, listRoleAssignments } from "@/lib/content/cms-queries";
import {
  SIGNATURE_TOLERANCE_SECONDS,
  getCommandCenterConfig
} from "@/lib/content/command-center";
import { CONTENT_CAPABILITIES, CONTENT_ROLES, ROLE_CAPABILITIES } from "@/lib/content/types";

export const dynamic = "force-dynamic";

const ROLE_BLURBS: Record<string, string> = {
  primary_admin: "Everything, including role management.",
  editor: "Writes, edits anything, approves editorially, publishes and schedules. Cannot give legal approval.",
  legal_reviewer: "Reads everything, gives (or withholds) legal approval. Cannot publish.",
  social_manager: "Drafts, approves, and sends promotion. Cannot edit articles.",
  contributor: "Writes and edits their own drafts, submits for review. Cannot approve or publish.",
  partner_contributor: "Their own organization's drafts only — scoped by row level security, not by the UI.",
  viewer: "Read-only."
};

export default async function ContentSettingsPage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/settings");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const assignments = await listRoleAssignments();
  const commandCenter = getCommandCenterConfig();
  const configured = isContentStorageConfigured();

  const envRows = [
    {
      name: "COMMAND_CENTER_CONTENT_EVENTS_ENABLED",
      set: process.env.COMMAND_CENTER_CONTENT_EVENTS_ENABLED?.trim().toLowerCase() === "true"
    },
    {
      name: "COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT",
      set: Boolean(process.env.COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT?.trim())
    },
    {
      name: "COMMAND_CENTER_CONTENT_SIGNING_SECRET",
      set: Boolean(process.env.COMMAND_CENTER_CONTENT_SIGNING_SECRET?.trim())
    }
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-navy">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          You are signed in as <strong>{humanize(access.session.role)}</strong>.
        </p>
      </header>

      <Panel
        title="Command Center connection"
        description="LegalEase owns content and approval. The Command Center owns connected accounts and posting."
      >
        {commandCenter.configured ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-emerald-800">Connected</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Promotion packages are signed with HMAC-SHA256 and delivered to the configured
                endpoint. The timestamp is inside the signed material, and the receiver rejects a
                signature older than {SIGNATURE_TOLERANCE_SECONDS} seconds — which is what makes a
                captured request impossible to replay.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-slate-300 bg-slate-50 px-4 py-3">
            <PlugZap className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-700">Not connected</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Reason: <code>{commandCenter.reason}</code>. Sending is disabled everywhere in the CMS
                and no part of the UI will report a send as successful. Promotion JSON export still
                works.
              </p>
            </div>
          </div>
        )}

        <ul className="mt-4 space-y-1">
          {envRows.map((row) => (
            <li key={row.name} className="flex items-center gap-2">
              {row.set ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />
              )}
              <code className="text-xs text-slate-700">{row.name}</code>
              <span className="text-[11px] font-bold uppercase text-slate-500">
                {row.set ? "set" : "not set"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-4 text-slate-500">
          Values are never displayed — only whether they are present.
        </p>
      </Panel>

      <Panel
        title="Content storage"
        description="Supabase backs every read and write in the CMS."
      >
        <div className="flex items-center gap-2">
          {configured ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <XCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          )}
          <p className="text-sm font-semibold text-slate-700">
            {configured
              ? "Configured. Reads and writes are live."
              : "Not configured in this environment. Every list in the CMS is empty because nothing can be read, and writes will fail rather than appear to succeed."}
          </p>
        </div>
      </Panel>

      <Panel
        title="Historical role assignments"
        description="These rows are retained for workflow history and audit context. They do not grant internal access; only an active global internal-admin membership does."
      >
        {assignments.length === 0 ? (
          <EmptyState
            message="No historical content role assignments."
            hint={
              configured
                ? "Only active global internal admins have content access."
                : "Content storage is not configured in this environment."
            }
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {assignments.map((assignment) => (
              <li key={assignment.authUserId} className="flex flex-wrap items-center gap-3 py-2">
                <span className="text-sm font-bold text-navy">
                  {assignment.displayName ?? assignment.authUserId}
                </span>
                <Pill tone="neutral">{humanize(assignment.role)}</Pill>
                {assignment.partnerSlug && (
                  <span className="font-mono text-[11px] text-slate-500">{assignment.partnerSlug}</span>
                )}
                <Pill tone={assignment.status === "active" ? "ok" : "block"}>{assignment.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Content workflow vocabulary"
        description="This historical capability matrix describes workflow semantics. It is not an authorization source; authorized internal admins operate as primary admins."
      >
        <div className="space-y-4">
          {CONTENT_ROLES.map((role) => (
            <div key={role} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-navy">{humanize(role)}</p>
                {role === access.session.role && <Pill tone="ok">You</Pill>}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{ROLE_BLURBS[role]}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {CONTENT_CAPABILITIES.map((capability) => {
                  const granted = ROLE_CAPABILITIES[role].includes(capability);
                  return (
                    <span
                      key={capability}
                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                        granted
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-400 line-through"
                      }`}
                    >
                      {capability}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
