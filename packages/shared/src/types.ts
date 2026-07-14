import type { ClaimAction, ClaimCategory, ClaimStatus, RoleName, WorkflowStep } from "./constants";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  managerId: string | null;
  seniorManagerId: string | null;
  isActive: boolean;
};

export type ClaimDto = {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName?: string;
  amount: string;
  currency: string;
  category: ClaimCategory;
  description: string;
  expenseDate: string;
  receiptUrl: string | null;
  status: ClaimStatus;
  currentStep: WorkflowStep;
  pendingWithUserId: string | null;
  pendingWithName?: string | null;
  assignedManagerId: string;
  assignedSeniorManagerId: string;
  submittedAt: string | null;
  resolvedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type AuditEntryDto = {
  id: string;
  action: ClaimAction;
  actorName: string;
  actorRole: RoleName;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  step: WorkflowStep;
  note: string | null;
  metadata: unknown;
  createdAt: string;
};
