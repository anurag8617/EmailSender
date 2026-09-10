import process from "process";
import { pool } from "../config/db";
import * as userRepository from "../repositories/users";
import { hashPassword } from "../services/password";

const name = process.env.ADMIN_NAME ?? "Admin";
const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "ChangeMe!123";

async function seed() {
  if (password.length < 8) {
    throw new Error(
      "Invalid admin defaults. Provide a password of at least 8 characters."
    );
  }

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    console.log(`[seed] Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const id = await userRepository.createUser({ name, email, passwordHash });
  console.log(`[seed] Created admin user #${id}: ${email}`);
  console.log(`[seed] Set ADMIN_EMAIL/ADMIN_PASSWORD in backend/.env to override defaults.`);
}

seed()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });