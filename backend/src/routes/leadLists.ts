import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  addMembers,
  createLeadList,
  deleteLeadList,
  getLeadList,
  listLeadLists,
  listMembers,
  removeMember,
  updateLeadList,
} from "../controllers/leadLists";

const router = Router();

router.use(requireAuth);

router.get("/", listLeadLists);
router.post("/", createLeadList);
router.get("/:id", getLeadList);
router.put("/:id", updateLeadList);
router.delete("/:id", deleteLeadList);
router.get("/:id/members", listMembers);
router.post("/:id/members", addMembers);
router.delete("/:id/members/:leadId", removeMember);

export default router;