ALTER TABLE "WilmaChatSession" ADD COLUMN "leadEmail" TEXT;
ALTER TABLE "WilmaChatSession" ADD COLUMN "decisionId" TEXT;
ALTER TABLE "WilmaChatSession" ADD COLUMN "documentPrepHandoffAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "WilmaChatSession_decisionId_key" ON "WilmaChatSession"("decisionId");
CREATE INDEX "WilmaChatSession_leadEmail_idx" ON "WilmaChatSession"("leadEmail");
