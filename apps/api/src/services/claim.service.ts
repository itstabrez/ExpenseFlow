import { Prisma } from "@prisma/client";
import {
  ClaimAction,
  ClaimStatus,
  RoleName,
  WorkflowStep,
  type ClaimCreateInput,
  type ClaimEditInput,
  type PaginationInput
} from "@expense-flow/shared";
import { prisma } from "../config/prisma";
import { AuthorizationError, ConflictError, NotFoundError, ValidationError, WorkflowError } from "../errors/app-error";
import { paginationMeta } from "../utils/pagination";
import { notifyClaimChanged } from "./sse.service";
import { toAuditDto, toClaimDto } from "./mappers";

type Actor = { id: string; role: RoleName };
type Tx = Prisma.TransactionClient;

const claimInclude = {
  employee: { select: { id: true, name: true } },
  pendingWith: { select: { id: true, name: true } }
} satisfies Prisma.ClaimInclude;

const generateClaimNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EF-${date}-${suffix}`;
};

const ensureEmployeeReviewerChain = async (employeeId: string, tx: Tx) => {
  const employee = await tx.user.findUnique({
    where: { id: employeeId },
    include: { role: true, manager: { include: { role: true, seniorManager: { include: { role: true } } } } }
  });
  if (!employee || employee.role.name !== RoleName.EMPLOYEE || !employee.manager) {
    throw new ValidationError("Employee must be assigned to a manager before submitting claims");
  }
  if (employee.manager.role.name !== RoleName.MANAGER || !employee.manager.seniorManager) {
    throw new ValidationError("Employee manager must be assigned to a senior manager");
  }
  if (employee.manager.seniorManager.role.name !== RoleName.SENIOR_MANAGER) {
    throw new ValidationError("Manager must report to a senior manager");
  }
  return { managerId: employee.manager.id, seniorManagerId: employee.manager.seniorManager.id };
};

const createHistory = async (
  tx: Tx,
  data: {
    claimId: string;
    actorId: string;
    action: ClaimAction;
    fromStatus: ClaimStatus | null;
    toStatus: ClaimStatus;
    step: WorkflowStep;
    note?: string;
    metadata?: Prisma.InputJsonValue;
  }
) =>
  tx.approvalHistory.create({
    data: {
      claimId: data.claimId,
      actorId: data.actorId,
      action: data.action,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      step: data.step,
      note: data.note ?? null,
      metadata: data.metadata ?? Prisma.JsonNull
    }
  });

const updateVersioned = async (tx: Tx, claimId: string, version: number, data: Prisma.ClaimUncheckedUpdateManyInput) => {
  const updated = await tx.claim.updateMany({
    where: { id: claimId, version, deletedAt: null },
    data: { ...data, version: { increment: 1 } }
  });
  if (updated.count !== 1) {
    throw new ConflictError();
  }
  return tx.claim.findUniqueOrThrow({ where: { id: claimId }, include: claimInclude });
};

const assertEmployeeOwns = (claim: { employeeId: string }, actor: Actor) => {
  if (actor.role !== RoleName.EMPLOYEE || claim.employeeId !== actor.id) {
    throw new AuthorizationError();
  }
};

const assertPendingReviewer = (
  claim: { pendingWithUserId: string | null; currentStep: WorkflowStep; status: ClaimStatus },
  actor: Actor,
  role: RoleName,
  step: WorkflowStep,
  status: ClaimStatus
) => {
  if (actor.role !== role || claim.pendingWithUserId !== actor.id) {
    throw new AuthorizationError("This claim is not assigned to you");
  }
  if (claim.status !== status || claim.currentStep !== step) {
    throw new WorkflowError();
  }
};

const listClaims = async (where: Prisma.ClaimWhereInput, query: PaginationInput) => {
  const and: Prisma.ClaimWhereInput[] = [where, { deletedAt: null }];
  if (query.search) {
    and.push({
      OR: [
        { claimNumber: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { employee: { name: { contains: query.search, mode: "insensitive" } } }
      ]
    });
  }
  if (query.status) {
    and.push({ status: query.status });
  }
  if (query.category) {
    and.push({ category: query.category });
  }
  if (query.fromDate || query.toDate) {
    const expenseDate: Prisma.DateTimeFilter<"Claim"> = {};
    if (query.fromDate) {
      expenseDate.gte = query.fromDate;
    }
    if (query.toDate) {
      expenseDate.lte = query.toDate;
    }
    and.push({
      expenseDate
    });
  }
  const finalWhere: Prisma.ClaimWhereInput = { AND: and };
  const [items, totalItems] = await Promise.all([
    prisma.claim.findMany({
      where: finalWhere,
      include: claimInclude,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.claim.count({ where: finalWhere })
  ]);
  return {
    items: items.map(toClaimDto),
    pagination: paginationMeta(query.page, query.pageSize, totalItems)
  };
};

export const claimService = {
  createDraft: async (actor: Actor, input: ClaimCreateInput) => {
    if (actor.role !== RoleName.EMPLOYEE) {
      throw new AuthorizationError();
    }
    return prisma.$transaction(async (tx) => {
      const chain = await ensureEmployeeReviewerChain(actor.id, tx);
      const claim = await tx.claim.create({
        data: {
          claimNumber: generateClaimNumber(),
          employeeId: actor.id,
          amount: new Prisma.Decimal(input.amount),
          currency: input.currency,
          category: input.category,
          description: input.description,
          expenseDate: input.expenseDate,
          receiptUrl: input.receiptUrl || null,
          assignedManagerId: chain.managerId,
          assignedSeniorManagerId: chain.seniorManagerId
        },
        include: claimInclude
      });
      await createHistory(tx, {
        claimId: claim.id,
        actorId: actor.id,
        action: ClaimAction.CREATE_DRAFT,
        fromStatus: null,
        toStatus: ClaimStatus.DRAFT,
        step: WorkflowStep.EMPLOYEE
      });
      return toClaimDto(claim);
    });
  },

  listMine: (actor: Actor, query: PaginationInput) => listClaims({ employeeId: actor.id }, query),

  listManager: (actor: Actor, query: PaginationInput) => {
    if (actor.role !== RoleName.MANAGER) {
      throw new AuthorizationError();
    }
    return listClaims(
      {
        OR: [
          { pendingWithUserId: actor.id },
          { history: { some: { actorId: actor.id } } },
          { assignedManagerId: actor.id, status: ClaimStatus.REVERTED_TO_MANAGER }
        ]
      },
      query
    );
  },

  listManagerHistory: (actor: Actor, query: PaginationInput) => {
    if (actor.role !== RoleName.MANAGER) {
      throw new AuthorizationError();
    }
    return listClaims({ history: { some: { actorId: actor.id } } }, query);
  },

  listSeniorManager: (actor: Actor, query: PaginationInput) => {
    if (actor.role !== RoleName.SENIOR_MANAGER) {
      throw new AuthorizationError();
    }
    return listClaims({ OR: [{ pendingWithUserId: actor.id }, { history: { some: { actorId: actor.id } } }] }, query);
  },

  listSeniorManagerHistory: (actor: Actor, query: PaginationInput) => {
    if (actor.role !== RoleName.SENIOR_MANAGER) {
      throw new AuthorizationError();
    }
    return listClaims({ history: { some: { actorId: actor.id } } }, query);
  },

  getById: async (actor: Actor, claimId: string) => {
    const claim = await prisma.claim.findFirst({ where: { id: claimId, deletedAt: null }, include: claimInclude });
    if (!claim) {
      throw new NotFoundError("Claim not found");
    }
    const allowed =
      actor.role === RoleName.ADMIN ||
      claim.employeeId === actor.id ||
      claim.assignedManagerId === actor.id ||
      claim.assignedSeniorManagerId === actor.id ||
      claim.pendingWithUserId === actor.id;
    if (!allowed) {
      throw new AuthorizationError();
    }
    return toClaimDto(claim);
  },

  updateClaim: async (actor: Actor, claimId: string, input: ClaimEditInput) =>
    prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findFirst({ where: { id: claimId, deletedAt: null } });
      if (!claim) {
        throw new NotFoundError("Claim not found");
      }
      assertEmployeeOwns(claim, actor);
      if (claim.status !== ClaimStatus.DRAFT && claim.status !== ClaimStatus.REVERTED_TO_EMPLOYEE) {
        throw new WorkflowError("Employees can edit only draft or reverted claims");
      }
      const updateData: Prisma.ClaimUncheckedUpdateManyInput = {};
      if (input.amount) updateData.amount = new Prisma.Decimal(input.amount);
      if (input.currency) updateData.currency = input.currency;
      if (input.category) updateData.category = input.category;
      if (input.description) updateData.description = input.description;
      if (input.expenseDate) updateData.expenseDate = input.expenseDate;
      if (input.receiptUrl !== undefined) updateData.receiptUrl = input.receiptUrl === "" ? null : input.receiptUrl;
      const updated = await updateVersioned(tx, claim.id, input.version, updateData);
      if (claim.status === ClaimStatus.REVERTED_TO_EMPLOYEE) {
        await createHistory(tx, {
          claimId: claim.id,
          actorId: actor.id,
          action: ClaimAction.EMPLOYEE_EDIT,
          fromStatus: claim.status,
          toStatus: claim.status,
          step: WorkflowStep.EMPLOYEE
        });
      }
      return toClaimDto(updated);
    }),

  deleteDraft: async (actor: Actor, claimId: string, version: number) =>
    prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findFirst({ where: { id: claimId, deletedAt: null } });
      if (!claim) {
        throw new NotFoundError("Claim not found");
      }
      assertEmployeeOwns(claim, actor);
      if (claim.status !== ClaimStatus.DRAFT) {
        throw new WorkflowError("Only draft claims can be deleted");
      }
      const updated = await updateVersioned(tx, claim.id, version, { deletedAt: new Date() });
      await createHistory(tx, {
        claimId: claim.id,
        actorId: actor.id,
        action: ClaimAction.DELETE_DRAFT,
        fromStatus: claim.status,
        toStatus: claim.status,
        step: WorkflowStep.EMPLOYEE
      });
      return toClaimDto(updated);
    }),

  submit: async (actor: Actor, claimId: string, version: number, resubmit = false) => {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findFirst({ where: { id: claimId, deletedAt: null } });
      if (!claim) {
        throw new NotFoundError("Claim not found");
      }
      assertEmployeeOwns(claim, actor);
      const expected = resubmit ? ClaimStatus.REVERTED_TO_EMPLOYEE : ClaimStatus.DRAFT;
      if (claim.status !== expected) {
        throw new WorkflowError(resubmit ? "Only employee-reverted claims can be resubmitted" : "Only drafts can be submitted");
      }
      const updated = await updateVersioned(tx, claim.id, version, {
        status: ClaimStatus.PENDING_MANAGER,
        currentStep: WorkflowStep.MANAGER,
        pendingWithUserId: claim.assignedManagerId,
        submittedAt: claim.submittedAt ?? new Date(),
        resolvedAt: null
      });
      await createHistory(tx, {
        claimId: claim.id,
        actorId: actor.id,
        action: resubmit ? ClaimAction.EMPLOYEE_RESUBMIT : ClaimAction.SUBMIT,
        fromStatus: claim.status,
        toStatus: ClaimStatus.PENDING_MANAGER,
        step: WorkflowStep.MANAGER
      });
      return toClaimDto(updated);
    });
    notifyClaimChanged([result.employeeId, result.pendingWithUserId, result.assignedManagerId], result);
    return result;
  },

  managerApprove: async (actor: Actor, claimId: string, version: number, reapprove = false) => {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findFirst({ where: { id: claimId, deletedAt: null } });
      if (!claim) {
        throw new NotFoundError("Claim not found");
      }
      const expectedStatus = reapprove ? ClaimStatus.REVERTED_TO_MANAGER : ClaimStatus.PENDING_MANAGER;
      if (actor.role === RoleName.MANAGER && claim.assignedManagerId === actor.id && claim.status !== expectedStatus) {
        throw new WorkflowError();
      }
      assertPendingReviewer(
        claim,
        actor,
        RoleName.MANAGER,
        WorkflowStep.MANAGER,
        expectedStatus
      );
      const updated = await updateVersioned(tx, claim.id, version, {
        status: ClaimStatus.PENDING_SENIOR_MANAGER,
        currentStep: WorkflowStep.SENIOR_MANAGER,
        pendingWithUserId: claim.assignedSeniorManagerId
      });
      await createHistory(tx, {
        claimId: claim.id,
        actorId: actor.id,
        action: reapprove ? ClaimAction.MANAGER_REAPPROVE : ClaimAction.MANAGER_APPROVE,
        fromStatus: claim.status,
        toStatus: ClaimStatus.PENDING_SENIOR_MANAGER,
        step: WorkflowStep.SENIOR_MANAGER
      });
      return toClaimDto(updated);
    });
    notifyClaimChanged([result.employeeId, result.pendingWithUserId, result.assignedManagerId, result.assignedSeniorManagerId], result);
    return result;
  },

  managerReject: async (actor: Actor, claimId: string, version: number, note: string) => {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findFirst({ where: { id: claimId, deletedAt: null } });
      if (!claim) {
        throw new NotFoundError("Claim not found");
      }
      assertPendingReviewer(claim, actor, RoleName.MANAGER, WorkflowStep.MANAGER, ClaimStatus.PENDING_MANAGER);
      const updated = await updateVersioned(tx, claim.id, version, {
        status: ClaimStatus.REJECTED,
        currentStep: WorkflowStep.COMPLETED,
        pendingWithUserId: null,
        resolvedAt: new Date()
      });
      await createHistory(tx, {
        claimId: claim.id,
        actorId: actor.id,
        action: ClaimAction.MANAGER_REJECT,
        fromStatus: claim.status,
        toStatus: ClaimStatus.REJECTED,
        step: WorkflowStep.COMPLETED,
        note: note ?? undefined
      });
      return toClaimDto(updated);
    });
    notifyClaimChanged([result.employeeId, result.assignedManagerId], result);
    return result;
  },

  seniorAction: async (actor: Actor, claimId: string, version: number, action: "approve" | "reject" | "revert", note?: string) => {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findFirst({ where: { id: claimId, deletedAt: null } });
      if (!claim) {
        throw new NotFoundError("Claim not found");
      }
      assertPendingReviewer(claim, actor, RoleName.SENIOR_MANAGER, WorkflowStep.SENIOR_MANAGER, ClaimStatus.PENDING_SENIOR_MANAGER);
      const target =
        action === "approve"
          ? { status: ClaimStatus.APPROVED, step: WorkflowStep.COMPLETED, pendingWithUserId: null, audit: ClaimAction.SENIOR_MANAGER_APPROVE }
          : action === "reject"
            ? { status: ClaimStatus.REJECTED, step: WorkflowStep.COMPLETED, pendingWithUserId: null, audit: ClaimAction.SENIOR_MANAGER_REJECT }
            : {
                status: ClaimStatus.REVERTED_TO_MANAGER,
                step: WorkflowStep.MANAGER,
                pendingWithUserId: claim.assignedManagerId,
                audit: ClaimAction.SENIOR_MANAGER_REVERT
              };
      const updated = await updateVersioned(tx, claim.id, version, {
        status: target.status,
        currentStep: target.step,
        pendingWithUserId: target.pendingWithUserId,
        resolvedAt: action === "revert" ? null : new Date()
      });
      const historyData = {
        claimId: claim.id,
        actorId: actor.id,
        action: target.audit,
        fromStatus: claim.status,
        toStatus: target.status,
        step: target.step
      };
      await createHistory(tx, note ? { ...historyData, note } : historyData);
      return toClaimDto(updated);
    });
    notifyClaimChanged([result.employeeId, result.pendingWithUserId, result.assignedManagerId, result.assignedSeniorManagerId], result);
    return result;
  },

  managerRevertToEmployee: async (actor: Actor, claimId: string, version: number, note: string) => {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findFirst({ where: { id: claimId, deletedAt: null } });
      if (!claim) {
        throw new NotFoundError("Claim not found");
      }
      assertPendingReviewer(claim, actor, RoleName.MANAGER, WorkflowStep.MANAGER, ClaimStatus.REVERTED_TO_MANAGER);
      const updated = await updateVersioned(tx, claim.id, version, {
        status: ClaimStatus.REVERTED_TO_EMPLOYEE,
        currentStep: WorkflowStep.EMPLOYEE,
        pendingWithUserId: claim.employeeId
      });
      await createHistory(tx, {
        claimId: claim.id,
        actorId: actor.id,
        action: ClaimAction.MANAGER_REVERT_TO_EMPLOYEE,
        fromStatus: claim.status,
        toStatus: ClaimStatus.REVERTED_TO_EMPLOYEE,
        step: WorkflowStep.EMPLOYEE,
        note
      });
      return toClaimDto(updated);
    });
    notifyClaimChanged([result.employeeId, result.pendingWithUserId, result.assignedManagerId], result);
    return result;
  },

  history: async (actor: Actor, claimId: string) => {
    await claimService.getById(actor, claimId);
    const entries = await prisma.approvalHistory.findMany({
      where: { claimId },
      include: { actor: { include: { role: true } } },
      orderBy: { createdAt: "asc" }
    });
    return entries.map(toAuditDto);
  }
};
