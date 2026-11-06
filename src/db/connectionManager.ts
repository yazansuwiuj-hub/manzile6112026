import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const CONFIG_FILE = path.join(process.cwd(), 'config_database.json');
const ENV_FILE = path.join(process.cwd(), '.env');

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  usingRealServer: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  message: string;
  lastChecked?: string;
}

class DatabaseConnectionManager {
  private config: DatabaseConfig;
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;
  private statusMessage: string = 'لم يتم تهيئة الاتصال بعد';

  constructor() {
    this.config = this.loadConfig();
  }

  public loadConfig(): DatabaseConfig {
    // 1. Try reading from config_database.json
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.host) {
          return {
            host: parsed.host,
            port: Number(parsed.port) || 3306,
            user: parsed.user || 'root',
            password: parsed.password || '',
            database: parsed.database || 'alarabi_db'
          };
        }
      }
    } catch (e) {}

    // 2. Fallback to environment variables
    return {
      host: process.env.SQL_HOST || '',
      port: Number(process.env.SQL_PORT) || 3306,
      user: process.env.SQL_USER || 'root',
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME || 'alarabi_db'
    };
  }

  public saveConfig(cfg: DatabaseConfig): void {
    this.config = {
      host: cfg.host.trim(),
      port: Number(cfg.port) || 3306,
      user: cfg.user.trim(),
      password: cfg.password ?? this.config.password ?? '',
      database: cfg.database.trim()
    };

    // Save to JSON config file
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB Manager] Failed to write config_database.json:', e);
    }

    // Also update .env file
    try {
      const envContent = `SQL_HOST=${this.config.host}
SQL_PORT=${this.config.port}
SQL_USER=${this.config.user}
SQL_PASSWORD=${this.config.password || ''}
SQL_DB_NAME=${this.config.database}
`;
      fs.writeFileSync(ENV_FILE, envContent, 'utf-8');
    } catch (e) {}
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  public getStatus(): ConnectionStatus {
    return {
      isConnected: this.isConnected,
      usingRealServer: this.isConnected && !!this.config.host,
      host: this.config.host || 'غير محدد',
      port: this.config.port || 3306,
      database: this.config.database || 'alarabi_db',
      user: this.config.user || 'root',
      message: this.statusMessage,
      lastChecked: new Date().toISOString()
    };
  }

  public async testConnection(cfg: DatabaseConfig): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    let tempPool: mysql.Pool | null = null;
    try {
      tempPool = mysql.createPool({
        host: cfg.host.trim(),
        port: Number(cfg.port) || 3306,
        user: cfg.user.trim(),
        password: cfg.password || '',
        database: cfg.database.trim(),
        connectTimeout: 4000,
        connectionLimit: 1
      });

      const conn = await tempPool.getConnection();
      await conn.query('SELECT 1 as test');
      conn.release();
      await tempPool.end();

      const latencyMs = Date.now() - start;
      return {
        success: true,
        message: `تم الاتصال بالسيرفر الحقيقي بنجاح! زمن الاستجابة: ${latencyMs}ms`,
        latencyMs
      };
    } catch (err: any) {
      if (tempPool) {
        try { await tempPool.end(); } catch (e) {}
      }
      let errDetail = err.message || 'خطأ غير معروف في الاتصال';
      if (err.code === 'ECONNREFUSED') {
        errDetail = `تم رفض الاتصال (ECONNREFUSED). يرجى التأكد من تشغيل MySQL على ${cfg.host}:${cfg.port} والسماح بالاتصال الخارجي في جدار الحماية (Firewall).`;
      } else if (err.code === 'ETIMEDOUT') {
        errDetail = `انتهت مهلة الاتصال (ETIMEDOUT). تحقق من صحة عنوان IP (${cfg.host}) ومن فتح المنفذ ${cfg.port}.`;
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        errDetail = `خطأ في اسم المستخدم أو كلمة المرور للمستخدم '${cfg.user}' على السيرفر.`;
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        errDetail = `قاعدة البيانات '${cfg.database}' غير موجودة على السيرفر. يرجى إنشاؤها أولاً.`;
      }
      return {
        success: false,
        message: errDetail
      };
    }
  }

  public async connectToRealServer(cfg?: DatabaseConfig): Promise<{ success: boolean; message: string }> {
    if (cfg) {
      this.saveConfig(cfg);
    }

    if (!this.config.host) {
      this.isConnected = false;
      this.statusMessage = 'لم يتم تحديد عنوان سيرفر خارجي، يعمل النظام بالقاعدة المحلية.';
      return { success: false, message: this.statusMessage };
    }

    // Close previous pool if open
    if (this.pool) {
      try {
        await this.pool.end();
      } catch (e) {}
      this.pool = null;
    }

    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password || '',
        database: this.config.database,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
        connectTimeout: 5000
      });

      const conn = await this.pool.getConnection();
      console.log(`[DB Manager] Connected successfully to real server: ${this.config.host}:${this.config.port}/${this.config.database}`);

      // Auto-migrate tables on real server
      await this.initTables(conn);
      conn.release();

      this.isConnected = true;
      this.statusMessage = `متصل بنجاح بالسيرفر الحقيقي: ${this.config.host}:${this.config.port}/${this.config.database}`;
      return { success: true, message: this.statusMessage };
    } catch (err: any) {
      this.isConnected = false;
      this.pool = null;
      this.statusMessage = `فشل الاتصال بالسيرفر الحقيقي: ${err.message}`;
      console.error('[DB Manager] Failed to connect to real server:', err.message);
      return { success: false, message: this.statusMessage };
    }
  }

  private async initTables(conn: mysql.PoolConnection): Promise<void> {
    const tableQueries = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'مستخدم',
        password VARCHAR(255),
        phone VARCHAR(50),
        status VARCHAR(50),
        governorate VARCHAR(255),
        shift VARCHAR(50),
        amman_sector VARCHAR(50),
        daily_limit INT,
        notification_start VARCHAR(50),
        notification_end VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        age INT NOT NULL,
        test_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        tester_name VARCHAR(255),
        date VARCHAR(50) NOT NULL,
        time VARCHAR(50) NOT NULL,
        location_url VARCHAR(1000),
        status VARCHAR(50) NOT NULL DEFAULT 'جديد',
        price DOUBLE NOT NULL DEFAULT 0,
        amount_collected DOUBLE,
        arrival_time VARCHAR(50),
        completion_time VARCHAR(50),
        notes TEXT,
        requires_fasting BOOLEAN DEFAULT FALSE,
        price_diff_reason TEXT,
        attachment_url VARCHAR(1000),
        tester_notified BOOLEAN DEFAULT FALSE,
        payment_status VARCHAR(50) DEFAULT 'غير مدفوع',
        priority VARCHAR(50) DEFAULT 'عادي',
        insurance VARCHAR(255) DEFAULT 'لا يوجد',
        payment_method VARCHAR(50) DEFAULT 'نقدي',
        last_visit VARCHAR(50) DEFAULT '-',
        is_external_request BOOLEAN DEFAULT FALSE,
        is_pending_acceptance BOOLEAN DEFAULT FALSE,
        timeline JSON,
        audit_trail JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS examinations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        price DOUBLE NOT NULL DEFAULT 0,
        notes TEXT,
        requires_fasting BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS system_settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        \`value\` TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS region_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        governorate VARCHAR(255) NOT NULL,
        shift VARCHAR(50) NOT NULL,
        region_name VARCHAR(255) NOT NULL,
        time_from VARCHAR(50) NOT NULL,
        time_to VARCHAR(50) NOT NULL,
        friday_time_from VARCHAR(50),
        friday_time_to VARCHAR(50),
        amman_sector VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_name VARCHAR(255) NOT NULL,
        stars INT NOT NULL,
        comment TEXT,
        admin_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`
    ];

    for (const q of tableQueries) {
      try {
        await conn.query(q);
      } catch (err: any) {
        console.warn('[DB Manager] Table creation warning:', err.message);
      }
    }
  }

  public getPool(): mysql.Pool | null {
    return this.isConnected ? this.pool : null;
  }

  public isRealConnected(): boolean {
    return this.isConnected && !!this.pool;
  }
}

export const dbManager = new DatabaseConnectionManager();
