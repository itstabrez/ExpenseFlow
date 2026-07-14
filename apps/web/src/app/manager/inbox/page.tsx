"use client";

import { ProtectedShell, managerOnly } from "@/components/shell";
import { ClaimList } from "@/features/claims/claim-list";

export default function ManagerInboxPage() {
  return (
    <ProtectedShell roles={managerOnly}>
      <ClaimList endpoint="/manager/claims" title="Manager inbox" />
    </ProtectedShell>
  );
}
