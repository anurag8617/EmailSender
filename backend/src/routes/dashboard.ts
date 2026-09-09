import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboardStats } from "../controllers/dashboard";

const router = Router();

router.use(requireAuth);

router.get("/stats", getDashboardStats);

export default router;