import mysql, { Pool } from "mysql2/promise";
import { env } from "./env";

export const pool: Pool = mysql.createPool({
  uri: env.databaseUrl,
  connectionLimit: 10,
  namedPlaceholders: true,
  dateStrings: true,
});

export async function pingDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}