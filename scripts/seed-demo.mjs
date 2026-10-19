import crypto from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });

if (process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Set ALLOW_DEMO_SEED=true to create local demo accounts");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Demo accounts cannot be seeded in production");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const DEMO_PASSWORD = "1234";
const KEY_LENGTH = 32;
const accounts = [
  ["musteri@anbean.com.tr", "Elif Demir", "musteri"],
  ["kurye@anbean.com.tr", "Mert Aksoy", "kurye"],
  ["ops@anbean.com.tr", "Burcu Yılmaz", "ops"],
  ["finans@anbean.com.tr", "Selin Kara", "finance"],
  ["destek@anbean.com.tr", "Emre Tan", "support"],
  ["admin@anbean.com.tr", "Can Öztürk", "admin"],
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");
  const table = await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'users'",
  );
  if (table.rowCount === 0) {
    throw new Error("The users table is missing; apply the database schema first");
  }

  const legacyColumn = await client.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'passcode'",
  );
  if (legacyColumn.rowCount > 0) {
    const legacyUsers = await client.query(
      "SELECT id, password_hash, passcode FROM users WHERE passcode <> ''",
    );
    for (const user of legacyUsers.rows) {
      if (!user.password_hash) {
        await client.query(
          "UPDATE users SET password_hash = $1 WHERE id = $2 AND password_hash IS NULL",
          [hashPassword(user.passcode), user.id],
        );
      }
    }
    await client.query("ALTER TABLE users DROP COLUMN passcode");
  }

  for (const [email, fullName, role] of accounts) {
    await client.query(
      `INSERT INTO users (email, full_name, role, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash)`,
      [email, fullName, role, hashPassword(DEMO_PASSWORD)],
    );
  }

  await client.query(`
    UPDATE couriers
    SET user_id = (SELECT id FROM users WHERE email = 'kurye@anbean.com.tr')
    WHERE user_id IS NULL AND full_name = 'Mert Aksoy'
  `);
  await client.query("COMMIT");
  console.info(`Demo accounts ready (${accounts.length} accounts).`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
