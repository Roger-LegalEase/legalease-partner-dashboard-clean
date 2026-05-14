CREATE TABLE "ProviderReport" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReportId" TEXT NOT NULL,
    "providerCandidateId" TEXT,
    "caseId" TEXT,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "adjudication" TEXT,
    "assessment" TEXT,
    "summary" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseNotice" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseNotice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderReport_providerReportId_key" ON "ProviderReport"("providerReportId");
CREATE INDEX "ProviderReport_provider_idx" ON "ProviderReport"("provider");
CREATE INDEX "ProviderReport_providerCandidateId_idx" ON "ProviderReport"("providerCandidateId");
CREATE INDEX "ProviderReport_caseId_idx" ON "ProviderReport"("caseId");
CREATE INDEX "ProviderReport_status_idx" ON "ProviderReport"("status");
CREATE INDEX "CaseNotice_caseId_idx" ON "CaseNotice"("caseId");
CREATE INDEX "CaseNotice_audience_idx" ON "CaseNotice"("audience");
CREATE INDEX "CaseNotice_severity_idx" ON "CaseNotice"("severity");

ALTER TABLE "ProviderReport" ADD CONSTRAINT "ProviderReport_providerCandidateId_fkey" FOREIGN KEY ("providerCandidateId") REFERENCES "ProviderCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderReport" ADD CONSTRAINT "ProviderReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseNotice" ADD CONSTRAINT "CaseNotice_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
