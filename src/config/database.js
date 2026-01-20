import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // 🔑 CRITICAL SETTINGS FOR SUPABASE POOLER + RENDER
  max: 1,                         // REQUIRED (transaction/session pooler)
  idleTimeoutMillis: 10000,       // 🔥 kill idle connections fast
  connectionTimeoutMillis: 5000,  // 🔥 fail fast
  keepAlive: false,               // 🔥 do NOT keep dead sockets
  allowExitOnIdle: true           // 🔥 allow clean exit
});

pool.on("connect", () => {
  console.log("✅ Supabase database connected");
});

pool.on("error", (err) => {
  console.error("❌ DB pool error, recreating pool:", err.message);
  process.exit(1); // 🔥 FORCE RESTART — this is REQUIRED
});

export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error("❌ Query failed:", err.message);
    throw err;
  }
};

export default pool;

