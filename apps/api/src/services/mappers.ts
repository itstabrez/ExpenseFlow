import type { ApprovalHistory, Claim, Role, User } from "@prisma/client";
import type { AuditEntryDto, ClaimDto, RoleName, SafeUser } from "@expense-flow/shared";

type UserWithRole = User & { role: Role };
type ClaimWithPeople = Claim & {
  employee?: Pick<User, "id" | "name">;
  pendingWith?: Pick<User, "id" | "name"> | null;
};
type HistoryWithActor = ApprovalHistory & { actor: UserWithRole };

export const toSafeUser = (user: UserWithRole): SafeUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role.name as RoleName,
  managerId: user.managerId,
  seniorManagerId: user.seniorManagerId,
  isActive: user.isActive
});

export const toClaimDto = (claim: ClaimWithPeople): ClaimDto => {
  const dto: ClaimDto = {
    id: claim.id,
    claimNumber: claim.claimNumber,
    employeeId: claim.employeeId,
    amount: claim.amount.toFixed(2),
    currency: claim.currency,
    category: claim.category,
    description: claim.description,
    expenseDate: claim.expenseDate.toISOString(),
    receiptUrl: claim.receiptUrl,
    status: claim.status,
    currentStep: claim.currentStep,
    pendingWithUserId: claim.pendingWithUserId,
    pendingWithName: claim.pendingWith?.name ?? null,
    assignedManagerId: claim.assignedManagerId,
    assignedSeniorManagerId: claim.assignedSeniorManagerId,
    submittedAt: claim.submittedAt?.toISOString() ?? null,
    resolvedAt: claim.resolvedAt?.toISOString() ?? null,
    version: claim.version,
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString()
  };
  if (claim.employee?.name) {
    dto.employeeName = claim.employee.name;
  }
  return dto;
};

export const toAuditDto = (entry: HistoryWithActor): AuditEntryDto => ({
  id: entry.id,
  action: entry.action,
  actorName: entry.actor.name,
  actorRole: entry.actor.role.name as RoleName,
  fromStatus: entry.fromStatus,
  toStatus: entry.toStatus,
  step: entry.step,
  note: entry.note,
  metadata: entry.metadata,
  createdAt: entry.createdAt.toISOString()
});
