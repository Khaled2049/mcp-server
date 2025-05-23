// src/database/index.ts
import { Pool } from "pg";
import { DB_CONFIG } from "../config"; // Import DB_CONFIG

export const pool = new Pool(DB_CONFIG);

pool.on("connect", (client) => {
  console.error("[PostgreSQL] New client connected to pool.");
});

pool.on("error", (err, client) => {
  console.error("[PostgreSQL] Pool error:", err.message, err.stack);
});

export const initializeDatabase = async () => {
  try {
    // You could potentially run migrations or check connection here
    const res = await pool.query("SELECT 1"); // Simple query to test connection
    if (res.rowCount === 0) {
      throw new Error("Failed to connect to the database.");
    }
    console.error("[PostgreSQL] Database pool initialized successfully.");
  } catch (error) {
    console.error("[PostgreSQL] Failed to initialize database pool:", error);
    process.exit(1); // Exit if DB connection fails
  }
};

export const shutdownDatabase = async () => {
  console.error("[PostgreSQL] Closing database pool...");
  try {
    await pool.end();
    console.error("[PostgreSQL] Database pool closed.");
  } catch (e) {
    console.error("[PostgreSQL] Error closing database pool:", e);
  }
};
