import { Router } from "express";
import { claimCreateSchema, claimEditSchema, RoleName } from "@expense-flow/shared";
import * as claimController from "../controllers/claim.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const claimRoutes = Router();

claimRoutes.use(requireAuth);
claimRoutes.post("/claims", requireRole(RoleName.EMPLOYEE), validateBody(claimCreateSchema), claimController.createClaim);
claimRoutes.get("/claims/my", requireRole(RoleName.EMPLOYEE), claimController.myClaims);
claimRoutes.get("/claims/:claimId", claimController.getClaim);
claimRoutes.patch("/claims/:claimId", requireRole(RoleName.EMPLOYEE), validateBody(claimEditSchema), claimController.updateClaim);
claimRoutes.delete("/claims/:claimId", requireRole(RoleName.EMPLOYEE), claimController.deleteClaim);
claimRoutes.post("/claims/:claimId/submit", requireRole(RoleName.EMPLOYEE), claimController.submitClaim);
claimRoutes.post("/claims/:claimId/resubmit", requireRole(RoleName.EMPLOYEE), claimController.resubmitClaim);
claimRoutes.get("/claims/:claimId/history", claimController.claimHistory);

claimRoutes.get("/manager/claims", requireRole(RoleName.MANAGER), claimController.managerClaims);
claimRoutes.post("/manager/claims/:claimId/approve", requireRole(RoleName.MANAGER), claimController.managerApprove);
claimRoutes.post("/manager/claims/:claimId/reject", requireRole(RoleName.MANAGER), claimController.managerReject);
claimRoutes.post("/manager/claims/:claimId/reapprove", requireRole(RoleName.MANAGER), claimController.managerReapprove);
claimRoutes.post("/manager/claims/:claimId/revert-to-employee", requireRole(RoleName.MANAGER), claimController.managerRevertToEmployee);
claimRoutes.get("/manager/history", requireRole(RoleName.MANAGER), claimController.managerHistory);

claimRoutes.get("/senior-manager/claims", requireRole(RoleName.SENIOR_MANAGER), claimController.seniorManagerClaims);
claimRoutes.post("/senior-manager/claims/:claimId/approve", requireRole(RoleName.SENIOR_MANAGER), claimController.seniorApprove);
claimRoutes.post("/senior-manager/claims/:claimId/reject", requireRole(RoleName.SENIOR_MANAGER), claimController.seniorReject);
claimRoutes.post("/senior-manager/claims/:claimId/revert", requireRole(RoleName.SENIOR_MANAGER), claimController.seniorRevert);
claimRoutes.get("/senior-manager/history", requireRole(RoleName.SENIOR_MANAGER), claimController.seniorManagerHistory);
