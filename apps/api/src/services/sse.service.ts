import type { Response } from "express";
import type { ClaimDto } from "@expense-flow/shared";

const clients = new Map<string, Set<Response>>();

export const addSseClient = (userId: string, res: Response) => {
  const userClients = clients.get(userId) ?? new Set<Response>();
  userClients.add(res);
  clients.set(userId, userClients);

  res.write("event: connected\n");
  res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25_000);

  reqClose(res, () => {
    clearInterval(heartbeat);
    userClients.delete(res);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  });
};

const reqClose = (res: Response, onClose: () => void) => {
  res.on("close", onClose);
};

export const notifyClaimChanged = (userIds: string | Array<string | null | undefined>, claim: ClaimDto) => {
  const recipients = Array.isArray(userIds) ? userIds : [userIds];
  const payload = `event: claim-status\n` + `data: ${JSON.stringify(claim)}\n\n`;
  for (const userId of new Set(recipients.filter((userId): userId is string => Boolean(userId)))) {
    const userClients = clients.get(userId);
    if (!userClients) {
      continue;
    }
    for (const client of userClients) {
      client.write(payload);
    }
  }
};
