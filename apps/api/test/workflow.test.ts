import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { ClaimCategory, ClaimStatus, RoleName, WorkflowStep } from "@expense-flow/shared";
import { app } from "../src/app";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();
const password = "Password123!";

type Seeded = {
  employeeOne: string;
  employeeTwo: string;
  managerOne: string;
  managerTwo: string;
  senior: string;
  claims: Record<string, string>;
};

let seeded: Seeded;

const login = async (email: string) => {
  const response = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200);
  return {
    token: response.body.data.accessToken as string,
    cookie: response.headers["set-cookie"] as string[]
  };
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const makeClaim = async (data: {
  number: string;
  employeeId: string;
  managerId: string;
  seniorId: string;
  status: ClaimStatus;
  step: WorkflowStep;
  pendingWithUserId: string | null;
}) =>
  prisma.claim.create({
    data: {
      claimNumber: data.number,
      employeeId: data.employeeId,
      amount: new Prisma.Decimal("100.00"),
      currency: "INR",
      category: ClaimCategory.TRAVEL,
      description: `${data.number} travel claim`,
      expenseDate: new Date(),
      assignedManagerId: data.managerId,
      assignedSeniorManagerId: data.seniorId,
      status: data.status,
      currentStep: data.step,
      pendingWithUserId: data.pendingWithUserId,
      submittedAt: data.status === ClaimStatus.DRAFT ? null : new Date()
    }
  });

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.approvalHistory.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  const roles = new Map<RoleName, string>();
  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.create({ data: { name: roleName } });
    roles.set(roleName, role.id);
  }
  const passwordHash = await hashPassword(password);
  const senior = await prisma.user.create({
    data: { name: "Senior", email: "senior@test.local", passwordHash, roleId: roles.get(RoleName.SENIOR_MANAGER)! }
  });
  const managerOne = await prisma.user.create({
    data: { name: "Manager One", email: "manager1@test.local", passwordHash, roleId: roles.get(RoleName.MANAGER)!, seniorManagerId: senior.id }
  });
  const managerTwo = await prisma.user.create({
    data: { name: "Manager Two", email: "manager2@test.local", passwordHash, roleId: roles.get(RoleName.MANAGER)!, seniorManagerId: senior.id }
  });
  const employeeOne = await prisma.user.create({
    data: { name: "Employee One", email: "employee1@test.local", passwordHash, roleId: roles.get(RoleName.EMPLOYEE)!, managerId: managerOne.id }
  });
  const employeeTwo = await prisma.user.create({
    data: { name: "Employee Two", email: "employee2@test.local", passwordHash, roleId: roles.get(RoleName.EMPLOYEE)!, managerId: managerTwo.id }
  });
  const draft = await makeClaim({
    number: "EF-T-0001",
    employeeId: employeeOne.id,
    managerId: managerOne.id,
    seniorId: senior.id,
    status: ClaimStatus.DRAFT,
    step: WorkflowStep.EMPLOYEE,
    pendingWithUserId: null
  });
  const otherDraft = await makeClaim({
    number: "EF-T-0002",
    employeeId: employeeTwo.id,
    managerId: managerTwo.id,
    seniorId: senior.id,
    status: ClaimStatus.DRAFT,
    step: WorkflowStep.EMPLOYEE,
    pendingWithUserId: null
  });
  const pendingManagerOne = await makeClaim({
    number: "EF-T-0003",
    employeeId: employeeOne.id,
    managerId: managerOne.id,
    seniorId: senior.id,
    status: ClaimStatus.PENDING_MANAGER,
    step: WorkflowStep.MANAGER,
    pendingWithUserId: managerOne.id
  });
  const pendingManagerTwo = await makeClaim({
    number: "EF-T-0004",
    employeeId: employeeTwo.id,
    managerId: managerTwo.id,
    seniorId: senior.id,
    status: ClaimStatus.PENDING_MANAGER,
    step: WorkflowStep.MANAGER,
    pendingWithUserId: managerTwo.id
  });
  const pendingSenior = await makeClaim({
    number: "EF-T-0005",
    employeeId: employeeOne.id,
    managerId: managerOne.id,
    seniorId: senior.id,
    status: ClaimStatus.PENDING_SENIOR_MANAGER,
    step: WorkflowStep.SENIOR_MANAGER,
    pendingWithUserId: senior.id
  });
  const revertedManager = await makeClaim({
    number: "EF-T-0006",
    employeeId: employeeOne.id,
    managerId: managerOne.id,
    seniorId: senior.id,
    status: ClaimStatus.REVERTED_TO_MANAGER,
    step: WorkflowStep.MANAGER,
    pendingWithUserId: managerOne.id
  });

  seeded = {
    employeeOne: employeeOne.id,
    employeeTwo: employeeTwo.id,
    managerOne: managerOne.id,
    managerTwo: managerTwo.id,
    senior: senior.id,
    claims: {
      draft: draft.id,
      otherDraft: otherDraft.id,
      pendingManagerOne: pendingManagerOne.id,
      pendingManagerTwo: pendingManagerTwo.id,
      pendingSenior: pendingSenior.id,
      revertedManager: revertedManager.id
    }
  };
});

