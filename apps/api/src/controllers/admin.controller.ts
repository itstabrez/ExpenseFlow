import type { Request } from "express";
import { adminService } from "../services/admin.service";
import { asyncHandler } from "../utils/async-handler";
import { parsePagination } from "../utils/pagination";
import { ok } from "../utils/response";

const userId = (req: Request) => {
  const value = req.params.userId;
  if (!value || Array.isArray(value)) {
    throw new Error("Missing userId");
  }
  return value;
};

export const listUsers = asyncHandler(async (req, res) => {
  ok(res, await adminService.listUsers(parsePagination(req)));
});

export const createUser = asyncHandler(async (req, res) => {
  ok(res, await adminService.createUser(req.body), 201);
});

export const getUser = asyncHandler(async (req, res) => {
  ok(res, await adminService.getUser(userId(req)));
});

export const updateUser = asyncHandler(async (req, res) => {
  ok(res, await adminService.updateUser(userId(req), req.body));
});

export const setStatus = asyncHandler(async (req, res) => {
  ok(res, await adminService.setStatus(userId(req), Boolean(req.body.isActive)));
});

export const updateReportingLine = asyncHandler(async (req, res) => {
  ok(res, await adminService.updateReportingLine(userId(req), req.body.managerId, req.body.seniorManagerId));
});

export const listClaims = asyncHandler(async (req, res) => {
  ok(res, await adminService.listClaims(parsePagination(req)));
});

export const monthlySummary = asyncHandler(async (_req, res) => {
  ok(res, await adminService.monthlySummary());
});
