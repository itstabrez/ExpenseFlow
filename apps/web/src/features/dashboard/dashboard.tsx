"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RoleName, type ClaimDto, type Paginated } from "@expense-flow/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";

export function Dashboard() {
  const { user } = useAuth();
  const endpoint =
    user?.role === RoleName.EMPLOYEE
      ? "/claims/my"
      : user?.role === RoleName.MANAGER
        ? "/manager/claims"
        : user?.role === RoleName.SENIOR_MANAGER
          ? "/senior-manager/claims"
          : "/admin/claims";
  const claims = useQuery({
    queryKey: ["claims", "dashboard", endpoint],
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await api.get<{ success: true; data: Paginated<ClaimDto> }>(endpoint, { params: { pageSize: 100 } });
      return response.data.data.items;
    }
  });
  const items = claims.data ?? [];
  const pending = items.filter((claim) => claim.pendingWithUserId === user?.id).length;
  const approved = items.filter((claim) => claim.status === "APPROVED").length;
  const rejected = items.filter((claim) => claim.status === "REJECTED").length;
  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">A quick view of the work currently visible to you.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Pending with you", pending],
          ["Approved", approved],
          ["Rejected", rejected]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="mb-3 text-lg font-semibold">Recent claims</h2>
        <div className="grid gap-2">
          {items.slice(0, 5).map((claim) => (
            <Link key={claim.id} href={`/claims/${claim.id}`} className="flex justify-between rounded-md border border-slate-100 p-3 text-sm hover:bg-slate-50">
              <span>{claim.claimNumber}</span>
              <span className="font-medium">
                {claim.currency} {claim.amount}
              </span>
            </Link>
          ))}
          {!claims.isLoading && items.length === 0 ? <p className="text-sm text-slate-500">No claims to show yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
