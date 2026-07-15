"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";
import {
  ClaimStatus,
  RoleName,
  WorkflowStep,
  categoryLabels,
  statusLabels,
  type AuditEntryDto,
  type ClaimDto
} from "@expense-flow/shared";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useToast } from "@/components/toast";
import { Button } from "@/components/button";

export function ClaimDetail() {
  const params = useParams<{ claimId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const claimQuery = useQuery({
    queryKey: ["claim", params.claimId],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: ClaimDto }>(`/claims/${params.claimId}`);
      return response.data.data;
    }
  });
  const historyQuery = useQuery({
    queryKey: ["claim", params.claimId, "history"],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: AuditEntryDto[] }>(`/claims/${params.claimId}/history`);
      return response.data.data;
    }
  });
  const action = useMutation({
    mutationFn: async ({ url, body }: { url: string; body: { version: number; note?: string } }) => api.post(url, body),
    onSuccess: async () => {
      toast.push("Claim updated", "success");
      await queryClient.invalidateQueries({ queryKey: ["claim", params.claimId] });
      await queryClient.invalidateQueries({ queryKey: ["claim", params.claimId, "history"] });
      await queryClient.invalidateQueries({ queryKey: ["claims"] });
    },
    onError: (error) => toast.push(apiErrorMessage(error), "error")
  });
  const deleteDraft = useMutation({
    mutationFn: async () => api.delete(`/claims/${params.claimId}`, { params: { version: claim?.version ?? 0 } }),
    onSuccess: async () => {
      toast.push("Draft deleted", "success");
      await queryClient.invalidateQueries({ queryKey: ["claims"] });
      router.push("/employee/claims");
    },
    onError: (error) => toast.push(apiErrorMessage(error), "error")
  });

  const claim = claimQuery.data;
  if (claimQuery.isLoading || !claim || !user) {
    return <div className="rounded-md bg-white p-6 text-sm text-slate-500 shadow-panel">Loading claim...</div>;
  }

  const note = (message: string) => window.prompt(message)?.trim();
  const run = (url: string, needsNote = false) => {
    const entered = needsNote ? note("Add the required note") : undefined;
    if (needsNote && !entered) {
      toast.push("A note is required", "error");
      return;
    }
    action.mutate({ url, body: entered ? { version: claim.version, note: entered } : { version: claim.version } });
  };

  const canEdit =
    user.role === RoleName.EMPLOYEE &&
    claim.employeeId === user.id &&
    (claim.status === ClaimStatus.DRAFT || claim.status === ClaimStatus.REVERTED_TO_EMPLOYEE);
  const canDelete = user.role === RoleName.EMPLOYEE && claim.employeeId === user.id && claim.status === ClaimStatus.DRAFT;
  const canSubmit = canEdit && claim.status === ClaimStatus.DRAFT;
  const canResubmit = canEdit && claim.status === ClaimStatus.REVERTED_TO_EMPLOYEE;
  const canManagerInitial =
    user.role === RoleName.MANAGER &&
    claim.pendingWithUserId === user.id &&
    claim.status === ClaimStatus.PENDING_MANAGER &&
    claim.currentStep === WorkflowStep.MANAGER;
  const canManagerReverted =
    user.role === RoleName.MANAGER &&
    claim.pendingWithUserId === user.id &&
    claim.status === ClaimStatus.REVERTED_TO_MANAGER &&
    claim.currentStep === WorkflowStep.MANAGER;
  const canSenior =
    user.role === RoleName.SENIOR_MANAGER &&
    claim.pendingWithUserId === user.id &&
    claim.status === ClaimStatus.PENDING_SENIOR_MANAGER &&
    claim.currentStep === WorkflowStep.SENIOR_MANAGER;
  const latestNote = historyQuery.data
    ?.filter((entry) => entry.note)
    .slice()
    .reverse()[0];

  return (
    <section className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{claim.claimNumber}</h1>
          <p className="text-sm text-slate-500">{claim.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Link href={`/employee/claims/${claim.id}/edit`}>
              <Button tone="secondary">Edit</Button>
            </Link>
          ) : null}
          {canDelete ? (
            <Button
              tone="danger"
              disabled={deleteDraft.isPending}
              onClick={() => {
                if (window.confirm("Delete this draft claim? This keeps an audit record and removes it from lists.")) {
                  deleteDraft.mutate();
                }
              }}
            >
              Delete draft
            </Button>
          ) : null}
          {canSubmit ? <Button onClick={() => run(`/claims/${claim.id}/submit`)}>Submit</Button> : null}
          {canResubmit ? <Button onClick={() => run(`/claims/${claim.id}/resubmit`)}>Resubmit</Button> : null}
          {canManagerInitial ? (
            <>
              <Button onClick={() => run(`/manager/claims/${claim.id}/approve`)}>Approve</Button>
              <Button tone="danger" onClick={() => run(`/manager/claims/${claim.id}/reject`, true)}>
                Reject
              </Button>
            </>
          ) : null}
          {canManagerReverted ? (
            <>
              <Button onClick={() => run(`/manager/claims/${claim.id}/reapprove`)}>Reapprove</Button>
              <Button tone="danger" onClick={() => run(`/manager/claims/${claim.id}/revert-to-employee`, true)}>
                Revert to employee
              </Button>
            </>
          ) : null}
          {canSenior ? (
            <>
              <Button onClick={() => run(`/senior-manager/claims/${claim.id}/approve`)}>Approve</Button>
              <Button tone="danger" onClick={() => run(`/senior-manager/claims/${claim.id}/reject`, true)}>
                Reject
              </Button>
              <Button tone="secondary" onClick={() => run(`/senior-manager/claims/${claim.id}/revert`, true)}>
                Revert
              </Button>
            </>
          ) : null}
          <Button tone="secondary" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Employee", claim.employeeName ?? claim.employeeId],
          ["Amount", `${claim.currency} ${claim.amount}`],
          ["Category", categoryLabels[claim.category]],
          ["Expense date", new Date(claim.expenseDate).toLocaleDateString()],
          ["Status", statusLabels[claim.status]],
          ["Workflow step", claim.currentStep.replaceAll("_", " ")],
          ["Pending reviewer", claim.pendingWithName ?? "-"]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-xs uppercase text-slate-500">{label}</p>
            <p className="mt-1 font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <p className="text-xs uppercase text-slate-500">Receipt document</p>
        {claim.receiptUrl ? (
          <a className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-leaf hover:underline" href={claim.receiptUrl} target="_blank" rel="noreferrer">
            <FileText size={16} />
            Open uploaded receipt
            <ExternalLink size={14} />
          </a>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No receipt uploaded</p>
        )}
      </div>
      {latestNote ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Latest note</p>
          <p className="mt-1">{latestNote.note}</p>
        </div>
      ) : null}
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="mb-4 text-lg font-semibold">Audit timeline</h2>
        <ol className="grid gap-3">
          {historyQuery.data?.map((entry) => (
            <li key={entry.id} className="border-l-2 border-mint pl-4">
              <p className="text-sm font-semibold text-ink">
                {entry.action.replaceAll("_", " ")} by {entry.actorName}
              </p>
              <p className="text-xs text-slate-500">
                {entry.actorRole.replaceAll("_", " ")} | {entry.fromStatus ?? "START"} {"->"} {entry.toStatus} | {entry.step.replaceAll("_", " ")} |{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              {entry.note ? <p className="mt-1 rounded-md bg-slate-50 p-2 text-sm text-slate-700">{entry.note}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
