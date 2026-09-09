import { Router } from "express";
import { z } from "zod";
import * as jobRepo from "../repositories/jobs";
import * as suppressionRepo from "../repositories/suppressions";

const router = Router();

const unsubscribeQuerySchema = z.object({
  email: z.string().email(),
  campaign_id: z.coerce.number().int().positive().optional(),
});

const confirmationHtml = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Unsubscribed</title></head>
<body style="font-family: Arial, sans-serif; max-width: 32rem; margin: 4rem auto; color: #1f2937;">
  <h1>You are unsubscribed</h1>
  <p>Your address has been added to the suppression list and no further emails will be
  sent to it through this campaign.</p>
</body>
</html>`;

router.get("/unsubscribe", async (req, res) => {
  const parsed = unsubscribeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).send("Invalid unsubscribe link. Please copy the full link from the email.");
    return;
  }
  const { email, campaign_id } = parsed.data;

  await suppressionRepo.addSuppression(email, "UNSUBSCRIBED", "unsubscribe_link");
  if (campaign_id) {
    await jobRepo.recordUnsubscribe(campaign_id, email);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(confirmationHtml);
});

export default router;