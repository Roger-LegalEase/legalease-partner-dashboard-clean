import assert from "node:assert/strict";
import { File } from "node:buffer";
import crypto from "node:crypto";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const servicePath = path.join(
  rootDir,
  "src/lib/partners/onboarding/service.ts"
);
const assetsPath = path.join(
  rootDir,
  "src/lib/partners/onboarding/assets.ts"
);
const storagePath = path.join(
  rootDir,
  "src/lib/partners/onboarding/storage.ts"
);
const migrationPath = path.join(
  rootDir,
  "supabase/phase-43-rcap-partner-onboarding-phase1.sql"
);
const saveOrderPath = path.join(
  rootDir,
  "src/lib/partners/onboarding/client-save-order.ts"
);

const ids = {
  partner: "11111111-1111-4111-8111-111111111111",
  workspace: "22222222-2222-4222-8222-222222222222",
  actor: "33333333-3333-4333-8333-333333333333",
  programContact: "44444444-4444-4444-8444-444444444444",
  escalationContact: "55555555-5555-4555-8555-555555555555",
  plannedAdmin: "66666666-6666-4666-8666-666666666666",
  recipient: "77777777-7777-4777-8777-777777777777",
  asset: "88888888-8888-4888-8888-888888888888",
  request: "99999999-9999-4999-8999-999999999999"
};

const partnerContext = {
  authUserId: ids.actor,
  workEmail: "authenticated.admin@example.org",
  partnerSlug: "server-partner",
  role: "partner_admin"
};

const tests = [];
let networkAttempts = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  networkAttempts += 1;
  throw new Error("Network access is disabled in the onboarding service verifier.");
};

function test(name, run) {
  tests.push({ name, run });
}

test("portal reads are scoped only by the server context partner", async () => {
  const harness = createServiceHarness();
  const portal = await harness.service.getPartnerOnboardingPortal(
    partnerContext
  );

  assert.equal(portal.workspace.partnerSlug, partnerContext.partnerSlug);
  const workspaceScope = harness.requestLog.find(
    (query) => query.table === "partner_onboarding_workspace_safe"
  );
  assert.ok(workspaceScope);
  assert.deepEqual(
    workspaceScope.filters.find((filter) => filter.column === "partner_slug"),
    {
      kind: "eq",
      column: "partner_slug",
      value: partnerContext.partnerSlug
    }
  );
  const entitlementScope = harness.requestLog.find(
    (query) => query.table === "partner_entitlement"
  );
  assert.equal(
    entitlementScope.filters.find(
      (filter) => filter.column === "partner_slug"
    ).value,
    partnerContext.partnerSlug
  );
  assert.equal(
    JSON.stringify(harness.requestLog).includes("payload-partner"),
    false
  );
  assert.equal(portal.recordShieldInScope, true);
  assert.equal(portal.recordShieldScopeSource, "selected_partner_package");
});

test("RecordShield scope fails closed without an authoritative selected package", async () => {
  const harness = createServiceHarness({ selectedPackageId: null });
  const portal = await harness.service.getPartnerOnboardingPortal(
    partnerContext
  );

  assert.equal(portal.recordShieldInScope, false);
  assert.equal(portal.recordShieldScopeSource, "unavailable");
});

test("portal exposes only partner-safe implementation lifecycle fields", async () => {
  const harness = createServiceHarness({
    packageData: completePackage(),
    workspace: {
      commercial_gate_changed_at: "2026-07-27T10:00:00.000Z",
      submitted_at: "2026-07-28T12:00:00.000Z",
      internal_approved_at: null,
      last_meaningful_activity_at: "2026-07-28T12:00:00.000Z"
    }
  });
  const portal = await harness.service.getPartnerOnboardingPortal(partnerContext);

  assert.equal(
    portal.workspace.commercialGateChangedAt,
    "2026-07-27T10:00:00.000Z"
  );
  assert.equal(
    portal.workspace.lastMeaningfulActivityAt,
    "2026-07-28T12:00:00.000Z"
  );
  assert.equal(portal.teamMembers.length, 1);
  assert.deepEqual(
    {
      trainingStatus: portal.teamMembers[0].trainingStatus,
      invitationStatus: portal.teamMembers[0].invitationStatus,
      membershipStatus: portal.teamMembers[0].membershipStatus
    },
    {
      trainingStatus: "not_started",
      invitationStatus: "planned",
      membershipStatus: "planned"
    }
  );
  assert.equal(portal.sections[0].updatedAt, "2026-07-28T00:00:00.000Z");
});

test("partner staff cannot save onboarding data", async () => {
  const harness = createServiceHarness();
  const error = await expectCode(
    () =>
      harness.service.savePartnerOnboardingSection(
        { ...partnerContext, role: "partner_staff" },
        draftSaveInput()
      ),
    "forbidden"
  );
  assert.equal(
    harness.requestLog.length,
    0,
    "Role denial must occur before loading partner data."
  );
  assert.match(error.message, /administrator/i);
});

test("the authoritative commercial gate blocks edits", async () => {
  const harness = createServiceHarness({
    workspace: {
      status: "commercially_blocked",
      commercial_gate_status: "blocked"
    }
  });
  await expectCode(
    () =>
      harness.service.savePartnerOnboardingSection(
        partnerContext,
        draftSaveInput()
      ),
    "commercially_blocked"
  );
  assert.equal(harness.rpcLog.length, 0);
});

test("draft save accepts incomplete safe data and separates normalized collections", async () => {
  const harness = createServiceHarness();
  const result = await harness.service.savePartnerOnboardingSection(
    partnerContext,
    draftSaveInput()
  );

  assert.equal(result.section.data.public_organization_name, "Community Partner");
  assert.equal(
    result.section.data.contacts[0].work_email,
    "person@example.org"
  );
  assert.equal(harness.rpcLog.length, 1);
  const call = harness.rpcLog[0];
  assert.equal(call.name, "rcap_service_save_onboarding_section");
  assert.equal(call.params.p_partner_slug, partnerContext.partnerSlug);
  assert.equal(call.params.p_actor_user_id, partnerContext.authUserId);
  assert.equal(call.params.p_expected_workspace_version, 7);
  assert.deepEqual(call.params.p_response_data, {
    public_organization_name: "Community Partner"
  });
  assert.deepEqual(Object.keys(call.params.p_collections), ["contacts"]);
  assert.equal(
    call.params.p_collections.contacts[0].work_email,
    "person@example.org"
  );
  assert.equal("contacts" in call.params.p_response_data, false);
  assert.equal("completion_percentage" in call.params.p_response_data, false);
  assert.match(call.params.p_payload_hash, /^[0-9a-f]{64}$/);
  assert.equal(call.params.p_workspace_completion, result.completionPercentage);
  assert.ok(call.params.p_workspace_completion < 100);
  assertSensitiveOnlyIn(call.params, ["p_response_data", "p_collections"]);
});

