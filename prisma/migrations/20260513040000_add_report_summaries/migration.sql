CREATE TABLE "ReportSummary" (
    "id" TEXT NOT NULL,
    "providerReportId" TEXT NOT NULL,
    "plainEnglishSummary" TEXT NOT NULL,
    "whatWasFound" JSONB NOT NULL,
    "possibleImpact" JSONB NOT NULL,
    "possibleErrors" JSONB NOT NULL,
    "expungementReadiness" JSONB NOT NULL,
    "recommendedNextSteps" JSONB NOT NULL,
    "customerQuestions" JSONB NOT NULL,
    "disclaimers" JSONB NOT NULL,
    "confidence" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "rawOutput" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportSummary_providerReportId_key" ON "ReportSummary"("providerReportId");
CREATE INDEX "ReportSummary_confidence_idx" ON "ReportSummary"("confidence");

ALTER TABLE "ReportSummary" ADD CONSTRAINT "ReportSummary_providerReportId_fkey" FOREIGN KEY ("providerReportId") REFERENCES "ProviderReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
