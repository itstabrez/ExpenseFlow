"use client";

import { ProtectedShell } from "@/components/shell";
import { Dashboard } from "@/features/dashboard/dashboard";

export default function DashboardPage() {
  return (
    <ProtectedShell>
      <Dashboard />
    </ProtectedShell>
  );
}