test("section completion errors preserve normalized local values", async () => {
  const harness = createServiceHarness();
  const error = await expectCode(
    () =>
      harness.service.savePartnerOnboardingSection(partnerContext, {
        sectionKey: "organization_contacts",
        expectedRevision: 3,
        expectedWorkspaceVersion: 7,
        requestId: ids.request,
        mode: "section_complete",
        data: {
          public_organization_name: "  Preserved   Organization  "
        }
      }),
    "invalid_input"
  );

  assert.ok(Array.isArray(error.details.issues));
  assert.ok(error.details.issues.length > 0);
  assert.equal(
    error.details.normalizedData.public_organization_name,
    "Preserved Organization"
  );
  assert.equal(harness.rpcLog.length, 0);
});

test("partner change-response completion returns action ownership to LegalEase", async () => {
  const organizationSectionId =
    "10000000-0000-4000-8000-000000000001";
  const harness = createServiceHarness({
    packageData: completePackage(),
    includeLogo: true,
    defaultSectionStatus: "submitted",
    sectionStatuses: {
      organization_contacts: "needs_changes"
    },
    changeRequests: [
      {
        id: "aaaaaaaa-0000-4000-8000-000000000001",
        workspace_id: ids.workspace,
        section_id: organizationSectionId,
        status: "open",
        partner_safe_instructions: "Confirm the organization details.",
        requested_at: "2026-07-28T00:00:00.000Z"
      }
    ],
    workspace: {
      status: "waiting_on_partner",
      blocker_code: "partner_changes_requested",
      next_action_code: "address_change_request",
      next_action_owner: "partner"
    },
    rpcHandler: (name) => {
      assert.equal(name, "rcap_service_save_onboarding_section");
      return {
        data: [
          {
            section_revision: 4,
            section_status: "submitted",
            workspace_aggregate_version: 8,
            duplicate: false
          }
        ],
        error: null
      };
    }
  });
  const result = await harness.service.savePartnerOnboardingSection(
    partnerContext,
    {
      sectionKey: "organization_contacts",
      expectedRevision: 3,
      expectedWorkspaceVersion: 7,
      requestId: ids.request,
      mode: "section_complete",
      data: completePackage().organization_contacts
    }
  );

  assert.equal(result.section.changeRequestStatus, "partner_responded");
  assert.equal(result.nextActionCode, "await_legalease_review");
  assert.equal(result.nextActionOwner, "legalease");
  assert.equal(result.blockerCode, null);
  assert.equal(
    harness.rpcLog[0].params.p_expected_workspace_version,
    7
  );
});

test("a stale section or aggregate revision is rejected by the transactional RPC", async () => {
  const harness = createServiceHarness({
    rpcHandler: () => ({
      data: null,
      error: {
        code: "40001",
        message: "Onboarding workspace revision conflict"
      }
    })
  });
  const error = await expectCode(
    () =>
      harness.service.savePartnerOnboardingSection(partnerContext, {
        ...draftSaveInput(),
        expectedRevision: 2
      }),
    "revision_conflict"
  );

  assert.match(error.message, /newer saved information/i);
  assert.equal(harness.rpcLog.length, 1);
  assert.equal(harness.rpcLog[0].params.p_expected_revision, 2);
  assert.equal(harness.rpcLog[0].params.p_expected_workspace_version, 7);
});

test("an admin RPC error can never be reported as save success", async () => {
  const harness = createServiceHarness({
    rpcHandler: () => ({
      data: null,
      error: { code: "XX000", message: "synthetic persistence failure" }
    })
  });
  await expectCode(
    () =>
      harness.service.savePartnerOnboardingSection(
        partnerContext,
        draftSaveInput()
      ),
    "persistence_failed"
  );
  assert.equal(harness.rpcLog.length, 1);
});

test("an idempotent duplicate RPC result maps exactly once", async () => {
  const harness = createServiceHarness({
    rpcHandler: (name) => {
      assert.equal(name, "rcap_service_save_onboarding_section");
      return {
        data: [
          {
            section_revision: 4,
            section_status: "in_progress",
            workspace_aggregate_version: 8,
            duplicate: true
          }
        ],
        error: null
      };
    }
  });
  const result = await harness.service.savePartnerOnboardingSection(
    partnerContext,
    draftSaveInput()
  );

  assert.equal(result.duplicate, true);
  assert.equal(result.section.revision, 4);
  assert.equal(result.workspaceVersion, 8);
  assert.equal(harness.rpcLog.length, 1);
});

test("out-of-order confirmations never replace newer section state", () => {
  const saveOrder = loadTsModule(saveOrderPath, new Map(), {});
  const newer = saveOrder.decideConfirmedSectionSave({
    operationSequence: 2,
    latestAppliedSequence: 0,
    sentSerialized: '{"primary_goal":"newer"}',
    currentSerialized: '{"primary_goal":"newer"}'
  });
  assert.deepEqual(newer, {
    applyServerVersion: true,
    replaceLocalData: true
  });

  const older = saveOrder.decideConfirmedSectionSave({
    operationSequence: 1,
    latestAppliedSequence: 2,
    sentSerialized: '{"primary_goal":"older"}',
    currentSerialized: '{"primary_goal":"newer"}'
  });
  assert.deepEqual(older, {
    applyServerVersion: false,
    replaceLocalData: false
  });

  const locallyEdited = saveOrder.decideConfirmedSectionSave({
    operationSequence: 3,
    latestAppliedSequence: 2,
    sentSerialized: '{"primary_goal":"sent"}',
    currentSerialized: '{"primary_goal":"still editing"}'
  });
  assert.deepEqual(locallyEdited, {
    applyServerVersion: true,
    replaceLocalData: false
  });
});

test("final submission uses the authenticated actor and canonical schema", async () => {
  const harness = createServiceHarness({
    packageData: completePackage(),
    includeLogo: true,
    rpcHandler: (name) => {
      assert.equal(name, "rcap_service_submit_onboarding");
      return {
        data: [
          {
            workspace_aggregate_version: 8,
            submitted_at: "2026-07-28T12:00:00.000Z",
            duplicate: false
          }
        ],
        error: null
      };
    }
  });
  const result = await harness.service.submitPartnerOnboarding(
    partnerContext,
    {
      requestId: ids.request,
      expectedWorkspaceVersion: 7
    }
  );

  assert.equal(result.status, "ready_for_review");
  assert.equal(harness.rpcLog.length, 1);
  const call = harness.rpcLog[0];
  assert.equal(call.params.p_partner_slug, partnerContext.partnerSlug);
  assert.equal(call.params.p_actor_user_id, partnerContext.authUserId);
  assert.equal(call.params.p_actor_work_email, partnerContext.workEmail);
  assert.equal(
    call.params.p_schema_version,
    "rcap_partner_onboarding_phase_1_v1"
  );
  assert.equal("approver_user_id" in call.params.p_authorization, false);
  assert.equal("approver_work_email" in call.params.p_authorization, false);
  assert.equal("authorization_timestamp" in call.params.p_authorization, false);
  assertSensitiveOnlyIn(call.params, [
    "p_actor_work_email",
    "p_authorization"
  ]);
});

