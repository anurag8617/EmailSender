import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listSupportedVariables,
  listTemplates,
  previewTemplate,
  renderTemplateText,
  updateTemplate,
} from "../controllers/templates";

const router = Router();

router.use(requireAuth);

router.get("/", listTemplates);
router.post("/", createTemplate);
router.post("/render", renderTemplateText);
router.get("/variables", listSupportedVariables);
router.get("/:id/preview", previewTemplate);
router.get("/:id", getTemplate);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

export default router;