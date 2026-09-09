import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const TOKEN_COOKIE = "token";
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  userId: number;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(
    { email: payload.email, sub: payload.userId },
    env.jwtSecret,
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === "string" || typeof decoded.sub !== "number") {
    throw new Error("Invalid token payload");
  }
  return { userId: decoded.sub, email: decoded.email as string };
}