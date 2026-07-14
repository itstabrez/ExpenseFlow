"use client";

import { useParams } from "next/navigation";
import { ProtectedShell, employeeOnly } from "@/components/shell";
import { ClaimForm } from "@/features/claims/claim-form";

export default function EditClaimPage() {
  const params = useParams<{ claimId: string }>();
  return (
    <ProtectedShell roles={employeeOnly}>
      <ClaimForm claimId={params.claimId} />
    </ProtectedShell>
  );
}
