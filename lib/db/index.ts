import fs from "node:fs";
import { drizzle } from "drizzle-orm/mysql2";
import mysql, { type PoolOptions } from "mysql2/promise";
import * as schema from "./schema";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set MySQL env vars in .env.local (see .env.example).`,
    );
  }
  return value;
}

function createPool() {
  const host = required("MYSQL_HOST");
  const port = Number(process.env.MYSQL_PORT ?? "3306");
  const user = required("MYSQL_USER");
  const password = required("MYSQL_PASSWORD");
  const database = required("MYSQL_DATABASE");

  const sslEnabled = (process.env.MYSQL_SSL ?? "true").toLowerCase() !== "false";
  const rejectUnauthorized =
    (process.env.MYSQL_SSL_REJECT_UNAUTHORIZED ?? "false").toLowerCase() ===
    "true";

  const options: PoolOptions = {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
  };

  if (sslEnabled) {
    const caPath = process.env.MYSQL_SSL_CA?.trim();
    const ca =
      caPath && fs.existsSync(caPath)
        ? fs.readFileSync(caPath, "utf8")
        : undefined;
    options.ssl = {
      rejectUnauthorized,
      ...(ca ? { ca } : {}),
    };
  }

  return mysql.createPool(options);
}

const globalForDb = globalThis as unknown as {
  travelmapMysqlPool?: ReturnType<typeof createPool>;
};

const pool = globalForDb.travelmapMysqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.travelmapMysqlPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });
