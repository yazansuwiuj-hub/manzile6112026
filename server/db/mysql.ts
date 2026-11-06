import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbHost = process.env.CALLS_DB_HOST || '62.84.183.128';
const dbPort = Number(process.env.CALLS_DB_PORT || process.env.SQL_PORT || 3306);
const dbUser = process.env.CALLS_DB_USER || process.env.SQL_USER || 'root';
const dbPassword = process.env.CALLS_DB_PASSWORD || process.env.CALLS_DB_PASSW || process.env.SQL_PASSWORD || 'Alarabilab@06';
const dbName = process.env.CALLS_DB_NAME || 'asteriskcdrdb';

export const mysqlPool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 8000
});

// Test connection
mysqlPool.getConnection()
  .then(conn => {
    console.log(`[MySQL] Successfully connected to Asterisk CDR DB (${dbHost}:${dbPort}/${dbName})`);
    conn.release();
  })
  .catch(err => {
    console.error(`[MySQL] Calls DB Connection error: ${err.message}`);
  });

