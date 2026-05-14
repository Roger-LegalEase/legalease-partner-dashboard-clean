CREATE TABLE "WilmaChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "facts" JSONB NOT NULL,
    "decision" JSONB,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WilmaChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WilmaChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WilmaChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WilmaChatSession_userId_idx" ON "WilmaChatSession"("userId");
CREATE INDEX "WilmaChatSession_caseId_idx" ON "WilmaChatSession"("caseId");
CREATE INDEX "WilmaChatSession_updatedAt_idx" ON "WilmaChatSession"("updatedAt");
CREATE INDEX "WilmaChatMessage_sessionId_idx" ON "WilmaChatMessage"("sessionId");
CREATE INDEX "WilmaChatMessage_userId_idx" ON "WilmaChatMessage"("userId");
CREATE INDEX "WilmaChatMessage_createdAt_idx" ON "WilmaChatMessage"("createdAt");

ALTER TABLE "WilmaChatSession" ADD CONSTRAINT "WilmaChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WilmaChatSession" ADD CONSTRAINT "WilmaChatSession_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WilmaChatMessage" ADD CONSTRAINT "WilmaChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WilmaChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
