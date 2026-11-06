import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';
import { ratings } from './src/db/schema';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE ratings ADD COLUMN admin_response TEXT;`);
    console.log('Success');
  } catch(e) {
    console.error('Error alter:', e);
  }
  
  try {
    const data = await db.select().from(ratings);
    console.log('Select length:', data.length);
  } catch(e) {
    console.error('Select error:', e);
  }
  process.exit(0);
}
main();
