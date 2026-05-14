CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "ShieldCaseStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'ACTION_REQUIRED', 'SUBMITTED', 'CLOSED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShieldCase" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "ShieldCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "productKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShieldCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "ShieldCase_ownerId_idx" ON "ShieldCase"("ownerId");
CREATE INDEX "ShieldCase_status_idx" ON "ShieldCase"("status");

ALTER TABLE "ShieldCase" ADD CONSTRAINT "ShieldCase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
