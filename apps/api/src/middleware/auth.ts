import type { NextFunction, Request, Response } from "express";
import type { RoleName } from "@expense-flow/shared";
import { AuthenticationError, AuthorizationError } from "../errors/app-error";
import { prisma } from "../config/prisma";
import { verifyAccessToken } from "../utils/tokens";

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw new AuthenticationError("Authentication required");
    }
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true }
    });
    if (!user || !user.isActive) {
      throw new AuthenticationError("Authentication required");
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name as RoleName,
      isActive: user.isActive
    };
    next();
  } catch {
    next(new AuthenticationError("Authentication required"));
  }
};

export const requireRole =
  (...roles: RoleName[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AuthenticationError("Authentication required"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AuthorizationError());
      return;
    }
    next();
  };
