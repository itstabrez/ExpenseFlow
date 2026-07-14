"use client";

import { ProtectedShell, employeeOnly } from "@/components/shell";
import { ClaimList } from "@/features/claims/claim-list";

export default function EmployeeClaimsPage() {
  return (
    <ProtectedShell roles={employeeOnly}>
      <ClaimList endpoint="/claims/my" title="My claims" newHref="/employee/claims/new" />
    </ProtectedShell>
  );
}
