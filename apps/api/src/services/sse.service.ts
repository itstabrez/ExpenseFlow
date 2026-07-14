import type { Response } from "express";
import type { ClaimDto } from "@expense-flow/shared";

const clients = new Map<string, Set<Response>>();

export const addSseClient = (userId: string, res: Response) => {
  const userClients = clients.get(userId) ?? new Set<Response>();
  userClients.add(res);
  clients.set(userId, userClients);

  res.write("event: connected\n");
  res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);

  reqClose(res, () => {
    userClients.delete(res);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  });
};

const reqClose = (res: Response, onClose: () => void) => {
  res.on("close", onClose);
};

export const notifyClaimChanged = (employeeId: string, claim: ClaimDto) => {
  const userClients = clients.get(employeeId);
  if (!userClients) {
    return;
  }
  const payload = `event: claim-status\n` + `data: ${JSON.stringify(claim)}\n\n`;
  for (const client of userClients) {
    client.write(payload);
  }
};
