import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createSuppression,
  listSuppressions,
  removeSuppression,
} from "../controllers/suppressions";

const router = Router();

router.use(requireAuth);

router.get("/", listSuppressions);
router.post("/", createSuppression);
router.delete("/:id", removeSuppression);

export default router;