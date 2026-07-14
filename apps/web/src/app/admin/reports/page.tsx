"use client";

import { ProtectedShell, adminOnly } from "@/components/shell";
import { Reports } from "@/features/admin/reports";

export default function AdminReportsPage() {
  return (
    <ProtectedShell roles={adminOnly}>
      <Reports />
    </ProtectedShell>
  );
}
