import { Router } from "express";
import { events } from "../controllers/event.controller";
import { requireEventAuth } from "../middleware/event-auth";

export const eventRoutes = Router();

eventRoutes.get("/events", requireEventAuth, events);
