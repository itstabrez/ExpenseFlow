"use client";

import { ProtectedShell, adminOnly } from "@/components/shell";
import { AdminUserForm } from "@/features/admin/admin-user-form";

export default function NewAdminUserPage() {
  return (
    <ProtectedShell roles={adminOnly}>
      <AdminUserForm />
    </ProtectedShell>
  );
}
