"use client";

import { ProtectedShell, adminOnly } from "@/components/shell";
import { AdminUsers } from "@/features/admin/admin-users";

export default function AdminUsersPage() {
  return (
    <ProtectedShell roles={adminOnly}>
      <AdminUsers />
    </ProtectedShell>
  );
}
