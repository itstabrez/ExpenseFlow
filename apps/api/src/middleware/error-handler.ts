import { ZodError } from "zod";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

const isZodError = (error: unknown): error is ZodError =>
  error instanceof ZodError ||
  (typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown }).issues) &&
    typeof (error as { flatten?: unknown }).flatten === "function");

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Route ${req.method} ${req.path} was not found`));
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isZodError(error)) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.flatten() }
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details }
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" }
  });
};
