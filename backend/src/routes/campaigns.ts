import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  cancelCampaign,
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignStats,
  listCampaigns,
  pauseCampaign,
  restartCampaign,
  resumeCampaign,
  startCampaign,
  updateCampaign,
} from "../controllers/campaigns";

const router = Router();

router.use(requireAuth);

router.get("/", listCampaigns);
router.post("/", createCampaign);
router.get("/:id/stats", getCampaignStats);
router.post("/:id/start", startCampaign);
router.post("/:id/pause", pauseCampaign);
router.post("/:id/resume", resumeCampaign);
router.post("/:id/cancel", cancelCampaign);
router.post("/:id/restart", restartCampaign);
router.get("/:id", getCampaign);
router.put("/:id", updateCampaign);
router.delete("/:id", deleteCampaign);

export default router;