import "server-only";

import { APPROVED_PROCESSORS, type ApprovedProcessorKey } from "@/lib/expungement-ai/privacy/contract";
import {
  PrivacyProcessorConfigError,
  requireProcessorConfig
} from "@/lib/expungement-ai/privacy/processor-config";

/**
 * What a processor actually did about an erasure, as opposed to what we hoped.
 *
 * The step this replaces wrote "sent" for every processor whose contract entry
 * said personalDataHeld, and "not_applicable" for the one that said it did not.
 * No request left the building. A participant reading that receipt would have
 * been told their data was passed on for deletion at three companies when
 * nothing had been transmitted to any of them, and the deletion would have
 * reported completed on the strength of it.
 *
 * So the vocabulary distinguishes the two things that were being conflated:
 * whether a processor holds data, and whether we did anything about it.
 */
export type ProcessorErasureStatus =
  /** A real request succeeded and the provider's reference is recorded. */
  | "acknowledged"
  /** A real request was transmitted; the provider acknowledges asynchronously. */
  | "sent"
  /** Repository evidence proves no PII is held, or no deletion request is legally appropriate. */
  | "not_applicable"
  /** A real request was attempted and failed after the permitted attempts. */
  | "failed"
  /** Queued and not yet attempted, or attempted and retryable. Must be retried. */
  | "pending";

/** Only these two mean nothing is outstanding. */
export const PROCESSOR_SETTLED_STATUSES: readonly ProcessorErasureStatus[] = ["acknowledged", "not_applicable"];

/**
 * The retry and pending policy, stated rather than implied.
 *
 * maxAttemptsPerRun is per deletion run, not per lifetime: a run that exhausts
 * it records `failed` or `pending` and the request stays resumable, so a later
 * run tries again from the ledger rather than starting the whole deletion over.
 *
 * A `sent` outcome settles the step only for an adapter that declares its
 * provider offers no acknowledgement. Otherwise `sent` is still outstanding —
 * transmitting a request is not the same as the provider having honoured it,
 * and treating it as equivalent is how the original defect read.
 */
export const PROCESSOR_ERASURE_POLICY = {
  maxAttemptsPerRun: 2,
  settled: PROCESSOR_SETTLED_STATUSES,
  outstanding: ["pending", "failed"] as const,
  sentSettlesOnlyWithoutAcknowledgement: true,
  accountDeletionBlockedByOutstandingRequiredProcessor: true
} as const;

export type ProcessorErasureRequest = {
  processorKey: ApprovedProcessorKey;
  requestId: string;
  userId: string;
  subjectPseudonym: string;
  email: string | null;
  /** A durable provider reference from an earlier asynchronous acceptance. */
  providerReference?: string | null;
};

export type ProcessorErasureOutcome = {
  status: ProcessorErasureStatus;
  /** The provider's own reference. Required for `acknowledged`; never invented. */
  reference: string | null;
  detail: Record<string, unknown>;
};

export type ProcessorErasureAdapter = {
  key: ApprovedProcessorKey;
  /**
   * Whether an outstanding outcome blocks the deletion from completing.
   * A processor that genuinely holds nothing is not required; one that holds
   * participant data is, because "we could not tell them" is not a deletion.
   */
  required: boolean;
  /** True when the provider replies asynchronously and `sent` is as good as it gets. */
  acknowledgementOffered: boolean;
  erase(request: ProcessorErasureRequest): Promise<ProcessorErasureOutcome>;
};

/** Does this outcome leave work outstanding for this adapter? */
export function processorOutcomeIsSettled(
  adapter: ProcessorErasureAdapter,
  outcome: ProcessorErasureOutcome
): boolean {
  if (PROCESSOR_SETTLED_STATUSES.includes(outcome.status)) return true;
  if (outcome.status === "sent" && !adapter.acknowledgementOffered) return true;
  return false;
}

/**
 * The four approved processors, each either implemented or explicitly classified.
 *
 * Two are classified rather than implemented, and the classification is the
 * honest answer rather than a shortcut:
 *
 *   payment_processor — the processor is the independent controller of its own
 *     transaction records and is legally required to retain them. A deletion
 *     request is not appropriate and would not be honoured, so pretending one
 *     was sent would misdescribe both what we did and what the participant can
 *     expect. What actually happens is recorded instead: the link from those
 *     records to this account is removed on our side, which the pseudonymization
 *     step performs and the receipt already explains.
 *
 *   packet_render_worker — holds no participant personal data of its own. It
 *     reads a job and writes an artifact; the artifact is removed by the storage
 *     sweep and the job row is pseudonymized in place. There is nothing to ask
 *     it to delete.
 *
 * The other two are real outbound operations. Where the provider is not
 * configured, the outcome is `pending` — never `sent` — because no request was
 * transmitted, and a deletion that cannot reach a processor holding participant
 * data has not finished. The deployment readiness gate is what stops the
 * participant-facing control appearing before that configuration exists.
 */
