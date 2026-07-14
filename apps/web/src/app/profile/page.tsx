"use client";

import { ProtectedShell } from "@/components/shell";
import { useAuth } from "@/features/auth/auth-provider";
import { roleLabels } from "@expense-flow/shared";

export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <ProtectedShell>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h1 className="text-2xl font-semibold">Profile</h1>
        {user ? (
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium">{roleLabels[user.role]}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </ProtectedShell>
  );
}
