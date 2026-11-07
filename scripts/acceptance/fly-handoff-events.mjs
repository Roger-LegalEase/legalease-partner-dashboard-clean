// Fly's native JSON schema uses omitempty for these integer/boolean fields.
// Source: superfly/fly-go machine_types.go, blob a781102cf7e2acefdac621e5e0d06836adb71257.
const integers = ['exit_code', 'guest_exit_code', 'guest_signal', 'signal'];
const booleans = ['oom_killed', 'requested_stop', 'restarting'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);

export function nativeExit(event) {
  if (event?.type !== 'exit' || !object(event.request)) return null;
  const payloads = [];
  if (own(event.request, 'exit_event')) payloads.push(['request.exit_event', event.request.exit_event]);
  if (own(event.request, 'MonitorEvent')) {
    if (!object(event.request.MonitorEvent)) return null;
    if (own(event.request.MonitorEvent, 'exit_event')) payloads.push(['request.MonitorEvent.exit_event', event.request.MonitorEvent.exit_event]);
  }
  if (!payloads.length) return null;
  const parsed = [];
  for (const [payloadPath, payload] of payloads) {
    if (!object(payload)) return null;
    const fields = {}, defaultedFields = [];
    for (const key of integers) {
      if (!own(payload, key)) { fields[key] = 0; defaultedFields.push(key); }
      else if (Number.isSafeInteger(payload[key])) fields[key] = payload[key];
      else return null;
    }
    for (const key of booleans) {
      if (!own(payload, key)) { fields[key] = false; defaultedFields.push(key); }
      else if (typeof payload[key] === 'boolean') fields[key] = payload[key];
      else return null;
    }
    parsed.push({payloadPath, fields, defaultedFields});
  }
  if (parsed.some(p => JSON.stringify(p.fields) !== JSON.stringify(parsed[0].fields))) return null;
  return {...parsed[0].fields, payloads: parsed.map(({payloadPath, defaultedFields}) => ({payloadPath, defaultedFields}))};
}

export function cleanNativeExit(event) {
  const exit = nativeExit(event);
  return exit?.requested_stop === true && exit.exit_code === 0 && exit.guest_exit_code === 0 && exit.guest_signal !== 9 && exit.signal !== 9 && exit.oom_killed === false ? exit : null;
}

// Retain actual presence/absence before interpretation. Never emit arbitrary
// request text, environment values or unknown payload fields into the artifact.
export function projectNativeEvents(events) {
  if (!Array.isArray(events) || events.length > 50) throw Error('native_event_history_shape_invalid');
  const payload = value => {
    if (!object(value)) return null;
    const result = {};
    for (const key of [...integers, ...booleans, 'exited_at']) if (own(value, key)) {
      const v = value[key];
      result[key] = v === null || typeof v === 'boolean' || typeof v === 'number' || (key === 'exited_at' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(v)) ? v : 'INVALID_NATIVE_TYPE';
    }
    return result;
  };
  return events.map(event => {
    const result = {type: typeof event?.type === 'string' && /^[a-z_]{1,32}$/.test(event.type) ? event.type : 'invalid', timestamp: Number.isSafeInteger(event?.timestamp) ? event.timestamp : null};
    if (object(event?.request)) {
      result.request = {};
      if (own(event.request, 'exit_event')) result.request.exit_event = payload(event.request.exit_event);
      if (own(event.request, 'MonitorEvent')) result.request.MonitorEvent = object(event.request.MonitorEvent) ? (own(event.request.MonitorEvent, 'exit_event') ? {exit_event: payload(event.request.MonitorEvent.exit_event)} : {}) : null;
    }
    return result;
  });
}