export function defaultProcessorAdapters(): ProcessorErasureAdapter[] {
  return [
    {
      key: "email_delivery",
      required: true,
      acknowledgementOffered: true,
      async erase(request) {
        let config;
        try {
          config = requireProcessorConfig("email_delivery") as { endpoint: string; token: string };
        } catch (error) {
          if (!(error instanceof PrivacyProcessorConfigError)) throw error;
          return {
            status: "pending",
            reference: null,
            detail: {
              reason: "no_provider_configured",
              explanation:
                "No email suppression endpoint is configured, so no request was transmitted. This is recorded as pending rather than sent: the participant's address has not yet been suppressed at the provider."
            }
          };
        }
        return transmit(config.endpoint, config.token, request, "suppress");
      }
    },
    {
      key: "payment_processor",
      required: false,
      acknowledgementOffered: false,
      async erase() {
        return {
          status: "not_applicable",
          reference: null,
          detail: {
            reason: "independent_controller_retains_transaction_records",
            deletionRequested: false,
            explanation:
              "The payment processor is the independent controller of its own transaction records and is required to retain them, so no deletion request is appropriate and none was sent. The link from those records to this account is removed on our side by the pseudonymization step.",
            retentionTreatment: "retained_for_financial_compliance"
          }
        };
      }
    },
    {
      key: "product_analytics",
      required: true,
      acknowledgementOffered: true,
      async erase(request) {
        let config;
        try {
          config = requireProcessorConfig("product_analytics") as { endpoint: string; token: string };
        } catch (error) {
          if (!(error instanceof PrivacyProcessorConfigError)) throw error;
          return {
            status: "pending",
            reference: null,
            detail: {
              reason: "no_provider_configured",
              explanation:
                "No analytics erasure endpoint is configured, so no request was transmitted. Retained event rows are de-identified locally by the deletion pipeline, but the provider has not been asked to erase its own copy."
            }
          };
        }
        return transmit(config.endpoint, config.token, request, "erase");
      }
    },
    {
      key: "packet_render_worker",
      required: false,
      acknowledgementOffered: false,
      async erase() {
        return {
          status: "not_applicable",
          reference: null,
          detail: {
            reason: "holds_no_participant_personal_data",
            deletionRequested: false,
            explanation:
              "The render worker reads a job and writes an artifact; it stores no participant personal data of its own. The artifact is removed by the storage sweep and the job row is pseudonymized in place, so there is nothing to ask it to delete."
          }
        };
      }
    }
  ];
}

/** One real outbound request. Never reports success it did not receive. */
async function transmit(
  endpoint: string,
  token: string,
  request: ProcessorErasureRequest,
  action: "suppress" | "erase"
): Promise<ProcessorErasureOutcome> {
  const checkingAsynchronousRequest = Boolean(request.providerReference);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        action: checkingAsynchronousRequest ? "status" : action,
        requestedAction: action,
        providerReference: request.providerReference ?? null,
        subject: request.subjectPseudonym,
        email: request.email,
        requestId: request.requestId
      })
    });
    const responseReference = response.headers.get("x-request-id");
    const reference = checkingAsynchronousRequest ? request.providerReference! : responseReference;
    if (response.ok) {
      // 202 means the provider accepted work for later processing. Its request
      // reference proves submission, not erasure, so acknowledgement-enabled
      // adapters must keep the deletion outstanding until a later retry gets
      // a synchronous completion response.
      if (response.status === 202) {
        return reference
          ? {
            status: "sent",
            reference,
            detail: { httpStatus: response.status, action, asynchronous: true, statusCheck: checkingAsynchronousRequest }
          }
          : {
            status: "pending",
            reference: null,
            detail: { httpStatus: response.status, action, asynchronous: true, retryable: true, reason: "missing_provider_reference" }
          };
      }
      if (checkingAsynchronousRequest) {
        // The same configured endpoint is the status protocol: a retry sends
        // action=status with the durable reference, and only a 2xx response
        // echoing that exact reference proves completion.
        return responseReference === request.providerReference
          ? {
            status: "acknowledged",
            reference,
            detail: { httpStatus: response.status, action, asynchronous: true, statusCheck: true }
          }
          : {
            status: "sent",
            reference,
            detail: { httpStatus: response.status, action, asynchronous: true, statusCheck: true, reason: "reference_not_confirmed" }
          };
      }
      // Acknowledged only when the provider hands back its own reference.
      // Without one there is nothing to show a participant or an auditor, so
      // the honest answer is that it was sent.
      return reference
        ? { status: "acknowledged", reference, detail: { httpStatus: response.status, action } }
        : { status: "sent", reference: null, detail: { httpStatus: response.status, action } };
    }
    // 5xx and 429 are worth another attempt; a 4xx will not become a 2xx.
    const retryable = response.status >= 500 || response.status === 429;
    return {
      status: retryable ? "pending" : "failed",
      reference,
      detail: { httpStatus: response.status, action, retryable, asynchronous: checkingAsynchronousRequest, statusCheck: checkingAsynchronousRequest }
    };
  } catch (error) {
    return {
      status: "pending",
      reference: request.providerReference ?? null,
      detail: {
        action,
        asynchronous: checkingAsynchronousRequest,
        statusCheck: checkingAsynchronousRequest,
        transportError: error instanceof Error ? error.message : String(error),
        retryable: true
      }
    };
  }
}

/** Every approved processor has an adapter, and every adapter an approved processor. */
export function assertAdapterCoverage(adapters: readonly ProcessorErasureAdapter[]): void {
  const byKey = new Set(adapters.map((adapter) => adapter.key));
  const missing = APPROVED_PROCESSORS.filter((processor) => !byKey.has(processor.key));
  if (missing.length > 0) {
    throw new Error(
      `no erasure adapter for approved processor(s): ${missing.map((processor) => processor.key).join(", ")}`
    );
  }
}
