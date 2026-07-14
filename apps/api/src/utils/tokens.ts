import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

type AccessTokenPayload = {
  sub: string;
  role: string;
  email: string;
  type: "access";
};

type RefreshTokenPayload = {
  sub: string;
  sessionId: string;
  type: "refresh";
};

type JwtTtl = NonNullable<jwt.SignOptions["expiresIn"]>;

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const generateId = () => crypto.randomUUID();

export const signAccessToken = (payload: Omit<AccessTokenPayload, "type">) =>
  jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as JwtTtl
  });

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, "type">) =>
  jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as JwtTtl
  });

export const verifyAccessToken = (token: string): AccessTokenPayload & JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === "string" || decoded.type !== "access") {
    throw new Error("Invalid access token");
  }
  return decoded as AccessTokenPayload & JwtPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload & JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (typeof decoded === "string" || decoded.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }
  return decoded as RefreshTokenPayload & JwtPayload;
};

export const ttlToDate = (ttl: string) => {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    throw new Error(`Unsupported TTL: ${ttl}`);
  }
  const amountRaw = match[1];
  const unit = match[2];
  if (!amountRaw || !unit) {
    throw new Error(`Unsupported TTL: ${ttl}`);
  }
  const amount = Number(amountRaw);
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const multiplier = multipliers[unit];
  if (!multiplier) {
    throw new Error(`Unsupported TTL: ${ttl}`);
  }
  return new Date(Date.now() + amount * multiplier);
};
