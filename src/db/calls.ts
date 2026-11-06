import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const callsDb = mysql.createPool({
  host: process.env.CALLS_DB_HOST || "62.84.183.128",
  port: Number(process.env.CALLS_DB_PORT || 3306),
  user: process.env.CALLS_DB_USER || "root",
  password: process.env.CALLS_DB_PASSWORD || process.env.CALLS_DB_PASSW || "Alarabilab@06",
  database: process.env.CALLS_DB_NAME || "asteriskcdrdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 8000
});

