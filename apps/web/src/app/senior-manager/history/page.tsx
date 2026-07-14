"use client";

import { ProtectedShell, seniorOnly } from "@/components/shell";
import { ClaimList } from "@/features/claims/claim-list";

export default function SeniorHistoryPage() {
  return (
    <ProtectedShell roles={seniorOnly}>
      <ClaimList endpoint="/senior-manager/history" title="Senior manager history" />
    </ProtectedShell>
  );
}