test("final submission requires complete validation and required assets", async () => {
  const withoutLogo = createServiceHarness({
    packageData: completePackage(),
    includeLogo: false
  });
  const assetError = await expectCode(
    () =>
      withoutLogo.service.submitPartnerOnboarding(partnerContext, {
        requestId: ids.request,
        expectedWorkspaceVersion: 7
      }),
    "invalid_input"
  );
  assert.ok(
    assetError.details.issues.some(
      (issue) => issue.code === "required_asset_missing"
    )
  );
  assert.equal(withoutLogo.rpcLog.length, 0);

  const incomplete = completePackage();
  delete incomplete.program_goals.primary_goal;
  const incompleteHarness = createServiceHarness({
    packageData: incomplete,
    includeLogo: true
  });
  const validationError = await expectCode(
    () =>
      incompleteHarness.service.submitPartnerOnboarding(partnerContext, {
        requestId: ids.request,
        expectedWorkspaceVersion: 7
      }),
    "invalid_input"
  );
  assert.ok(
    validationError.details.issues.some(
      (issue) =>
        issue.fieldKey === "primary_goal" &&
        issue.code === "missing_required"
    )
  );
  assert.equal(incompleteHarness.rpcLog.length, 0);
});

test("integration-event shape and non-persistence RPC parameters exclude PII", () => {
  const migration = read(migrationPath);
  const eventTable = sliceSqlObject(
    migration,
    "create table public.partner_onboarding_integration_events ("
  );
  for (const forbidden of [
    "name",
    "email",
    "phone",
    "object_path",
    "signed_url",
    "response_data"
  ]) {
    assert.equal(
      new RegExp(`\\b${forbidden}\\b`, "i").test(eventTable),
      false,
      `Integration event schema must not contain ${forbidden}.`
    );
  }
  assert.match(eventTable, /\bworkspace_aggregate_version\b/);
  assert.match(eventTable, /\bcompletion_percentage\b/);
  assert.match(eventTable, /\bblocker_code\b/);
  assert.match(eventTable, /\bnext_action_code\b/);
  assert.match(eventTable, /\bartifact_category\b/);
});

test("internal commercial review derives its summary server-side before the CAS RPC", async () => {
  const portalTables = buildPortalTables({
    workspace: {
      status: "commercially_blocked",
      commercial_gate_status: "blocked",
      blocker_code: "commercial_gate_blocked",
      next_action_code: "complete_commercial_requirements"
    }
  });
  const harness = createServiceHarness({
    adminTables: {
      partner_onboarding: portalTables.partner_onboarding_workspace_safe,
      partner_onboarding_sections:
        portalTables.partner_onboarding_sections,
      partner_onboarding_contacts:
        portalTables.partner_onboarding_contacts,
      partner_onboarding_planned_users:
        portalTables.partner_onboarding_planned_users,
      partner_onboarding_report_recipients:
        portalTables.partner_onboarding_report_recipients,
      partner_onboarding_change_requests: [],
      partner_onboarding_assets: [],
      partner_onboarding_agreements: [],
      partner_records: portalTables.partner_records,
      partner_entitlement: portalTables.partner_entitlement
    },
    rpcHandler: () => ({
      data: [
        {
          workspace_aggregate_version: 8,
          workspace_status: "setup_in_progress",
          duplicate: false
        }
      ],
      error: null
    })
  });

  await harness.service.applyInternalOnboardingReview(partnerContext, {
    workspaceId: ids.workspace,
    expectedWorkspaceVersion: 7,
    requestId: ids.request,
    operation: {
      action: "commercial_gate",
      outcome: "cleared_by_paid_invoice"
    }
  });

  const call = harness.rpcLog.at(-1);
  assert.equal(call.name, "rcap_service_review_onboarding");
  assert.deepEqual(call.params.p_operation.systemDerived, {
    completionPercentage: 0,
    blockerCode: "required_section_incomplete",
    nextActionCode: "complete_section",
    nextActionOwner: "partner"
  });
  assert.equal(call.params.p_expected_workspace_version, 7);
  assert.match(call.params.p_payload_hash, /^[0-9a-f]{64}$/);
});

test("asset upload uses the deterministic server-generated request object path", async () => {
  const harness = createAssetHarness();
  const result = await harness.assets.uploadPartnerOnboardingAsset(
    partnerContext,
    {
      category: "transparent_logo",
      file: pngFile(),
      requestId: ids.request,
      expectedWorkspaceVersion: 7
    }
  );
  const expectedPath =
    `partners/${ids.partner}/onboarding/${ids.workspace}/` +
    `transparent_logo/${ids.request}.png`;

  assert.equal(harness.uploads.length, 1);
  assert.equal(harness.uploads[0].objectPath, expectedPath);
  assert.equal(harness.rpcLog.length, 1);
  assert.equal(harness.rpcLog[0].params.p_object_path, expectedPath);
  assert.equal(harness.rpcLog[0].params.p_partner_slug, partnerContext.partnerSlug);
  assert.equal(
    harness.rpcLog[0].params.p_expected_workspace_version,
    7
  );
  assert.match(harness.rpcLog[0].params.p_payload_hash, /^[0-9a-f]{64}$/);
  assert.equal(result.asset.id, ids.request);
  assert.equal(result.duplicate, false);
  assertSensitiveOnlyIn(harness.rpcLog[0].params, [
    "p_object_path",
    "p_original_filename",
    "p_safe_filename"
  ]);
});

test("asset-derived state preserves a partner response as pending LegalEase review", async () => {
  const portal = {
    ...assetPortal(),
    data: completePackage(),
    sections: assetPortal().sections.map((section, index) => ({
      ...section,
      status: "submitted",
      changeRequestStatus:
        index === 0 ? "partner_responded" : null,
      changeRequestInstructions:
        index === 0 ? ["Updated section submitted for review."] : []
    }))
  };
  const harness = createAssetHarness({ portal });

  await harness.assets.uploadPartnerOnboardingAsset(partnerContext, {
    category: "transparent_logo",
    file: pngFile(),
    requestId: ids.request,
    expectedWorkspaceVersion: 7
  });

  assert.equal(
    harness.rpcLog[0].params.p_blocker_code,
    null
  );
  assert.equal(
    harness.rpcLog[0].params.p_next_action_code,
    "await_legalease_review"
  );
  assert.equal(
    harness.rpcLog[0].params.p_next_action_owner,
    "legalease"
  );
});

