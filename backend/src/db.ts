import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";

let pool: mysql.Pool | undefined;

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL || "mysql://user:password@localhost:3306/checklist_db",
      charset: "utf8mb4",
    });
  }
  return drizzle(pool, { schema, mode: "default" });
}

export type Db = ReturnType<typeof getDb>;
