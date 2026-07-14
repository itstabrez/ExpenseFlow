"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClaimCategory, ClaimStatus, categoryLabels, statusLabels, type ClaimDto, type Paginated } from "@expense-flow/shared";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useDebounce } from "@/lib/use-debounce";
import { Button } from "@/components/button";
import { Input, Select } from "@/components/field";

type Props = {
  endpoint: string;
  title: string;
  newHref?: string;
};

export function ClaimList({ endpoint, title, newHref }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const debouncedSearch = useDebounce(search);
  const params = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: debouncedSearch || undefined,
      status: status || undefined,
      category: category || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      sortBy,
      sortOrder
    }),
    [category, debouncedSearch, fromDate, page, sortBy, sortOrder, status, toDate]
  );
  useEffect(() => {
    setPage(1);
  }, [category, debouncedSearch, fromDate, sortBy, sortOrder, status, toDate]);
  const { data, isLoading } = useQuery({
    queryKey: ["claims", endpoint, params],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: Paginated<ClaimDto> }>(endpoint, { params });
      return response.data.data;
    }
  });

  return (
    <section className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="text-sm text-slate-500">Search, filter, and open claims for review.</p>
        </div>
        {newHref ? (
          <Link href={newHref}>
            <Button>
              <Plus size={16} />
              New claim
            </Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-4">
        <Input placeholder="Search claim, employee, description" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {Object.values(ClaimStatus).map((item) => (
            <option key={item} value={item}>
              {statusLabels[item]}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {Object.values(ClaimCategory).map((item) => (
            <option key={item} value={item}>
            {categoryLabels[item]}
          </option>
        ))}
        </Select>
        <Input type="date" aria-label="From date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <Input type="date" aria-label="To date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="createdAt">Created</option>
          <option value="updatedAt">Updated</option>
          <option value="expenseDate">Expense date</option>
          <option value="submittedAt">Submitted</option>
          <option value="amount">Amount</option>
          <option value="claimNumber">Claim number</option>
        </Select>
        <Select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </Select>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Claim</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pending With</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4" colSpan={6}>
                        <div className="h-5 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                : data?.items.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link className="font-semibold text-leaf hover:underline" href={`/claims/${claim.id}`}>
                          {claim.claimNumber}
                        </Link>
                        <p className="max-w-xs truncate text-xs text-slate-500">{claim.description}</p>
                      </td>
                      <td className="px-4 py-3">{claim.employeeName ?? "You"}</td>
                      <td className="px-4 py-3">{categoryLabels[claim.category]}</td>
                      <td className="px-4 py-3">
                        {claim.currency} {claim.amount}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-mint px-2 py-1 text-xs font-medium text-leaf">{statusLabels[claim.status]}</span>
                      </td>
                      <td className="px-4 py-3">{claim.pendingWithName ?? "-"}</td>
                    </tr>
                  ))}
              {!isLoading && data?.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                    No claims match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Page {data?.pagination.page ?? page} of {data?.pagination.totalPages || 1}
          </span>
          <div className="flex gap-2">
            <Button tone="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Previous
            </Button>
            <Button tone="secondary" disabled={!data || page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
