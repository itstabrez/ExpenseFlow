"use client";

import { ProtectedShell, managerOnly } from "@/components/shell";
import { ClaimList } from "@/features/claims/claim-list";

export default function ManagerHistoryPage() {
  return (
    <ProtectedShell roles={managerOnly}>
      <ClaimList endpoint="/manager/history" title="Manager history" />
    </ProtectedShell>
  );
}
