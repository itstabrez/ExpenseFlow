import { addSseClient } from "../services/sse.service";
import { asyncHandler } from "../utils/async-handler";

export const events = asyncHandler(async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  addSseClient(req.user!.id, res);
});
