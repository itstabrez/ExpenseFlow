"use client";

import { useParams } from "next/navigation";
import { ProtectedShell, adminOnly } from "@/components/shell";
import { AdminUserForm } from "@/features/admin/admin-user-form";

export default function EditAdminUserPage() {
  const params = useParams<{ userId: string }>();
  return (
    <ProtectedShell roles={adminOnly}>
      <AdminUserForm userId={params.userId} />
    </ProtectedShell>
  );
}