test("an upload request ID cannot be replayed with different asset bytes", async () => {
  const file = pngFile();
  const originalHash = crypto
    .createHash("sha256")
    .update(new Uint8Array(await file.arrayBuffer()))
    .digest("hex");
  const harness = createAssetHarness({
    priorAssets: [
      {
        id: ids.request,
        workspace_id: ids.workspace,
        category: "transparent_logo",
        original_filename: "original-logo.png",
        media_type: "image/png",
        byte_size: 24,
        width_pixels: 32,
        height_pixels: 32,
        sha256_hex: originalHash.replace(/^./, originalHash[0] === "0" ? "1" : "0"),
        lifecycle_status: "active",
        review_status: "approved",
        uploaded_at: "2026-07-28T00:00:00.000Z"
      }
    ]
  });

  await expectCode(
    () =>
      harness.assets.uploadPartnerOnboardingAsset(partnerContext, {
        category: "transparent_logo",
        file,
        requestId: ids.request,
        expectedWorkspaceVersion: 7
      }),
    "duplicate_request"
  );
  assert.equal(harness.uploads.length, 0);
  assert.equal(harness.deletes.length, 0);
  assert.equal(harness.rpcLog.length, 0);
});

test("SVG upload is rejected before storage or metadata mutation", async () => {
  const harness = createAssetHarness();
  await expectCode(
    () =>
      harness.assets.uploadPartnerOnboardingAsset(partnerContext, {
        category: "transparent_logo",
        file: new File(
          ['<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
          "logo.svg",
          { type: "image/svg+xml" }
        ),
        requestId: ids.request,
        expectedWorkspaceVersion: 7
      }),
    "invalid_input"
  );
  assert.equal(harness.uploads.length, 0);
  assert.equal(harness.rpcLog.length, 0);
});

test("asset metadata failure deletes the uploaded orphan", async () => {
  const harness = createAssetHarness({
    rpcHandler: () => ({
      data: null,
      error: { code: "XX000", message: "synthetic metadata failure" }
    })
  });
  await expectCode(
    () =>
      harness.assets.uploadPartnerOnboardingAsset(partnerContext, {
        category: "transparent_logo",
        file: pngFile(),
        requestId: ids.request,
        expectedWorkspaceVersion: 7
      }),
    "persistence_failed"
  );

  assert.equal(harness.uploads.length, 1);
  assert.deepEqual(
    harness.deletes,
    [harness.uploads[0].objectPath],
    "The task-owned object must be removed after metadata failure."
  );
});

test("an ambiguous asset RPC response preserves a confirmed committed object", async () => {
  const harness = createAssetHarness({
    rpcHandler: (_name, params, tables) => {
      tables.partner_onboarding_idempotency.push({
        workspace_id: ids.workspace,
        operation_key: "asset:record:transparent_logo",
        request_id: ids.request,
        payload_hash: params.p_payload_hash,
        result_status: "succeeded",
        result_workspace_version: 8
      });
      tables.partner_onboarding_assets.push({
        id: ids.request,
        workspace_id: ids.workspace,
        category: "transparent_logo",
        object_path: params.p_object_path,
        original_filename: params.p_original_filename,
        media_type: params.p_media_type,
        byte_size: params.p_byte_size,
        width_pixels: params.p_width_pixels,
        height_pixels: params.p_height_pixels,
        sha256_hex: params.p_sha256_hex,
        lifecycle_status: "pending_review",
        review_status: "pending",
        uploaded_at: "2026-07-28T00:00:00.000Z",
        deleted_at: null
      });
      return {
        data: null,
        error: { code: "PGRST000", message: "synthetic lost RPC response" }
      };
    }
  });

  const result = await harness.assets.uploadPartnerOnboardingAsset(
    partnerContext,
    {
      category: "transparent_logo",
      file: pngFile(),
      requestId: ids.request,
      expectedWorkspaceVersion: 7
    }
  );

  assert.equal(result.asset.id, ids.request);
  assert.equal(result.workspaceVersion, 8);
  assert.equal(result.duplicate, true);
  assert.equal(harness.deletes.length, 0);
});

test("a failed private storage upload creates no active metadata", async () => {
  const harness = createAssetHarness({ failStorageUpload: true });
  await expectCode(
    () =>
      harness.assets.uploadPartnerOnboardingAsset(partnerContext, {
        category: "transparent_logo",
        file: pngFile(),
        requestId: ids.request,
        expectedWorkspaceVersion: 7
      }),
    "storage_failed"
  );

  assert.equal(harness.uploads.length, 2);
  assert.equal(harness.rpcLog.length, 0);
  assert.equal(harness.adminFromCalls.length, 1);
});

test("asset replacement activates the new metadata before cleaning the superseded object", async () => {
  const previousAssetId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const previousPath =
    `partners/${ids.partner}/onboarding/${ids.workspace}/` +
    `transparent_logo/${previousAssetId}.png`;
  const harness = createAssetHarness({
    portal: {
      ...assetPortal(),
      assets: [
        {
          id: previousAssetId,
          category: "transparent_logo",
          originalFileName: "previous-logo.png",
          mediaType: "image/png",
          byteSize: 24,
          width: 32,
          height: 32,
          lifecycleStatus: "active",
          reviewStatus: "approved",
          uploadedAt: "2026-07-27T00:00:00.000Z"
        }
      ]
    },
    rpcHandler: () => ({
      data: [
        {
          asset_id: ids.request,
          workspace_aggregate_version: 8,
          duplicate: false,
          superseded_object_path: previousPath
        }
      ],
      error: null
    })
  });
  const result = await harness.assets.uploadPartnerOnboardingAsset(
    partnerContext,
    {
      category: "transparent_logo",
      file: pngFile(),
      requestId: ids.request,
      expectedWorkspaceVersion: 7
    }
  );

  assert.equal(result.asset.id, ids.request);
  assert.equal(harness.rpcLog.length, 1);
  assert.deepEqual(harness.deletes, [previousPath]);
});

test("private asset URLs use the private bucket, attachment name, and ten-minute TTL", async () => {
  const calls = [];
  const storage = loadTsModule(storagePath, new Map(), {
    "server-only": {},
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => ({
        storage: {
          from(bucket) {
            return {
              async createSignedUrl(objectPath, ttlSeconds, options) {
                calls.push({ bucket, objectPath, ttlSeconds, options });
                return {
                  data: {
                    signedUrl: "http://localhost/synthetic-private-url"
                  },
                  error: null
                };
              }
            };
          }
        }
      })
    }
  });
  const objectPath =
    `partners/${ids.partner}/onboarding/${ids.workspace}/` +
    `transparent_logo/${ids.asset}.png`;
  const url = await storage.createPrivateOnboardingAssetUrl({
    objectPath,
    downloadFileName: 'partner/"logo".png'
  });

  assert.equal(url, "http://localhost/synthetic-private-url");
  assert.deepEqual(calls, [
    {
      bucket: "rcap-partner-onboarding-private",
      objectPath,
      ttlSeconds: 600,
      options: { download: "partner__logo_.png" }
    }
  ]);
});

