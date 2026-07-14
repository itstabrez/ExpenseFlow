"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { ClaimCategory, categoryLabels, claimCreateSchema, type ClaimCreateInput, type ClaimDto } from "@expense-flow/shared";
import { api, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/button";
import { Field, Input, Select, Textarea } from "@/components/field";
import { useToast } from "@/components/toast";

type Props = { claimId?: string };
const claimResolver = zodResolver as unknown as (schema: unknown) => Resolver<ClaimCreateInput>;

export function ClaimForm({ claimId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const claimQuery = useQuery({
    queryKey: ["claim", claimId],
    enabled: Boolean(claimId),
    queryFn: async () => {
      const response = await api.get<{ success: true; data: ClaimDto }>(`/claims/${claimId}`);
      return response.data.data;
    }
  });
  const claim = claimQuery.data;
  const form = useForm<ClaimCreateInput>({
    resolver: claimResolver(claimCreateSchema),
    defaultValues: {
      amount: "",
      currency: "INR",
      category: ClaimCategory.TRAVEL,
      description: "",
      expenseDate: new Date(),
      receiptUrl: ""
    }
  });

  useEffect(() => {
    if (!claim) {
      return;
    }
    form.reset({
      amount: claim.amount,
      currency: claim.currency,
      category: claim.category,
      description: claim.description,
      expenseDate: new Date(claim.expenseDate),
      receiptUrl: claim.receiptUrl ?? ""
    });
  }, [claim, form]);
  const save = useMutation({
    mutationFn: async (input: ClaimCreateInput) => {
      const payload = claimId ? { ...input, version: claim?.version ?? 0 } : input;
      const response = claimId
        ? await api.patch<{ success: true; data: ClaimDto }>(`/claims/${claimId}`, payload)
        : await api.post<{ success: true; data: ClaimDto }>("/claims", payload);
      return response.data.data;
    },
    onSuccess: (saved) => {
      toast.push("Claim saved", "success");
      router.push(`/claims/${saved.id}`);
    },
    onError: (error) => toast.push(apiErrorMessage(error), "error")
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const data = new FormData();
      data.append("receipt", file);
      const response = await api.post<{ success: true; data: { receiptUrl: string } }>("/uploads/receipts", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data.data.receiptUrl;
    },
    onSuccess: (receiptUrl) => {
      form.setValue("receiptUrl", receiptUrl, { shouldDirty: true, shouldValidate: true });
      toast.push("Receipt uploaded", "success");
    },
    onError: (error) => toast.push(apiErrorMessage(error), "error")
  });

  return (
    <form className="grid max-w-3xl gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel" onSubmit={form.handleSubmit((data) => save.mutate(data))}>
      <div>
        <h1 className="text-2xl font-semibold">{claimId ? "Edit claim" : "New claim"}</h1>
        <p className="text-sm text-slate-500">Amounts are stored as decimals and returned as strings.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Amount" error={form.formState.errors.amount?.message}>
          <Input inputMode="decimal" {...form.register("amount")} />
        </Field>
        <Field label="Currency" error={form.formState.errors.currency?.message}>
          <Input maxLength={3} {...form.register("currency")} />
        </Field>
        <Field label="Category" error={form.formState.errors.category?.message}>
          <Select {...form.register("category")}>
            {Object.values(ClaimCategory).map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Expense date" error={form.formState.errors.expenseDate?.message}>
          <Input type="date" {...form.register("expenseDate", { valueAsDate: true })} />
        </Field>
      </div>
      <Field label="Description" error={form.formState.errors.description?.message}>
        <Textarea {...form.register("description")} />
      </Field>
      <Field label="Receipt URL" error={form.formState.errors.receiptUrl?.message}>
        <Input placeholder="/uploads/receipt.pdf" {...form.register("receiptUrl")} />
      </Field>
      <Field label="Receipt upload">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={upload.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              upload.mutate(file);
            }
          }}
        />
      </Field>
      <div className="flex gap-2">
        <Button disabled={save.isPending}>{save.isPending ? "Saving..." : "Save claim"}</Button>
        <Button type="button" tone="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
