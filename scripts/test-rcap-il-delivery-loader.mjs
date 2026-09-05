// Test-only boundary replacements; never registered by the application/worker.
const doubles = new URL('./test-rcap-il-delivery-boundaries.mjs', import.meta.url).href;
export async function resolve(specifier, context, next) {
  const subject = /(?:packet-generation|consumer-render-request|personalized-packet)\.ts$/.test(context.parentURL ?? '');
  if (subject && [
    '@/lib/expungement-ai/briefcase', '@/lib/expungement-ai/packet-information',
    '@/lib/expungement-ai/briefcase-presentation-authority'
  ].includes(specifier)) return { url: doubles, shortCircuit: true };
  return next(specifier, context);
}
