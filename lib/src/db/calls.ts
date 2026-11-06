import mysql from "mysql2/promise";

export const callsDb = mysql.createPool({
  host: process.env.CALLS_DB_HOST || "127.0.0.1",
  port: Number(process.env.CALLS_DB_PORT || 3306),
  user: process.env.CALLS_DB_USER || "root",
  password: process.env.CALLS_DB_PASSWORD || "",
  database: process.env.CALLS_DB_NAME || "asteriskcdrdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
