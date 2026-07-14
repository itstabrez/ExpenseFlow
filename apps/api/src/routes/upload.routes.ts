import { Router } from "express";
import { uploadReceipt, receiptUpload } from "../controllers/upload.controller";
import { requireAuth } from "../middleware/auth";

export const uploadRoutes = Router();

uploadRoutes.post("/uploads/receipts", requireAuth, receiptUpload.single("receipt"), uploadReceipt);
