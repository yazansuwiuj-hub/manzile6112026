import { mysqlTable, text, timestamp, int, double, json, boolean, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('مستخدم'),
  password: varchar('password', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  status: varchar('status', { length: 50 }),
  governorate: varchar('governorate', { length: 255 }),
  shift: varchar('shift', { length: 50 }),
  ammanSector: varchar('amman_sector', { length: 50 }),
  dailyLimit: int('daily_limit'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const appointments = mysqlTable('appointments', {
  id: int('id').autoincrement().primaryKey(),
  testId: varchar('test_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  age: int('age').notNull(),
  testName: varchar('test_name', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  testerName: varchar('tester_name', { length: 255 }),
  date: varchar('date', { length: 50 }).notNull(),
  time: varchar('time', { length: 50 }).notNull(),
  locationUrl: varchar('location_url', { length: 1000 }),
  status: varchar('status', { length: 50 }).notNull().default('جديد'),
  price: double('price').notNull().default(0),
  amountCollected: double('amount_collected'),
  arrivalTime: varchar('arrival_time', { length: 50 }),
  completionTime: varchar('completion_time', { length: 50 }),
  notes: text('notes'),
  requiresFasting: boolean('requires_fasting').default(false),
  priceDiffReason: text('price_diff_reason'),
  attachmentUrl: varchar('attachment_url', { length: 1000 }),
  paymentStatus: varchar('payment_status', { length: 50 }).default('غير مدفوع'),
  priority: varchar('priority', { length: 50 }).default('عادي'),
  insurance: varchar('insurance', { length: 255 }).default('لا يوجد'),
  paymentMethod: varchar('payment_method', { length: 50 }).default('نقدي'),
  lastVisit: varchar('last_visit', { length: 50 }).default('-'),
  isExternalRequest: boolean('is_external_request').default(false),
  isPendingAcceptance: boolean('is_pending_acceptance').default(false),
  timeline: json('timeline'),
  auditTrail: json('audit_trail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const examinations = mysqlTable('examinations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  price: double('price').notNull().default(0),
  notes: text('notes'),
  requiresFasting: boolean('requires_fasting').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const systemSettings = mysqlTable('system_settings', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const regionConfigs = mysqlTable('region_configs', {
  id: int('id').autoincrement().primaryKey(),
  governorate: varchar('governorate', { length: 255 }).notNull(),
  shift: varchar('shift', { length: 50 }).notNull(),
  regionName: varchar('region_name', { length: 255 }).notNull(),
  timeFrom: varchar('time_from', { length: 50 }).notNull(),
  timeTo: varchar('time_to', { length: 50 }).notNull(),
  fridayTimeFrom: varchar('friday_time_from', { length: 50 }),
  fridayTimeTo: varchar('friday_time_to', { length: 50 }),
  ammanSector: varchar('amman_sector', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ratings = mysqlTable('ratings', {
  id: int('id').autoincrement().primaryKey(),
  patientName: varchar('patient_name', { length: 255 }).notNull(),
  stars: int('stars').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
