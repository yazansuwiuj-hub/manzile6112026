import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.SQL_HOST || '',
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 3306,
    user: process.env.SQL_USER || '',
    password: process.env.SQL_PASSWORD || '',
    database: process.env.SQL_DB_NAME || '',
  },
});
