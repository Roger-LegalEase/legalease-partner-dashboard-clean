/**
 * Emits a JSON-LD structured-data block.
 *
 * The payload is built server-side from our own typed view models (see src/lib/content/seo.ts) —
 * never from a request parameter — and JSON.stringify escapes the values. The `</script>` sequence
 * is neutralized defensively so a title that happens to contain markup can never close the script
 * element early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
