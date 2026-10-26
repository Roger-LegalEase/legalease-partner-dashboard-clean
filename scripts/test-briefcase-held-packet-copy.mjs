import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire, register } from 'node:module';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

register('./lib/ts-esm-loader.mjs', import.meta.url);
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const require = createRequire(import.meta.url);
const filename = path.resolve('src/app/briefcase/[packetId]/page.tsx');
let locale = 'en', authenticated = true, reads = 0;
let item;
const blank = () => null;
const mocks = {
  '@/lib/rcap/render/mn-held-caption-consumer': { mnHeldCaptionPreparationFor: blank },
  '@/lib/expungement-ai/virginia-record-context': { VA_RECORD_CONTEXT_IDS: [] },
  '@/lib/expungement-ai/reviewed-result-copy': { isMsTimingDisplayText: () => false },
  '@/lib/rcap-engine/mississippi-exact-timing': { msExactTimingQuestionIds: () => [] },
  '@/lib/expungement-ai/verification-cas': { readProtectedPacketVerification: () => assert.fail('Unexpected protected read') },
  '@/lib/expungement-ai/packet-information': new Proxy({}, { get: (_, name) => name === 'factualPathwayCorrectionIds' ? () => [] : name === 'heldPacketCorrectionInputIds' ? () => new Set() : blank }),
  '@/lib/expungement-ai/ca-prop64-choices': { CA_PROP64_CLARIFICATION_COPY: {} },
  '@/lib/expungement-ai/packet-display-copy': { packetMatterTitleCopy: () => ({ en: 'Saved matter' }), packetMatterSummaryCopy: () => ({ en: '' }), packetDisplayCopy: () => ({ en: '' }) },
  '@/components/expungement-ai/SponsorCapacityNotice': { SponsorCapacityNotice: blank },
  'next/link': ({ href, children }) => React.createElement('a', { href }, children),
  'lucide-react': { Download: blank, MessageCircle: blank },
  '@/components/expungement-ai/BriefcaseShell': { BriefcaseShell: ({ children }) => React.createElement('main', null, children) },
  '@/components/expungement-ai/BriefcaseViews': { MatterStatusBadge: blank, MatterStepper: blank },
  '@/components/expungement-ai/LocalizationProvider': {
    LocalizedCopy: copy => copy[locale] ?? copy.en,
    LocalizedRuntimeText: ({ text, vars }) => resolveRuntimeText(locale, text, { vars })
  },
  '@/lib/expungement-ai/auth': { requireConsumerBriefcaseSession: async () => { assert(authenticated, 'auth_required'); return { userId: 'synthetic-owner', userEmail: 'owner@example.test' }; } },
  '@/lib/expungement-ai/briefcase': { getBriefcaseItem: async (owner, id) => { reads++; assert.equal(owner, 'synthetic-owner'); assert.equal(id, 'synthetic-matter'); return item; } },
  '@/lib/expungement-ai/briefcase-presentation-authority': { decorateBriefcaseItemForPresentation: async ({ item }) => item },
  '@/lib/expungement-ai/frontend/briefcase-presentation': { humanMatterState: () => 'Matter saved' },
  '@/lib/expungement-ai/packet-generation': { getConsumerPacketStatus: () => assert.fail('Unexpected generation read') },
  '@/components/expungement-ai/PacketGenerateButton': { PacketGenerateButton: () => assert.fail('Generation must stay held') }
};
const mod = new Module(filename);
mod.filename = filename + '.cjs';
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
} }).outputText, mod.filename);
const page = mod.exports.default;
const base = {
  id: 'synthetic-matter', authorityStatus: 'protected_draft', jurisdiction: 'MS',
  pathwayId: 'non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
  resultCode: 'packet_ready_with_caution', paymentState: 'sponsored', verificationStatus: 'unverified',
  packetProgress: 'in_progress', summary: '', checklist: [], nextSteps: [],
  packetDraft: { status: 'available', initialAnswers: {}, questions: [], expectedComponents: [] },
  commercialActions: { fulfillmentAvailable: false, generationAllowed: false, checkoutAllowed: false },
  artifact: { status: 'unavailable' }
};
let checks = 0;
for (const language of ['en', 'es']) {
  locale = language;
  for (const draftAvailable of [true, false]) {
    item = structuredClone(base);
    if (!draftAvailable) item.packetDraft = { status: 'unavailable' };
    const before = structuredClone(item);
    const html = renderToStaticMarkup(await page({ params: Promise.resolve({ packetId: item.id }) }));
    const held = language === 'en' ? 'Packet generation is not available yet. You can still review and update your packet information.' : 'La generación del paquete aún no está disponible. Aún puede revisar y actualizar la información de su paquete.';
    const unavailable = language === 'en' ? 'A packet is not available for this route yet.' : 'Aún no hay un paquete disponible para esta ruta.';
    assert.equal(html.includes(held), draftAvailable);
    assert.equal(html.includes(unavailable), !draftAvailable);
    assert.equal(html.includes('href="/briefcase/synthetic-matter/packet-information"'), draftAvailable);
    assert(!html.includes('Your packet is covered') && !html.includes('Su paquete está cubierto'));
    assert(!html.includes('$50') && !html.includes('Generate my packet'));
    assert.deepEqual(item, before);
    checks++;
  }
}
authenticated = false;
const readsBefore = reads;
await assert.rejects(() => page({ params: Promise.resolve({ packetId: 'synthetic-matter' }) }), /auth_required/);
assert.equal(reads, readsBefore);
console.log(JSON.stringify({ status: 'PASS', checks: checks + 1, scope: 'Actual page render with presentation/auth fixtures and real EN/ES resolver; held generation, unchanged Continue destination, unavailable-draft fallback and auth refusal. No actual protected reads or hosted journey.' }));