describe("workflow authorization", () => {
  it("prevents an employee from editing another employee's claim", async () => {
    const { token } = await login("employee1@test.local");
    await request(app)
      .patch(`/api/v1/claims/${seeded.claims.otherDraft}`)
      .set(auth(token))
      .send({ amount: "50.00", version: 0 })
      .expect(403);
  });

  it("prevents an employee from editing a pending claim", async () => {
    const { token } = await login("employee1@test.local");
    await request(app)
      .patch(`/api/v1/claims/${seeded.claims.pendingManagerOne}`)
      .set(auth(token))
      .send({ amount: "50.00", version: 0 })
      .expect(409);
  });

  it("prevents a manager from approving a claim assigned to another manager", async () => {
    const { token } = await login("manager1@test.local");
    await request(app)
      .post(`/api/v1/manager/claims/${seeded.claims.pendingManagerTwo}/approve`)
      .set(auth(token))
      .send({ version: 0 })
      .expect(403);
  });

  it("allows a manager to approve a valid pending claim", async () => {
    const { token } = await login("manager1@test.local");
    const response = await request(app)
      .post(`/api/v1/manager/claims/${seeded.claims.pendingManagerOne}/approve`)
      .set(auth(token))
      .send({ version: 0 })
      .expect(200);
    expect(response.body.data.status).toBe(ClaimStatus.PENDING_SENIOR_MANAGER);
    expect(response.body.data.pendingWithUserId).toBe(seeded.senior);
  });

  it("prevents a senior manager from acting before the senior step", async () => {
    const { token } = await login("senior@test.local");
    await request(app)
      .post(`/api/v1/senior-manager/claims/${seeded.claims.pendingManagerOne}/approve`)
      .set(auth(token))
      .send({ version: 0 })
      .expect(403);
  });

  it("sends a senior-manager revert back to the correct manager", async () => {
    const { token } = await login("senior@test.local");
    const response = await request(app)
      .post(`/api/v1/senior-manager/claims/${seeded.claims.pendingSenior}/revert`)
      .set(auth(token))
      .send({ version: 0, note: "Need manager clarification" })
      .expect(200);
    expect(response.body.data.status).toBe(ClaimStatus.REVERTED_TO_MANAGER);
    expect(response.body.data.pendingWithUserId).toBe(seeded.managerOne);
  });

  it("requires senior-manager revert before manager can revert to employee", async () => {
    const { token } = await login("manager1@test.local");
    await request(app)
      .post(`/api/v1/manager/claims/${seeded.claims.pendingManagerOne}/revert-to-employee`)
      .set(auth(token))
      .send({ version: 0, note: "Please fix" })
      .expect(409);
  });

  it("rejects manager rejection without a note", async () => {
    const { token } = await login("manager1@test.local");
    await request(app)
      .post(`/api/v1/manager/claims/${seeded.claims.pendingManagerOne}/reject`)
      .set(auth(token))
      .send({ version: 0 })
      .expect(400);
  });

  it("revokes the old refresh session when rotating tokens", async () => {
    const session = await login("employee1@test.local");
    const rotated = await request(app).post("/api/v1/auth/refresh").set("Cookie", session.cookie).expect(200);
    await request(app).post("/api/v1/auth/refresh").set("Cookie", session.cookie).expect(401);
    expect(rotated.headers["set-cookie"]).toBeDefined();
  });

  it("allows only one concurrent approval attempt to succeed", async () => {
    const { token } = await login("manager1@test.local");
    const calls = await Promise.allSettled([
      request(app).post(`/api/v1/manager/claims/${seeded.claims.pendingManagerOne}/approve`).set(auth(token)).send({ version: 0 }),
      request(app).post(`/api/v1/manager/claims/${seeded.claims.pendingManagerOne}/approve`).set(auth(token)).send({ version: 0 })
    ]);
    const statuses = calls.map((call) => (call.status === "fulfilled" ? call.value.status : 500)).sort();
    expect(statuses).toEqual([200, 409]);
  });
});
