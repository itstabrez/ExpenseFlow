import { paginationSchema, type PaginationInput } from "@expense-flow/shared";
import type { Request } from "express";

export const parsePagination = (req: Request): PaginationInput => paginationSchema.parse(req.query);

export const paginationMeta = (page: number, pageSize: number, totalItems: number) => ({
  page,
  pageSize,
  totalItems,
  totalPages: Math.ceil(totalItems / pageSize)
});
