"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ClipboardList, Gauge, LogOut, User, Users } from "lucide-react";
import { RoleName, roleLabels, type RoleName as RoleNameType } from "@expense-flow/shared";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "./button";

const navByRole: Record<RoleNameType, { href: string; label: string; icon: React.ElementType }[]> = {
  EMPLOYEE: [
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/employee/claims", label: "My Claims", icon: ClipboardList },
    { href: "/profile", label: "Profile", icon: User }
  ],
  MANAGER: [
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/manager/inbox", label: "Inbox", icon: ClipboardList },
    { href: "/manager/history", label: "History", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: User }
  ],
  SENIOR_MANAGER: [
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/senior-manager/inbox", label: "Inbox", icon: ClipboardList },
    { href: "/senior-manager/history", label: "History", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: User }
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/claims", label: "Claims", icon: ClipboardList },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: User }
  ]
};

export function ProtectedShell({ children, roles }: { children: React.ReactNode; roles?: RoleNameType[] }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return <div className="p-8 text-sm text-slate-600">Loading your workspace...</div>;
  }
  if (roles && !roles.includes(user.role)) {
    return <main className="p-8 text-sm text-red-700">You do not have access to this page.</main>;
  }
  const nav = navByRole[user.role];
  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <Link href="/dashboard" className="mb-8 block text-xl font-semibold text-ink">
          ExpenseFlow
        </Link>
        <nav className="grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  active ? "bg-mint text-leaf" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-ink">{user.name}</p>
            <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
          </div>
          <Button tone="secondary" onClick={() => void logout().then(() => router.push("/login"))}>
            <LogOut size={16} />
            Logout
          </Button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export const employeeOnly = [RoleName.EMPLOYEE];
export const managerOnly = [RoleName.MANAGER];
export const seniorOnly = [RoleName.SENIOR_MANAGER];
export const adminOnly = [RoleName.ADMIN];
