import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const initializeDatabase = async () => {
  try {
    console.log("Reading schema file...");
    const schemaPath = path.join(__dirname, "supabase_schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    console.log("Executing schema...");
    await pool.query(schema);

    console.log("✅ Database initialized successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    await pool.end();
    process.exit(1);
  }
};

initializeDatabase();
