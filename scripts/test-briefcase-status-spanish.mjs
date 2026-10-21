import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
// Expose only the existing context so both locales render the native text consumer.
const file = 'src/components/expungement-ai/LocalizationProvider.tsx';
const source = ts.transpileModule(fs.readFileSync(file, 'utf8') + '\nexport { LocalizationContext };', {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`, {
  data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source }
});
const { LocalizationContext, LocalizedRuntimeText } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const { resolveRuntimeText, t } = await import('../src/lib/expungement-ai/localization.ts');
const { humanMatterState } = await import('../src/lib/expungement-ai/frontend/briefcase-presentation.ts');
const pairs = [
  ['Matter saved', 'Asunto guardado'],
  ['A self-help packet may be available', 'Puede haber un paquete de autoayuda disponible'],
  ['Packet details in progress', 'Detalles del paquete en curso'],
  ['Ready to generate', 'Listo para generar'],
  ['Payment confirmed', 'Pago confirmado'],
  ['Filed', 'Presentado'],
  ['Waiting on the court', 'En espera del tribunal'],
  ['Decision received', 'Decisión recibida'],
  ['Matter details unavailable', 'Los detalles del asunto no están disponibles']
];
const productNamePairs = [
  [
    "Back to Briefcase",
    "Volver al Maletín"
  ],
  [
    "This matter is not in your Briefcase.",
    "Este asunto no está en su Maletín."
  ],
  [
    "We saved this result and its state-specific next steps in your free Briefcase. You can return anytime as you gather information or follow the guidance below.",
    "Guardamos este resultado y los próximos pasos correspondientes a su estado en su Maletín gratuito. Puede volver cuando quiera mientras reúne información o sigue las indicaciones que aparecen a continuación."
  ],
  [
    "This packet belongs to your private Briefcase matter.",
    "Este paquete pertenece a su asunto privado en su Maletín."
  ],
  [
    "Your Briefcase is free. Complete your packet information and pay only when you're ready to generate your packet.",
    "Su Maletín es gratuito. Complete la información de su paquete y pague solo cuando esté listo para prepararlo."
  ],
  [
    "Open your Briefcase to review packet availability and the next steps for this result.",
    "Abra su Maletín para revisar la disponibilidad del paquete y los próximos pasos para este resultado."
  ]
];
const base = {
  authorityStatus: 'available', resultCode: 'packet_ready', packetType: 'filing_packet',
  artifact: { status: 'unavailable' }, packetDraft: { status: 'available' },
  packetProgress: 'not_started', paymentState: 'unpaid',
  commercialActions: { fulfillmentAvailable: true, checkoutAllowed: false, generationAllowed: false }
};
const cases = [
  [{ resultCode: 'hard_stop' }, 'Matter saved'],
  [{}, 'A self-help packet may be available'],
  [{ packetProgress: 'in_progress' }, 'Packet details in progress'],
  [{ packetProgress: 'verified', commercialActions: { ...base.commercialActions, checkoutAllowed: true } }, 'Ready to generate'],
  [{ packetProgress: 'verified', paymentState: 'paid' }, 'Payment confirmed'],
  [{ authorityStatus: 'unavailable' }, 'Matter details unavailable'],
  [{ packetDraft: { status: 'unavailable' } }, 'Matter details unavailable'],
  [{ packetProgress: 'verified' }, 'Packet not available yet'],
  [{ commercialActions: { ...base.commercialActions, fulfillmentAvailable: false }, paymentState: 'paid' }, 'Packet not available yet'],
  [{ resultCode: 'needs_review' }, 'We need a little more information'],
  [{ resultCode: 'guidance_only' }, 'Next steps saved'],
  [{ packetProgress: 'facts_complete' }, 'Packet facts complete']
];
for (const [overrides, expected] of cases) {
  const saved = JSON.stringify({ ...base, ...overrides });
  const item = JSON.parse(saved);
  assert.equal(humanMatterState(item), expected);
  assert.equal(JSON.stringify(item), saved, 'Presentation must preserve saved state and commercial restrictions');
}
// Filed/court/decision are declared vocabulary, not milestones this mapper currently emits.
const vocabulary = fs.readFileSync('src/lib/expungement-ai/frontend/briefcase-presentation.ts', 'utf8');
for (const [label] of pairs) assert.ok(vocabulary.includes(`| "${label}"`));
const rows = [];
for (const locale of ['en', 'es']) {
  const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
  for (const [en, es] of [...pairs, ...productNamePairs]) {
    const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value }, React.createElement(LocalizedRuntimeText, { text: en })));
    rows.push({ locale, en, expected: locale === 'es' ? es : en, markup });
  }
}
assert.equal(resolveRuntimeText('es', 'Packet facts complete'), 'Datos del paquete completos');
assert.equal(resolveRuntimeText('es', 'Packet ready'), 'Paquete listo');
assert.equal(resolveRuntimeText('es', 'Unmapped synthetic label'), 'Unmapped synthetic label');
const failures = rows.filter(row => row.markup !== renderToStaticMarkup(React.createElement(React.Fragment, null, row.expected)));
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', mappedStates: cases.length, nativeRenders: rows.length, failures, rows }, null, 2));
assert.equal(failures.length, 0, 'All status labels and product names must render exact reviewed ES; EN remains unchanged');
