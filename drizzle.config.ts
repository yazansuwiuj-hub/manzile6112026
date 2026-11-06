import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.SQL_HOST || process.env.CALLS_DB_HOST || '62.84.183.128',
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : (process.env.CALLS_DB_PORT ? parseInt(process.env.CALLS_DB_PORT) : 3306),
    user: process.env.SQL_USER || process.env.CALLS_DB_USER || 'root',
    password: process.env.SQL_PASSWORD || process.env.CALLS_DB_PASSWORD || process.env.CALLS_DB_PASSW || 'Alarabilab@06',
    database: process.env.SQL_DB_NAME || 'manzile_db',
  },
});
