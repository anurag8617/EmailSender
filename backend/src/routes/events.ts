import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { subscribe } from "../realtime/events";

const router = Router();

router.get("/events", requireAuth, (req, res) => {
  subscribe(req.user!.userId, res);
});

export default router;