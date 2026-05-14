CREATE TABLE "AdminCaseNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorEmail" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCaseNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminCaseNote_caseId_idx" ON "AdminCaseNote"("caseId");
CREATE INDEX "AdminCaseNote_authorUserId_idx" ON "AdminCaseNote"("authorUserId");
CREATE INDEX "AdminCaseNote_createdAt_idx" ON "AdminCaseNote"("createdAt");

ALTER TABLE "AdminCaseNote" ADD CONSTRAINT "AdminCaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ShieldCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
