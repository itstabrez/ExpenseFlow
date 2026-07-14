"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedSortFields = exports.statusLabels = exports.roleLabels = exports.categoryLabels = exports.ClaimCategory = exports.ClaimAction = exports.WorkflowStep = exports.ClaimStatus = exports.RoleName = void 0;
exports.RoleName = {
    EMPLOYEE: "EMPLOYEE",
    MANAGER: "MANAGER",
    SENIOR_MANAGER: "SENIOR_MANAGER",
    ADMIN: "ADMIN"
};
exports.ClaimStatus = {
    DRAFT: "DRAFT",
    PENDING_MANAGER: "PENDING_MANAGER",
    PENDING_SENIOR_MANAGER: "PENDING_SENIOR_MANAGER",
    REVERTED_TO_MANAGER: "REVERTED_TO_MANAGER",
    REVERTED_TO_EMPLOYEE: "REVERTED_TO_EMPLOYEE",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED"
};
exports.WorkflowStep = {
    EMPLOYEE: "EMPLOYEE",
    MANAGER: "MANAGER",
    SENIOR_MANAGER: "SENIOR_MANAGER",
    COMPLETED: "COMPLETED"
};
exports.ClaimAction = {
    CREATE_DRAFT: "CREATE_DRAFT",
    SUBMIT: "SUBMIT",
    MANAGER_APPROVE: "MANAGER_APPROVE",
    MANAGER_REJECT: "MANAGER_REJECT",
    SENIOR_MANAGER_APPROVE: "SENIOR_MANAGER_APPROVE",
    SENIOR_MANAGER_REJECT: "SENIOR_MANAGER_REJECT",
    SENIOR_MANAGER_REVERT: "SENIOR_MANAGER_REVERT",
    MANAGER_REAPPROVE: "MANAGER_REAPPROVE",
    MANAGER_REVERT_TO_EMPLOYEE: "MANAGER_REVERT_TO_EMPLOYEE",
    EMPLOYEE_EDIT: "EMPLOYEE_EDIT",
    EMPLOYEE_RESUBMIT: "EMPLOYEE_RESUBMIT",
    DELETE_DRAFT: "DELETE_DRAFT"
};
exports.ClaimCategory = {
    TRAVEL: "TRAVEL",
    MEALS: "MEALS",
    ACCOMMODATION: "ACCOMMODATION",
    OFFICE_SUPPLIES: "OFFICE_SUPPLIES",
    SOFTWARE: "SOFTWARE",
    TRANSPORT: "TRANSPORT",
    OTHER: "OTHER"
};
exports.categoryLabels = {
    TRAVEL: "Travel",
    MEALS: "Meals",
    ACCOMMODATION: "Accommodation",
    OFFICE_SUPPLIES: "Office supplies",
    SOFTWARE: "Software",
    TRANSPORT: "Transport",
    OTHER: "Other"
};
exports.roleLabels = {
    EMPLOYEE: "Employee",
    MANAGER: "Manager",
    SENIOR_MANAGER: "Senior Manager",
    ADMIN: "Admin"
};
exports.statusLabels = {
    DRAFT: "Draft",
    PENDING_MANAGER: "Pending Manager",
    PENDING_SENIOR_MANAGER: "Pending Senior Manager",
    REVERTED_TO_MANAGER: "Reverted to Manager",
    REVERTED_TO_EMPLOYEE: "Reverted to Employee",
    APPROVED: "Approved",
    REJECTED: "Rejected"
};
exports.allowedSortFields = [
    "createdAt",
    "updatedAt",
    "expenseDate",
    "submittedAt",
    "amount",
    "claimNumber"
];
