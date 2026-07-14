import { workflowNoteSchema, workflowOptionalNoteSchema } from "@expense-flow/shared";
import type { Request } from "express";
import { ValidationError } from "../errors/app-error";
import { claimService } from "../services/claim.service";
import { asyncHandler } from "../utils/async-handler";
import { parsePagination } from "../utils/pagination";
import { ok } from "../utils/response";

const actor = (req: Request) => req.user!;
const claimId = (req: Request) => {
  const value = req.params.claimId;
  if (!value || Array.isArray(value)) {
    throw new Error("Missing claimId");
  }
  return value;
};

export const createClaim = asyncHandler(async (req, res) => {
  ok(res, await claimService.createDraft(actor(req), req.body), 201);
});

export const myClaims = asyncHandler(async (req, res) => {
  ok(res, await claimService.listMine(actor(req), parsePagination(req)));
});

export const managerClaims = asyncHandler(async (req, res) => {
  ok(res, await claimService.listManager(actor(req), parsePagination(req)));
});

export const managerHistory = asyncHandler(async (req, res) => {
  ok(res, await claimService.listManagerHistory(actor(req), parsePagination(req)));
});

export const seniorManagerClaims = asyncHandler(async (req, res) => {
  ok(res, await claimService.listSeniorManager(actor(req), parsePagination(req)));
});

export const seniorManagerHistory = asyncHandler(async (req, res) => {
  ok(res, await claimService.listSeniorManagerHistory(actor(req), parsePagination(req)));
});

export const getClaim = asyncHandler(async (req, res) => {
  ok(res, await claimService.getById(actor(req), claimId(req)));
});

export const updateClaim = asyncHandler(async (req, res) => {
  ok(res, await claimService.updateClaim(actor(req), claimId(req), req.body));
});

export const deleteClaim = asyncHandler(async (req, res) => {
  const version = Number(req.query.version);
  if (!Number.isInteger(version) || version < 0) {
    throw new ValidationError("A valid claim version is required");
  }
  ok(res, await claimService.deleteDraft(actor(req), claimId(req), version));
});

export const submitClaim = asyncHandler(async (req, res) => {
  const { version } = workflowOptionalNoteSchema.parse(req.body);
  ok(res, await claimService.submit(actor(req), claimId(req), version));
});

export const resubmitClaim = asyncHandler(async (req, res) => {
  const { version } = workflowOptionalNoteSchema.parse(req.body);
  ok(res, await claimService.submit(actor(req), claimId(req), version, true));
});

export const managerApprove = asyncHandler(async (req, res) => {
  const { version } = workflowOptionalNoteSchema.parse(req.body);
  ok(res, await claimService.managerApprove(actor(req), claimId(req), version));
});

export const managerReject = asyncHandler(async (req, res) => {
  const { note, version } = workflowNoteSchema.parse(req.body);
  ok(res, await claimService.managerReject(actor(req), claimId(req), version, note));
});

export const managerReapprove = asyncHandler(async (req, res) => {
  const { version } = workflowOptionalNoteSchema.parse(req.body);
  ok(res, await claimService.managerApprove(actor(req), claimId(req), version, true));
});

export const managerRevertToEmployee = asyncHandler(async (req, res) => {
  const { note, version } = workflowNoteSchema.parse(req.body);
  ok(res, await claimService.managerRevertToEmployee(actor(req), claimId(req), version, note));
});

export const seniorApprove = asyncHandler(async (req, res) => {
  const { version } = workflowOptionalNoteSchema.parse(req.body);
  ok(res, await claimService.seniorAction(actor(req), claimId(req), version, "approve"));
});

export const seniorReject = asyncHandler(async (req, res) => {
  const { note, version } = workflowNoteSchema.parse(req.body);
  ok(res, await claimService.seniorAction(actor(req), claimId(req), version, "reject", note));
});

export const seniorRevert = asyncHandler(async (req, res) => {
  const { note, version } = workflowNoteSchema.parse(req.body);
  ok(res, await claimService.seniorAction(actor(req), claimId(req), version, "revert", note));
});

export const claimHistory = asyncHandler(async (req, res) => {
  ok(res, await claimService.history(actor(req), claimId(req)));
});
