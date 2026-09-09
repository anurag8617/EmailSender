import { Request, Response } from "express";
import { z } from "zod";
import * as userRepository from "../repositories/users";
import { comparePassword } from "../services/password";
import { signToken } from "../services/token";
import { asyncHandler } from "../utils/asyncHandler";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = parsed.data;
  const user = await userRepository.findByEmail(email);
  const passwordOk =
    user !== null && (await comparePassword(password, user.password_hash));

  if (!user || !passwordOk) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
});

export const logout = (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/", httpOnly: true, sameSite: "lax" });
  res.json({ message: "Logged out" });
};

export const me = asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.user!.userId);
  if (!user) {
    res.status(401).json({ message: "User no longer exists" });
    return;
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});