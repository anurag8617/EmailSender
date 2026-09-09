import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { csvUpload } from "../middleware/upload";
import {
  createLead,
  deleteLead,
  getLead,
  importLeads,
  listLeads,
  previewImport,
  updateLead,
} from "../controllers/leads";

const router = Router();

router.use(requireAuth);

router.get("/", listLeads);
router.post("/", createLead);
router.post("/import/preview", csvUpload.single("file"), previewImport);
router.post("/import", csvUpload.single("file"), importLeads);
router.get("/:id", getLead);
router.put("/:id", updateLead);
router.delete("/:id", deleteLead);

export default router;