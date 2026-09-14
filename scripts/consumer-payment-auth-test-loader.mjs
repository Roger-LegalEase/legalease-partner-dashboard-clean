// Preserve explicit verified/unverified synthetic sessions at the existing mock
// boundary. The shared historical payment double predates isVerified and drops it.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const doubles = pathToFileURL(path.resolve('scripts/lib/consumer-payment-test-doubles.mjs')).href;
const source = `import { currentSession } from ${JSON.stringify(doubles)};
export * from ${JSON.stringify(doubles)};
export async function getServerAuthState() { return { ...currentSession() }; }
export async function getRcapBriefcaseAuthState() {
  const s = currentSession();
  return { isAuthenticated: s.isAuthenticated, isVerified: s.isVerified === true,
    userId: s.userId, userEmail: s.email, mode: 'supabase' };
}`;
export async function resolve(specifier, context, next) {
  if (['@/lib/rcap/briefcase/auth', '@/lib/supabase/auth-server'].includes(specifier)) {
    return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
  }
  return next(specifier, context);
}
