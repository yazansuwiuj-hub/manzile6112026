import { defineConfig } from "drizzle-kit";

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!sqlHost || !sqlDbName || !user || !password) {
  throw new Error("Missing database environment variables");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: sqlHost,
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 3306,
    user: user,
    password: password,
    database: sqlDbName,
  },
});
