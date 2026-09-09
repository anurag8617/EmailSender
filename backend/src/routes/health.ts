import { Router } from "express";
import { pingDatabase } from "../config/db";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await pingDatabase();
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: "error",
      db: "disconnected",
      message: error instanceof Error ? error.message : "Unknown database error",
    });
  }
});

export default router;