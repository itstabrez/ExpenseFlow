import { PrismaClient, Prisma } from "@prisma/client";
import { ClaimAction, ClaimCategory, ClaimStatus, RoleName, WorkflowStep } from "@expense-flow/shared";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const password = "Password123!";

const claimNumber = (index: number) => `EF-202607-${String(index).padStart(4, "0")}`;

async function main() {
  await prisma.approvalHistory.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  const roles = Object.values(RoleName);
  const roleRows = new Map<RoleName, { id: string }>();
  for (const roleName of roles) {
    const role = await prisma.role.create({ data: { name: roleName } });
    roleRows.set(roleName, role);
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.create({
    data: {
      name: "Asha Admin",
      email: "admin@expenseflow.test",
      passwordHash,
      roleId: roleRows.get(RoleName.ADMIN)!.id
    }
  });
  const senior = await prisma.user.create({
    data: {
      name: "Sanjay Senior",
      email: "senior@expenseflow.test",
      passwordHash,
      roleId: roleRows.get(RoleName.SENIOR_MANAGER)!.id
    }
  });
  const managerOne = await prisma.user.create({
    data: {
      name: "Meera Manager",
      email: "manager1@expenseflow.test",
      passwordHash,
      roleId: roleRows.get(RoleName.MANAGER)!.id,
      seniorManagerId: senior.id
    }
  });
  const managerTwo = await prisma.user.create({
    data: {
      name: "Rahul Manager",
      email: "manager2@expenseflow.test",
      passwordHash,
      roleId: roleRows.get(RoleName.MANAGER)!.id,
      seniorManagerId: senior.id
    }
  });
  const employees = await Promise.all([
    prisma.user.create({
      data: {
        name: "Nisha Employee",
        email: "employee1@expenseflow.test",
        passwordHash,
        roleId: roleRows.get(RoleName.EMPLOYEE)!.id,
        managerId: managerOne.id
      }
    }),
    prisma.user.create({
      data: {
        name: "Arjun Employee",
        email: "employee2@expenseflow.test",
        passwordHash,
        roleId: roleRows.get(RoleName.EMPLOYEE)!.id,
        managerId: managerOne.id
      }
    }),
    prisma.user.create({
      data: {
        name: "Priya Employee",
        email: "employee3@expenseflow.test",
        passwordHash,
        roleId: roleRows.get(RoleName.EMPLOYEE)!.id,
        managerId: managerTwo.id
      }
    }),
    prisma.user.create({
      data: {
        name: "Kabir Employee",
        email: "employee4@expenseflow.test",
        passwordHash,
        roleId: roleRows.get(RoleName.EMPLOYEE)!.id,
        managerId: managerTwo.id
      }
    })
  ]);

  const now = new Date();
  const lastWeek = new Date(Date.now() - 7 * 86400000);
  const claims = [
    {
      employeeId: employees[0].id,
      amount: "1250.00",
      category: ClaimCategory.MEALS,
      description: "Client lunch during onboarding visit",
      status: ClaimStatus.DRAFT,
      currentStep: WorkflowStep.EMPLOYEE,
      pendingWithUserId: null,
      submittedAt: null,
      resolvedAt: null
    },
    {
      employeeId: employees[0].id,
      amount: "8800.00",
      category: ClaimCategory.TRAVEL,
      description: "Mumbai client-site rail and cab travel",
      status: ClaimStatus.PENDING_MANAGER,
      currentStep: WorkflowStep.MANAGER,
      pendingWithUserId: managerOne.id,
      submittedAt: lastWeek,
      resolvedAt: null
    },
    {
      employeeId: employees[1].id,
      amount: "4200.00",
      category: ClaimCategory.SOFTWARE,
      description: "Quarterly design tool subscription",
      status: ClaimStatus.PENDING_SENIOR_MANAGER,
      currentStep: WorkflowStep.SENIOR_MANAGER,
      pendingWithUserId: senior.id,
      submittedAt: lastWeek,
      resolvedAt: null
    },
    {
      employeeId: employees[2].id,
      amount: "15400.00",
      category: ClaimCategory.ACCOMMODATION,
      description: "Hotel stay for Bengaluru workshop",
      status: ClaimStatus.REVERTED_TO_MANAGER,
      currentStep: WorkflowStep.MANAGER,
      pendingWithUserId: managerTwo.id,
      submittedAt: lastWeek,
      resolvedAt: null
    },
    {
      employeeId: employees[2].id,
      amount: "630.00",
      category: ClaimCategory.OFFICE_SUPPLIES,
      description: "Replacement keyboard and stationery",
      status: ClaimStatus.REVERTED_TO_EMPLOYEE,
      currentStep: WorkflowStep.EMPLOYEE,
      pendingWithUserId: employees[2].id,
      submittedAt: lastWeek,
      resolvedAt: null
    },
    {
      employeeId: employees[3].id,
      amount: "3100.00",
      category: ClaimCategory.TRANSPORT,
      description: "Airport transfers for customer demo",
      status: ClaimStatus.APPROVED,
      currentStep: WorkflowStep.COMPLETED,
      pendingWithUserId: null,
      submittedAt: lastWeek,
      resolvedAt: now
    },
    {
      employeeId: employees[3].id,
      amount: "999.00",
      category: ClaimCategory.OTHER,
      description: "Unapproved team event expense",
      status: ClaimStatus.REJECTED,
      currentStep: WorkflowStep.COMPLETED,
      pendingWithUserId: null,
      submittedAt: lastWeek,
      resolvedAt: now
    }
  ];

  for (const [index, seed] of claims.entries()) {
    const employeeManager = seed.employeeId === employees[0].id || seed.employeeId === employees[1].id ? managerOne : managerTwo;
    const claim = await prisma.claim.create({
      data: {
        claimNumber: claimNumber(index + 1),
        employeeId: seed.employeeId,
        amount: new Prisma.Decimal(seed.amount),
        currency: "INR",
        category: seed.category,
        description: seed.description,
        expenseDate: new Date(Date.now() - (index + 2) * 86400000),
        status: seed.status,
        currentStep: seed.currentStep,
        pendingWithUserId: seed.pendingWithUserId,
        assignedManagerId: employeeManager.id,
        assignedSeniorManagerId: senior.id,
        submittedAt: seed.submittedAt,
        resolvedAt: seed.resolvedAt
      }
    });

    await prisma.approvalHistory.create({
      data: {
        claimId: claim.id,
        actorId: seed.employeeId,
        action: ClaimAction.CREATE_DRAFT,
        fromStatus: null,
        toStatus: ClaimStatus.DRAFT,
        step: WorkflowStep.EMPLOYEE
      }
    });
    if (seed.status !== ClaimStatus.DRAFT) {
      await prisma.approvalHistory.create({
        data: {
          claimId: claim.id,
          actorId: seed.employeeId,
          action: ClaimAction.SUBMIT,
          fromStatus: ClaimStatus.DRAFT,
          toStatus: ClaimStatus.PENDING_MANAGER,
          step: WorkflowStep.MANAGER
        }
      });
    }
    if (
      [ClaimStatus.PENDING_SENIOR_MANAGER, ClaimStatus.REVERTED_TO_MANAGER, ClaimStatus.REVERTED_TO_EMPLOYEE, ClaimStatus.APPROVED, ClaimStatus.REJECTED].includes(
        seed.status
      )
    ) {
      await prisma.approvalHistory.create({
        data: {
          claimId: claim.id,
          actorId: employeeManager.id,
          action: ClaimAction.MANAGER_APPROVE,
          fromStatus: ClaimStatus.PENDING_MANAGER,
          toStatus: ClaimStatus.PENDING_SENIOR_MANAGER,
          step: WorkflowStep.SENIOR_MANAGER
        }
      });
    }
    if ([ClaimStatus.REVERTED_TO_MANAGER, ClaimStatus.REVERTED_TO_EMPLOYEE].includes(seed.status)) {
      await prisma.approvalHistory.create({
        data: {
          claimId: claim.id,
          actorId: senior.id,
          action: ClaimAction.SENIOR_MANAGER_REVERT,
          fromStatus: ClaimStatus.PENDING_SENIOR_MANAGER,
          toStatus: ClaimStatus.REVERTED_TO_MANAGER,
          step: WorkflowStep.MANAGER,
          note: "Please confirm the invoice date and client code before final approval."
        }
      });
    }
    if (seed.status === ClaimStatus.REVERTED_TO_EMPLOYEE) {
      await prisma.approvalHistory.create({
        data: {
          claimId: claim.id,
          actorId: employeeManager.id,
          action: ClaimAction.MANAGER_REVERT_TO_EMPLOYEE,
          fromStatus: ClaimStatus.REVERTED_TO_MANAGER,
          toStatus: ClaimStatus.REVERTED_TO_EMPLOYEE,
          step: WorkflowStep.EMPLOYEE,
          note: "Please upload a clearer receipt and resubmit."
        }
      });
    }
    if (seed.status === ClaimStatus.APPROVED) {
      await prisma.approvalHistory.create({
        data: {
          claimId: claim.id,
          actorId: senior.id,
          action: ClaimAction.SENIOR_MANAGER_APPROVE,
          fromStatus: ClaimStatus.PENDING_SENIOR_MANAGER,
          toStatus: ClaimStatus.APPROVED,
          step: WorkflowStep.COMPLETED
        }
      });
    }
    if (seed.status === ClaimStatus.REJECTED) {
      await prisma.approvalHistory.create({
        data: {
          claimId: claim.id,
          actorId: senior.id,
          action: ClaimAction.SENIOR_MANAGER_REJECT,
          fromStatus: ClaimStatus.PENDING_SENIOR_MANAGER,
          toStatus: ClaimStatus.REJECTED,
          step: WorkflowStep.COMPLETED,
          note: "This expense is outside the reimbursement policy."
        }
      });
    }
  }

  console.log("Seed complete");
  console.table([
    { role: "Admin", email: admin.email, password },
    { role: "Senior Manager", email: senior.email, password },
    { role: "Manager", email: managerOne.email, password },
    { role: "Manager", email: managerTwo.email, password },
    { role: "Employee", email: employees[0].email, password }
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
