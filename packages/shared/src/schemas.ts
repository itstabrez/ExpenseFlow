import { z } from "zod";
import { ClaimCategory, ClaimStatus, RoleName, allowedSortFields } from "./constants";

const trimmed = z.string().trim();
const decimalMoney = trimmed.regex(/^\d+(\.\d{1,2})?$/, "Use a positive amount with up to two decimals");
const futureLimitDays = 31;
const optionalUuid = z.preprocess((value) => (value === "" ? undefined : value), trimmed.uuid().optional());
const nullableUuid = z.preprocess((value) => (value === "" ? null : value), trimmed.uuid().nullable().optional());
const receiptUrl = trimmed
  .refine((value) => value === "" || value.startsWith("/uploads/") || z.string().url().safeParse(value).success, "Use a valid receipt URL")
  .optional();

export const signupSchema = z.object({
  name: trimmed.min(2).max(120),
  email: trimmed.email().toLowerCase(),
  password: z.string().min(8).max(128),
  managerId: optionalUuid
});

export const loginSchema = z.object({
  email: trimmed.email().toLowerCase(),
  password: z.string().min(1).max(128)
});

export const claimCreateSchema = z.object({
  amount: decimalMoney.refine((value) => Number(value) > 0, "Amount must be greater than zero"),
  currency: trimmed.length(3).default("INR"),
  category: z.nativeEnum(ClaimCategory),
  description: trimmed.min(5).max(1000),
  expenseDate: z.coerce.date().refine((date) => {
    const max = new Date();
    max.setUTCDate(max.getUTCDate() + futureLimitDays);
    return date <= max;
  }, "Expense date is too far in the future"),
  receiptUrl
});

export const claimEditSchema = claimCreateSchema.partial().extend({
  version: z.coerce.number().int().nonnegative()
});

export const workflowNoteSchema = z.object({
  note: trimmed.min(3).max(1000),
  version: z.coerce.number().int().nonnegative()
});

export const workflowOptionalNoteSchema = z.object({
  note: trimmed.max(1000).optional(),
  version: z.coerce.number().int().nonnegative()
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: trimmed.max(120).optional(),
  status: z.nativeEnum(ClaimStatus).optional(),
  category: z.nativeEnum(ClaimCategory).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z.enum(allowedSortFields).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export const adminUserCreateSchema = z.object({
  name: trimmed.min(2).max(120),
  email: trimmed.email().toLowerCase(),
  password: z.string().min(8).max(128),
  roleName: z.nativeEnum(RoleName),
  managerId: nullableUuid,
  seniorManagerId: nullableUuid,
  isActive: z.boolean().default(true)
});

export const adminUserUpdateSchema = z.object({
  name: trimmed.min(2).max(120).optional(),
  email: trimmed.email().toLowerCase().optional(),
  roleName: z.nativeEnum(RoleName).optional(),
  managerId: nullableUuid,
  seniorManagerId: nullableUuid
});

export const userStatusSchema = z.object({
  isActive: z.boolean()
});

export const reportingLineSchema = z.object({
  managerId: nullableUuid,
  seniorManagerId: nullableUuid
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ClaimCreateInput = z.infer<typeof claimCreateSchema>;
export type ClaimEditInput = z.infer<typeof claimEditSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
