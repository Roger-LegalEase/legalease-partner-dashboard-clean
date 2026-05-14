CREATE TYPE "MonitoringEnrollmentStatus" AS ENUM ('ACTIVE', 'CANCELED', 'REVOKED');

ALTER TABLE "User" ADD COLUMN "monitoringConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "monitoringConsentAt" TIMESTAMP(3);

CREATE TABLE "MonitoringEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "providerCandidateId" TEXT NOT NULL,
    "status" "MonitoringEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerContinuousCheckId" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonitoringAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "caseId" TEXT,
    "provider" TEXT NOT NULL,
    "providerAlertId" TEXT NOT NULL,
    "providerCandidateId" TEXT,
    "providerContinuousCheckId" TEXT,
    "reportId" TEXT,
    "alertType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonitoringEnrollment_providerContinuousCheckId_key" ON "MonitoringEnrollment"("providerContinuousCheckId");
CREATE INDEX "MonitoringEnrollment_userId_idx" ON "MonitoringEnrollment"("userId");
CREATE INDEX "MonitoringEnrollment_caseId_idx" ON "MonitoringEnrollment"("caseId");
CREATE INDEX "MonitoringEnrollment_providerCandidateId_idx" ON "MonitoringEnrollment"("providerCandidateId");
CREATE INDEX "MonitoringEnrollment_status_idx" ON "MonitoringEnrollment"("status");
CREATE UNIQUE INDEX "MonitoringAlert_providerAlertId_key" ON "MonitoringAlert"("providerAlertId");
CREATE INDEX "MonitoringAlert_userId_idx" ON "MonitoringAlert"("userId");
CREATE INDEX "MonitoringAlert_caseId_idx" ON "MonitoringAlert"("caseId");
CREATE INDEX "MonitoringAlert_providerCandidateId_idx" ON "MonitoringAlert"("providerCandidateId");
CREATE INDEX "MonitoringAlert_providerContinuousCheckId_idx" ON "MonitoringAlert"("providerContinuousCheckId");
CREATE INDEX "MonitoringAlert_createdAt_idx" ON "MonitoringAlert"("createdAt");

ALTER TABLE "MonitoringEnrollment" ADD CONSTRAINT "MonitoringEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringEnrollment" ADD CONSTRAINT "MonitoringEnrollment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MonitoringEnrollment" ADD CONSTRAINT "MonitoringEnrollment_providerCandidateId_fkey" FOREIGN KEY ("providerCandidateId") REFERENCES "ProviderCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonitoringAlert" ADD CONSTRAINT "MonitoringAlert_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
