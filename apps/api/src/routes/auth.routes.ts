import { Router } from "express";
import { loginSchema, signupSchema } from "@expense-flow/shared";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rate-limit";
import { validateBody } from "../middleware/validate";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, validateBody(signupSchema), authController.signup);
authRoutes.post("/login", authRateLimit, validateBody(loginSchema), authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
authRoutes.get("/me", requireAuth, authController.me);
