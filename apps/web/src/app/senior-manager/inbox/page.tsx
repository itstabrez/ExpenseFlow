"use client";

import { ProtectedShell, seniorOnly } from "@/components/shell";
import { ClaimList } from "@/features/claims/claim-list";

export default function SeniorInboxPage() {
  return (
    <ProtectedShell roles={seniorOnly}>
      <ClaimList endpoint="/senior-manager/claims" title="Senior manager inbox" />
    </ProtectedShell>
  );
}
