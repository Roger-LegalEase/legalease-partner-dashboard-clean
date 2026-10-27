-- One exact QA-workspace poststate; no writes/RPC mutations/auth/participant reads.
BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
WITH w AS (
 SELECT id,partner_record_id,partner_slug,aggregate_version,status,landing_page_ready,rcap_launch_operation_id,operating_model,rcap_policy_version,internal_approved_at,launched_at
 FROM public.partner_onboarding WHERE partner_slug='legalease-ordinary-qa-20261024'
), policy AS (
 SELECT public.rcap_program_policy_source(id) AS value FROM w
), artifacts AS (
 SELECT a.id,a.artifact_type,a.current_version_id,a.lifecycle_status FROM public.partner_onboarding_artifacts a JOIN w ON w.id=a.workspace_id
), versions AS (
 SELECT v.* FROM public.partner_onboarding_artifact_versions v JOIN w ON w.id=v.workspace_id
), allocations AS (
 SELECT e.id,e.packet_cap FROM public.partner_packet_entitlement e JOIN w ON w.partner_record_id=e.partner_id WHERE e.entitlement_scope='sponsored_packets' AND e.expires_at IS NULL
), exact_review AS (
 SELECT a.* FROM public.partner_onboarding_launch_approvals a JOIN w ON w.id=a.workspace_id
 WHERE a.request_id='7eecf949-ab86-42dd-898b-7a1979760346'::uuid
), launch_rows AS (
 SELECT e.* FROM public.rcap_launch_operation_events e JOIN w ON w.id=e.workspace_id WHERE e.partner_slug='legalease-ordinary-qa-20261024'
), registrations AS (
 SELECT r.* FROM public.ordinary_sponsored_packet_routes r WHERE r.partner_slug='legalease-ordinary-qa-20261024'
)
SELECT jsonb_build_object(
 'observedAt',now(),'readOnly',current_setting('transaction_read_only'),'exactWorkspaceCount',(SELECT count(*) FROM w),
 'workspace',(SELECT jsonb_build_object('version',aggregate_version,'status',status,'landingPageReady',landing_page_ready,'hasLaunchOperation',rcap_launch_operation_id IS NOT NULL,'internalApproved',internal_approved_at IS NOT NULL,'launched',launched_at IS NOT NULL,'managed',operating_model='legalease_managed','policyCurrent',rcap_policy_version='rcap2.2') FROM w),
 'jurisdictions',(SELECT value#>'{geography_audience_language_accessibility,jurisdictions}' FROM policy),
 'exactMsJurisdiction',(SELECT value#>'{geography_audience_language_accessibility,jurisdictions}'='["MS"]'::jsonb FROM policy),
 'sponsoredServiceMode',(SELECT value#>>'{program_goals,service_mode}'='sponsored_packets' FROM policy),
 'childReviewRowCount',(SELECT count(*) FROM exact_review),
 'childReviewExactApprovedCount',(SELECT count(*) FROM exact_review WHERE approval_type='legalease_final_review' AND decision='approve' AND reviewer_user_id='6574d21e-5e0a-4567-b14e-01447c162f37'::uuid AND invalidated_at IS NULL),
 'childReviewExactMaterialCount',(SELECT max(jsonb_array_length(policy_details->'material_versions')) FROM exact_review WHERE jsonb_typeof(policy_details->'material_versions')='array'),
 'childReviewHasExpectedJurisdictions',(SELECT bool_and(policy_details->'jurisdictions'='["MS"]'::jsonb) FROM exact_review),
 'childReviewArtifactReviews',(SELECT count(*) FROM public.partner_onboarding_artifact_reviews r JOIN w ON w.id=r.workspace_id WHERE r.request_id='7eecf949-ab86-42dd-898b-7a1979760346'::uuid AND r.reviewer_user_id='6574d21e-5e0a-4567-b14e-01447c162f37'::uuid AND r.reviewer_type='legalease' AND r.decision='approve'),
 'allFinalReviewCount',(SELECT count(*) FROM public.partner_onboarding_launch_approvals a JOIN w ON w.id=a.workspace_id WHERE a.approval_type='legalease_final_review' AND a.decision='approve' AND a.invalidated_at IS NULL),
 'launchReceiptCount',(SELECT count(*) FROM launch_rows),
 'originalStartRequestJournalCount',(SELECT count(*) FROM launch_rows WHERE request_id='d8a07a4e-3f5c-49fb-b8ad-5e2c892ce38c'::uuid),
 'originalStartRequestSteps',(SELECT coalesce(jsonb_agg(step ORDER BY created_at,id),'[]'::jsonb) FROM launch_rows WHERE request_id='d8a07a4e-3f5c-49fb-b8ad-5e2c892ce38c'::uuid),
 'launchPreparedCount',(SELECT count(*) FROM launch_rows WHERE step='prepared'),
 'launchCompleteCount',(SELECT count(*) FROM launch_rows WHERE step='complete'),
 'ordinaryRegistrationCount',(SELECT count(*) FROM registrations),
 'ordinaryExactMsRegistrationCount',(SELECT count(*) FROM registrations WHERE route_key='MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal' AND active AND packet_specification_sha256='23426df251aa31bfd5215edbfe547d5f56c2349ed4c4bb5e7b407bc25405e126'),
 'artifactStubCount',(SELECT count(*) FROM artifacts),'artifactVersionCount',(SELECT count(*) FROM versions),
 'currentMaterials',(SELECT coalesce(jsonb_agg(jsonb_build_object('type',a.artifact_type,'version',v.version_number,'sourceVersion',v.source_workspace_version,'hash',v.snapshot_hash,'generated',v.generation_status='succeeded','approved',v.approval_status='approved','partnerApproved',v.partner_review_status='approved','notSuperseded',v.superseded_at IS NULL,'notDrifted',v.source_drift_invalidated_at IS NULL) ORDER BY a.artifact_type),'[]'::jsonb) FROM artifacts a JOIN versions v ON v.id=a.current_version_id WHERE a.artifact_type IN ('implementation_brief','co_branded_page_configuration')),
 'submittedTwoHashesCurrentCount',(SELECT count(*) FROM artifacts a JOIN versions v ON v.id=a.current_version_id WHERE a.artifact_type IN ('implementation_brief','co_branded_page_configuration') AND v.snapshot_hash IN ('3d1250399ba18f80283255bb021cd650b8a126a12b980d85eb9fd18286633388','2ba6a142d46d43ba79ca3ad9623c031c99ca345aa8eabeabb88df371b62f9c47')),
 'originalOnePlusOneReceiptCount',(SELECT count(*) FROM public.rcap_launch_capacity_events c JOIN w ON w.id=c.workspace_id WHERE c.request_id='718e921f-4e3a-428b-bd9f-94d4095a27c7'::uuid AND c.screenings_allowed=1 AND c.packet_cap=1),
 'screeningCapacity',(SELECT jsonb_build_object('allowed',e.screenings_allowed,'used',e.screenings_used,'remaining',greatest(0,e.screenings_allowed-e.screenings_used)) FROM public.partner_entitlement e WHERE e.partner_slug='legalease-ordinary-qa-20261024'),
 'packetCapTotal',(SELECT coalesce(sum(packet_cap),0) FROM allocations),
 'packetReservedOrConsumed',(SELECT count(*) FROM public.packet_credit_ledger l JOIN allocations a ON a.id=l.entitlement_id WHERE l.event_type IN ('reserved','consumed')),
 'legacyPublication',(SELECT jsonb_build_object('onboardingStatus',r.onboarding_status,'onboardingCompleted',r.onboarding_completed_at IS NOT NULL) FROM public.partner_records r JOIN w ON w.partner_record_id=r.id)
) AS ordinary_start_404538_poststate;
COMMIT;
