import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { adminRoutes } from "./routes/admin.routes";
import { authRoutes } from "./routes/auth.routes";
import { claimRoutes } from "./routes/claim.routes";
import { eventRoutes } from "./routes/event.routes";
import { uploadRoutes } from "./routes/upload.routes";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.WEB_APP_URL,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", service: "expense-flow-api" } });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", claimRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", uploadRoutes);
app.use("/api/v1", eventRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
