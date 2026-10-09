/** Convert the displayed wall time in the event's timezone, independently of the operator's browser. */
export function clinicEventTime(value: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a complete event date and time.");
  const target = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(target)) throw new Error("Enter a valid event date and time.");
  let formatter: Intl.DateTimeFormat;
  try { formatter = new Intl.DateTimeFormat("en-CA", {timeZone, year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}); }
  catch { throw new Error("Choose a valid timezone, such as America/Chicago."); }
  function wallTime(instant: number) {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
    return Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
  }
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const adjustment = target - wallTime(instant);
    if (!adjustment) return new Date(instant).toISOString();
    instant += adjustment;
  }
  throw new Error("This time does not exist in the event timezone because the clocks change. Choose another time.");
}
