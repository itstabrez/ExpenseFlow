"use client";

import { ProtectedShell, employeeOnly } from "@/components/shell";
import { ClaimForm } from "@/features/claims/claim-form";

export default function NewClaimPage() {
  return (
    <ProtectedShell roles={employeeOnly}>
      <ClaimForm />
    </ProtectedShell>
  );
}
