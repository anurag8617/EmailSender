import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";

interface CountRow extends RowDataPacket {
  count?: number;
}

async function main(): Promise<void> {
  const [rows] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'email_templates'
        AND COLUMN_NAME = 'footer'`
  );
  if (Number(rows[0]?.count ?? 0) === 0) {
    await pool.query(
      `ALTER TABLE email_templates
         ADD COLUMN footer TEXT DEFAULT NULL AFTER body,
         MODIFY COLUMN subject VARCHAR(255) NOT NULL DEFAULT ''`
    );
    console.log("Added email_templates.footer and made subject default empty");
  } else {
    console.log("email_templates.footer already exists");
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});