"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportingLineSchema = exports.userStatusSchema = exports.adminUserUpdateSchema = exports.adminUserCreateSchema = exports.paginationSchema = exports.workflowOptionalNoteSchema = exports.workflowNoteSchema = exports.claimEditSchema = exports.claimCreateSchema = exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("./constants");
const trimmed = zod_1.z.string().trim();
const decimalMoney = trimmed.regex(/^\d+(\.\d{1,2})?$/, "Use a positive amount with up to two decimals");
const futureLimitDays = 31;
exports.signupSchema = zod_1.z.object({
    name: trimmed.min(2).max(120),
    email: trimmed.email().toLowerCase(),
    password: zod_1.z.string().min(8).max(128),
    managerId: trimmed.uuid().optional()
});
exports.loginSchema = zod_1.z.object({
    email: trimmed.email().toLowerCase(),
    password: zod_1.z.string().min(1).max(128)
});
exports.claimCreateSchema = zod_1.z.object({
    amount: decimalMoney.refine((value) => Number(value) > 0, "Amount must be greater than zero"),
    currency: trimmed.length(3).default("INR"),
    category: zod_1.z.nativeEnum(constants_1.ClaimCategory),
    description: trimmed.min(5).max(1000),
    expenseDate: zod_1.z.coerce.date().refine((date) => {
        const max = new Date();
        max.setUTCDate(max.getUTCDate() + futureLimitDays);
        return date <= max;
    }, "Expense date is too far in the future"),
    receiptUrl: trimmed.url().optional().or(zod_1.z.literal(""))
});
exports.claimEditSchema = exports.claimCreateSchema.partial().extend({
    version: zod_1.z.coerce.number().int().nonnegative()
});
exports.workflowNoteSchema = zod_1.z.object({
    note: trimmed.min(3).max(1000),
    version: zod_1.z.coerce.number().int().nonnegative()
});
exports.workflowOptionalNoteSchema = zod_1.z.object({
    note: trimmed.max(1000).optional(),
    version: zod_1.z.coerce.number().int().nonnegative()
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    pageSize: zod_1.z.coerce.number().int().positive().max(100).default(10),
    search: trimmed.max(120).optional(),
    status: zod_1.z.nativeEnum(constants_1.ClaimStatus).optional(),
    category: zod_1.z.nativeEnum(constants_1.ClaimCategory).optional(),
    fromDate: zod_1.z.coerce.date().optional(),
    toDate: zod_1.z.coerce.date().optional(),
    sortBy: zod_1.z.enum(constants_1.allowedSortFields).default("createdAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc")
});
exports.adminUserCreateSchema = zod_1.z.object({
    name: trimmed.min(2).max(120),
    email: trimmed.email().toLowerCase(),
    password: zod_1.z.string().min(8).max(128),
    roleName: zod_1.z.nativeEnum(constants_1.RoleName),
    managerId: trimmed.uuid().nullable().optional(),
    seniorManagerId: trimmed.uuid().nullable().optional(),
    isActive: zod_1.z.boolean().default(true)
});
exports.adminUserUpdateSchema = zod_1.z.object({
    name: trimmed.min(2).max(120).optional(),
    email: trimmed.email().toLowerCase().optional(),
    roleName: zod_1.z.nativeEnum(constants_1.RoleName).optional(),
    managerId: trimmed.uuid().nullable().optional(),
    seniorManagerId: trimmed.uuid().nullable().optional()
});
exports.userStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean()
});
exports.reportingLineSchema = zod_1.z.object({
    managerId: trimmed.uuid().nullable().optional(),
    seniorManagerId: trimmed.uuid().nullable().optional()
});
