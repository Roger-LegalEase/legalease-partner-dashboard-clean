/**
 * The participant-facing safety statement stored on every consumer packet row.
 *
 * `public.rcap_document_packets.safety_disclaimer` is `text not null` in the
 * canonical schema, and both consumer enqueue transactions
 * (`enqueue_verified_consumer_packet_render`,
 * `enqueue_verified_sponsored_packet_render`) insert it straight from the
 * render packet the application supplies. Every builder of that packet must
 * carry this value, so it lives in one dependency-free module.
 */
export const CONSUMER_PACKET_SAFETY_DISCLAIMER =
  "This personalized self-help packet is not legal advice and does not guarantee court approval. Review every answer and confirm current local filing requirements before filing.";
