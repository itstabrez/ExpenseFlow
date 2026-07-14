"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from "@expense-flow/shared";
import { Button } from "@/components/button";
import { Field, Input } from "@/components/field";
import { useToast } from "@/components/toast";
import { apiErrorMessage } from "@/lib/api";
import { useAuth } from "./auth-provider";

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const { login } = useAuth();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to continue your expense workflow">
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit(async (data) => {
          try {
            await login(data);
            router.push("/dashboard");
          } catch (error) {
            toast.push(apiErrorMessage(error), "error");
          }
        })}
      >
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        <Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Signing in..." : "Sign in"}</Button>
        <p className="text-center text-sm text-slate-500">
          New employee?{" "}
          <Link className="font-medium text-leaf hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export function SignupForm() {
  const router = useRouter();
  const toast = useToast();
  const { signup } = useAuth();
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema) as unknown as Resolver<SignupInput>,
    defaultValues: { name: "", email: "", password: "", managerId: undefined }
  });
  return (
    <AuthCard title="Employee signup" subtitle="Your account will be assigned to the default seeded manager unless a manager ID is supplied">
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit(async (data) => {
          try {
            await signup(data);
            router.push("/dashboard");
          } catch (error) {
            toast.push(apiErrorMessage(error), "error");
          }
        })}
      >
        <Field label="Name" error={form.formState.errors.name?.message}>
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <Field label="Manager ID" error={form.formState.errors.managerId?.message}>
          <Input placeholder="Optional during local demo" {...form.register("managerId")} />
        </Field>
        <Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating..." : "Create account"}</Button>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link className="font-medium text-leaf hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#edf4f1] px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
