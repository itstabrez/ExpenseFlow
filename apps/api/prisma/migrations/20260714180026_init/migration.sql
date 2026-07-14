-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('EMPLOYEE', 'MANAGER', 'SENIOR_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'PENDING_MANAGER', 'PENDING_SENIOR_MANAGER', 'REVERTED_TO_MANAGER', 'REVERTED_TO_EMPLOYEE', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkflowStep" AS ENUM ('EMPLOYEE', 'MANAGER', 'SENIOR_MANAGER', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClaimAction" AS ENUM ('CREATE_DRAFT', 'SUBMIT', 'MANAGER_APPROVE', 'MANAGER_REJECT', 'SENIOR_MANAGER_APPROVE', 'SENIOR_MANAGER_REJECT', 'SENIOR_MANAGER_REVERT', 'MANAGER_REAPPROVE', 'MANAGER_REVERT_TO_EMPLOYEE', 'EMPLOYEE_EDIT', 'EMPLOYEE_RESUBMIT', 'DELETE_DRAFT');

-- CreateEnum
CREATE TYPE "ClaimCategory" AS ENUM ('TRAVEL', 'MEALS', 'ACCOMMODATION', 'OFFICE_SUPPLIES', 'SOFTWARE', 'TRANSPORT', 'OTHER');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "managerId" TEXT,
    "seniorManagerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "category" "ClaimCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" "WorkflowStep" NOT NULL DEFAULT 'EMPLOYEE',
    "pendingWithUserId" TEXT,
    "assignedManagerId" TEXT NOT NULL,
    "assignedSeniorManagerId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_history" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ClaimAction" NOT NULL,
    "fromStatus" "ClaimStatus",
    "toStatus" "ClaimStatus" NOT NULL,
    "step" "WorkflowStep" NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBySessionId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_managerId_idx" ON "users"("managerId");

-- CreateIndex
CREATE INDEX "users_seniorManagerId_idx" ON "users"("seniorManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claimNumber_key" ON "claims"("claimNumber");

-- CreateIndex
CREATE INDEX "claims_employeeId_idx" ON "claims"("employeeId");

-- CreateIndex
CREATE INDEX "claims_pendingWithUserId_idx" ON "claims"("pendingWithUserId");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_pendingWithUserId_status_createdAt_idx" ON "claims"("pendingWithUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "claims_employeeId_createdAt_idx" ON "claims"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "claims_expenseDate_idx" ON "claims"("expenseDate");

-- CreateIndex
CREATE INDEX "approval_history_claimId_idx" ON "approval_history"("claimId");

-- CreateIndex
CREATE INDEX "approval_history_actorId_createdAt_idx" ON "approval_history"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "refresh_sessions_userId_idx" ON "refresh_sessions"("userId");

-- CreateIndex
CREATE INDEX "refresh_sessions_expiresAt_idx" ON "refresh_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_seniorManagerId_fkey" FOREIGN KEY ("seniorManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_pendingWithUserId_fkey" FOREIGN KEY ("pendingWithUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_assignedSeniorManagerId_fkey" FOREIGN KEY ("assignedSeniorManagerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_replacedBySessionId_fkey" FOREIGN KEY ("replacedBySessionId") REFERENCES "refresh_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
