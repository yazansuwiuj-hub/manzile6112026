import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'local_database.json');

export interface TableStorage {
  users: any[];
  appointments: any[];
  examinations: any[];
  system_settings: any[];
  region_configs: any[];
  ratings: any[];
}

function toCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
}

function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function getInitialData(): TableStorage {
  return {
    users: [
      {
        id: '1',
        email: 'admin@manzily.com',
        name: 'admin',
        role: 'مسؤول',
        password: '123',
        phone: '0790000001',
        status: 'نشط',
        governorate: 'كل المحافظات',
        shift: 'كلاهما',
        amman_sector: 'كلاهما',
        daily_limit: null,
        notification_start: null,
        notification_end: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'user-rania',
        email: 'rania56715@gmail.com',
        name: 'rania',
        role: 'مسؤول',
        password: '123',
        phone: '0790000000',
        status: 'نشط',
        governorate: 'كل المحافظات',
        shift: 'كلاهما',
        amman_sector: 'كلاهما',
        daily_limit: null,
        notification_start: null,
        notification_end: null,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        email: 'phlebotomist@manzily.com',
        name: 'phlebotomist',
        role: 'ساحب منزلي',
        password: '123',
        phone: '0790000002',
        status: 'نشط',
        governorate: 'عمان',
        shift: 'صباحي',
        amman_sector: 'عمان الغربية',
        daily_limit: 10,
        notification_start: null,
        notification_end: null,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        email: 'khaled@manzily.com',
        name: 'خالد عبد الله',
        role: 'ساحب منزلي',
        password: '123',
        phone: '0791234567',
        status: 'نشط',
        governorate: 'عمان',
        shift: 'صباحي',
        amman_sector: 'عمان الغربية',
        daily_limit: 8,
        notification_start: null,
        notification_end: null,
        created_at: new Date().toISOString()
      },
      {
        id: '4',
        email: 'muna@manzily.com',
        name: 'منى علي',
        role: 'ساحب منزلي',
        password: '123',
        phone: '0787600000',
        status: 'نشط',
        governorate: 'الزرقاء',
        shift: 'مسائي',
        amman_sector: 'كلاهما',
        daily_limit: 8,
        notification_start: null,
        notification_end: null,
        created_at: new Date().toISOString()
      }
    ],
    appointments: [
      {
        id: 1,
        test_id: 'APT-1001',
        name: 'أحمد محمود',
        phone: '0791234567',
        age: 35,
        location: 'عمان - عبدون',
        test_name: 'فحص دم شامل (CBC)',
        tester_name: 'خالد عبد الله',
        date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
        time: '10:00',
        location_url: 'https://maps.google.com/?q=31.9539,35.9106',
        status: 'جديد',
        price: 45.0,
        amount_collected: null,
        arrival_time: null,
        completion_time: null,
        notes: 'يرجى القدوم في الموعد المحدد',
        requires_fasting: false,
        price_diff_reason: null,
        attachment_url: null,
        tester_notified: false,
        payment_status: 'غير مدفوع',
        priority: 'عادي',
        insurance: 'لا يوجد',
        payment_method: 'نقدي',
        last_visit: '-',
        is_external_request: false,
        is_pending_acceptance: false,
        timeline: [],
        audit_trail: [],
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        test_id: 'APT-1002',
        name: 'سارة خالد',
        phone: '0787600000',
        age: 28,
        location: 'الزرقاء الجديدة',
        test_name: 'فحص فيتامين د',
        tester_name: 'منى علي',
        date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
        time: '11:30',
        location_url: '',
        status: 'قائم',
        price: 30.0,
        amount_collected: null,
        arrival_time: null,
        completion_time: null,
        notes: '',
        requires_fasting: false,
        price_diff_reason: null,
        attachment_url: null,
        tester_notified: true,
        payment_status: 'غير مدفوع',
        priority: 'عاجل',
        insurance: 'لا يوجد',
        payment_method: 'نقدي',
        last_visit: '-',
        is_external_request: false,
        is_pending_acceptance: false,
        timeline: [],
        audit_trail: [],
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    examinations: [
      { id: 'exam-1', name: 'فحص دم شامل (CBC)', price: 15.0, notes: 'لا يتطلب صيام', requires_fasting: false, created_at: new Date().toISOString() },
      { id: 'exam-2', name: 'فحص فيتامين د (Vitamin D)', price: 25.0, notes: 'لا يتطلب صيام', requires_fasting: false, created_at: new Date().toISOString() },
      { id: 'exam-3', name: 'فحص سكر تراكمي (HbA1c)', price: 10.0, notes: 'فحص السكري التراكمي لآخر 3 أشهر', requires_fasting: false, created_at: new Date().toISOString() },
      { id: 'exam-4', name: 'وظائف الكلى (KFT)', price: 20.0, notes: 'صيام 8 ساعات', requires_fasting: true, created_at: new Date().toISOString() },
      { id: 'exam-5', name: 'وظائف الكبد (LFT)', price: 20.0, notes: 'صيام 8 ساعات', requires_fasting: true, created_at: new Date().toISOString() },
      { id: 'exam-6', name: 'دهنيات الدم الشاملة (Lipid Profile)', price: 20.0, notes: 'صيام 12 ساعة', requires_fasting: true, created_at: new Date().toISOString() },
      { id: 'exam-7', name: 'فحص الغدة الدرقية (TSH)', price: 15.0, notes: 'لا يتطلب صيام', requires_fasting: false, created_at: new Date().toISOString() },
      { id: 'exam-8', name: 'فحص فيتامين ب12 (Vitamin B12)', price: 20.0, notes: 'لا يتطلب صيام', requires_fasting: false, created_at: new Date().toISOString() },
      { id: 'exam-9', name: 'فحص بول كامل (General Urine)', price: 5.0, notes: 'عينة صباحية نظيفة', requires_fasting: false, created_at: new Date().toISOString() },
      { id: 'exam-10', name: 'مخزون الحديد (Ferritin)', price: 15.0, notes: 'لا يتطلب صيام', requires_fasting: false, created_at: new Date().toISOString() }
    ],
    system_settings: [
      {
        key: 'keys',
        value: JSON.stringify({
          GOOGLE_MAPS_API_KEY: '',
          WHATSAPP_API_URL: '',
          WHATSAPP_API_KEY: '',
          WHATSAPP_API_TEMPLATE: 'مرحباً {اسم_المريض}،\nنود إعلامك بأنه تم تثبيت موعدك بنجاح لدى مختبرات العربي الطبية.\n📅 التاريخ: {تاريخ_الموعد}\n🕒 الوقت: بين الساعة {وقت_الموعد}\n📍 المنطقة: {اسم_المنطقة}\n🧪 الفحوصات: {قائمة_الفحوصات}\n💰 إجمالي المبلغ: {إجمالي_السعر} دينار أردني.\n\nنشكركم على ثقتكم، ونتطلع لخدمتكم. مع تمنياتنا لكم بدوام الصحة والعافية. 🌿',
          WHATSAPP_COMPLETED_TEMPLATE: 'مرحباً {اسم_المريض}،\nتم الانتهاء من الموعد بنجاح. نتمنى لكم دوام الصحة والعافية.',
          WHATSAPP_CANCELED_TEMPLATE: 'مرحباً {اسم_المريض}،\nتم إلغاء موعدكم للسبب التالي: {سبب_الإلغاء}.',
          version: 'v1.0.0'
        }),
        updated_at: new Date().toISOString()
      },
      {
        key: 'appearance',
        value: JSON.stringify({
          systemName: 'Alarabi Lab Home',
          logoEmoji: '🧪'
        }),
        updated_at: new Date().toISOString()
      }
    ],
    region_configs: [
      {
        id: 1,
        governorate: 'عمان',
        shift: 'صباحي',
        region_name: 'عمان الغربية (عبدون، دير غبار، الصويفية)',
        time_from: '08:00',
        time_to: '14:00',
        friday_time_from: '09:00',
        friday_time_to: '13:00',
        amman_sector: 'عمان الغربية',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        governorate: 'عمان',
        shift: 'صباحي',
        region_name: 'تلاع العلي، خلدا، الجبيهة، الجامعة',
        time_from: '08:00',
        time_to: '14:00',
        friday_time_from: '09:00',
        friday_time_to: '13:00',
        amman_sector: 'عمان الغربية',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        governorate: 'الزرقاء',
        shift: 'صباحي',
        region_name: 'الزرقاء الجديدة ووسط البلد',
        time_from: '08:00',
        time_to: '14:00',
        friday_time_from: '09:00',
        friday_time_to: '13:00',
        amman_sector: 'كلاهما',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    ratings: []
  };
}

class LocalDatabaseStore {
  private data: TableStorage;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): TableStorage {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const initial = getInitialData();
        return {
          users: parsed.users || initial.users,
          appointments: parsed.appointments || initial.appointments,
          examinations: parsed.examinations || initial.examinations,
          system_settings: parsed.system_settings || initial.system_settings,
          region_configs: parsed.region_configs || initial.region_configs,
          ratings: parsed.ratings || initial.ratings
        };
      }
    } catch (e) {
      console.warn('[LocalDatabase] Error reading store from disk, initializing fresh:', e);
    }
    const initial = getInitialData();
    this.saveToDisk(initial);
    return initial;
  }

  private saveToDisk(dataToSave?: TableStorage): void {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[LocalDatabase] Failed to save store to disk:', e);
    }
  }

  private getTable(name: string): any[] {
    const key = toSnake(name) as keyof TableStorage;
    if (!this.data[key]) {
      this.data[key] = [];
    }
    return this.data[key];
  }

  public executeSql(sqlStr: string, params: any[] = []): { rows: any[]; insertId?: number; affectedRows?: number } {
    const rawSql = sqlStr.trim();
    const cleanSql = rawSql.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    const lower = cleanSql.toLowerCase();

    // 1. SELECT Query
    if (lower.startsWith('select')) {
      const fromMatch = cleanSql.match(/from\s+[`]?([a-zA-Z0-9_]+)[`]?/i);
      if (!fromMatch) return { rows: [] };
      const tableName = fromMatch[1];
      let rows = [...this.getTable(tableName)];

      // WHERE clause
      const whereMatch = cleanSql.match(/where\s+(.*?)(?:\s+order\s+by|\s*$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        // Match conditions: `tbl`.`col` = ? or `col` = ? or `col` is null
        const condRegex = /(?:[`]?([a-zA-Z0-9_]+)[`]?\.)?[`]?([a-zA-Z0-9_]+)[`]?\s*(=|is\s+null|is\s+not\s+null)\s*(\?)?/gi;
        let paramIdx = 0;
        let m;
        const conditions: { col: string; op: string; val?: any }[] = [];
        while ((m = condRegex.exec(whereClause)) !== null) {
          const col = m[2];
          const op = m[3].toLowerCase();
          const hasParam = !!m[4];
          const val = hasParam ? params[paramIdx++] : undefined;
          conditions.push({ col, op, val });
        }

        rows = rows.filter(r => {
          return conditions.every(c => {
            const rowVal = r[c.col] !== undefined ? r[c.col] : r[toCamel(c.col)];
            if (c.op === 'is null') return rowVal === null || rowVal === undefined;
            if (c.op === 'is not null') return rowVal !== null && rowVal !== undefined;
            // Equality
            if (c.val === null || c.val === undefined) {
              return rowVal === null || rowVal === undefined;
            }
            if (typeof c.val === 'boolean') {
              return Boolean(rowVal) === c.val;
            }
            if (typeof c.val === 'number') {
              return Number(rowVal) === c.val;
            }
            return String(rowVal ?? '').toLowerCase() === String(c.val).toLowerCase();
          });
        });
      }

      // ORDER BY clause
      const orderMatch = cleanSql.match(/order\s+by\s+(?:[`]?([a-zA-Z0-9_]+)[`]?\.)?[`]?([a-zA-Z0-9_]+)[`]?\s*(asc|desc)?/i);
      if (orderMatch) {
        const col = orderMatch[2];
        const dir = (orderMatch[3] || 'asc').toLowerCase();
        rows.sort((a, b) => {
          const valA = a[col] ?? a[toCamel(col)] ?? 0;
          const valB = b[col] ?? b[toCamel(col)] ?? 0;
          const compareA = valA instanceof Date ? valA.getTime() : (typeof valA === 'string' && !isNaN(Date.parse(valA)) ? Date.parse(valA) : valA);
          const compareB = valB instanceof Date ? valB.getTime() : (typeof valB === 'string' && !isNaN(Date.parse(valB)) ? Date.parse(valB) : valB);
          if (compareA < compareB) return dir === 'desc' ? 1 : -1;
          if (compareA > compareB) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // Extract column list
      const colMatch = cleanSql.match(/select\s+(.*?)\s+from/i);
      const cols = colMatch ? colMatch[1].split(',').map(c => {
        const parts = c.trim().split('.');
        const colPart = parts[parts.length - 1];
        return colPart.replace(/[`\s]/g, '');
      }) : [];

      const rowsAsArray = rows.map(r => {
        return cols.map(c => {
          let val = r[c] !== undefined ? r[c] : r[toCamel(c)];
          if (val === undefined) val = null;
          // Format Date instances or ISO strings for timestamp columns
          if (c.includes('created_at') || c.includes('updated_at')) {
            if (val && !(val instanceof Date)) {
              val = new Date(val);
            }
          }
          return val;
        });
      });

      return { rows: rowsAsArray };
    }

    // 2. INSERT Query
    if (lower.startsWith('insert')) {
      const intoMatch = cleanSql.match(/into\s+[`]?([a-zA-Z0-9_]+)[`]?\s*\((.*?)\)\s*values\s*\((.*?)\)/i);
      if (!intoMatch) return { rows: [], affectedRows: 0 };
      const tableName = intoMatch[1];
      const table = this.getTable(tableName);

      const colNames = intoMatch[2].split(',').map(c => c.trim().replace(/[`\s]/g, ''));
      const valuePlaceholders = intoMatch[3].split(',').map(v => v.trim());

      let paramIdx = 0;
      const newRecord: Record<string, any> = {};

      for (let i = 0; i < colNames.length; i++) {
        const col = colNames[i];
        const placeholder = valuePlaceholders[i]?.toLowerCase();
        if (placeholder === 'default') {
          if (col === 'id') {
            // Auto increment integer ID
            const existingIds = table.map(r => Number(r.id)).filter(n => !isNaN(n));
            newRecord.id = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
          } else if (col === 'created_at' || col === 'updated_at') {
            newRecord[col] = new Date().toISOString();
          } else {
            newRecord[col] = null;
          }
        } else {
          newRecord[col] = params[paramIdx++];
        }
      }

      // If id is not set and needed
      if (newRecord.id === undefined) {
        if (tableName === 'appointments' || tableName === 'ratings' || tableName === 'region_configs') {
          const existingIds = table.map(r => Number(r.id)).filter(n => !isNaN(n));
          newRecord.id = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        } else if (tableName === 'users' || tableName === 'examinations') {
          newRecord.id = String(Date.now());
        }
      }

      if (!newRecord.created_at && (tableName === 'appointments' || tableName === 'users' || tableName === 'examinations')) {
        newRecord.created_at = new Date().toISOString();
      }

      // Check on duplicate key update (e.g. system_settings)
      if (lower.includes('on duplicate key update')) {
        let existingIdx = -1;
        if (newRecord.key !== undefined) {
          existingIdx = table.findIndex(r => r.key === newRecord.key);
        } else if (newRecord.id !== undefined) {
          existingIdx = table.findIndex(r => String(r.id) === String(newRecord.id));
        }

        if (existingIdx !== -1) {
          table[existingIdx] = { ...table[existingIdx], ...newRecord };
          this.saveToDisk();
          return { rows: [], insertId: Number(table[existingIdx].id) || 1, affectedRows: 1 };
        }
      }

      table.push(newRecord);
      this.saveToDisk();
      return { rows: [], insertId: Number(newRecord.id) || 1, affectedRows: 1 };
    }

    // 3. UPDATE Query
    if (lower.startsWith('update')) {
      const updateMatch = cleanSql.match(/update\s+[`]?([a-zA-Z0-9_]+)[`]?\s+set\s+(.*?)\s+where\s+(.*)/i);
      if (!updateMatch) return { rows: [], affectedRows: 0 };
      const tableName = updateMatch[1];
      const table = this.getTable(tableName);

      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];

      // Parse SET clause
      const setRegex = /[`]?([a-zA-Z0-9_]+)[`]?\s*=\s*\?/gi;
      let paramIdx = 0;
      let m;
      const updates: Record<string, any> = {};
      while ((m = setRegex.exec(setClause)) !== null) {
        const col = m[1];
        updates[col] = params[paramIdx++];
      }

      // Parse WHERE clause
      const whereRegex = /(?:[`]?([a-zA-Z0-9_]+)[`]?\.)?[`]?([a-zA-Z0-9_]+)[`]?\s*=\s*\?/gi;
      const whereConds: { col: string; val: any }[] = [];
      while ((m = whereRegex.exec(whereClause)) !== null) {
        const col = m[2];
        whereConds.push({ col, val: params[paramIdx++] });
      }

      let affected = 0;
      for (let i = 0; i < table.length; i++) {
        const row = table[i];
        const match = whereConds.every(c => {
          const val = row[c.col] !== undefined ? row[c.col] : row[toCamel(c.col)];
          return String(val) === String(c.val);
        });
        if (match) {
          table[i] = { ...row, ...updates };
          affected++;
        }
      }

      this.saveToDisk();
      return { rows: [], affectedRows: affected };
    }

    // 4. DELETE Query
    if (lower.startsWith('delete')) {
      const fromMatch = cleanSql.match(/from\s+[`]?([a-zA-Z0-9_]+)[`]?/i);
      if (!fromMatch) return { rows: [], affectedRows: 0 };
      const tableName = fromMatch[1];
      const table = this.getTable(tableName);

      const whereMatch = cleanSql.match(/where\s+(.*)/i);
      if (!whereMatch) {
        const count = table.length;
        this.data[tableName as keyof TableStorage] = [];
        this.saveToDisk();
        return { rows: [], affectedRows: count };
      }

      const whereClause = whereMatch[1];
      const whereRegex = /(?:[`]?([a-zA-Z0-9_]+)[`]?\.)?[`]?([a-zA-Z0-9_]+)[`]?\s*=\s*\?/gi;
      let paramIdx = 0;
      let m;
      const whereConds: { col: string; val: any }[] = [];
      while ((m = whereRegex.exec(whereClause)) !== null) {
        const col = m[2];
        whereConds.push({ col, val: params[paramIdx++] });
      }

      const initialLen = table.length;
      const filtered = table.filter(row => {
        const matchesAll = whereConds.every(c => {
          const val = row[c.col] !== undefined ? row[c.col] : row[toCamel(c.col)];
          return String(val) === String(c.val);
        });
        return !matchesAll;
      });

      this.data[tableName as keyof TableStorage] = filtered;
      this.saveToDisk();
      return { rows: [], affectedRows: initialLen - filtered.length };
    }

    // 5. DDL / ALTER / etc
    return { rows: [], affectedRows: 0 };
  }
}

export const localStore = new LocalDatabaseStore();
