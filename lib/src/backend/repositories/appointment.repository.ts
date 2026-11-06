import { db } from '../../db';
import { appointments } from '../../db/schema';
import { desc, eq } from 'drizzle-orm';

export class AppointmentRepository {
  async save(data: typeof appointments.$inferInsert) {    try {

      if (!data.testId) {
        data.testId = `APT-${Date.now()}` as any;
      }

      const [result] = await db.insert(appointments).values(data).$returningId();
      return { ...data, id: result.id };
    } catch (err) {
      throw err;
    }
  }

  async getAll() {
    try {
      return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
    } catch (err) {
      throw err;
    }
  }

  async updateStatus(id: number, status: string) {
    try {
      await db.update(appointments).set({ status }).where(eq(appointments.id, id));
      return true;
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, data: Partial<typeof appointments.$inferInsert>) {
    try {
      await db.update(appointments).set(data).where(eq(appointments.id, id));
      return true;
    } catch (err) {
      throw err;
    }
  }

  async delete(id: number) {
    try {
      await db.delete(appointments).where(eq(appointments.id, id));
      return true;
    } catch (err) {
      throw err;
    }
  }
}

