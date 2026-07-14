"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type MonthlySummary = {
  month: string;
  totalClaimed: string;
  totalApproved: string;
  totalRejected: string;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
};

export function Reports() {
  const report = useQuery({
    queryKey: ["monthly-summary"],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: MonthlySummary[] }>("/admin/reports/monthly-summary");
      return response.data.data;
    }
  });
  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Monthly reports</h1>
        <p className="text-sm text-slate-500">Grouped by submission month.</p>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Claimed</th>
              <th className="px-4 py-3">Approved</th>
              <th className="px-4 py-3">Rejected</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Approved Count</th>
              <th className="px-4 py-3">Rejected Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.data?.map((row) => (
              <tr key={row.month}>
                <td className="px-4 py-3">{row.month}</td>
                <td className="px-4 py-3">{row.totalClaimed}</td>
                <td className="px-4 py-3">{row.totalApproved}</td>
                <td className="px-4 py-3">{row.totalRejected}</td>
                <td className="px-4 py-3">{row.submittedCount}</td>
                <td className="px-4 py-3">{row.approvedCount}</td>
                <td className="px-4 py-3">{row.rejectedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
