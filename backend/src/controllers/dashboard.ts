import * as dashboardRepository from "../repositories/dashboard";
import { asyncHandler } from "../utils/asyncHandler";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await dashboardRepository.stats(req.user!.userId);
  res.json({ data });
});