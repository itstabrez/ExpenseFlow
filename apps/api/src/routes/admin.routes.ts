import { Router } from "express";
import { adminUserCreateSchema, adminUserUpdateSchema, reportingLineSchema, RoleName, userStatusSchema } from "@expense-flow/shared";
import * as adminController from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole(RoleName.ADMIN));
adminRoutes.get("/admin/users", adminController.listUsers);
adminRoutes.post("/admin/users", validateBody(adminUserCreateSchema), adminController.createUser);
adminRoutes.get("/admin/users/:userId", adminController.getUser);
adminRoutes.patch("/admin/users/:userId", validateBody(adminUserUpdateSchema), adminController.updateUser);
adminRoutes.patch("/admin/users/:userId/status", validateBody(userStatusSchema), adminController.setStatus);
adminRoutes.patch("/admin/users/:userId/reporting-line", validateBody(reportingLineSchema), adminController.updateReportingLine);
adminRoutes.get("/admin/claims", adminController.listClaims);
adminRoutes.get("/admin/reports/monthly-summary", adminController.monthlySummary);
