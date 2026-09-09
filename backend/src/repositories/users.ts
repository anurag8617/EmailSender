import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { User } from "../types";

interface UserRow extends RowDataPacket, User {}

export async function findByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] ?? null;
}

export async function findById(id: number): Promise<User | null> {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<number> {
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [input.name, input.email, input.passwordHash]
  );
  return (result as { insertId: number }).insertId;
}