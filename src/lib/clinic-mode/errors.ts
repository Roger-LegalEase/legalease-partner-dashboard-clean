export type ClinicServiceErrorCode = "unauthenticated" | "forbidden" | "unavailable" | "not_found" | "conflict";

export class ClinicServiceError extends Error {
  constructor(readonly code: ClinicServiceErrorCode, message: string) {
    super(message);
    this.name = "ClinicServiceError";
  }
}
