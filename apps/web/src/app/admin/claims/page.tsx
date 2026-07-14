"use client";

import { ProtectedShell, adminOnly } from "@/components/shell";
import { ClaimList } from "@/features/claims/claim-list";

export default function AdminClaimsPage() {
  return (
    <ProtectedShell roles={adminOnly}>
      <ClaimList endpoint="/admin/claims" title="All claims" />
    </ProtectedShell>
  );
}
