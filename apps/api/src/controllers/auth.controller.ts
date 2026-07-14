import type { Request, Response } from "express";
import { env } from "../config/env";
import { asyncHandler } from "../utils/async-handler";
import { ok } from "../utils/response";
import * as authService from "../services/auth.service";

const refreshCookieName = "expenseflow_refresh";

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(refreshCookieName, token, cookieOptions);
};

export const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body, req);
  setRefreshCookie(res, result.refreshToken);
  ok(res, { user: result.user, accessToken: result.accessToken }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  setRefreshCookie(res, result.refreshToken);
  ok(res, { user: result.user, accessToken: result.accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.cookies[refreshCookieName] as string | undefined, req);
  setRefreshCookie(res, result.refreshToken);
  ok(res, { user: result.user, accessToken: result.accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies[refreshCookieName] as string | undefined);
  res.clearCookie(refreshCookieName, cookieOptions);
  ok(res, { loggedOut: true });
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { user: await authService.me(req.user!.id) });
});
