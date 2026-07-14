import type { NextFunction, Request, Response } from "express";
import type { RoleName } from "@expense-flow/shared";
import { prisma } from "../config/prisma";
import { AuthenticationError } from "../errors/app-error";
import { verifyAccessToken } from "../utils/tokens";

export const requireEventAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = typeof req.query.accessToken === "string" ? req.query.accessToken : null;
    if (!token) {
      throw new AuthenticationError("Authentication required");
    }
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user || !user.isActive) {
      throw new AuthenticationError("Authentication required");
    }
    req.user = { id: user.id, email: user.email, role: user.role.name as RoleName, isActive: user.isActive };
    next();
  } catch {
    next(new AuthenticationError("Authentication required"));
  }
};
