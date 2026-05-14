CREATE TABLE "CaseOperationState" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "manualReviewNeeded" BOOLEAN NOT NULL DEFAULT false,
    "manualReviewReason" TEXT,
    "manualReviewResolutionNote" TEXT,
    "manualReviewFlaggedAt" TIMESTAMP(3),
    "manualReviewFlaggedById" TEXT,
    "manualReviewFlaggedByEmail" TEXT,
    "manualReviewResolvedAt" TIMESTAMP(3),
    "manualReviewResolvedById" TEXT,
    "manualReviewResolvedByEmail" TEXT,
    "anonymizationStatus" TEXT NOT NULL DEFAULT 'none',
    "anonymizationReason" TEXT,
    "anonymizationRequestedAt" TIMESTAMP(3),
    "anonymizationRequestedById" TEXT,
    "anonymizationRequestedByEmail" TEXT,
    "anonymizationCompletedAt" TIMESTAMP(3),
    "anonymizationCompletedById" TEXT,
    "anonymizationCompletedByEmail" TEXT,
    "displayState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseOperationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaseOperationState_caseId_key" ON "CaseOperationState"("caseId");
CREATE INDEX "CaseOperationState_manualReviewNeeded_idx" ON "CaseOperationState"("manualReviewNeeded");
CREATE INDEX "CaseOperationState_anonymizationStatus_idx" ON "CaseOperationState"("anonymizationStatus");
CREATE INDEX "CaseOperationState_updatedAt_idx" ON "CaseOperationState"("updatedAt");

ALTER TABLE "CaseOperationState" ADD CONSTRAINT "CaseOperationState_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
