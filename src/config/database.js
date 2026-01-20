import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on("connect", () => {
  console.log("✅ Supabase database connected");
});

pool.on("error", (err) => {
  console.error("❌ Database error:", err);
  process.exit(1);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
