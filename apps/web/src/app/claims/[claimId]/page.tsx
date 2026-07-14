"use client";

import { ProtectedShell } from "@/components/shell";
import { ClaimDetail } from "@/features/claims/claim-detail";

export default function ClaimDetailPage() {
  return (
    <ProtectedShell>
      <ClaimDetail />
    </ProtectedShell>
  );
}
