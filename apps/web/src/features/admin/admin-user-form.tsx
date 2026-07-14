"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { RoleName, adminUserCreateSchema, adminUserUpdateSchema, roleLabels, type AdminUserCreateInput, type SafeUser } from "@expense-flow/shared";
import { Button } from "@/components/button";
import { Field, Input, Select } from "@/components/field";
import { api, apiErrorMessage } from "@/lib/api";
import { useToast } from "@/components/toast";

export function AdminUserForm({ userId }: { userId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const user = useQuery({
    queryKey: ["admin-user", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await api.get<{ success: true; data: SafeUser }>(`/admin/users/${userId}`);
      return response.data.data;
    }
  });
  const form = useForm<AdminUserCreateInput>({
    resolver: zodResolver(userId ? adminUserUpdateSchema : adminUserCreateSchema) as unknown as Resolver<AdminUserCreateInput>,
    defaultValues: {
      name: "",
      email: "",
      password: "Password123!",
      roleName: RoleName.EMPLOYEE,
      managerId: "",
      seniorManagerId: "",
      isActive: true
    }
  });

  useEffect(() => {
    if (!user.data) {
      return;
    }
    form.reset({
      name: user.data.name,
      email: user.data.email,
      password: "Password123!",
      roleName: user.data.role,
      managerId: user.data.managerId ?? "",
      seniorManagerId: user.data.seniorManagerId ?? "",
      isActive: user.data.isActive
    });
  }, [form, user.data]);
  const create = useMutation({
    mutationFn: (input: AdminUserCreateInput) => {
      const payload = { ...input, managerId: input.managerId || null, seniorManagerId: input.seniorManagerId || null };
      return userId ? api.patch(`/admin/users/${userId}`, payload) : api.post("/admin/users", payload);
    },
    onSuccess: () => {
      toast.push(userId ? "User updated" : "User created", "success");
      router.push("/admin/users");
    },
    onError: (error) => toast.push(apiErrorMessage(error), "error")
  });
  return (
    <form className="grid max-w-2xl gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-panel" onSubmit={form.handleSubmit((data) => create.mutate(data as AdminUserCreateInput))}>
      <h1 className="text-2xl font-semibold">{userId ? "Edit user" : "New user"}</h1>
      <Field label="Name" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" {...form.register("email")} />
      </Field>
      {!userId ? (
        <Field label="Password" error={form.formState.errors.password?.message}>
          <Input type="password" {...form.register("password")} />
        </Field>
      ) : null}
      <Field label="Role" error={form.formState.errors.roleName?.message}>
        <Select {...form.register("roleName")}>
          {Object.values(RoleName).map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Manager ID" error={form.formState.errors.managerId?.message}>
        <Input {...form.register("managerId")} />
      </Field>
      <Field label="Senior Manager ID" error={form.formState.errors.seniorManagerId?.message}>
        <Input {...form.register("seniorManagerId")} />
      </Field>
      <div className="flex gap-2">
        <Button disabled={create.isPending}>{userId ? "Save changes" : "Create"}</Button>
        <Button type="button" tone="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
