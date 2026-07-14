import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import type { Request } from "express";
import { env } from "../config/env";
import { ValidationError } from "../errors/app-error";
import { asyncHandler } from "../utils/async-handler";
import { ok } from "../utils/response";

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf"
};

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${extensions[file.mimetype] ?? ""}`);
  }
});

export const receiptUpload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_SIZE },
  fileFilter: (_req: Request, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new ValidationError("Receipts must be JPEG, PNG, WEBP, or PDF"));
      return;
    }
    cb(null, true);
  }
});

export const uploadReceipt = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError("Receipt file is required");
  }
  ok(res, { receiptUrl: `/uploads/${req.file.filename}` }, 201);
});
