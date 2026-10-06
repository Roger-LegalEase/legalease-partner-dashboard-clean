// Independent browser/API cleanup proof. DB closure is proved separately in
// the smoke's rolled-back transaction. Never expose response bodies or cookies.
const RECOVERY = 'clinic_reset_recovery';
const PENDING = 'clinic_reset_pending';
const CLINIC = ['clinic_session', 'clinic_device', 'clinic_event'];

function responseCookies(headers, jar) {
  const lines = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    // Older Fetch implementations combine headers. Split only at a new cookie
    // name=value boundary, never at the comma within an Expires date.
    : (headers.get('set-cookie') ?? '').split(/,(?=\s*[!#$%&'*+.^_`|~0-9A-Za-z-]+=)/);
  const deleted = new Set();
  for (const line of lines) {
    const [pair, ...attributes] = line.split(';');
    const equals = pair.indexOf('=');
    if (equals < 1) continue;
    const name = pair.slice(0, equals).trim(), value = pair.slice(equals + 1).trim();
    const attrs = new Map(attributes.map(attribute => {
      const at = attribute.indexOf('=');
      return at < 0 ? [attribute.trim().toLowerCase(), '']
        : [attribute.slice(0, at).trim().toLowerCase(), attribute.slice(at + 1).trim()];
    }));
    const maxAge = attrs.get('max-age');
    const expired = maxAge !== undefined && /^-?\d+$/.test(maxAge)
      ? Number(maxAge) <= 0 : Date.parse(attrs.get('expires') ?? '') <= Date.now();
    if (expired) { jar.delete(name); deleted.add(name); }
    else {
      deleted.delete(name);
      if (name !== RECOVERY && name !== PENDING) continue;
      // Store only opaque cookie octets; never decode or inspect the receipt.
      if (!/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/.test(value)) throw Error('Invalid reset cookie');
      jar.set(name, value);
    }
  }
  return deleted;
}

export async function runCleanDeviceReset(request) {
  const jar = new Map();
  const evidence = { passed: false };
  async function post(action) {
    const response = await request('/api/clinic/session/reset', {
      method: 'POST', redirect: 'manual',
      ...(jar.size ? { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') } : {}),
      body: { action, reason: 'staff_reset' }
    });
    const body = await response.json().catch(() => null);
    const deleted = responseCookies(response.headers, jar);
    return { response, body, deleted };
  }
  try {
    const prepare = await post('prepare');
    evidence.resetPrepareStatus = prepare.response.status;
    evidence.resetPrepared = prepare.body?.prepared === true;
    evidence.resetPrepareStateIsNoSession = prepare.body?.state === 'no_session';
    evidence.resetRecoveryCookieIssued = jar.has(RECOVERY);
    if (evidence.resetPrepareStatus !== 200 || !evidence.resetPrepared
      || !evidence.resetPrepareStateIsNoSession || !evidence.resetRecoveryCookieIssued) return evidence;

    const close = await post('close');
    evidence.resetCloseStatus = close.response.status;
    evidence.resetCloseSuccess = close.body?.success === true;
    evidence.resetRevocationConfirmed = close.body?.revocationConfirmed === true;
    evidence.resetSignOutConfirmed = close.body?.signOutConfirmed === true;
    evidence.resetClearSiteDataStorage = (close.response.headers.get('clear-site-data') ?? '')
      .split(',').some(value => value.trim() === '"storage"');
    evidence.resetClinicCookiesCleared = CLINIC.every(name => close.deleted.has(name));
    if (evidence.resetCloseStatus !== 200 || !evidence.resetCloseSuccess
      || !evidence.resetRevocationConfirmed || !evidence.resetSignOutConfirmed
      || !evidence.resetClearSiteDataStorage || !evidence.resetClinicCookiesCleared) return evidence;

    const complete = await post('complete');
    evidence.resetCompleteStatus = complete.response.status;
    evidence.resetCompleteSuccess = complete.body?.success === true;
    // A clean anonymous device has no canonical event association. Only /clinic
    // is valid; neither request input nor a response redirect can widen it.
    evidence.resetCleanEntryPathSafe = complete.body?.cleanEntryPath === '/clinic';
    evidence.resetRecoveryRetired = [RECOVERY, PENDING].every(name => complete.deleted.has(name) && !jar.has(name));
    evidence.passed = evidence.resetCompleteStatus === 200 && evidence.resetCompleteSuccess
      && evidence.resetCleanEntryPathSafe && evidence.resetRecoveryRetired;
  } catch {
    // Fetch/parser failures may contain secret response/request data. Report
    // only this classification, never the exception or raw response.
    evidence.resetProtocolError = true;
  }
  return evidence;
}
