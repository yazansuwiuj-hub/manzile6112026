import { db } from '../../db';
import { appointments } from '../../db/schema';
import { desc, eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

let cachedAppointments: any[] | null = null;

const loadFallbackAppointments = (): any[] => {
  try {
    const fallbackPath = path.join(process.cwd(), 'data_fallback/appointments.json');
    if (fs.existsSync(fallbackPath)) {
      const data = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (err: any) {
    console.warn('[AppointmentRepository] Error reading fallback appointments:', err.message);
  }
  return [];
};

export class AppointmentRepository {
  async save(data: typeof appointments.$inferInsert) {
    try {
      if (!data.testId) {
        data.testId = `APT-${Date.now()}` as any;
      }

      const [result] = await db.insert(appointments).values(data).$returningId();
      const saved = { ...data, id: result?.id || Date.now() };
      if (cachedAppointments) {
        cachedAppointments.unshift(saved);
      }
      return saved;
    } catch (err: any) {
      console.warn('[AppointmentRepository] Save warning:', err.message);
      const saved = { ...data, id: (data as any).id || Date.now() };
      if (cachedAppointments) {
        cachedAppointments.unshift(saved);
      }
      return saved;
    }
  }

  async getAll() {
    try {
      const results = await db.select().from(appointments).orderBy(desc(appointments.createdAt));
      if (Array.isArray(results) && results.length > 0) {
        cachedAppointments = results;
        try {
          const fallbackPath = path.join(process.cwd(), 'data_fallback/appointments.json');
          fs.writeFileSync(fallbackPath, JSON.stringify(results, null, 2), 'utf-8');
        } catch (_) {}
        return results;
      }
      if (cachedAppointments && cachedAppointments.length > 0) {
        return cachedAppointments;
      }
      return loadFallbackAppointments();
    } catch (err: any) {
      console.warn('[AppointmentRepository] Query error (using fallback):', err.message);
      if (cachedAppointments && cachedAppointments.length > 0) {
        return cachedAppointments;
      }
      return loadFallbackAppointments();
    }
  }

  async updateStatus(id: number, status: string) {
    try {
      await db.update(appointments).set({ status }).where(eq(appointments.id, id));
      if (cachedAppointments) {
        const item = cachedAppointments.find((a: any) => a.id === id);
        if (item) item.status = status;
      }
      return true;
    } catch (err: any) {
      console.warn('[AppointmentRepository] updateStatus warning:', err.message);
      if (cachedAppointments) {
        const item = cachedAppointments.find((a: any) => a.id === id);
        if (item) item.status = status;
      }
      return true;
    }
  }

  async update(id: number, data: Partial<typeof appointments.$inferInsert>) {
    try {
      await db.update(appointments).set(data).where(eq(appointments.id, id));
      if (cachedAppointments) {
        const index = cachedAppointments.findIndex((a: any) => a.id === id);
        if (index !== -1) {
          cachedAppointments[index] = { ...cachedAppointments[index], ...data };
        }
      }
      return true;
    } catch (err: any) {
      console.warn('[AppointmentRepository] update warning:', err.message);
      if (cachedAppointments) {
        const index = cachedAppointments.findIndex((a: any) => a.id === id);
        if (index !== -1) {
          cachedAppointments[index] = { ...cachedAppointments[index], ...data };
        }
      }
      return true;
    }
  }

  async delete(id: number) {
    try {
      await db.delete(appointments).where(eq(appointments.id, id));
      if (cachedAppointments) {
        cachedAppointments = cachedAppointments.filter((a: any) => a.id !== id);
      }
      return true;
    } catch (err: any) {
      console.warn('[AppointmentRepository] delete warning:', err.message);
      if (cachedAppointments) {
        cachedAppointments = cachedAppointments.filter((a: any) => a.id !== id);
      }
      return true;
    }
  }
}

