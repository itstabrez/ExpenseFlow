export const RoleName = {
  EMPLOYEE: "EMPLOYEE",
  MANAGER: "MANAGER",
  SENIOR_MANAGER: "SENIOR_MANAGER",
  ADMIN: "ADMIN"
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const ClaimStatus = {
  DRAFT: "DRAFT",
  PENDING_MANAGER: "PENDING_MANAGER",
  PENDING_SENIOR_MANAGER: "PENDING_SENIOR_MANAGER",
  REVERTED_TO_MANAGER: "REVERTED_TO_MANAGER",
  REVERTED_TO_EMPLOYEE: "REVERTED_TO_EMPLOYEE",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
} as const;

export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export const WorkflowStep = {
  EMPLOYEE: "EMPLOYEE",
  MANAGER: "MANAGER",
  SENIOR_MANAGER: "SENIOR_MANAGER",
  COMPLETED: "COMPLETED"
} as const;

export type WorkflowStep = (typeof WorkflowStep)[keyof typeof WorkflowStep];

export const ClaimAction = {
  CREATE_DRAFT: "CREATE_DRAFT",
  SUBMIT: "SUBMIT",
  MANAGER_APPROVE: "MANAGER_APPROVE",
  MANAGER_REJECT: "MANAGER_REJECT",
  SENIOR_MANAGER_APPROVE: "SENIOR_MANAGER_APPROVE",
  SENIOR_MANAGER_REJECT: "SENIOR_MANAGER_REJECT",
  SENIOR_MANAGER_REVERT: "SENIOR_MANAGER_REVERT",
  MANAGER_REAPPROVE: "MANAGER_REAPPROVE",
  MANAGER_REVERT_TO_EMPLOYEE: "MANAGER_REVERT_TO_EMPLOYEE",
  EMPLOYEE_EDIT: "EMPLOYEE_EDIT",
  EMPLOYEE_RESUBMIT: "EMPLOYEE_RESUBMIT",
  DELETE_DRAFT: "DELETE_DRAFT"
} as const;

export type ClaimAction = (typeof ClaimAction)[keyof typeof ClaimAction];

export const ClaimCategory = {
  TRAVEL: "TRAVEL",
  MEALS: "MEALS",
  ACCOMMODATION: "ACCOMMODATION",
  OFFICE_SUPPLIES: "OFFICE_SUPPLIES",
  SOFTWARE: "SOFTWARE",
  TRANSPORT: "TRANSPORT",
  OTHER: "OTHER"
} as const;

export type ClaimCategory = (typeof ClaimCategory)[keyof typeof ClaimCategory];

export const categoryLabels: Record<ClaimCategory, string> = {
  TRAVEL: "Travel",
  MEALS: "Meals",
  ACCOMMODATION: "Accommodation",
  OFFICE_SUPPLIES: "Office supplies",
  SOFTWARE: "Software",
  TRANSPORT: "Transport",
  OTHER: "Other"
};

export const roleLabels: Record<RoleName, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  SENIOR_MANAGER: "Senior Manager",
  ADMIN: "Admin"
};

export const statusLabels: Record<ClaimStatus, string> = {
  DRAFT: "Draft",
  PENDING_MANAGER: "Pending Manager",
  PENDING_SENIOR_MANAGER: "Pending Senior Manager",
  REVERTED_TO_MANAGER: "Reverted to Manager",
  REVERTED_TO_EMPLOYEE: "Reverted to Employee",
  APPROVED: "Approved",
  REJECTED: "Rejected"
};

export const allowedSortFields = [
  "createdAt",
  "updatedAt",
  "expenseDate",
  "submittedAt",
  "amount",
  "claimNumber"
] as const;

export type SortField = (typeof allowedSortFields)[number];
