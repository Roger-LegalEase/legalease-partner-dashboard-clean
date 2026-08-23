# RCAP internal-admin production account remediation

Status: prepared only. Do not execute as part of the code hardening PR. This runbook preserves both Auth users, never changes either email, and never deletes historical authorization or audit records.

Intended transition:

- Grant or confirm: `roger@legalease.com`
- Revoke internal access: `roman.roger@gmail.com`

Supabase global sign-out requires a valid logged-in JWT; global scope removes affected refresh-token sessions, while already-issued access JWTs remain valid until expiry. The application closes that JWT window for internal operations because every request rechecks the now-disabled UUID membership. See the official [Supabase sign-out reference](https://supabase.com/docs/reference/javascript/auth-signout) and [user sessions guide](https://supabase.com/docs/guides/auth/sessions).

## Guardrails

- Obtain a production-change approval and name a second reviewer.
- Use a secure incident workstation and a production-specific shell with history disabled.
- Never paste a service-role key or user access token into a command argument, ticket, chat, or receipt.
- Supply secrets only through the approved secret-injection mechanism. The remediation tool reads `SUPABASE_SERVICE_ROLE_KEY` and, during revoke only, `RCAP_PERSONAL_ACCOUNT_ACCESS_TOKEN` from the environment and never prints them.
- Store receipts in the incident evidence vault; do not commit them. In apply mode the tool reserves
  the receipt before its first mutation and records `completed` or `failed` without tokens or secrets.
- Do not delete either Auth user, merge identities, or update either email.
- Do not continue if either email is ambiguous, both resolve to one UUID, the corporate email is unverified, the corporate UUID has partner-scoped membership, or the planned result has no recovery administrator.

## 1. Read-only exact identity audit

Run both commands without `--redact` only in the secure incident terminal so the exact UUIDs can be recorded. The commands are read-only.

```bash
node scripts/security/audit-internal-admin-access.mjs --email roger@legalease.com --json
node scripts/security/audit-internal-admin-access.mjs --email roman.roger@gmail.com --json
```

Record:

- `CORPORATE_UUID` from the exact corporate Auth match;
- `PERSONAL_UUID` from the exact Gmail Auth match;
- confirmation that the UUIDs differ;
- corporate `emailVerified: true`;
- canonical active/disabled rows, partner memberships, metadata claims, legacy allowlist matches, and recent exact-actor events for each.

Stop if either match count is not exactly one. Do not substitute a similar address.

## 2. Grant/confirm the corporate UUID — dry run

Substitute the two audited UUIDs exactly:

```bash
node scripts/security/remediate-internal-admin-accounts.mjs \
  --mode grant \
  --corporate-email roger@legalease.com \
  --personal-email roman.roger@gmail.com \
  --expected-corporate-uuid <CORPORATE_UUID> \
  --expected-personal-uuid <PERSONAL_UUID>
```

The dry run must show only a corporate `partner_users` insert/reactivation or confirmation and at least one recovery administrator afterward. If the corporate UUID has a partner-scoped membership, stop; the tool refuses to destroy tenant identity.

After the two reviewers match the plan to the audit evidence, repeat with `--apply` and an approved secure receipt path:

```bash
node scripts/security/remediate-internal-admin-accounts.mjs \
  --mode grant \
  --corporate-email roger@legalease.com \
  --personal-email roman.roger@gmail.com \
  --expected-corporate-uuid <CORPORATE_UUID> \
  --expected-personal-uuid <PERSONAL_UUID> \
  --receipt <SECURE_EVIDENCE_PATH>/corporate-grant.json \
  --apply
```

## 3. Verify corporate access before revocation

In a clean browser profile:

1. Sign in as `roger@legalease.com`.
2. Open `/internal/partners/provisioning`.
3. Confirm the shell shows the exact corporate email and `internal_admin`.
4. Perform a read-only page load only; do not invite, publish, activate, or change a commercial gate.
5. Confirm a direct read-only internal API call succeeds with that browser session.
6. Sign out and confirm the internal URL requires a new session.

Record the acceptance evidence without tokens, cookies, customer details, or participant data. Do not proceed if any identity text is unexpected.

## 4. Prepare supported global session revocation

The installed Admin SDK's supported global sign-out call requires a valid access JWT for the target Gmail user. Obtain a short-lived current JWT through the approved incident procedure while the Gmail account holder is authenticated; inject it as `RCAP_PERSONAL_ACCOUNT_ACCESS_TOKEN`. Do not display or persist the token. The tool decodes only the local payload to require `sub = PERSONAL_UUID` and an unexpired `exp`, then passes it to `auth.admin.signOut(jwt, "global")`.

If a secure target-user JWT cannot be obtained, stop. Do not delete the Auth user, change its password/email, manipulate Supabase-managed Auth tables directly, or claim session revocation succeeded. Disabling the canonical role still blocks internal operations immediately, but the session-revocation requirement remains open.

## 5. Revoke the personal UUID — dry run

```bash
node scripts/security/remediate-internal-admin-accounts.mjs \
  --mode revoke \
  --corporate-email roger@legalease.com \
  --personal-email roman.roger@gmail.com \
  --expected-corporate-uuid <CORPORATE_UUID> \
  --expected-personal-uuid <PERSONAL_UUID>
```

The plan must:

- preserve both Auth users and emails;
- set the Gmail UUID's internal-admin membership to disabled rather than delete it;
- set any active legacy `content_admin_users` row for the Gmail UUID to disabled rather than delete it;
- neutralize only Auth metadata keys that contain an internal-admin claim;
- refuse any remaining legacy environment email allowlist match;
- preserve partner/audit history;
- globally revoke the Gmail user's refresh-token sessions;
- leave the verified corporate UUID as an active recovery administrator.

## 6. Apply personal revocation

Only after step 3 evidence is approved and the target access token is injected:

```bash
node scripts/security/remediate-internal-admin-accounts.mjs \
  --mode revoke \
  --corporate-email roger@legalease.com \
  --personal-email roman.roger@gmail.com \
  --expected-corporate-uuid <CORPORATE_UUID> \
  --expected-personal-uuid <PERSONAL_UUID> \
  --confirm-corporate-access \
  --receipt <SECURE_EVIDENCE_PATH>/personal-revocation.json \
  --apply
```

Remove `RCAP_PERSONAL_ACCOUNT_ACCESS_TOKEN` from the process environment immediately after the command. Preserve the receipt securely and do not commit it.

## 7. Post-change verification

Re-run the exact read-only audits. Require:

- corporate UUID: exactly one active canonical internal-admin record;
- Gmail UUID: zero active internal-admin records and a preserved disabled record;
- Gmail UUID: zero active legacy content-role records and preserved disabled content-role history;
- neither user was deleted and neither email changed;
- no internal/admin metadata claim remains on the Gmail user;
- no legacy allowlist exact match remains;
- the corporate account can load the console;
- the Gmail account receives the server-rendered access-denied state/403 and no partner data in page, RSC, or API payloads;
- the Gmail session cannot refresh after global sign-out;
- the corporate account remains authorized after a new sign-in.

Because Supabase access JWTs are stateless until `exp`, record the JWT-expiry setting and the time by which all pre-revocation JWTs expire. The disabled UUID membership denies internal pages, APIs, RLS, and trusted service boundaries during that window.

## Rollback

If the corporate account fails after personal revocation, do not change emails or delete users. With incident approval, re-run the grant phase for a separately verified recovery administrator UUID or reactivate the preserved Gmail membership row temporarily, record a new receipt, and investigate. Session revocation is intentionally not reversible; the user can authenticate again only after authorization is deliberately restored.
