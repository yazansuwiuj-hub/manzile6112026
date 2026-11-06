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
  notificationStart: varchar('notification_start', { length: 50 }),
  notificationEnd: varchar('notification_end', { length: 50 }),
  canCloseCliq: boolean('can_close_cliq').default(false),
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
  testerNotified: boolean('tester_notified').default(false),
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
  adminResponse: text('admin_response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cliqTransactions = mysqlTable('cliq_transactions', {
  id: int('id').autoincrement().primaryKey(),
  transactionId: varchar('transaction_id', { length: 100 }),
  senderName: varchar('sender_name', { length: 255 }),
  senderPhone: varchar('sender_phone', { length: 50 }),
  accountNumber: varchar('account_number', { length: 100 }),
  amount: double('amount'),
  currency: varchar('currency', { length: 10 }).notNull().default('JOD'),
  bankSender: varchar('bank_sender', { length: 100 }).notNull().default('ARABIISLAMI'),
  smsBody: text('sms_body').notNull(),
  receivedAt: timestamp('received_at'),
  serverReceivedAt: timestamp('server_received_at').defaultNow().notNull(),
  deviceId: varchar('device_id', { length: 100 }).notNull().default('MANZILE-ANDROID-01'),
  status: varchar('status', { length: 50 }).notNull().default('NEW'), // 'NEW' | 'INFO_PROVIDED' | 'CLOSED'
  closedByName: varchar('closed_by_name', { length: 255 }),
  patientFileNumber: varchar('patient_file_number', { length: 100 }),
  closedAt: timestamp('closed_at'),
  // New Branch & Responsible Employee fields
  branchId: int('branch_id'),
  branchName: varchar('branch_name', { length: 150 }),
  employeeName: varchar('employee_name', { length: 255 }),
  actualClosedBy: varchar('actual_closed_by', { length: 255 }),
  // New Visit Number & Information Provided fields
  visitNumber: varchar('visit_number', { length: 100 }),
  infoProvidedAt: timestamp('info_provided_at'),
  infoProvidedBy: varchar('info_provided_by', { length: 255 }),
  matchedAppointmentId: int('matched_appointment_id'),
  reviewedBy: varchar('reviewed_by', { length: 255 }),
  reviewedAt: timestamp('reviewed_at'),
  duplicateHash: varchar('duplicate_hash', { length: 64 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cliqBranches = mysqlTable('cliq_branches', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  cliqBranchName: varchar('cliq_branch_name', { length: 100 }).notNull(),
  responsibleEmployeeName: varchar('responsible_employee_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('نشط'), // 'نشط' | 'غير نشط'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cliqDevices = mysqlTable('cliq_devices', {
  id: int('id').autoincrement().primaryKey(),
  deviceName: varchar('device_name', { length: 100 }).notNull().unique(),
  deviceModel: varchar('device_model', { length: 100 }).default('TECNO SPARK 9 PRO'),
  osVersion: varchar('os_version', { length: 50 }).default('Android 12'),
  deviceTokenHash: varchar('device_token_hash', { length: 128 }).notNull(),
  bankSender: varchar('bank_sender', { length: 100 }).notNull().default('ARABIISLAMI'),
  status: varchar('status', { length: 50 }).notNull().default('نشط'),
  lastSeenAt: timestamp('last_seen_at'),
  lastSmsAt: timestamp('last_sms_at'),
  messagesCount: int('messages_count').default(0),
  failedCount: int('failed_count').default(0),
  batteryLevel: int('battery_level'),
  ipAddress: varchar('ip_address', { length: 50 }),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cliqAuditLogs = mysqlTable('cliq_audit_logs', {
  id: int('id').autoincrement().primaryKey(),
  transactionId: int('transaction_id'),
  userId: varchar('user_id', { length: 255 }),
  userName: varchar('user_name', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  oldValue: json('old_value'),
  newValue: json('new_value'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
