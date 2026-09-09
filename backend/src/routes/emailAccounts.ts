import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createAccount,
  deleteAccount,
  getAccount,
  getAccountStats,
  listAccounts,
  setAccountStatus,
  testAccount,
  updateAccount,
} from "../controllers/emailAccounts";

const router = Router();

router.use(requireAuth);

router.get("/", listAccounts);
router.post("/", createAccount);
router.post("/:id/test", testAccount);
router.post("/:id/enable", setAccountStatus("active"));
router.post("/:id/disable", setAccountStatus("disabled"));
router.get("/:id/stats", getAccountStats);
router.get("/:id", getAccount);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);

export default router;