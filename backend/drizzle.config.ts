import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  driver: "mysql2",
  dbCredentials: {
    uri: process.env.DATABASE_URL || "mysql://user:password@localhost:3306/checklist_db",
  },
  strict: true,
} satisfies Config;