test("an authorized partner receives a signed operation only for its safe workspace asset", async () => {
  const objectPath =
    `partners/${ids.partner}/onboarding/${ids.workspace}/` +
    `transparent_logo/${ids.asset}.png`;
  const ownAsset = {
    id: ids.asset,
    category: "transparent_logo",
    originalFileName: "own-logo.png",
    mediaType: "image/png",
    byteSize: 24,
    width: 32,
    height: 32,
    lifecycleStatus: "active",
    reviewStatus: "approved",
    uploadedAt: "2026-07-28T00:00:00.000Z"
  };
  const harness = createAssetHarness({
    portal: {
      ...assetPortal(),
      assets: [ownAsset]
    },
    priorAssets: [
      {
        id: ids.asset,
        workspace_id: ids.workspace,
        object_path: objectPath,
        original_filename: "own-logo.png",
        media_type: "image/png",
        deleted_at: null,
        lifecycle_status: "active"
      }
    ]
  });
  const download = await harness.assets.getPartnerOnboardingAssetDownload(
    partnerContext,
    ids.asset
  );

  assert.equal(download.url, "http://localhost/private-signed-operation");
  assert.deepEqual(harness.signedUrls, [
    {
      objectPath,
      downloadFileName: undefined
    }
  ]);
  assert.ok(
    harness.adminFromCalls[0].filters.some(
      (filter) =>
        filter.column === "workspace_id" &&
        filter.value === ids.workspace
    )
  );
});

test("cross-workspace asset download is denied by partner-safe portal metadata", async () => {
  const harness = createAssetHarness({
    portal: {
      ...assetPortal(),
      assets: [
        {
          id: ids.asset,
          category: "transparent_logo",
          originalFileName: "own-logo.png",
          mediaType: "image/png",
          byteSize: 24,
          width: 32,
          height: 32,
          lifecycleStatus: "active",
          reviewStatus: "approved",
          uploadedAt: "2026-07-28T00:00:00.000Z"
        }
      ]
    }
  });
  await expectCode(
    () =>
      harness.assets.getPartnerOnboardingAssetDownload(
        partnerContext,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      ),
    "workspace_not_found"
  );
  assert.equal(harness.adminFromCalls.length, 0);
  assert.equal(harness.signedUrls.length, 0);
});

