import { Router } from "express";
import healthRoutes from "./health";
import authRoutes from "./auth";
import leadsRoutes from "./leads";
import emailAccountsRoutes from "./emailAccounts";
import templatesRoutes from "./templates";
import campaignsRoutes from "./campaigns";
import unsubscribeRoutes from "./unsubscribe";
import suppressionsRoutes from "./suppressions";
import dashboardRoutes from "./dashboard";

const router = Router();

router.use("/api", healthRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/leads", leadsRoutes);
router.use("/api/email-accounts", emailAccountsRoutes);
router.use("/api/templates", templatesRoutes);
router.use("/api/campaigns", campaignsRoutes);
router.use("/api", unsubscribeRoutes);
router.use("/api/suppressions", suppressionsRoutes);
router.use("/api/dashboard", dashboardRoutes);

export default router;