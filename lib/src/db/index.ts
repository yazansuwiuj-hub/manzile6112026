import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

export const createPool = () => {
  const isSocket = process.env.SQL_HOST && process.env.SQL_HOST.startsWith('/');
  
  const config: mysql.PoolOptions = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionLimit: 10,
  };

  if (isSocket) {
    config.socketPath = process.env.SQL_HOST;
  } else {
    config.host = process.env.SQL_HOST;
    config.port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 3306;
  }

  return mysql.createPool(config);
};

const pool = createPool();
export const db = drizzle(pool, { schema, mode: 'default' });
