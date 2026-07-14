import type { Request } from "express";
import { Prisma } from "@prisma/client";
import { RoleName } from "@expense-flow/shared";
import { prisma } from "../config/prisma";
import { AuthenticationError, ConflictError, ValidationError } from "../errors/app-error";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateId, hashToken, signAccessToken, signRefreshToken, ttlToDate, verifyRefreshToken } from "../utils/tokens";
import { env } from "../config/env";
import { toSafeUser } from "./mappers";
import type { LoginInput, SignupInput } from "@expense-flow/shared";

const genericAuthError = new AuthenticationError("Invalid email or password");

const sessionContext = (req: Request) => ({
  userAgent: req.get("user-agent") ?? null,
  ipAddress: req.ip ?? null
});

const issueRefreshSession = async (userId: string, req: Request, tx: Prisma.TransactionClient = prisma) => {
  const sessionId = generateId();
  const refreshToken = signRefreshToken({ sub: userId, sessionId });
  await tx.refreshSession.create({
    data: {
      id: sessionId,
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: ttlToDate(env.REFRESH_TOKEN_TTL),
      ...sessionContext(req)
    }
  });
  return { refreshToken, sessionId };
};

const issueAccessToken = (user: { id: string; email: string; role: { name: string } }) =>
  signAccessToken({ sub: user.id, email: user.email, role: user.role.name });

export const signup = async (input: SignupInput, req: Request) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw genericAuthError;
  }

  const employeeRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.EMPLOYEE } });
  const manager = input.managerId
    ? await prisma.user.findUnique({ where: { id: input.managerId }, include: { role: true } })
    : await prisma.user.findFirst({ where: { role: { name: RoleName.MANAGER }, isActive: true }, include: { role: true } });

  if (!manager || manager.role.name !== RoleName.MANAGER || !manager.seniorManagerId) {
    throw new ValidationError("A valid manager with a senior manager is required for signup");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      roleId: employeeRole.id,
      managerId: manager.id
    },
    include: { role: true }
  });
  const { refreshToken } = await issueRefreshSession(user.id, req);
  return { user: toSafeUser(user), accessToken: issueAccessToken(user), refreshToken };
};

export const login = async (input: LoginInput, req: Request) => {
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { role: true } });
  if (!user || !user.isActive) {
    throw genericAuthError;
  }
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw genericAuthError;
  }
  const { refreshToken } = await issueRefreshSession(user.id, req);
  return { user: toSafeUser(user), accessToken: issueAccessToken(user), refreshToken };
};

export const refresh = async (refreshToken: string | undefined, req: Request) => {
  if (!refreshToken) {
    throw new AuthenticationError("Refresh required");
  }
  const payload = verifyRefreshToken(refreshToken);
  return prisma.$transaction(async (tx) => {
    const session = await tx.refreshSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: { include: { role: true } } }
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.tokenHash !== hashToken(refreshToken) ||
      !session.user.isActive
    ) {
      throw new AuthenticationError("Refresh failed");
    }

    const replacement = await issueRefreshSession(session.userId, req, tx);
    const updated = await tx.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedBySessionId: replacement.sessionId }
    });
    if (updated.count !== 1) {
      throw new ConflictError("Refresh session has already been rotated");
    }
    return {
      user: toSafeUser(session.user),
      accessToken: issueAccessToken(session.user),
      refreshToken: replacement.refreshToken
    };
  });
};

export const logout = async (refreshToken: string | undefined) => {
  if (!refreshToken) {
    return;
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.refreshSession.updateMany({
      where: { id: payload.sessionId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  } catch {
    return;
  }
};

export const me = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
  return toSafeUser(user);
};
