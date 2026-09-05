// Extends the existing PostgreSQL/filesystem harnesses. The render port returns
// the unchanged, specification-pinned fixture: this proves delivery plumbing,
// not hosted rendering, provider publication or participant personalization.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { IL_ROUTE, IL_TRACK, IL_FAMILY, IL_SPECIFICATION, IL_SNAPSHOT, ilContext } from "./verify-rcap-il-delivery-binding.mjs";
const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
const { runWorkerCycle } = await import("../src/lib/rcap/render/render-worker.ts");
const { authorizePacketDownload, streamAuthorizedPacket } = await import("../src/lib/rcap/render/packet-delivery.ts");
const { commercialRouteIdentity, governCommercialAdmission } = await import("../src/lib/rcap/render/commercial-admission.ts");

export async function exerciseIllinoisDelivery({ db, deps, deliveryPorts, userId, partnerId, personId }) {
  const pin = IL_SPECIFICATION.approvedArtifacts.find((artifact) => artifact.fixture === "canonical");
  const bytes = fs.readFileSync(pin.file);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), pin.sha256);
  const identity = commercialRouteIdentity({ jurisdiction: "IL", pathwayId: "felony-prostitution-relief" });
  const jobs = [];
  const currents = new Map();
  const ports = {
    ...deliveryPorts,
    getJob: async (id) => {
      const job = await deliveryPorts.getJob(id);
      const binding = db.json(`select row_to_json(t) from (select consumer_briefcase_item_id from packet_render_jobs where id = '${id}') t`);
      return job && { ...job, consumerBriefcaseItemId: binding.consumer_briefcase_item_id };
    },
    userOwnsBriefcaseItem: async (user, item) => user === userId && currents.has(item),
    getCurrentVerification: async (item) => currents.get(item) ?? null
  };
  for (const [index, kind] of ["consumer_payment", "sponsored_credit"].entries()) {
    const matterId = `aa110000-0000-4000-8000-00000000000${index}`;
    const itemId = db.scalar(`with item as (insert into consumer_briefcase_items (user_id, item_type, status, jurisdiction) values ('${userId}', 'packet', 'packet_ready', 'IL') returning id) select id from item`);
    const point = kind === "consumer_payment" ? "consumer_checkout" : "sponsored_entitlement";
    assert.equal(governCommercialAdmission(point, identity, ilContext({ userId, matterId, kind })).admitted, true);
    if (kind === "consumer_payment") {
      // A local synthetic provider event enters through the existing payment
      // authority RPC; never direct paid-state writes or a Stripe connection.
      assert.match(db.scalar(`select outcome from record_consumer_packet_payment('${itemId}', 'paid', 5000, 'usd', 'stripe', 'local-il-event-${itemId}', 'local-il-checkout', null, null, 'server_webhook', 'local-il-test')`), /recorded_paid/);
    }
    const packetId = db.scalar("with packet as (insert into rcap_document_packets default values returning id) select id from packet");
    const { spec, route } = buildRenderJobSpec({
      packetId, state: "IL", pathway: "felony-prostitution-relief", trackId: IL_TRACK,
      briefcaseItemId: itemId, packetFields: { selectedTrackId: IL_TRACK, packetFamilyId: IL_FAMILY, fixtureSha256: pin.sha256 }
    });
    assert.equal(route.factoryV2.packetFamilyId, IL_FAMILY);
    const sponsored = kind === "sponsored_credit";
    const jobId = db.scalar(`select id from enqueue_packet_render_job('${packetId}', '${spec.routeId}', '${spec.rendererKind}', '${spec.rendererVersion}', null, '${spec.profileId}', '${spec.profileVersion}', '${spec.inputHash}', '${itemId}', ${sponsored ? `'${partnerId}'` : "null"}, '${personId}', '${matterId}', 5, ${sponsored ? "null, null" : `'${itemId}', '${userId}'`})`);
    const cycle = await runWorkerCycle({
      ...deps,
      renderer: { render: async (claim) => {
        assert.equal(claim.routeId, IL_ROUTE);
        assert.equal(claim.inputHash, spec.inputHash);
        assert.equal(claim.packetId, packetId);
        return bytes;
      } },
      allowlists: { ...deps.allowlists, knownProfileVersions: new Set([spec.profileVersion]) }
    });
    assert.equal(cycle.outcome, "finalized", JSON.stringify(cycle));
    assert.equal(cycle.jobId, jobId);
    assert.equal(cycle.accountingResult, sponsored ? "consumed" : "zero_charge");
    assert.equal(cycle.deliveryEligibility, "eligible");
    const current = { snapshot: IL_SNAPSHOT, hash: "local-il-verification", ownerUserId: userId, matterId, alreadyDownloaded: false };
    currents.set(itemId, current);
    const ledgerCount = () => db.scalar("select (select count(*) from packet_credit_ledger) + (select count(*) from consumer_packet_payment_consumption)");
    const before = ledgerCount();
    for (const repeat of [false, true]) {
      current.alreadyDownloaded = repeat;
      const decision = await authorizePacketDownload(ports, { jobId, userId });
      assert.equal(decision.ok, true, JSON.stringify(decision));
      const response = await streamAuthorizedPacket(ports, decision, { userId });
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    }
    assert.equal(ledgerCount(), before, "repeat download must not consume again");
    for (const selectedTrackId of [null, "*", "il-prostitution-j-auto"]) {
      currents.set(itemId, { ...current, snapshot: { ...IL_SNAPSHOT, selectedTrackId } });
      assert.equal((await authorizePacketDownload(ports, { jobId, userId })).ok, false, `${kind}: wrong-track download`);
    }
    currents.set(itemId, current);
    for (const routeId of ["IL:*", "*", "IL:il-prostitution-j-auto"]) {
      const wrongRoutePorts = { ...ports, getJob: async (id) => ({ ...await ports.getJob(id), routeId }) };
      assert.equal((await authorizePacketDownload(wrongRoutePorts, { jobId, userId })).ok, false, `${kind}: wrong-scope artifact`);
    }
    const noVerification = { ...ports, getCurrentVerification: undefined };
    assert.equal((await authorizePacketDownload(noVerification, { jobId, userId })).ok, false);
    assert.equal((await authorizePacketDownload(ports, { jobId, userId: null })).ok, false);
    assert.equal((await authorizePacketDownload(ports, { jobId, userId: "wrong-owner" })).ok, false);
    jobs.push({ jobId, kind, itemId, matterId });
  }
  console.log("Illinois ephemeral delivery: consumer and sponsored jobs, pinned fixture bytes, current verification, denial and repeat-download checks PASS");
  return { jobs, ports, bytes };
}
