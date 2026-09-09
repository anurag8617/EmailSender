import { Request, RequestHandler } from "express";
import { TOKEN_COOKIE, verifyToken } from "../services/token";

export function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  const cookie = req.cookies?.[TOKEN_COOKIE];
  return typeof cookie === "string" && cookie.length > 0 ? cookie : null;
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
};