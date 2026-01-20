import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

let pool;

function createPool() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000
  });

  pool.on("connect", () => {
    console.log("✅ Supabase database connected");
  });

  pool.on("error", (err) => {
    console.error("❌ Pool error, recreating pool:", err.message);
    recreatePool();
  });
}

function recreatePool() {
  try {
    pool?.end?.();
  } catch {}
  createPool();
}

// 🔥 CREATE POOL ON START
createPool();

// 🔥 SAFE QUERY FUNCTION
export async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error("❌ Query failed:", err.message);

    // 🔥 DEAD CONNECTION → RECREATE POOL → RETRY ONCE
    recreatePool();
    return await pool.query(text, params);
  }
}

export default { query };

