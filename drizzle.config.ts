import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

const host = process.env.MYSQL_HOST;
const port = process.env.MYSQL_PORT ?? "3306";
const user = process.env.MYSQL_USER;
const password = process.env.MYSQL_PASSWORD;
const database = process.env.MYSQL_DATABASE;

if (!host || !user || !password || !database) {
  throw new Error(
    "Missing MYSQL_HOST / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host,
    port: Number(port),
    user,
    password,
    database,
    ssl:
      (process.env.MYSQL_SSL ?? "true").toLowerCase() === "false"
        ? undefined
        : {
            rejectUnauthorized:
              (process.env.MYSQL_SSL_REJECT_UNAUTHORIZED ?? "false").toLowerCase() ===
              "true",
          },
  },
});
