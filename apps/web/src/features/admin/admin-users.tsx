"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Paginated, type SafeUser, roleLabels } from "@expense-flow/shared";
import { useMemo, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";
import { Input } from "@/components/field";
import { useDebounce } from "@/lib/use-debounce";

export function AdminUsers() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const params = useMemo(() => ({ page, pageSize: 10, search: debouncedSearch || undefined }), [debouncedSearch, page]);
  const users = useQuery({
    queryKey: ["admin-users", params],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: Paginated<SafeUser> }>("/admin/users", { params });
      return response.data.data;
    }
  });
  const status = useMutation({
    mutationFn: (user: SafeUser) => api.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive }),
    onSuccess: async () => {
      toast.push("User status updated", "success");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => toast.push(apiErrorMessage(error), "error")
  });
  return (
    <section className="grid gap-5">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-slate-500">Create reviewers and manage reporting lines.</p>
        </div>
        <Link href="/admin/users/new">
          <Button>New user</Button>
        </Link>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <Input placeholder="Search name, email, or role" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.data?.items.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{roleLabels[user.role]}</td>
                <td className="px-4 py-3">{user.isActive ? "Active" : "Inactive"}</td>
                <td className="flex gap-2 px-4 py-3">
                  <Link href={`/admin/users/${user.id}`}>
                    <Button tone="secondary">Edit</Button>
                  </Link>
                  <Button
                    tone="secondary"
                    onClick={() => {
                      if (window.confirm(`${user.isActive ? "Deactivate" : "Activate"} ${user.name}?`)) {
                        status.mutate(user);
                      }
                    }}
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {!users.isLoading && users.data?.items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  No users match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Page {users.data?.pagination.page ?? page} of {users.data?.pagination.totalPages || 1}
          </span>
          <div className="flex gap-2">
            <Button tone="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Previous
            </Button>
            <Button tone="secondary" disabled={!users.data || page >= users.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
