import { Prisma } from "@prisma/client";
import { ClaimStatus, RoleName, type AdminUserCreateInput, type AdminUserUpdateInput, type PaginationInput } from "@expense-flow/shared";
import { prisma } from "../config/prisma";
import { ConflictError, NotFoundError, ValidationError } from "../errors/app-error";
import { hashPassword } from "../utils/password";
import { paginationMeta } from "../utils/pagination";
import { toClaimDto, toSafeUser } from "./mappers";

const userInclude = { role: true } satisfies Prisma.UserInclude;
const claimInclude = {
  employee: { select: { id: true, name: true } },
  pendingWith: { select: { id: true, name: true } }
} satisfies Prisma.ClaimInclude;

const validateReportingLine = async (
  userId: string | null,
  roleName: RoleName,
  managerId: string | null | undefined,
  seniorManagerId: string | null | undefined
) => {
  if (managerId && userId === managerId) {
    throw new ValidationError("A user cannot report to themselves");
  }
  if (seniorManagerId && userId === seniorManagerId) {
    throw new ValidationError("A user cannot report to themselves");
  }
  if (roleName === RoleName.EMPLOYEE) {
    if (!managerId) {
      throw new ValidationError("Employees must be assigned to a manager");
    }
    const manager = await prisma.user.findUnique({ where: { id: managerId }, include: { role: true } });
    if (!manager || manager.role.name !== RoleName.MANAGER) {
      throw new ValidationError("Employee manager must have the Manager role");
    }
  }
  if (roleName === RoleName.MANAGER) {
    if (!seniorManagerId) {
      throw new ValidationError("Managers must be assigned to a senior manager");
    }
    const senior = await prisma.user.findUnique({ where: { id: seniorManagerId }, include: { role: true } });
    if (!senior || senior.role.name !== RoleName.SENIOR_MANAGER) {
      throw new ValidationError("Manager senior manager must have the Senior Manager role");
    }
  }
};

export const adminService = {
  listUsers: async (query: PaginationInput) => {
    const roleSearch = query.search && Object.values(RoleName).includes(query.search as RoleName) ? (query.search as RoleName) : undefined;
    const where: Prisma.UserWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            ...(roleSearch ? [{ role: { name: { equals: roleSearch } } }] : [])
          ]
        }
      : {};
    const [items, totalItems] = await Promise.all([
      prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      prisma.user.count({ where })
    ]);
    return { items: items.map(toSafeUser), pagination: paginationMeta(query.page, query.pageSize, totalItems) };
  },

  createUser: async (input: AdminUserCreateInput) => {
    await validateReportingLine(null, input.roleName, input.managerId, input.seniorManagerId);
    const role = await prisma.role.findUniqueOrThrow({ where: { name: input.roleName } });
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        roleId: role.id,
        managerId: input.roleName === RoleName.EMPLOYEE ? input.managerId ?? null : null,
        seniorManagerId: input.roleName === RoleName.MANAGER ? input.seniorManagerId ?? null : null,
        isActive: input.isActive
      },
      include: userInclude
    });
    return toSafeUser(user);
  },

  getUser: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return toSafeUser(user);
  },

  updateUser: async (userId: string, input: AdminUserUpdateInput) => {
    const current = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
    if (!current) {
      throw new NotFoundError("User not found");
    }
    const roleName = input.roleName ?? (current.role.name as RoleName);
    const managerId = input.managerId === undefined ? current.managerId : input.managerId;
    const seniorManagerId = input.seniorManagerId === undefined ? current.seniorManagerId : input.seniorManagerId;
    await validateReportingLine(userId, roleName, managerId, seniorManagerId);
    const role = input.roleName ? await prisma.role.findUniqueOrThrow({ where: { name: input.roleName } }) : null;
    const data: Prisma.UserUncheckedUpdateInput = {
      managerId: roleName === RoleName.EMPLOYEE ? managerId : null,
      seniorManagerId: roleName === RoleName.MANAGER ? seniorManagerId : null
    };
    if (input.name) data.name = input.name;
    if (input.email) data.email = input.email;
    if (role) data.roleId = role.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: userInclude
    });
    return toSafeUser(user);
  },

  setStatus: async (userId: string, isActive: boolean) => {
    if (!isActive) {
      const pending = await prisma.claim.count({ where: { pendingWithUserId: userId, deletedAt: null } });
      if (pending > 0) {
        throw new ConflictError("Cannot deactivate a user who currently owns pending workflow tasks");
      }
      await prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    const user = await prisma.user.update({ where: { id: userId }, data: { isActive }, include: userInclude });
    return toSafeUser(user);
  },

  updateReportingLine: async (userId: string, managerId?: string | null, seniorManagerId?: string | null) => {
    const current = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
    if (!current) {
      throw new NotFoundError("User not found");
    }
    const nextManagerId = managerId === undefined ? current.managerId : managerId;
    const nextSeniorManagerId = seniorManagerId === undefined ? current.seniorManagerId : seniorManagerId;
    await validateReportingLine(userId, current.role.name as RoleName, nextManagerId, nextSeniorManagerId);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { managerId: nextManagerId, seniorManagerId: nextSeniorManagerId },
      include: userInclude
    });
    return toSafeUser(user);
  },

  listClaims: async (query: PaginationInput) => {
    const and: Prisma.ClaimWhereInput[] = [{ deletedAt: null }];
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
      and.push({ expenseDate });
    }
    const where: Prisma.ClaimWhereInput = { AND: and };
    const [items, totalItems] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: claimInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      prisma.claim.count({ where })
    ]);
    return { items: items.map(toClaimDto), pagination: paginationMeta(query.page, query.pageSize, totalItems) };
  },

  monthlySummary: async () => {
    const claims = await prisma.claim.findMany({
      where: { submittedAt: { not: null }, deletedAt: null },
      select: { amount: true, status: true, submittedAt: true }
    });
    const rows = new Map<
      string,
      {
        month: string;
        totalClaimed: Prisma.Decimal;
        totalApproved: Prisma.Decimal;
        totalRejected: Prisma.Decimal;
        submittedCount: number;
        approvedCount: number;
        rejectedCount: number;
      }
    >();
    for (const claim of claims) {
      if (!claim.submittedAt) {
        continue;
      }
      const month = claim.submittedAt.toISOString().slice(0, 7);
      const current =
        rows.get(month) ??
        {
          month,
          totalClaimed: new Prisma.Decimal(0),
          totalApproved: new Prisma.Decimal(0),
          totalRejected: new Prisma.Decimal(0),
          submittedCount: 0,
          approvedCount: 0,
          rejectedCount: 0
        };
      current.totalClaimed = current.totalClaimed.plus(claim.amount);
      current.submittedCount += 1;
      if (claim.status === ClaimStatus.APPROVED) {
        current.totalApproved = current.totalApproved.plus(claim.amount);
        current.approvedCount += 1;
      }
      if (claim.status === ClaimStatus.REJECTED) {
        current.totalRejected = current.totalRejected.plus(claim.amount);
        current.rejectedCount += 1;
      }
      rows.set(month, current);
    }
    return Array.from(rows.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((row) => ({
        month: row.month,
        totalClaimed: row.totalClaimed.toFixed(2),
        totalApproved: row.totalApproved.toFixed(2),
        totalRejected: row.totalRejected.toFixed(2),
        submittedCount: row.submittedCount,
        approvedCount: row.approvedCount,
        rejectedCount: row.rejectedCount
      }));
  }
};