test("client onboarding components import no server or service-role capability", () => {
  const files = listSourceFiles(
    path.join(rootDir, "src/app/partner/onboarding")
  );
  const clientFiles = files.filter((file) =>
    /^\s*["']use client["'];/u.test(read(file))
  );
  assert.ok(clientFiles.length >= 2);

  for (const file of clientFiles) {
    const source = read(file);
    for (const forbidden of [
      "@/lib/supabase/server",
      "@/lib/supabase/auth-server",
      "@/lib/partners/onboarding/service",
      "@/lib/partners/onboarding/assets",
      "@/lib/partners/onboarding/storage",
      "SUPABASE_SERVICE_ROLE_KEY",
      "service_role"
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        `${path.relative(rootDir, file)} imports ${forbidden}.`
      );
    }
  }
});

test("partner-facing Phase 1 routes resolve tenant and write authority from the server session", () => {
  const writeRoutes = [
    "src/app/api/partners/onboarding/sections/[sectionKey]/route.ts",
    "src/app/api/partners/onboarding/submit/route.ts",
    "src/app/api/partners/onboarding/assets/route.ts",
    "src/app/api/partners/onboarding/assets/[assetId]/route.ts"
  ];
  for (const relativePath of writeRoutes) {
    const source = read(path.join(rootDir, relativePath));
    assert.match(
      source,
      /requirePartnerOnboardingContext\(\{[\s\S]*?write:\s*true/,
      `${relativePath} must revalidate partner-admin write authority.`
    );
    assert.doesNotMatch(
      source,
      /\b(?:body|form|searchParams)\.(?:partnerId|partnerSlug|workspaceId)\b/,
      `${relativePath} must not accept tenant identity from the browser.`
    );
    assert.doesNotMatch(
      source,
      /export\s+async\s+function\s+PATCH\b/,
      `${relativePath} must not expose a generic patch action.`
    );
  }

  const authContext = read(
    path.join(rootDir, "src/lib/partners/onboarding/auth-context.ts")
  );
  assert.match(authContext, /await requirePartnerSession\(\)/);
  assert.match(
    authContext,
    /options\.write\s*&&\s*session\.role\s*!==\s*["']partner_admin["']/
  );

  const migration = read(migrationPath);
  const partnerAssertion = migration.slice(
    migration.indexOf(
      "create or replace function public.rcap_service_assert_partner_actor("
    ),
    migration.indexOf(
      "create or replace function public.rcap_service_assert_internal_actor("
    )
  );
  assert.match(partnerAssertion, /pu\.auth_user_id\s*=\s*p_actor_user_id/);
  assert.match(partnerAssertion, /pu\.partner_slug\s*=\s*p_partner_slug/);
  assert.match(partnerAssertion, /po\.id\s*=\s*p_workspace_id/);
  assert.match(partnerAssertion, /pu\.role\s*=\s*'partner_admin'/);
  assert.match(partnerAssertion, /pu\.status\s*=\s*'active'/);
});

test("private Phase 1 routes are dynamic and emit private no-store responses", () => {
  const apiRoutes = [
    "src/app/api/partners/onboarding/workspace/route.ts",
    "src/app/api/partners/onboarding/sections/[sectionKey]/route.ts",
    "src/app/api/partners/onboarding/submit/route.ts",
    "src/app/api/partners/onboarding/assets/route.ts",
    "src/app/api/partners/onboarding/assets/[assetId]/route.ts",
    "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/route.ts"
  ];
  for (const relativePath of apiRoutes) {
    const source = read(path.join(rootDir, relativePath));
    assert.match(source, /export const dynamic = ["']force-dynamic["']/);
    assert.match(source, /export const revalidate = 0/);
    assert.ok(
      source.includes("onboardingJson") ||
        source.includes("ONBOARDING_PRIVATE_RESPONSE_HEADERS"),
      `${relativePath} must use the private response policy.`
    );
  }

  for (const relativePath of [
    "src/app/partner/onboarding/page.tsx",
    "src/app/partner/onboarding/[sectionKey]/page.tsx",
    "src/app/partner/onboarding/review/page.tsx"
  ]) {
    assert.match(
      read(path.join(rootDir, relativePath)),
      /export const dynamic = ["']force-dynamic["']/
    );
  }

  const privateHeaders = read(
    path.join(
      rootDir,
      "src/lib/partners/onboarding/request-security.ts"
    )
  );
  assert.match(
    privateHeaders,
    /Cache-Control["']:\s*["']private, no-store, no-cache, must-revalidate, max-age=0["']/
  );
});

test("legacy partner onboarding mutation APIs return 410 with private caching disabled", () => {
  for (const relativePath of [
    "src/app/api/partners/onboarding/route.ts",
    "src/app/api/partners/onboarding/checklist/route.ts"
  ]) {
    const source = read(path.join(rootDir, relativePath));
    assert.match(source, /isRcapPartnerOnboardingEnabled\(\)/);
    assert.match(source, /status:\s*410/);
    assert.match(
      source,
      /canonicalRoute:\s*["']\/partner\/onboarding["']/
    );
    assert.match(
      source,
      /Cache-Control["']:\s*["']private, no-store, max-age=0["']/
    );
  }
});

test("service mutation RPC execute grants exclude authenticated and include service_role", () => {
  const migration = read(migrationPath);
  const statements = migration
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const serviceFunctions = [
    "rcap_service_assert_partner_actor",
    "rcap_service_assert_internal_actor",
    "rcap_service_save_onboarding_section",
    "rcap_service_submit_onboarding",
    "rcap_service_create_onboarding_workspace",
    "rcap_service_review_onboarding",
    "rcap_service_record_onboarding_asset",
    "rcap_service_delete_onboarding_asset"
  ];

  for (const functionName of serviceFunctions) {
    const executeGrants = statements.filter(
      (statement) =>
        /^grant execute on function/i.test(statement) &&
        statement.includes(`public.${functionName}(`)
    );
    assert.equal(
      executeGrants.length,
      1,
      `${functionName} must have one explicit execute grant.`
    );
    assert.match(executeGrants[0], /\bto service_role\b/i);
    assert.doesNotMatch(executeGrants[0], /\bauthenticated\b/i);

    const revocation = statements.find(
      (statement) =>
        /^revoke all on function/i.test(statement) &&
        statement.includes(`public.${functionName}(`)
    );
    assert.ok(revocation, `${functionName} must revoke browser execution.`);
    assert.match(revocation, /\bauthenticated\b/i);
  }
});

test("the verifier performs no environment or network access", () => {
  assert.equal(networkAttempts, 0);
});

let passed = 0;
const failures = [];
try {
  for (const { name, run } of tests) {
    try {
      await run();
      passed += 1;
    } catch (error) {
      failures.push({
        name,
        error: error instanceof Error ? error.stack ?? error.message : String(error)
      });
    }
  }
} finally {
  globalThis.fetch = originalFetch;
}

if (failures.length > 0) {
  console.error(
    `RCAP partner onboarding service verification failed: ${passed}/${tests.length} checks passed.`
  );
  for (const failure of failures) {
    console.error(`\n[${failure.name}]\n${failure.error}`);
  }
  process.exit(1);
}

console.log(
  `RCAP partner onboarding service verification passed: ${passed}/${tests.length} checks passed.`
);

function createServiceHarness(options = {}) {
  const requestLog = [];
  const rpcLog = [];
  const tables = buildPortalTables(options);
  const requestClient = createFakeSupabase({
    tables,
    queryLog: requestLog
  });
  const adminClient = createFakeSupabase({
    tables: options.adminTables ?? {},
    queryLog: [],
    rpcLog,
    rpcHandler:
      options.rpcHandler ??
      (() => ({
        data: [
          {
            section_revision: 4,
            section_status: "in_progress",
            workspace_aggregate_version: 8,
            duplicate: false
          }
        ],
        error: null
      }))
  });
  const mocks = {
    "server-only": {},
    "@/lib/supabase/auth-server": {
      createServerSupabaseAuthClient: async () => requestClient
    },
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => adminClient
    }
  };
  const service = loadTsModule(servicePath, new Map(), mocks);
  return { service, requestLog, rpcLog, requestClient, adminClient };
}

function createAssetHarness(options = {}) {
  const uploads = [];
  const deletes = [];
  const signedUrls = [];
  const rpcLog = [];
  const adminFromCalls = [];
  const storage = loadTsModule(storagePath, new Map(), {
    "server-only": {},
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => null
    }
  });
  const tables = {
    partner_onboarding_assets: options.priorAssets ?? [],
    partner_onboarding_idempotency: []
  };
  const adminClient = createFakeSupabase({
    tables,
    queryLog: adminFromCalls,
    rpcLog,
    rpcHandler: options.rpcHandler
      ? (name, params) => options.rpcHandler(name, params, tables)
      : () => ({
        data: [
          {
            workspace_aggregate_version: 8,
            duplicate: false,
            superseded_object_path: null
          }
        ],
        error: null
      })
  });
  const storageMock = {
    buildOnboardingObjectPath: storage.buildOnboardingObjectPath,
    uploadPrivateOnboardingAsset: async (objectPath, asset) => {
      uploads.push({ objectPath, asset });
      if (options.failStorageUpload) {
        throw new Error("Synthetic private storage upload failure.");
      }
    },
    deletePrivateOnboardingAsset: async (objectPath) => {
      deletes.push(objectPath);
    },
    createPrivateOnboardingAssetUrl: async (input) => {
      signedUrls.push(input);
      return "http://localhost/private-signed-operation";
    }
  };
  const portal = options.portal ?? assetPortal();
  const mocks = {
    "server-only": {},
    "./service": {
      getPartnerOnboardingPortal: async () => portal
    },
    "./storage": storageMock,
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => adminClient
    }
  };
  const assets = loadTsModule(assetsPath, new Map(), mocks);
  return {
    assets,
    uploads,
    deletes,
    signedUrls,
    rpcLog,
    adminFromCalls,
    portal
  };
}

function buildPortalTables(options) {
  const packageData = options.packageData ?? {};
  const workspace = {
    id: ids.workspace,
    partner_slug: partnerContext.partnerSlug,
    partner_record_id: ids.partner,
    status: "setup_in_progress",
    schema_version: "rcap_partner_onboarding_phase_1_v1",
    aggregate_version: 7,
    completion_percentage: 0,
    blocker_code: null,
    next_action_code: "complete_section",
    next_action_owner: "partner",
    target_launch_date: null,
    commercial_gate_status: "cleared_by_paid_invoice",
    commercial_gate_changed_at: "2026-07-27T00:00:00.000Z",
    submitted_at: null,
    internal_approved_at: null,
    launched_at: null,
    paused_at: null,
    closed_at: null,
    last_meaningful_activity_at: "2026-07-28T00:00:00.000Z",
    created_at: "2026-07-27T00:00:00.000Z",
    updated_at: "2026-07-28T00:00:00.000Z",
    ...(options.workspace ?? {})
  };
  const rows = sectionRows(packageData, options);
  const assets = options.includeLogo
    ? [
        {
          id: ids.asset,
          workspace_id: ids.workspace,
          category: "transparent_logo",
          original_filename: "logo.png",
          media_type: "image/png",
          byte_size: 24,
          width_pixels: 32,
          height_pixels: 32,
          lifecycle_status: "active",
          review_status: "approved",
          uploaded_at: "2026-07-28T00:00:00.000Z",
          deleted_at: null
        }
      ]
    : [];

  return {
    partner_onboarding_workspace_safe: [workspace],
    partner_onboarding_sections: rows,
    partner_onboarding_contacts: contactRows(
      packageData.organization_contacts?.contacts ?? []
    ),
    partner_onboarding_planned_users: plannedUserRows(
      packageData.staff_dashboard_plan?.planned_users ?? []
    ),
    partner_onboarding_report_recipients: recipientRows(
      packageData.support_referrals_reporting?.report_recipients ?? []
    ),
    partner_onboarding_change_requests_safe: options.changeRequests ?? [],
    partner_onboarding_assets_safe: assets,
    partner_onboarding_agreements_safe: [],
    partner_onboarding_activity: [],
    partner_records: [
      {
        id: ids.partner,
        organization_name: "Server Partner",
        partner_name: "Server Partner",
        program_name: "Fresh Start",
        selected_package_id:
          Object.prototype.hasOwnProperty.call(options, "selectedPackageId")
            ? options.selectedPackageId
            : "community-access-program"
      }
    ],
    partner_entitlement: [
      {
        partner_slug: partnerContext.partnerSlug,
        screenings_allowed: 500,
        screenings_used: 25,
        overage_enabled: false,
        pause_at_cap: true
      }
    ]
  };
}

function sectionRows(packageData, options = {}) {
  const sectionKeys = [
    "organization_contacts",
    "program_goals",
    "geography_audience_language_accessibility",
    "access_sponsorship_capacity",
    "brand_public_page",
    "staff_dashboard_plan",
    "support_referrals_reporting",
    "review_authorization"
  ];
  return sectionKeys.map((sectionKey, index) => {
    const response = structuredClone(packageData[sectionKey] ?? {});
    delete response.contacts;
    delete response.planned_users;
    delete response.report_recipients;
    return {
      id: `10000000-0000-4000-8000-00000000000${index + 1}`,
      workspace_id: ids.workspace,
      section_key: sectionKey,
      response_data: response,
      revision: sectionKey === "organization_contacts" ? 3 : 1,
      status:
        options.sectionStatuses?.[sectionKey] ??
        options.defaultSectionStatus ??
        "in_progress",
      completion_percentage:
        (
          options.sectionStatuses?.[sectionKey] ??
          options.defaultSectionStatus
        ) === "submitted"
          ? 100
          : 0,
      missing_required_keys: [],
      first_started_at: "2026-07-28T00:00:00.000Z",
      completed_at: null,
      submitted_at: null,
      approved_at: null,
      waived_at: null,
      reviewed_at: null,
      created_at: "2026-07-28T00:00:00.000Z",
      updated_at: "2026-07-28T00:00:00.000Z"
    };
  });
}

function contactRows(contacts) {
  return contacts.map((contact) => ({
    id: contact.stable_row_id,
    workspace_id: ids.workspace,
    role: contact.role,
    name: contact.name,
    title: contact.title,
    organization: contact.organization ?? null,
    work_email: contact.work_email,
    phone: contact.phone ?? null,
    deleted_at: null,
    created_at: "2026-07-28T00:00:00.000Z"
  }));
}

function plannedUserRows(users) {
  return users.map((user) => ({
    id: user.stable_row_id,
    workspace_id: ids.workspace,
    name: user.name,
    work_email: user.work_email,
    requested_role: user.requested_role,
    special_permissions: user.special_permissions ?? [],
    training_attendee: user.training_attendee,
    training_status: user.training_status ?? "not_started",
    training_completed_at: user.training_completed_at ?? null,
    invitation_status: user.invitation_status ?? "planned",
    membership_status: user.membership_status ?? "planned",
    deleted_at: null,
    created_at: "2026-07-28T00:00:00.000Z",
    updated_at: "2026-07-28T00:00:00.000Z"
  }));
}

function recipientRows(recipients) {
  return recipients.map((recipient) => ({
    id: recipient.stable_row_id,
    workspace_id: ids.workspace,
    name: recipient.name ?? null,
    work_email: recipient.work_email,
    deleted_at: null,
    created_at: "2026-07-28T00:00:00.000Z"
  }));
}

function createFakeSupabase({
  tables,
  queryLog,
  rpcLog = [],
  rpcHandler = () => ({ data: null, error: null })
}) {
  return {
    from(table) {
      const query = {
        table,
        select: null,
        filters: [],
        order: [],
        limit: null
      };
      queryLog.push(query);
      return createQueryBuilder(query, tables);
    },
    async rpc(name, params) {
      rpcLog.push({ name, params });
      return await rpcHandler(name, params);
    }
  };
}

function createQueryBuilder(query, tables) {
  const builder = {
    select(columns) {
      query.select = columns;
      return builder;
    },
    eq(column, value) {
      query.filters.push({ kind: "eq", column, value });
      return builder;
    },
    is(column, value) {
      query.filters.push({ kind: "is", column, value });
      return builder;
    },
    in(column, value) {
      query.filters.push({ kind: "in", column, value });
      return builder;
    },
    order(column, options) {
      query.order.push({ column, options });
      return builder;
    },
    limit(value) {
      query.limit = value;
      return builder;
    },
    maybeSingle() {
      const result = resolveQuery(query, tables);
      return Promise.resolve({
        data: result.data[0] ?? null,
        error: result.error
      });
    },
    then(resolve, reject) {
      const result = resolveQuery(query, tables);
      return Promise.resolve(result).then(resolve, reject);
    }
  };
  return builder;
}

function resolveQuery(query, tables) {
  const configured = tables[query.table];
  if (configured && !Array.isArray(configured) && configured.error) {
    return { data: null, error: configured.error };
  }
  let rows = structuredClone(Array.isArray(configured) ? configured : []);
  for (const filter of query.filters) {
    rows = rows.filter((row) => {
      const value = row[filter.column];
      if (filter.kind === "eq") return value === filter.value;
      if (filter.kind === "is") {
        return filter.value === null
          ? value === null || value === undefined
          : value === filter.value;
      }
      if (filter.kind === "in") return filter.value.includes(value);
      return true;
    });
  }
  if (query.limit !== null) rows = rows.slice(0, query.limit);
  return { data: rows, error: null };
}

function draftSaveInput() {
  return {
    sectionKey: "organization_contacts",
    expectedRevision: 3,
    expectedWorkspaceVersion: 7,
    requestId: ids.request,
    mode: "draft_save",
    data: {
      public_organization_name: "  Community   Partner  ",
      contacts: [
        {
          stable_row_id: ids.programContact,
          role: "program_operator",
          work_email: "PERSON@EXAMPLE.ORG"
        }
      ]
    }
  };
}

function completePackage() {
  return {
    organization_contacts: {
      legal_organization_name: "Community Justice Alliance",
      public_organization_name: "Community Justice Alliance",
      organization_type: "legal_services",
      website: "https://partner.example.org",
      primary_address: "100 Main Street",
      main_phone: "+1 555 010 1000",
      public_program_name: "Fresh Start Program",
      contacts: [
        {
          stable_row_id: ids.programContact,
          role: "program_operator",
          name: "Jordan Lee",
          title: "Program Director",
          organization: null,
          work_email: "jordan@example.org",
          phone: null
        },
        {
          stable_row_id: ids.escalationContact,
          role: "legal_services_referral_contact",
          name: "Morgan Reed",
          title: "Supervising Attorney",
          organization: "Community Justice Alliance",
          work_email: "morgan@example.org",
          phone: null
        }
      ]
    },
    program_goals: {
      primary_goal: "Help residents understand record-clearing options.",
      definition_of_success: "Deliver accessible screening and referrals.",
      target_population: "Adults served by the workforce program.",
      expected_screening_volume: 250,
      expected_screening_period: "Program year",
      expected_packet_volume: 75,
      expected_packet_period: "Program year",
      program_model: "year_round",
      program_start_date: "2026-09-01",
      program_end_date: null,
      ongoing: true,
      outreach_channels: ["Workshops"],
      current_workflow: "Staff make warm referrals.",
      known_barriers: [],
      known_barriers_other: null,
      partner_side_outcome_tracking: "Aggregate referrals are tracked."
    },
    geography_audience_language_accessibility: {
      jurisdictions: ["Mississippi"],
      service_area_description: "Statewide service.",
      counties: ["Hinds"],
      default_county: "Hinds",
      out_of_area_policy: "case_by_case",
      primary_language: "English",
      enable_spanish: true,
      additional_languages: [],
      accessibility_accommodations: "Phone support is available.",
      community_specific_terminology: "",
      population_restrictions: "Adults in partner programs."
    },
    access_sponsorship_capacity: {
      participant_access_model: "open",
      code_expiration: null,
      code_level_capacity: null,
      overage_approver_contact_id: null
    },
    brand_public_page: {
      approved_organization_description:
        "The alliance connects residents with trusted support.",
      program_headline: "A clearer path forward",
      program_subheadline: "Understand record-clearing pathways.",
      primary_cta_label: "Start screening",
      participant_support_copy: "Contact the partner team for support.",
      partner_privacy_url: "https://partner.example.org/privacy",
      accessibility_url: null,
      impact_reporting_url: null
    },
    staff_dashboard_plan: {
      planned_users: [
        {
          stable_row_id: ids.plannedAdmin,
          name: "Jordan Lee",
          work_email: "jordan@example.org",
          requested_role: "partner_administrator",
          special_permissions: ["manage_codes", "manage_users"],
          training_attendee: true
        }
      ],
      primary_dashboard_administrator_row_id: ids.plannedAdmin,
      user_invitation_authority_role: "partner_administrator",
      code_management_authority_role: "partner_administrator",
      report_export_authority_role: "partner_administrator",
      access_review_frequency: "Quarterly"
    },
    support_referrals_reporting: {
      participant_support_email: "support@example.org",
      participant_support_phone: null,
      partner_staff_support_contact_id: ids.programContact,
      legal_services_referral_organization: "Community Justice Alliance",
      referral_intake_method: "Warm email referral",
      referral_intake_details: "Staff send the approved referral summary.",
      contested_matter_procedure:
        "When a prosecutor objects, a contested hearing is scheduled, or individualized legal advocacy is required, the self-help path stops and the approved referral or escalation process applies.",
      urgent_escalation_contact_id: ids.escalationContact,
      report_recipients: [
        {
          stable_row_id: ids.recipient,
          name: "Taylor Kim",
          work_email: "reports@example.org"
        }
      ],
      reporting_cadence: "Monthly",
      funder_required_metrics: [],
      data_use_restrictions: [],
      external_outcome_data_description: ""
    },
    review_authorization: {
      organization_information_accurate: true,
      program_scope_approved_for_configuration: true,
      brand_assets_authorized_for_use: true,
      no_eligibility_or_outcome_guarantee_understood: true,
      contested_and_representation_matters_follow_escalation_plan: true,
      dashboard_users_authorized: true,
      legalease_may_prepare_draft_implementation_materials: true,
      approver_name: "Jordan Lee",
      approver_title: "Program Director"
    }
  };
}

function assetPortal() {
  const sectionKeys = [
    "organization_contacts",
    "program_goals",
    "geography_audience_language_accessibility",
    "access_sponsorship_capacity",
    "brand_public_page",
    "staff_dashboard_plan",
    "support_referrals_reporting",
    "review_authorization"
  ];
  return {
    canEdit: true,
    workspace: {
      id: ids.workspace,
      partnerRecordId: ids.partner,
      aggregateVersion: 7,
      commercialGateStatus: "cleared_by_paid_invoice",
      status: "setup_in_progress"
    },
    data: {},
    sections: sectionKeys.map((key) => ({
      key,
      status: "not_started",
      changeRequestInstructions: []
    })),
    assets: [],
    procurementRequired: false,
    recordShieldInScope: false,
    overageApprovalRequired: false
  };
}

function pngFile() {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 32);
  view.setUint32(20, 32);
  return new File([bytes], "partner-logo.png", { type: "image/png" });
}

async function expectCode(run, expectedCode) {
  let thrown;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, `Expected ${expectedCode} error.`);
  assert.equal(thrown.code, expectedCode);
  return thrown;
}

function assertSensitiveOnlyIn(params, allowedKeys) {
  const allowed = new Set(allowedKeys);
  for (const [key, value] of Object.entries(params)) {
    if (allowed.has(key)) continue;
    const serialized = JSON.stringify(value);
    assert.doesNotMatch(
      serialized,
      /(?:[A-Z][a-z]+\s[A-Z][a-z]+|@example\.org|partners\/[^/]+\/onboarding\/)/i,
      `Sensitive content escaped persistence parameter ${key}.`
    );
    assert.doesNotMatch(
      key,
      /(?:name|email|phone|object_path)/i,
      `Sensitive parameter ${key} is not an explicitly allowed persistence field.`
    );
  }
}

function sliceSqlObject(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing SQL marker: ${marker}`);
  const end = source.indexOf("\n);", start);
  assert.notEqual(end, -1, `Unterminated SQL object: ${marker}`);
  return source.slice(start, end + 3);
}

function listSourceFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(target);
    return /\.(?:ts|tsx)$/u.test(entry.name) ? [target] : [];
  });
}

function read(filename) {
  return fs.readFileSync(filename, "utf8");
}

function loadTsModule(filename, moduleCache, mocks) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: resolved,
    reportDiagnostics: true
  });
  assert.equal(
    (transpiled.diagnostics ?? []).length,
    0,
    `TypeScript transpilation failed for ${path.relative(rootDir, resolved)}.`
  );

  const mod = new Module(`${resolved}.cjs`);
  mod.filename = `${resolved}.cjs`;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    if (request.endsWith(".json") && request.startsWith(".")) {
      return JSON.parse(
        fs.readFileSync(path.resolve(path.dirname(resolved), request), "utf8")
      );
    }
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile
      ? loadTsModule(nextFile, moduleCache, mocks)
      : require(request);
  };
  mod._compile(transpiled.outputText, mod.filename);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return resolveExisting(path.join(rootDir, "src", request.slice(2)));
  }
  if (request.startsWith(".")) {
    return resolveExisting(path.resolve(basedir, request));
  }
  return null;
}

function resolveExisting(candidate) {
  for (const extension of [".ts", ".tsx", ".js"]) {
    if (fs.existsSync(`${candidate}${extension}`)) {
      return `${candidate}${extension}`;
    }
  }
  return fs.existsSync(candidate) ? candidate : null;
}
