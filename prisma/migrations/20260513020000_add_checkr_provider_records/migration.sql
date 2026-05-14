CREATE TABLE "ProviderCandidate" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerCandidateId" TEXT NOT NULL,
    "customId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderInvitation" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerInvitationId" TEXT NOT NULL,
    "providerCandidateId" TEXT NOT NULL,
    "caseId" TEXT,
    "packageSlug" TEXT NOT NULL,
    "invitationUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderCandidate_providerCandidateId_key" ON "ProviderCandidate"("providerCandidateId");
CREATE UNIQUE INDEX "ProviderCandidate_customId_key" ON "ProviderCandidate"("customId");
CREATE INDEX "ProviderCandidate_provider_idx" ON "ProviderCandidate"("provider");
CREATE INDEX "ProviderCandidate_email_idx" ON "ProviderCandidate"("email");
CREATE INDEX "ProviderCandidate_userId_idx" ON "ProviderCandidate"("userId");
CREATE INDEX "ProviderCandidate_caseId_idx" ON "ProviderCandidate"("caseId");
CREATE UNIQUE INDEX "ProviderInvitation_providerInvitationId_key" ON "ProviderInvitation"("providerInvitationId");
CREATE INDEX "ProviderInvitation_provider_idx" ON "ProviderInvitation"("provider");
CREATE INDEX "ProviderInvitation_providerCandidateId_idx" ON "ProviderInvitation"("providerCandidateId");
CREATE INDEX "ProviderInvitation_caseId_idx" ON "ProviderInvitation"("caseId");
CREATE INDEX "ProviderInvitation_status_idx" ON "ProviderInvitation"("status");
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");
CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "AuditEvent"("targetType", "targetId");

ALTER TABLE "ProviderCandidate" ADD CONSTRAINT "ProviderCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderCandidate" ADD CONSTRAINT "ProviderCandidate_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderInvitation" ADD CONSTRAINT "ProviderInvitation_providerCandidateId_fkey" FOREIGN KEY ("providerCandidateId") REFERENCES "ProviderCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderInvitation" ADD CONSTRAINT "ProviderInvitation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
