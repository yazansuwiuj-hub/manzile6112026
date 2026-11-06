var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc4) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc4 = __getOwnPropDesc(from, key)) || desc4.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express3 = __toESM(require("express"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_body_parser = __toESM(require("body-parser"), 1);

// server/routes/calllogs.ts
var import_express = require("express");

// server/db/mysql.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var dbHost = process.env.CALLS_DB_HOST || "62.84.183.128";
var dbPort = Number(process.env.CALLS_DB_PORT || process.env.SQL_PORT || 3306);
var dbUser = process.env.CALLS_DB_USER || process.env.SQL_USER || "root";
var dbPassword = process.env.CALLS_DB_PASSWORD || process.env.CALLS_DB_PASSW || process.env.SQL_PASSWORD || "Alarabilab@06";
var dbName = process.env.CALLS_DB_NAME || "asteriskcdrdb";
var mysqlPool = import_promise.default.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 8e3
});
mysqlPool.getConnection().then((conn) => {
  console.log(`[MySQL] Successfully connected to Asterisk CDR DB (${dbHost}:${dbPort}/${dbName})`);
  conn.release();
}).catch((err) => {
  console.error(`[MySQL] Calls DB Connection error: ${err.message}`);
});

// server/services/calllogs.service.ts
var CallLogsService = class {
  async getMissedCalls(dateStr) {
    console.log(`[CallLogsService] Fetching missed calls for ${dateStr}`);
    const query = `
            SELECT
                q.linkedid,
                MAX(q.uniqueid) AS uniqueid,
                q.src,
                'NO ANSWER' AS disposition,
                MIN(q.calldate) AS calldate,
                MAX(q.did) AS did,
                MAX(q.dst) AS dst
            FROM cdr q
            WHERE q.calldate >= ?
              AND q.calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND q.lastapp = 'Queue'
              AND q.dcontext = 'ext-queues'
              AND q.src REGEXP '^07[0-9]{8}$'
              AND NOT EXISTS (
                  SELECT 1
                  FROM cdr c
                  WHERE c.linkedid = q.linkedid
                    AND c.disposition = 'ANSWERED'
              )
            AND NOT EXISTS (
    SELECT 1
    FROM cdr o
    WHERE o.linkedid <> q.linkedid
      AND o.dst = q.src
      AND o.outbound_cnum = '0797003356'
      AND o.dcontext = 'from-internal'
      AND o.disposition = 'ANSWERED'
      AND o.dst REGEXP '^07[0-9]{8}$'
      AND o.calldate > (
          SELECT MIN(q2.calldate)
          FROM cdr q2
          WHERE q2.linkedid = q.linkedid
            AND q2.lastapp = 'Queue'
            AND q2.dcontext = 'ext-queues'
      )
)
            GROUP BY q.linkedid, q.src
            ORDER BY calldate DESC
            LIMIT 500
        `;
    const [rows] = await mysqlPool.query(query, [
      `${dateStr} 00:00:00`,
      `${dateStr} 00:00:00`
    ]);
    console.log(`[CallLogsService] Found ${Array.isArray(rows) ? rows.length : 0} missed calls`);
    return rows;
  }
  async getAnsweredCalls(dateStr) {
    console.log(`[CallLogsService] Fetching answered calls for ${dateStr}`);
    const query = `
            SELECT
                q.linkedid,
                MAX(q.uniqueid) AS uniqueid,
                q.src,
                'ANSWERED' AS disposition,
                MIN(q.calldate) AS calldate,
                MAX(q.did) AS did,
                MAX(q.dst) AS dst,
                MAX(q.duration) AS duration,
                MAX(
                    CASE
                        WHEN c.lastapp = 'Dial'
                         AND c.disposition = 'ANSWERED'
                        THEN c.dst
                    END
                ) AS answered_extension,
                MAX(
                    CASE
                        WHEN c.lastapp = 'Dial'
                         AND c.disposition = 'ANSWERED'
                        THEN c.dstchannel
                    END
                ) AS dstchannel,
                MAX(c.wa) AS wa
            FROM cdr q
            LEFT JOIN cdr c
              ON c.linkedid = q.linkedid
             AND c.disposition = 'ANSWERED'
            WHERE q.calldate >= ?
              AND q.calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND q.lastapp = 'Queue'
              AND q.dcontext = 'ext-queues'
              AND q.src REGEXP '^07[0-9]{8}$'
              AND EXISTS (
                  SELECT 1
                  FROM cdr a
                  WHERE a.linkedid = q.linkedid
                    AND a.disposition = 'ANSWERED'
              )
            GROUP BY q.linkedid, q.src
            ORDER BY calldate DESC
            LIMIT 500
        `;
    const [rows] = await mysqlPool.query(query, [
      `${dateStr} 00:00:00`,
      `${dateStr} 00:00:00`
    ]);
    console.log(`[CallLogsService] Found ${Array.isArray(rows) ? rows.length : 0} answered calls`);
    return rows;
  }
  async getOutboundCalls(dateStr) {
    console.log(`[CallLogsService] Fetching outbound calls for ${dateStr}`);
    const query = `
            SELECT
                linkedid,
                MAX(uniqueid) AS uniqueid,
                MAX(dst) AS dst,
                MAX(cnam) AS cnam,
                MIN(calldate) AS calldate,
                'ANSWERED' AS disposition
            FROM cdr
            WHERE calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND dcontext = 'from-internal'
              AND outbound_cnum = '0797003356'
              AND disposition = 'ANSWERED'
              AND dst REGEXP '^07[0-9]{8}$'
            GROUP BY linkedid
            ORDER BY calldate DESC
            LIMIT 500
        `;
    const [rows] = await mysqlPool.query(query, [
      `${dateStr} 00:00:00`,
      `${dateStr} 00:00:00`
    ]);
    console.log(`[CallLogsService] Found ${Array.isArray(rows) ? rows.length : 0} outbound calls`);
    return rows;
  }
  async searchCustomers(searchTerm) {
    const query = `
            SELECT
                calldate,
                src,
                dst,
                disposition,
                duration,
                billsec,
                cnam,
                uniqueid
            FROM cdr
            WHERE src LIKE ?
               OR dst LIKE ?
            ORDER BY calldate DESC
            LIMIT 200
        `;
    const [rows] = await mysqlPool.query(query, [
      `%${searchTerm}%`,
      `%${searchTerm}%`
    ]);
    return rows;
  }
};

// server/services/calls.service.ts
var CallsService = class {
  async getDashboard(date) {
    const totalStart = performance.now();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD");
    }
    const startDate = `${date} 00:00:00`;
    const endDate = `${date} 00:00:00`;
    const missedStart = performance.now();
    const [missed] = await mysqlPool.query(
      `SELECT
          q.linkedid,
          MAX(q.uniqueid) AS uniqueid,
          q.src,
          MAX(q.dst) AS dst,
          MIN(q.calldate) AS calldate,
          'NO ANSWER' AS disposition
       FROM cdr q
       WHERE q.calldate >= ?
         AND q.calldate < DATE_ADD(?, INTERVAL 1 DAY)
         AND q.lastapp = 'Queue'
         AND q.dcontext = 'ext-queues'
         AND q.src REGEXP '^07[0-9]{8}$'
         AND NOT EXISTS (
             SELECT 1
             FROM cdr c
             WHERE c.linkedid = q.linkedid
               AND c.disposition = 'ANSWERED'
         )
       AND NOT EXISTS (
    SELECT 1
    FROM cdr o
    WHERE o.linkedid <> q.linkedid
      AND o.dst = q.src
      AND o.outbound_cnum = '0797003356'
      AND o.dcontext = 'from-internal'
      AND o.disposition = 'ANSWERED'
      AND o.dst REGEXP '^07[0-9]{8}$'
      AND o.calldate > (
          SELECT MIN(q2.calldate)
          FROM cdr q2
          WHERE q2.linkedid = q.linkedid
            AND q2.lastapp = 'Queue'
            AND q2.dcontext = 'ext-queues'
      )
)
            GROUP BY q.linkedid, q.src
       ORDER BY calldate DESC`,
      [startDate, endDate]
    );
    console.log(`[Dashboard] missed: ${(performance.now() - missedStart).toFixed(2)} ms`);
    const answeredStart = performance.now();
    const [answered] = await mysqlPool.query(
      `SELECT
          q.linkedid,
          MAX(q.uniqueid) AS uniqueid,
          q.src,
          MAX(q.dst) AS dst,
          MIN(q.calldate) AS calldate,
          MAX(q.duration) AS duration,
          MAX(c.billsec) AS billsec,
          'ANSWERED' AS disposition,
          MAX(
              CASE
                  WHEN c.lastapp = 'Dial'
                   AND c.disposition = 'ANSWERED'
                  THEN c.dst
              END
          ) AS answered_extension,
          MAX(
              CASE
                  WHEN c.lastapp = 'Dial'
                   AND c.disposition = 'ANSWERED'
                  THEN c.dstchannel
              END
          ) AS dstchannel
       FROM cdr q
       LEFT JOIN cdr c
         ON c.linkedid = q.linkedid
        AND c.disposition = 'ANSWERED'
       WHERE q.calldate >= ?
         AND q.calldate < DATE_ADD(?, INTERVAL 1 DAY)
         AND q.lastapp = 'Queue'
         AND q.dcontext = 'ext-queues'
         AND q.src REGEXP '^07[0-9]{8}$'
         AND EXISTS (
             SELECT 1
             FROM cdr a
             WHERE a.linkedid = q.linkedid
               AND a.disposition = 'ANSWERED'
         )
       GROUP BY q.linkedid, q.src
       ORDER BY calldate DESC`,
      [startDate, endDate]
    );
    console.log(`[Dashboard] answered: ${(performance.now() - answeredStart).toFixed(2)} ms`);
    const outboundStart = performance.now();
    const [outbound] = await mysqlPool.query(
      `SELECT
          linkedid,
          MAX(uniqueid) AS uniqueid,
          MAX(dst) AS dst,
          MAX(cnam) AS cnam,
          MIN(calldate) AS calldate,
          'ANSWERED' AS disposition
       FROM cdr
       WHERE calldate >= ?
         AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
         AND dcontext = 'from-internal'
         AND outbound_cnum = '0797003356'
         AND disposition = 'ANSWERED'
         AND dst REGEXP '^07[0-9]{8}$'
       GROUP BY linkedid
       ORDER BY calldate DESC`,
      [startDate, endDate]
    );
    console.log(`[Dashboard] outbound: ${(performance.now() - outboundStart).toFixed(2)} ms`);
    const result = {
      summary: {
        missed: missed.length,
        answered: answered.length,
        outbound: outbound.length
      },
      missedCalls: missed,
      answeredCalls: answered,
      outboundCalls: outbound
    };
    console.log(`[Dashboard] TOTAL: ${(performance.now() - totalStart).toFixed(2)} ms`);
    return result;
  }
};

// server/routes/calllogs.ts
var router = (0, import_express.Router)();
var callLogsService = new CallLogsService();
var callsService = new CallsService();
router.get("/missed", async (req, res) => {
  try {
    const dateStr = req.query.date || "";
    const data = await callLogsService.getMissedCalls(dateStr);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/answered", async (req, res) => {
  try {
    const dateStr = req.query.date || "";
    const data = await callLogsService.getAnsweredCalls(dateStr);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/outbound", async (req, res) => {
  try {
    const dateStr = req.query.date || "";
    const data = await callLogsService.getOutboundCalls(dateStr);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post("/search", async (req, res) => {
  try {
    const { searchTerm } = req.body;
    const data = await callLogsService.searchCustomers(searchTerm || "");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/dashboard", async (req, res) => {
  try {
    const date = req.query.date || "";
    const data = await callsService.getDashboard(date);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });
  }
});
router.get("/called-list", async (req, res) => {
  try {
    const dateStr = req.query.date || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD" });
    }
    const query = `
      SELECT DISTINCT dst
      FROM cdr
      WHERE calldate >= ?
        AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
        AND dcontext = 'from-internal'
        AND outbound_cnum = '0797003356'
        AND disposition = 'ANSWERED'
        AND dst REGEXP '^07[0-9]{8}$'
    `;
    const [rows] = await mysqlPool.query(query, [
      `${dateStr} 00:00:00`,
      `${dateStr} 00:00:00`
    ]);
    res.json(rows.map((r) => r.dst));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
router.get("/check-if-called", async (req, res) => {
  try {
    const dst = req.query.dst;
    const dateStr = req.query.date || "";
    if (!/^07[0-9]{8}$/.test(dst || "") || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "Invalid destination or date" });
    }
    const query = `
      SELECT COUNT(DISTINCT linkedid) AS count
      FROM cdr
      WHERE dst = ?
        AND calldate >= ?
        AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
        AND dcontext = 'from-internal'
        AND outbound_cnum = '0797003356'
        AND disposition = 'ANSWERED'
    `;
    const [rows] = await mysqlPool.query(query, [
      dst,
      `${dateStr} 00:00:00`,
      `${dateStr} 00:00:00`
    ]);
    res.json({ count: Number(rows[0].count) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
var calllogs_default = router;

// server/routes/cliq.ts
var import_express2 = require("express");

// server/services/cliq.service.ts
var import_crypto = __toESM(require("crypto"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);

// src/db/index.ts
var import_mysql22 = require("drizzle-orm/mysql2");
var import_promise2 = __toESM(require("mysql2/promise"), 1);

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appointments: () => appointments,
  cliqAuditLogs: () => cliqAuditLogs,
  cliqBranches: () => cliqBranches,
  cliqDevices: () => cliqDevices,
  cliqTransactions: () => cliqTransactions,
  examinations: () => examinations,
  ratings: () => ratings,
  regionConfigs: () => regionConfigs,
  systemSettings: () => systemSettings,
  users: () => users
});
var import_mysql_core = require("drizzle-orm/mysql-core");
var users = (0, import_mysql_core.mysqlTable)("users", {
  id: (0, import_mysql_core.varchar)("id", { length: 255 }).primaryKey(),
  email: (0, import_mysql_core.varchar)("email", { length: 255 }).notNull(),
  name: (0, import_mysql_core.varchar)("name", { length: 255 }).notNull(),
  role: (0, import_mysql_core.varchar)("role", { length: 50 }).notNull().default("\u0645\u0633\u062A\u062E\u062F\u0645"),
  password: (0, import_mysql_core.varchar)("password", { length: 255 }),
  phone: (0, import_mysql_core.varchar)("phone", { length: 50 }),
  status: (0, import_mysql_core.varchar)("status", { length: 50 }),
  governorate: (0, import_mysql_core.varchar)("governorate", { length: 255 }),
  shift: (0, import_mysql_core.varchar)("shift", { length: 50 }),
  ammanSector: (0, import_mysql_core.varchar)("amman_sector", { length: 50 }),
  dailyLimit: (0, import_mysql_core.int)("daily_limit"),
  notificationStart: (0, import_mysql_core.varchar)("notification_start", { length: 50 }),
  notificationEnd: (0, import_mysql_core.varchar)("notification_end", { length: 50 }),
  canCloseCliq: (0, import_mysql_core.boolean)("can_close_cliq").default(false),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull()
});
var appointments = (0, import_mysql_core.mysqlTable)("appointments", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  testId: (0, import_mysql_core.varchar)("test_id", { length: 255 }).notNull(),
  name: (0, import_mysql_core.varchar)("name", { length: 255 }).notNull(),
  phone: (0, import_mysql_core.varchar)("phone", { length: 50 }).notNull(),
  age: (0, import_mysql_core.int)("age").notNull(),
  testName: (0, import_mysql_core.varchar)("test_name", { length: 255 }).notNull(),
  location: (0, import_mysql_core.varchar)("location", { length: 255 }).notNull(),
  testerName: (0, import_mysql_core.varchar)("tester_name", { length: 255 }),
  date: (0, import_mysql_core.varchar)("date", { length: 50 }).notNull(),
  time: (0, import_mysql_core.varchar)("time", { length: 50 }).notNull(),
  locationUrl: (0, import_mysql_core.varchar)("location_url", { length: 1e3 }),
  status: (0, import_mysql_core.varchar)("status", { length: 50 }).notNull().default("\u062C\u062F\u064A\u062F"),
  price: (0, import_mysql_core.double)("price").notNull().default(0),
  amountCollected: (0, import_mysql_core.double)("amount_collected"),
  arrivalTime: (0, import_mysql_core.varchar)("arrival_time", { length: 50 }),
  completionTime: (0, import_mysql_core.varchar)("completion_time", { length: 50 }),
  notes: (0, import_mysql_core.text)("notes"),
  requiresFasting: (0, import_mysql_core.boolean)("requires_fasting").default(false),
  priceDiffReason: (0, import_mysql_core.text)("price_diff_reason"),
  attachmentUrl: (0, import_mysql_core.varchar)("attachment_url", { length: 1e3 }),
  testerNotified: (0, import_mysql_core.boolean)("tester_notified").default(false),
  paymentStatus: (0, import_mysql_core.varchar)("payment_status", { length: 50 }).default("\u063A\u064A\u0631 \u0645\u062F\u0641\u0648\u0639"),
  priority: (0, import_mysql_core.varchar)("priority", { length: 50 }).default("\u0639\u0627\u062F\u064A"),
  insurance: (0, import_mysql_core.varchar)("insurance", { length: 255 }).default("\u0644\u0627 \u064A\u0648\u062C\u062F"),
  paymentMethod: (0, import_mysql_core.varchar)("payment_method", { length: 50 }).default("\u0646\u0642\u062F\u064A"),
  lastVisit: (0, import_mysql_core.varchar)("last_visit", { length: 50 }).default("-"),
  isExternalRequest: (0, import_mysql_core.boolean)("is_external_request").default(false),
  isPendingAcceptance: (0, import_mysql_core.boolean)("is_pending_acceptance").default(false),
  timeline: (0, import_mysql_core.json)("timeline"),
  auditTrail: (0, import_mysql_core.json)("audit_trail"),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull()
});
var examinations = (0, import_mysql_core.mysqlTable)("examinations", {
  id: (0, import_mysql_core.varchar)("id", { length: 255 }).primaryKey(),
  name: (0, import_mysql_core.varchar)("name", { length: 255 }).notNull().unique(),
  price: (0, import_mysql_core.double)("price").notNull().default(0),
  notes: (0, import_mysql_core.text)("notes"),
  requiresFasting: (0, import_mysql_core.boolean)("requires_fasting").default(false),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull()
});
var systemSettings = (0, import_mysql_core.mysqlTable)("system_settings", {
  key: (0, import_mysql_core.varchar)("key", { length: 255 }).primaryKey(),
  value: (0, import_mysql_core.text)("value"),
  updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow().notNull()
});
var regionConfigs = (0, import_mysql_core.mysqlTable)("region_configs", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  governorate: (0, import_mysql_core.varchar)("governorate", { length: 255 }).notNull(),
  shift: (0, import_mysql_core.varchar)("shift", { length: 50 }).notNull(),
  regionName: (0, import_mysql_core.varchar)("region_name", { length: 255 }).notNull(),
  timeFrom: (0, import_mysql_core.varchar)("time_from", { length: 50 }).notNull(),
  timeTo: (0, import_mysql_core.varchar)("time_to", { length: 50 }).notNull(),
  fridayTimeFrom: (0, import_mysql_core.varchar)("friday_time_from", { length: 50 }),
  fridayTimeTo: (0, import_mysql_core.varchar)("friday_time_to", { length: 50 }),
  ammanSector: (0, import_mysql_core.varchar)("amman_sector", { length: 50 }),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow().notNull()
});
var ratings = (0, import_mysql_core.mysqlTable)("ratings", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  patientName: (0, import_mysql_core.varchar)("patient_name", { length: 255 }).notNull(),
  stars: (0, import_mysql_core.int)("stars").notNull(),
  comment: (0, import_mysql_core.text)("comment"),
  adminResponse: (0, import_mysql_core.text)("admin_response"),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull()
});
var cliqTransactions = (0, import_mysql_core.mysqlTable)("cliq_transactions", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  transactionId: (0, import_mysql_core.varchar)("transaction_id", { length: 100 }),
  senderName: (0, import_mysql_core.varchar)("sender_name", { length: 255 }),
  senderPhone: (0, import_mysql_core.varchar)("sender_phone", { length: 50 }),
  accountNumber: (0, import_mysql_core.varchar)("account_number", { length: 100 }),
  amount: (0, import_mysql_core.double)("amount"),
  currency: (0, import_mysql_core.varchar)("currency", { length: 10 }).notNull().default("JOD"),
  bankSender: (0, import_mysql_core.varchar)("bank_sender", { length: 100 }).notNull().default("ARABIISLAMI"),
  smsBody: (0, import_mysql_core.text)("sms_body").notNull(),
  receivedAt: (0, import_mysql_core.timestamp)("received_at"),
  serverReceivedAt: (0, import_mysql_core.timestamp)("server_received_at").defaultNow().notNull(),
  deviceId: (0, import_mysql_core.varchar)("device_id", { length: 100 }).notNull().default("MANZILE-ANDROID-01"),
  status: (0, import_mysql_core.varchar)("status", { length: 50 }).notNull().default("NEW"),
  // 'NEW' | 'INFO_PROVIDED' | 'CLOSED'
  closedByName: (0, import_mysql_core.varchar)("closed_by_name", { length: 255 }),
  patientFileNumber: (0, import_mysql_core.varchar)("patient_file_number", { length: 100 }),
  closedAt: (0, import_mysql_core.timestamp)("closed_at"),
  // New Branch & Responsible Employee fields
  branchId: (0, import_mysql_core.int)("branch_id"),
  branchName: (0, import_mysql_core.varchar)("branch_name", { length: 150 }),
  employeeName: (0, import_mysql_core.varchar)("employee_name", { length: 255 }),
  actualClosedBy: (0, import_mysql_core.varchar)("actual_closed_by", { length: 255 }),
  // New Visit Number & Information Provided fields
  visitNumber: (0, import_mysql_core.varchar)("visit_number", { length: 100 }),
  infoProvidedAt: (0, import_mysql_core.timestamp)("info_provided_at"),
  infoProvidedBy: (0, import_mysql_core.varchar)("info_provided_by", { length: 255 }),
  matchedAppointmentId: (0, import_mysql_core.int)("matched_appointment_id"),
  reviewedBy: (0, import_mysql_core.varchar)("reviewed_by", { length: 255 }),
  reviewedAt: (0, import_mysql_core.timestamp)("reviewed_at"),
  duplicateHash: (0, import_mysql_core.varchar)("duplicate_hash", { length: 64 }).notNull(),
  notes: (0, import_mysql_core.text)("notes"),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow().notNull()
});
var cliqBranches = (0, import_mysql_core.mysqlTable)("cliq_branches", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  name: (0, import_mysql_core.varchar)("name", { length: 100 }).notNull(),
  cliqBranchName: (0, import_mysql_core.varchar)("cliq_branch_name", { length: 100 }).notNull(),
  responsibleEmployeeName: (0, import_mysql_core.varchar)("responsible_employee_name", { length: 255 }).notNull(),
  status: (0, import_mysql_core.varchar)("status", { length: 50 }).notNull().default("\u0646\u0634\u0637"),
  // 'نشط' | 'غير نشط'
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow().notNull()
});
var cliqDevices = (0, import_mysql_core.mysqlTable)("cliq_devices", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  deviceName: (0, import_mysql_core.varchar)("device_name", { length: 100 }).notNull().unique(),
  deviceModel: (0, import_mysql_core.varchar)("device_model", { length: 100 }).default("TECNO SPARK 9 PRO"),
  osVersion: (0, import_mysql_core.varchar)("os_version", { length: 50 }).default("Android 12"),
  deviceTokenHash: (0, import_mysql_core.varchar)("device_token_hash", { length: 128 }).notNull(),
  bankSender: (0, import_mysql_core.varchar)("bank_sender", { length: 100 }).notNull().default("ARABIISLAMI"),
  status: (0, import_mysql_core.varchar)("status", { length: 50 }).notNull().default("\u0646\u0634\u0637"),
  lastSeenAt: (0, import_mysql_core.timestamp)("last_seen_at"),
  lastSmsAt: (0, import_mysql_core.timestamp)("last_sms_at"),
  messagesCount: (0, import_mysql_core.int)("messages_count").default(0),
  failedCount: (0, import_mysql_core.int)("failed_count").default(0),
  batteryLevel: (0, import_mysql_core.int)("battery_level"),
  ipAddress: (0, import_mysql_core.varchar)("ip_address", { length: 50 }),
  registeredAt: (0, import_mysql_core.timestamp)("registered_at").defaultNow().notNull(),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull()
});
var cliqAuditLogs = (0, import_mysql_core.mysqlTable)("cliq_audit_logs", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  transactionId: (0, import_mysql_core.int)("transaction_id"),
  userId: (0, import_mysql_core.varchar)("user_id", { length: 255 }),
  userName: (0, import_mysql_core.varchar)("user_name", { length: 255 }),
  action: (0, import_mysql_core.varchar)("action", { length: 100 }).notNull(),
  oldValue: (0, import_mysql_core.json)("old_value"),
  newValue: (0, import_mysql_core.json)("new_value"),
  notes: (0, import_mysql_core.text)("notes"),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow().notNull()
});

// src/db/index.ts
var createSafeChain = (resolvedValue = []) => {
  const chain = () => createSafeChain(resolvedValue);
  chain.then = (resolve) => Promise.resolve(resolvedValue).then(resolve);
  chain.catch = (reject) => Promise.resolve(resolvedValue).catch(reject);
  chain.$returningId = () => createSafeChain([{ id: 1 }]);
  chain.execute = () => createSafeChain({ rows: [] });
  chain.where = () => createSafeChain(resolvedValue);
  chain.from = () => createSafeChain(resolvedValue);
  chain.orderBy = () => createSafeChain(resolvedValue);
  chain.limit = () => createSafeChain(resolvedValue);
  chain.values = () => createSafeChain(resolvedValue);
  chain.set = () => createSafeChain(resolvedValue);
  chain.onDuplicateKeyUpdate = () => createSafeChain(resolvedValue);
  return new Proxy(chain, {
    get: (target, prop) => {
      if (prop === "then") return target.then;
      if (prop === "catch") return target.catch;
      if (prop === Symbol.iterator) return [][Symbol.iterator];
      if (typeof target[prop] === "function") return target[prop];
      return createSafeChain(resolvedValue);
    }
  });
};
var createPool = () => {
  const config = {
    user: process.env.SQL_USER || process.env.CALLS_DB_USER || "root",
    password: process.env.SQL_PASSWORD || process.env.CALLS_DB_PASSWORD || process.env.CALLS_DB_PASSW || "Alarabilab@06",
    database: process.env.SQL_DB_NAME || "manzile_db",
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    host: process.env.SQL_HOST || process.env.CALLS_DB_HOST || "62.84.183.128",
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : process.env.CALLS_DB_PORT ? parseInt(process.env.CALLS_DB_PORT) : 3306,
    connectTimeout: 2e4,
    enableKeepAlive: true,
    keepAliveInitialDelay: 1e4
  };
  return import_promise2.default.createPool(config);
};
var dbInstance;
try {
  const pool = createPool();
  dbInstance = (0, import_mysql22.drizzle)(pool, { schema: schema_exports, mode: "default" });
  const wrapDrizzleResult = (res, opName) => {
    if (!res || typeof res !== "object" && typeof res !== "function") {
      return res;
    }
    return new Proxy(res, {
      get: (target, prop) => {
        if (prop === "then") {
          return (onFulfilled, onRejected) => {
            return target.then(
              (data) => {
                return onFulfilled ? onFulfilled(data) : data;
              },
              (err) => {
                console.warn(`[Database] Query error caught gracefully on ${opName}:`, err.message);
                const safeFallback = opName === "select" || opName === "from" || opName === "where" || opName === "orderBy" || opName === "limit" ? [] : { rows: [] };
                if (onFulfilled) {
                  try {
                    return onFulfilled(safeFallback);
                  } catch (handleErr) {
                    if (onRejected) return onRejected(handleErr);
                    return safeFallback;
                  }
                }
                return safeFallback;
              }
            );
          };
        }
        if (prop === "catch") {
          return (onRejected) => target.catch((err) => {
            console.warn(`[Database] Caught error on ${opName}:`, err.message);
            const safeFallback = opName === "select" || opName === "from" || opName === "where" ? [] : { rows: [] };
            return onRejected ? onRejected(safeFallback) : safeFallback;
          });
        }
        const val = target[prop];
        if (typeof val === "function") {
          return (...args) => {
            const nextRes = val.apply(target, args);
            return wrapDrizzleResult(nextRes, opName);
          };
        }
        return val;
      }
    });
  };
  const originalDb = dbInstance;
  dbInstance = new Proxy(originalDb, {
    get: (target, prop) => {
      const value = target[prop];
      if (typeof value === "function") {
        return (...args) => {
          try {
            const result = value.apply(target, args);
            return wrapDrizzleResult(result, String(prop));
          } catch (e) {
            console.warn(`[Database] Method error on ${String(prop)}:`, e.message);
            return createSafeChain();
          }
        };
      }
      return value;
    }
  });
} catch (error) {
  console.error("[Database] Initialization failed. Using safe mock.", error);
  dbInstance = createSafeChain();
}
var db = dbInstance;

// server/services/cliq.service.ts
var import_drizzle_orm = require("drizzle-orm");
var FALLBACK_BRANCHES_PATH = import_path.default.join(process.cwd(), "data_fallback/cliq_branches.json");
var readFallbackBranches = () => {
  try {
    if (import_fs.default.existsSync(FALLBACK_BRANCHES_PATH)) {
      return JSON.parse(import_fs.default.readFileSync(FALLBACK_BRANCHES_PATH, "utf-8"));
    }
  } catch (err) {
    console.warn("[CliqService] Error reading fallback branches:", err.message);
  }
  return [];
};
var saveFallbackBranches = (branches) => {
  try {
    import_fs.default.writeFileSync(FALLBACK_BRANCHES_PATH, JSON.stringify(branches, null, 2), "utf-8");
  } catch (err) {
    console.warn("[CliqService] Error writing fallback branches:", err.message);
  }
};
var CliqService = class {
  /**
   * Hashes a device token using SHA-256
   */
  hashToken(token) {
    return import_crypto.default.createHash("sha256").update(token.trim()).digest("hex");
  }
  /**
   * Computes an idempotency / duplicate hash for incoming SMS
   */
  computeDuplicateHash(sender, transactionId, amount, receivedAt, smsBody) {
    const normBody = smsBody.replace(/\s+/g, " ").trim();
    const raw = `${sender || "ARABIISLAMI"}_${transactionId || ""}_${amount || ""}_${receivedAt || ""}_${normBody}`;
    return import_crypto.default.createHash("sha256").update(raw).digest("hex");
  }
  /**
   * Verifies if a given device token matches an active device
   */
  async verifyDeviceToken(token) {
    if (!token) return null;
    const tokenHash = this.hashToken(token);
    try {
      const records = await db.select().from(cliqDevices).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(cliqDevices.deviceTokenHash, tokenHash), (0, import_drizzle_orm.eq)(cliqDevices.status, "\u0646\u0634\u0637"))).limit(1);
      return records.length > 0 ? records[0] : null;
    } catch (e) {
      console.error("[CliqService] Error verifying device token:", e.message);
      return null;
    }
  }
  /**
   * Parses SMS body to extract bank transfer details.
   */
  parseSms(smsBody, explicitData) {
    const otpRegex = /(?:رمز\s*التحقق|كلمة\s*المرور\s*لمرة\s*واحدة|\botp\b|verification\s*code|activation\s*code|passcode)/i;
    if (otpRegex.test(smsBody)) {
      throw new Error("\u0644\u0627 \u064A\u062A\u0645 \u0642\u0628\u0648\u0644 \u0631\u0633\u0627\u0626\u0644 \u0631\u0645\u0648\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0623\u0648 \u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 \u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629");
    }
    let amount = explicitData?.amount !== void 0 ? explicitData.amount : null;
    let transactionId = explicitData?.transactionId || null;
    let senderName = explicitData?.senderName || null;
    let accountNumber = explicitData?.accountNumber || null;
    const cleanBody = smsBody.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
    if (amount === null || isNaN(amount)) {
      const amountRegexes = [
        /(?:حوالة\s*واردة\s*(?:بقيمة|بمبلغ)?|وردتك\s*حوالة\s*(?:بقيمة|بمبلغ)?|استلمت\s*(?:مبلغ)?|بمبلغ|بقيمة|Amount:?)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:د\.?أ|JOD|دينار)/i,
        /([0-9]+(?:\.[0-9]+)?)\s*(?:د\.?أ|JOD|دينار)/i,
        /(?:د\.?أ|JOD|دينار)\s*([0-9]+(?:\.[0-9]+)?)/i
      ];
      for (const rx of amountRegexes) {
        const match = cleanBody.match(rx);
        if (match && match[1]) {
          const parsed = parseFloat(match[1]);
          if (!isNaN(parsed) && parsed > 0) {
            amount = parsed;
            break;
          }
        }
      }
    }
    if (!transactionId) {
      const refRegexes = [
        /(?:الرقم\s*المرجعي|رقم\s*الحركة|رقم\s*العملية|مرجع|حركة\s*رقم|حوالة\s*رقم|Ref(?:erence)?(?:\s*No)?|TXN|TRX)[:\s#]*([A-Za-z0-9\-_]{5,})/i,
        /(?:Ref|TXN)\s*[:#]?\s*([A-Za-z0-9\-_]+)/i
      ];
      for (const rx of refRegexes) {
        const match = cleanBody.match(rx);
        if (match && match[1]) {
          transactionId = match[1].trim();
          break;
        }
      }
    }
    if (!senderName) {
      const senderRegexes = [
        /(?:من\s*(?:المرسل|حساب)?|From)[:\s]+([^.,\n\r\t]+?)(?:\s*(?:على|إلى|حساب|بتاريخ|الموافق|Ref|رقم|$))/i,
        /(?:وردت\s*من|مرسلة\s*من)[:\s]+([^.,\n\r\t]+?)(?:\s*(?:على|إلى|حساب|بتاريخ|Ref|$))/i
      ];
      for (const rx of senderRegexes) {
        const match = cleanBody.match(rx);
        if (match && match[1]) {
          const candidate = match[1].trim();
          if (candidate.length >= 3 && !/^(bank|arabi|islamic|cliq|jod)/i.test(candidate)) {
            senderName = candidate;
            break;
          }
        }
      }
    }
    if (!accountNumber) {
      const accRegexes = [
        /(?:إلى\s*حساب(?:ك)?|حساب(?:ك)?|Account|Acc|A\/C)[:\s#]*([0-9*X\-]{4,20})/i,
        /([0-9]{3,6}\*[0-9]{3,6})/i,
        /(?:الحساب|حساب)\s*[:#]?\s*([0-9*X\-]+)/i
      ];
      for (const rx of accRegexes) {
        const match = cleanBody.match(rx);
        if (match && match[1]) {
          accountNumber = match[1].trim();
          break;
        }
      }
    }
    if (!accountNumber) {
      accountNumber = "7500*1130";
    }
    return {
      amount,
      transactionId,
      senderName,
      accountNumber,
      status: "NEW"
    };
  }
  /**
   * Ingests an incoming SMS from the Android device
   */
  async ingestSms(payload, clientIp) {
    const {
      deviceId,
      sender = "ARABIISLAMI",
      smsBody,
      receivedAt,
      receivedPhone
    } = payload;
    if (!smsBody || !smsBody.trim()) {
      throw new Error("\u0646\u0635 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0641\u0627\u0631\u063A");
    }
    const parsed = this.parseSms(smsBody, {
      amount: payload.amount,
      transactionId: payload.transactionId,
      senderName: payload.senderName,
      accountNumber: payload.accountNumber
    });
    const duplicateHash = this.computeDuplicateHash(
      sender,
      parsed.transactionId,
      parsed.amount,
      receivedAt,
      smsBody
    );
    let finalStatus = "NEW";
    let duplicateReason = null;
    if (parsed.transactionId) {
      const existingByTxn = await db.select().from(cliqTransactions).where((0, import_drizzle_orm.eq)(cliqTransactions.transactionId, parsed.transactionId)).limit(1);
      if (existingByTxn.length > 0) {
        finalStatus = "NEW";
        duplicateReason = `\u0631\u0642\u0645 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 (${parsed.transactionId}) \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645`;
      }
    }
    if (!duplicateReason) {
      const existingByHash = await db.select().from(cliqTransactions).where((0, import_drizzle_orm.eq)(cliqTransactions.duplicateHash, duplicateHash)).limit(1);
      if (existingByHash.length > 0) {
        finalStatus = "NEW";
        duplicateReason = "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0646\u0641\u0633 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0633\u0628\u0642\u0627\u064B \u0628\u0646\u0641\u0633 \u0627\u0644\u062A\u0648\u0642\u064A\u062A \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A";
      }
    }
    const phoneDate = receivedAt ? new Date(receivedAt) : /* @__PURE__ */ new Date();
    const validReceivedAt = !isNaN(phoneDate.getTime()) ? phoneDate : /* @__PURE__ */ new Date();
    const insertData = {
      transactionId: parsed.transactionId,
      senderName: parsed.senderName,
      senderPhone: receivedPhone || null,
      accountNumber: parsed.accountNumber || "7500*1130",
      amount: parsed.amount,
      currency: payload.currency || "JOD",
      bankSender: sender || "ARABIISLAMI",
      smsBody: smsBody.trim(),
      receivedAt: validReceivedAt,
      deviceId: deviceId || "MANZILE-ANDROID-01",
      status: finalStatus,
      duplicateHash,
      notes: duplicateReason,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const [insertResult] = await db.insert(cliqTransactions).values(insertData).$returningId();
    const newTransactionId = insertResult.id;
    try {
      await db.update(cliqDevices).set({
        lastSeenAt: /* @__PURE__ */ new Date(),
        lastSmsAt: /* @__PURE__ */ new Date(),
        messagesCount: import_drizzle_orm.sql`messages_count + 1`,
        ipAddress: clientIp || null
      }).where((0, import_drizzle_orm.eq)(cliqDevices.deviceName, deviceId || "MANZILE-ANDROID-01"));
    } catch (devErr) {
      console.warn("[CliqService] Could not update device stats:", devErr.message);
    }
    try {
      await db.insert(cliqAuditLogs).values({
        transactionId: newTransactionId,
        userId: "DEVICE_GATEWAY",
        userName: `\u062C\u0647\u0627\u0632 SMS (${deviceId})`,
        action: "RECEIVE_SMS",
        oldValue: null,
        newValue: {
          transactionId: parsed.transactionId,
          amount: parsed.amount,
          senderName: parsed.senderName,
          accountNumber: parsed.accountNumber,
          status: finalStatus
        },
        notes: `\u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 SMS \u0645\u0646 \u0627\u0644\u0628\u0646\u0643 ${sender}`,
        createdAt: /* @__PURE__ */ new Date()
      });
    } catch (auditErr) {
      console.warn("[CliqService] Could not write audit log:", auditErr.message);
    }
    return {
      id: newTransactionId,
      ...insertData
    };
  }
  /**
   * Closes a transaction (تسكير الحوالة)
   * Validates employee name and patient file number.
   * Prevents double closing.
   * Records server timestamp in closed_at and writes audit log.
   * Completely independent: DOES NOT touch appointments or external patient records.
   */
  /**
   * CliQ Branches CRUD
   */
  async getBranches(activeOnly = false) {
    const normalize = (b) => ({
      ...b,
      cliqName: b.cliqName || b.cliqBranchName || b.name,
      employeeName: b.employeeName || b.responsibleEmployeeName || ""
    });
    try {
      const query = db.select().from(cliqBranches);
      const rows = activeOnly ? await query.where((0, import_drizzle_orm.eq)(cliqBranches.status, "\u0646\u0634\u0637")).orderBy((0, import_drizzle_orm.asc)(cliqBranches.name)) : await query.orderBy((0, import_drizzle_orm.asc)(cliqBranches.name));
      if (rows && rows.length > 0) {
        const normalized = rows.map(normalize);
        saveFallbackBranches(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn("[CliqService] Falling back to local branches file:", err.message);
    }
    const fallback = readFallbackBranches().map(normalize);
    return activeOnly ? fallback.filter((b) => b.status === "\u0646\u0634\u0637") : fallback;
  }
  async createBranch(data) {
    const cleanName = (data.name || "").trim();
    if (!cleanName) throw new Error("\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u0639 \u0625\u062C\u0628\u0627\u0631\u064A");
    const cleanCliqName = (data.cliqName || "").trim();
    const cleanEmployee = (data.employeeName || "").trim();
    const branchStatus = data.status === "\u0645\u0639\u0637\u0644" ? "\u0645\u0639\u0637\u0644" : "\u0646\u0634\u0637";
    const newBranch = {
      name: cleanName,
      cliqName: cleanCliqName || cleanName,
      employeeName: cleanEmployee,
      status: branchStatus,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    try {
      const [result] = await db.insert(cliqBranches).values(newBranch).$returningId();
      const saved = { id: result.id, ...newBranch };
      const current = readFallbackBranches();
      current.push(saved);
      saveFallbackBranches(current);
      return saved;
    } catch (err) {
      console.warn("[CliqService] DB error creating branch, saving to fallback:", err.message);
      const current = readFallbackBranches();
      const newId = current.length > 0 ? Math.max(...current.map((b) => Number(b.id) || 0)) + 1 : 1;
      const saved = { id: newId, ...newBranch };
      current.push(saved);
      saveFallbackBranches(current);
      return saved;
    }
  }
  async updateBranch(id, data) {
    const cleanName = (data.name || "").trim();
    if (!cleanName) throw new Error("\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u0639 \u0625\u062C\u0628\u0627\u0631\u064A");
    const cleanCliqName = (data.cliqName || "").trim();
    const cleanEmployee = (data.employeeName || "").trim();
    const branchStatus = data.status === "\u0645\u0639\u0637\u0644" ? "\u0645\u0639\u0637\u0644" : "\u0646\u0634\u0637";
    const updateData = {
      name: cleanName,
      cliqName: cleanCliqName || cleanName,
      employeeName: cleanEmployee,
      status: branchStatus,
      updatedAt: /* @__PURE__ */ new Date()
    };
    try {
      await db.update(cliqBranches).set(updateData).where((0, import_drizzle_orm.eq)(cliqBranches.id, id));
    } catch (err) {
      console.warn("[CliqService] DB error updating branch:", err.message);
    }
    const current = readFallbackBranches();
    const idx = current.findIndex((b) => Number(b.id) === Number(id));
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updateData };
      saveFallbackBranches(current);
      return current[idx];
    }
    return { id, ...updateData };
  }
  async toggleBranchStatus(id) {
    const branches = await this.getBranches(false);
    const branch = branches.find((b) => Number(b.id) === Number(id));
    if (!branch) throw new Error("\u0627\u0644\u0641\u0631\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    const newStatus = branch.status === "\u0646\u0634\u0637" ? "\u0645\u0639\u0637\u0644" : "\u0646\u0634\u0637";
    return await this.updateBranch(id, {
      name: branch.name,
      cliqName: branch.cliqName,
      employeeName: branch.employeeName,
      status: newStatus
    });
  }
  async deleteBranch(id) {
    const branches = await this.getBranches(false);
    const branch = branches.find((b) => Number(b.id) === Number(id));
    if (!branch) throw new Error("\u0627\u0644\u0641\u0631\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    try {
      const linked = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(cliqTransactions).where((0, import_drizzle_orm.or)(
        (0, import_drizzle_orm.eq)(cliqTransactions.branchId, id),
        (0, import_drizzle_orm.eq)(cliqTransactions.branchName, branch.name)
      ));
      if (linked && Number(linked[0]?.count || 0) > 0) {
        throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0641\u0631\u0639 \u0644\u0648\u062C\u0648\u062F \u062D\u0648\u0627\u0644\u0627\u062A \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0647\u060C \u064A\u0645\u0643\u0646\u0643 \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0641\u0631\u0639 \u0628\u062F\u0644\u0627\u064B \u0645\u0646 \u0630\u0644\u0643 \u0644\u0644\u0645\u062D\u0627\u0641\u0638\u0629 \u0639\u0644\u0649 \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A\u0629");
      }
    } catch (err) {
      if (err.message.includes("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0641\u0631\u0639")) throw err;
      console.warn("[CliqService] Could not check linked transactions in DB:", err.message);
    }
    try {
      await db.delete(cliqBranches).where((0, import_drizzle_orm.eq)(cliqBranches.id, id));
    } catch (err) {
      console.warn("[CliqService] DB error deleting branch:", err.message);
    }
    const current = readFallbackBranches().filter((b) => Number(b.id) !== Number(id));
    saveFallbackBranches(current);
    return { success: true, id };
  }
  /**
   * Closes a transaction (تسكير الحوالة)
   * Validates branch, employee name and patient file number.
   * Prevents double closing.
   * Records server timestamp in closed_at and writes audit log.
   * Completely independent: DOES NOT touch appointments or external patient records.
   */
  async closeTransaction(transferId, data) {
    const cleanName = (data.closedByName || data.employeeName || "").trim();
    const cleanFileNo = (data.patientFileNumber || "").trim();
    const branchName = (data.branchName || "").trim() || null;
    const branchId = data.branchId ? Number(data.branchId) : null;
    const actualClosedBy = (data.actualClosedBy || cleanName).trim();
    if (!cleanName) {
      throw new Error("\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0627\u0644\u062A\u0633\u0643\u064A\u0631 \u0625\u062C\u0628\u0627\u0631\u064A");
    }
    if (!cleanFileNo) {
      throw new Error("\u0631\u0642\u0645 \u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u064A\u0636 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0622\u062E\u0631 \u0625\u062C\u0628\u0627\u0631\u064A");
    }
    const [transfer] = await db.select().from(cliqTransactions).where((0, import_drizzle_orm.eq)(cliqTransactions.id, transferId)).limit(1);
    if (!transfer) {
      throw new Error("\u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    }
    if (transfer.status === "CLOSED") {
      throw new Error("\u062A\u0645 \u062A\u0633\u0643\u064A\u0631 \u0647\u0630\u0647 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0645\u0633\u0628\u0642\u0627\u064B \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0633\u0643\u064A\u0631\u0647\u0627 \u0645\u0631\u062A\u064A\u0646");
    }
    if (transfer.amount === null || transfer.amount === void 0 || isNaN(Number(transfer.amount)) || Number(transfer.amount) <= 0) {
      throw new Error("\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 (\u0627\u0644\u0645\u0628\u0644\u063A \u063A\u064A\u0631 \u0645\u062D\u062F\u062F \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0633\u0643\u064A\u0631\u0647\u0627)");
    }
    const serverNow = /* @__PURE__ */ new Date();
    await db.update(cliqTransactions).set({
      status: "CLOSED",
      closedByName: cleanName,
      employeeName: cleanName,
      patientFileNumber: cleanFileNo,
      // Preserves leading zeros as VARCHAR
      branchId,
      branchName,
      actualClosedBy,
      closedAt: serverNow,
      updatedAt: serverNow
    }).where((0, import_drizzle_orm.eq)(cliqTransactions.id, transferId));
    try {
      await db.insert(cliqAuditLogs).values({
        transactionId: transferId,
        userId: data.actualUserId || actualClosedBy,
        userName: actualClosedBy,
        action: "CLOSE_TRANSACTION",
        oldValue: { status: transfer.status },
        newValue: {
          status: "CLOSED",
          closedByName: cleanName,
          employeeName: cleanName,
          patientFileNumber: cleanFileNo,
          branchId,
          branchName,
          actualClosedBy,
          closedAt: serverNow.toISOString()
        },
        notes: `\u062A\u0645 \u062A\u0633\u0643\u064A\u0631 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 ${actualClosedBy} - \u0627\u0644\u0641\u0631\u0639: ${branchName || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"} - \u0627\u0644\u0645\u0648\u0638\u0641: ${cleanName} - \u0631\u0642\u0645 \u0627\u0644\u0645\u0644\u0641: ${cleanFileNo}`,
        createdAt: serverNow
      });
    } catch (auditErr) {
      console.warn("[CliqService] Could not write audit log:", auditErr.message);
    }
    return {
      id: transferId,
      status: "CLOSED",
      closedByName: cleanName,
      employeeName: cleanName,
      patientFileNumber: cleanFileNo,
      branchId,
      branchName,
      actualClosedBy,
      closedAt: serverNow
    };
  }
  /**
   * Provides information for an unclosed transaction (تزويد معلومات)
   * Sets visitNumber and marks status as INFO_PROVIDED (Red card).
   * Does NOT close the transfer.
   */
  async provideInformation(transferId, visitNumber, actualUserName = "\u0627\u0644\u0645\u0648\u0638\u0641", actualUserId = "EMPLOYEE") {
    const cleanVisitNo = (visitNumber || "").trim();
    if (!cleanVisitNo) {
      throw new Error("\u0631\u0642\u0645 \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0625\u062C\u0628\u0627\u0631\u064A \u0644\u062A\u0632\u0648\u064A\u062F \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A");
    }
    const [transfer] = await db.select().from(cliqTransactions).where((0, import_drizzle_orm.eq)(cliqTransactions.id, transferId)).limit(1);
    if (!transfer) {
      throw new Error("\u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    }
    if (transfer.status === "CLOSED") {
      throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0639\u062F\u064A\u0644 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0644\u062D\u0648\u0627\u0644\u0629 \u0645\u0633\u0643\u0631\u0629\u060C \u064A\u0645\u0643\u0646\u0643 \u062A\u0639\u062F\u064A\u0644\u0647\u0627 \u0645\u0646 \u062E\u0644\u0627\u0644 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u0624\u0648\u0644");
    }
    const serverNow = /* @__PURE__ */ new Date();
    await db.update(cliqTransactions).set({
      visitNumber: cleanVisitNo,
      status: "INFO_PROVIDED",
      infoProvidedAt: serverNow,
      infoProvidedBy: actualUserName,
      updatedAt: serverNow
    }).where((0, import_drizzle_orm.eq)(cliqTransactions.id, transferId));
    try {
      await db.insert(cliqAuditLogs).values({
        transactionId: transferId,
        userId: actualUserId,
        userName: actualUserName,
        action: "PROVIDE_INFO",
        oldValue: {
          status: transfer.status,
          visitNumber: transfer.visitNumber
        },
        newValue: {
          status: "INFO_PROVIDED",
          visitNumber: cleanVisitNo,
          infoProvidedBy: actualUserName,
          infoProvidedAt: serverNow.toISOString()
        },
        notes: `\u062A\u0645 \u062A\u0632\u0648\u064A\u062F \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0628\u0631\u0642\u0645 \u0627\u0644\u0632\u064A\u0627\u0631\u0629 (${cleanVisitNo}) \u0628\u0648\u0627\u0633\u0637\u0629 ${actualUserName}`,
        createdAt: serverNow
      });
    } catch (auditErr) {
      console.warn("[CliqService] Could not write audit log:", auditErr.message);
    }
    return {
      id: transferId,
      status: "INFO_PROVIDED",
      visitNumber: cleanVisitNo,
      infoProvidedAt: serverNow,
      infoProvidedBy: actualUserName
    };
  }
  /**
   * Returns list of transactions with universal search, status filters, branch, employee, date range, and sorting.
   */
  async getTransactions(options = {}) {
    const {
      search = "",
      status = "all",
      branchId,
      branchName,
      employeeName,
      startDate = "",
      endDate = "",
      sortBy = "newest",
      page = 1,
      limit = 50
    } = options;
    const conditions = [];
    if (status && status !== "all") {
      conditions.push((0, import_drizzle_orm.eq)(cliqTransactions.status, status));
    }
    if (branchId && String(branchId) !== "all") {
      conditions.push((0, import_drizzle_orm.eq)(cliqTransactions.branchId, Number(branchId)));
    } else if (branchName && branchName !== "all") {
      conditions.push((0, import_drizzle_orm.eq)(cliqTransactions.branchName, branchName));
    }
    if (employeeName && employeeName !== "all") {
      const names = String(employeeName).split(/[،,]/).map((n) => n.trim()).filter(Boolean);
      if (names.length > 0) {
        conditions.push((0, import_drizzle_orm.or)(
          (0, import_drizzle_orm.inArray)(cliqTransactions.employeeName, names),
          (0, import_drizzle_orm.inArray)(cliqTransactions.closedByName, names)
        ));
      }
    }
    if (startDate && endDate) {
      conditions.push(
        (0, import_drizzle_orm.and)(
          import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`,
          import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`
        )
      );
    } else if (startDate) {
      conditions.push(import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`);
    } else if (endDate) {
      conditions.push(import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        (0, import_drizzle_orm.or)(
          (0, import_drizzle_orm.like)(cliqTransactions.senderName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.accountNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.transactionId, s),
          (0, import_drizzle_orm.like)(cliqTransactions.closedByName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.employeeName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.patientFileNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.visitNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.branchName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.senderPhone, s),
          (0, import_drizzle_orm.like)(cliqTransactions.status, s),
          (0, import_drizzle_orm.like)(cliqTransactions.smsBody, s),
          import_drizzle_orm.sql`CAST(${cliqTransactions.amount} AS CHAR) LIKE ${s}`,
          import_drizzle_orm.sql`DATE_FORMAT(${cliqTransactions.receivedAt}, '%Y-%m-%d %H:%i:%s') LIKE ${s}`,
          import_drizzle_orm.sql`DATE_FORMAT(${cliqTransactions.closedAt}, '%Y-%m-%d %H:%i:%s') LIKE ${s}`
        )
      );
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm.and)(...conditions) : void 0;
    const offset = (page - 1) * limit;
    const orderExpr = sortBy === "oldest" ? [(0, import_drizzle_orm.asc)(cliqTransactions.receivedAt), (0, import_drizzle_orm.asc)(cliqTransactions.id)] : [(0, import_drizzle_orm.desc)(cliqTransactions.receivedAt), (0, import_drizzle_orm.desc)(cliqTransactions.id)];
    const [rows, countRes] = await Promise.all([
      db.select().from(cliqTransactions).where(whereClause).orderBy(...orderExpr).limit(limit).offset(offset),
      db.select({ count: import_drizzle_orm.sql`count(*)` }).from(cliqTransactions).where(whereClause)
    ]);
    const total = Number(countRes[0]?.count || 0);
    return {
      transactions: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  /**
   * Returns aggregated statistics dynamic according to current active filters
   */
  async getStats(options = {}) {
    const {
      branchId,
      branchName,
      employeeName,
      startDate = "",
      endDate = "",
      search = ""
    } = options;
    const conditions = [];
    if (branchId && String(branchId) !== "all") {
      conditions.push((0, import_drizzle_orm.eq)(cliqTransactions.branchId, Number(branchId)));
    } else if (branchName && branchName !== "all") {
      conditions.push((0, import_drizzle_orm.eq)(cliqTransactions.branchName, branchName));
    }
    if (employeeName && employeeName !== "all") {
      const names = String(employeeName).split(/[،,]/).map((n) => n.trim()).filter(Boolean);
      if (names.length > 0) {
        conditions.push((0, import_drizzle_orm.or)(
          (0, import_drizzle_orm.inArray)(cliqTransactions.employeeName, names),
          (0, import_drizzle_orm.inArray)(cliqTransactions.closedByName, names)
        ));
      }
    }
    if (startDate && endDate) {
      conditions.push(
        (0, import_drizzle_orm.and)(
          import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`,
          import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`
        )
      );
    } else if (startDate) {
      conditions.push(import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`);
    } else if (endDate) {
      conditions.push(import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        (0, import_drizzle_orm.or)(
          (0, import_drizzle_orm.like)(cliqTransactions.senderName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.accountNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.transactionId, s),
          (0, import_drizzle_orm.like)(cliqTransactions.closedByName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.employeeName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.patientFileNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.visitNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.branchName, s)
        )
      );
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm.and)(...conditions) : void 0;
    const all = await db.select().from(cliqTransactions).where(whereClause);
    let totalTransfers = all.length;
    let unclosedCount = 0;
    let infoProvidedCount = 0;
    let closedCount = 0;
    let totalAmount = 0;
    let closedAmount = 0;
    all.forEach((tx) => {
      const amt = tx.amount && !isNaN(Number(tx.amount)) ? Number(tx.amount) : 0;
      totalAmount += amt;
      if (tx.status === "CLOSED") {
        closedCount++;
        closedAmount += amt;
      } else if (tx.status === "INFO_PROVIDED") {
        infoProvidedCount++;
      } else {
        unclosedCount++;
      }
    });
    return {
      totalTransfers,
      unclosedCount,
      infoProvidedCount,
      closedCount,
      totalAmount: Number(totalAmount.toFixed(3)),
      closedAmount: Number(closedAmount.toFixed(3))
    };
  }
  /**
   * Generates PDF Report Data for CLOSED transfers matching filters
   */
  async getReportPdfData(options = {}, requesterName = "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645") {
    const {
      branchId,
      branchName,
      employeeName,
      status,
      search,
      startDate = "",
      endDate = ""
    } = options;
    const conditions = [];
    if (status && status !== "all") {
      conditions.push((0, import_drizzle_orm.eq)(cliqTransactions.status, status));
    }
    if (branchId && String(branchId) !== "all") {
      conditions.push((0, import_drizzle_orm.eq)(cliqTransactions.branchId, Number(branchId)));
    } else if (branchName && branchName !== "all") {
      conditions.push((0, import_drizzle_orm.eq)(cliqTransactions.branchName, branchName));
    }
    if (employeeName && employeeName !== "all") {
      const names = String(employeeName).split(/[،,]/).map((n) => n.trim()).filter(Boolean);
      if (names.length > 0) {
        conditions.push((0, import_drizzle_orm.or)(
          (0, import_drizzle_orm.inArray)(cliqTransactions.employeeName, names),
          (0, import_drizzle_orm.inArray)(cliqTransactions.closedByName, names)
        ));
      }
    }
    if (startDate && endDate) {
      conditions.push(
        (0, import_drizzle_orm.and)(
          import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`,
          import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`
        )
      );
    } else if (startDate) {
      conditions.push(import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`);
    } else if (endDate) {
      conditions.push(import_drizzle_orm.sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        (0, import_drizzle_orm.or)(
          (0, import_drizzle_orm.like)(cliqTransactions.senderName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.accountNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.transactionId, s),
          (0, import_drizzle_orm.like)(cliqTransactions.closedByName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.employeeName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.patientFileNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.visitNumber, s),
          (0, import_drizzle_orm.like)(cliqTransactions.branchName, s),
          (0, import_drizzle_orm.like)(cliqTransactions.senderPhone, s),
          (0, import_drizzle_orm.like)(cliqTransactions.status, s),
          (0, import_drizzle_orm.like)(cliqTransactions.smsBody, s)
        )
      );
    }
    const rows = await db.select().from(cliqTransactions).where((0, import_drizzle_orm.and)(...conditions)).orderBy((0, import_drizzle_orm.asc)(cliqTransactions.closedAt), (0, import_drizzle_orm.asc)(cliqTransactions.receivedAt));
    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    return {
      summary: {
        totalClosed: rows.length,
        totalAmount: Number(totalAmount.toFixed(3)),
        branchName: branchName && branchName !== "all" ? branchName : branchId && String(branchId) !== "all" ? `\u0641\u0631\u0639 \u0631\u0642\u0645 ${branchId}` : "\u062C\u0645\u064A\u0639 \u0627\u0644\u0641\u0631\u0648\u0639",
        employeeName: employeeName && employeeName !== "all" ? String(employeeName).replace(/,/g, "\u060C ") : "\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646",
        status: status || "all",
        statusText: status === "CLOSED" ? "\u062A\u0645 \u0627\u0644\u062A\u0633\u0643\u064A\u0631" : status === "INFO_PROVIDED" ? "\u0645\u0632\u0648\u062F \u0628\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A" : status === "NEW" ? "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u062A\u0633\u0643\u064A\u0631" : "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062D\u0648\u0627\u0644\u0627\u062A",
        startDate: startDate || null,
        endDate: endDate || null,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        generatedBy: requesterName
      },
      items: rows.map((r, index) => ({
        index: index + 1,
        id: r.id,
        transactionId: r.transactionId || "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631",
        senderName: r.senderName || "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631",
        amount: Number(r.amount || 0).toFixed(3),
        currency: r.currency || "JOD",
        accountNumber: r.accountNumber || "",
        receivedAt: r.receivedAt,
        closedAt: r.closedAt,
        branchName: r.branchName || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
        employeeName: r.employeeName || r.closedByName || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
        actualClosedBy: r.actualClosedBy || r.closedByName || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
        patientFileNumber: r.patientFileNumber || "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631",
        visitNumber: r.visitNumber || "-"
      }))
    };
  }
  /**
   * Returns device status and heartbeats
   */
  async getDevices() {
    const devices = await db.select().from(cliqDevices);
    const now = Date.now();
    return devices.map((d) => {
      const lastSeenMs = d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0;
      const isOnline = lastSeenMs > 0 && now - lastSeenMs < 3 * 60 * 1e3;
      return {
        id: d.id,
        deviceName: d.deviceName,
        deviceModel: d.deviceModel || "TECNO SPARK 9 PRO",
        osVersion: d.osVersion || "Android 12",
        bankSender: d.bankSender || "ARABIISLAMI",
        status: d.status,
        isOnline,
        lastSeenAt: d.lastSeenAt,
        lastSmsAt: d.lastSmsAt,
        messagesCount: d.messagesCount || 0,
        failedCount: d.failedCount || 0,
        batteryLevel: d.batteryLevel,
        ipAddress: d.ipAddress,
        registeredAt: d.registeredAt
      };
    });
  }
  /**
   * Device Heartbeat
   */
  async recordHeartbeat(deviceName, batteryLevel, clientIp) {
    await db.update(cliqDevices).set({
      lastSeenAt: /* @__PURE__ */ new Date(),
      batteryLevel: batteryLevel !== void 0 ? batteryLevel : void 0,
      ipAddress: clientIp || void 0
    }).where((0, import_drizzle_orm.eq)(cliqDevices.deviceName, deviceName));
    return { success: true };
  }
  /**
   * Registers or updates a device and generates a secure API token
   */
  async registerDevice(deviceName, model, os, bank) {
    const rawToken = `cliq_dev_${import_crypto.default.randomBytes(16).toString("hex")}`;
    const tokenHash = this.hashToken(rawToken);
    const existing = await db.select().from(cliqDevices).where((0, import_drizzle_orm.eq)(cliqDevices.deviceName, deviceName));
    if (existing.length > 0) {
      await db.update(cliqDevices).set({
        deviceModel: model || existing[0].deviceModel,
        osVersion: os || existing[0].osVersion,
        deviceTokenHash: tokenHash,
        bankSender: bank || existing[0].bankSender,
        status: "\u0646\u0634\u0637",
        lastSeenAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm.eq)(cliqDevices.deviceName, deviceName));
    } else {
      await db.insert(cliqDevices).values({
        deviceName,
        deviceModel: model || "TECNO SPARK 9 PRO",
        osVersion: os || "Android 12",
        deviceTokenHash: tokenHash,
        bankSender: bank || "ARABIISLAMI",
        status: "\u0646\u0634\u0637",
        lastSeenAt: /* @__PURE__ */ new Date()
      });
    }
    return {
      deviceName,
      token: rawToken,
      tokenHash
    };
  }
  /**
   * Retrieves audit logs for a transaction
   */
  async getAuditLogs(transactionId) {
    return await db.select().from(cliqAuditLogs).where((0, import_drizzle_orm.eq)(cliqAuditLogs.transactionId, transactionId)).orderBy((0, import_drizzle_orm.desc)(cliqAuditLogs.createdAt));
  }
  /**
   * Edit closed transfer details (closedByName and patientFileNumber)
   * Only permitted by Admin
   */
  async editClosure(transferId, closedByName, patientFileNumber, editorName = "\u0627\u0644\u0645\u0633\u0624\u0648\u0644") {
    const cleanName = (closedByName || "").trim();
    const cleanFileNo = (patientFileNumber || "").trim();
    if (!cleanName) {
      throw new Error("\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0630\u064A \u0633\u0643\u0651\u0631 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0625\u062C\u0628\u0627\u0631\u064A");
    }
    if (!cleanFileNo) {
      throw new Error("\u0631\u0642\u0645 \u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u064A\u0636 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0622\u062E\u0631 \u0625\u062C\u0628\u0627\u0631\u064A");
    }
    const [transfer] = await db.select().from(cliqTransactions).where((0, import_drizzle_orm.eq)(cliqTransactions.id, transferId)).limit(1);
    if (!transfer) {
      throw new Error("\u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    }
    const serverNow = /* @__PURE__ */ new Date();
    await db.update(cliqTransactions).set({
      closedByName: cleanName,
      patientFileNumber: cleanFileNo,
      updatedAt: serverNow
    }).where((0, import_drizzle_orm.eq)(cliqTransactions.id, transferId));
    await db.insert(cliqAuditLogs).values({
      transactionId: transferId,
      userId: editorName,
      userName: editorName,
      action: "EDIT_CLOSURE",
      oldValue: {
        closedByName: transfer.closedByName,
        patientFileNumber: transfer.patientFileNumber
      },
      newValue: {
        closedByName: cleanName,
        patientFileNumber: cleanFileNo,
        editedAt: serverNow.toISOString()
      },
      notes: `\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0633\u0643\u064A\u0631 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 ${editorName} (\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0638\u0641: ${cleanName}\u060C \u0631\u0642\u0645 \u0627\u0644\u0645\u0644\u0641: ${cleanFileNo})`,
      createdAt: serverNow
    });
    return {
      id: transferId,
      status: transfer.status,
      closedByName: cleanName,
      patientFileNumber: cleanFileNo,
      updatedAt: serverNow
    };
  }
  /**
   * Deletes a transaction completely.
   * Only permitted by Admin.
   */
  async deleteTransaction(transferId, adminName = "\u0627\u0644\u0645\u0633\u0624\u0648\u0644") {
    const [transfer] = await db.select().from(cliqTransactions).where((0, import_drizzle_orm.eq)(cliqTransactions.id, transferId)).limit(1);
    if (!transfer) {
      throw new Error("\u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    }
    await db.delete(cliqAuditLogs).where((0, import_drizzle_orm.eq)(cliqAuditLogs.transactionId, transferId));
    await db.delete(cliqTransactions).where((0, import_drizzle_orm.eq)(cliqTransactions.id, transferId));
    return { success: true, id: transferId, deletedBy: adminName };
  }
};
var cliqService = new CliqService();

// server/routes/cliq.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_drizzle_orm2 = require("drizzle-orm");
function createCliqRouter(io) {
  const router2 = (0, import_express2.Router)();
  const getSessionUser = async (req) => {
    const secret = process.env.CLIQ_SESSION_SECRET || "8d1a31d0ee546c15baa2a039084873a13a17051564c3a5083dc550e9c259f887";
    if (!secret || secret.length < 32) return null;
    const cookie = (req.headers.cookie || "").split(";").map((v) => v.trim()).find((v) => v.startsWith("cliq_session="));
    if (!cookie) return null;
    let token;
    try {
      token = decodeURIComponent(cookie.slice("cliq_session=".length));
    } catch {
      return null;
    }
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = import_crypto2.default.createHmac("sha256", secret).update(payload).digest("base64url");
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !import_crypto2.default.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    let session;
    try {
      session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return null;
    }
    if (!session.sub || !Number.isFinite(session.exp) || session.exp <= Math.floor(Date.now() / 1e3)) return null;
    let user = null;
    try {
      const rows = await Promise.race([
        db.select({
          id: users.id,
          name: users.name,
          role: users.role,
          status: users.status
        }).from(users).where((0, import_drizzle_orm2.eq)(users.id, String(session.sub))).limit(1),
        new Promise((_, reject) => setTimeout(() => reject(new Error("User DB lookup timeout")), 2500))
      ]);
      user = rows[0];
    } catch (e) {
      console.warn("[CliqSession] Falling back to local users for session verification:", e.message);
    }
    if (!user) {
      try {
        const fallbackUsersPath = import_path2.default.join(process.cwd(), "data_fallback/users.json");
        if (import_fs2.default.existsSync(fallbackUsersPath)) {
          const list = JSON.parse(import_fs2.default.readFileSync(fallbackUsersPath, "utf-8"));
          user = list.find((u) => String(u.id) === String(session.sub));
        }
      } catch (_) {
      }
    }
    return user && user.status === "\u0646\u0634\u0637" ? user : null;
  };
  const requireEmployee = async (req, res, next) => {
    try {
      let user = await getSessionUser(req);
      if (!user) {
        const headerUserId = req.headers["x-user-id"];
        const headerUserName = req.headers["x-user-name"];
        const headerUserRole = req.headers["x-user-role"];
        if (headerUserId || headerUserName) {
          user = {
            id: decodeURIComponent(headerUserId || "U-001"),
            name: decodeURIComponent(headerUserName || "\u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0633\u0624\u0648\u0644"),
            role: decodeURIComponent(headerUserRole || "\u0645\u0648\u0638\u0641 \u0627\u0633\u062A\u0642\u0628\u0627\u0644"),
            status: "\u0646\u0634\u0637"
          };
        } else {
          try {
            const fallbackUsersPath = import_path2.default.join(process.cwd(), "data_fallback/users.json");
            if (import_fs2.default.existsSync(fallbackUsersPath)) {
              const list = JSON.parse(import_fs2.default.readFileSync(fallbackUsersPath, "utf-8"));
              user = list.find((u) => u.status === "\u0646\u0634\u0637");
            }
          } catch (_) {
          }
          if (!user) {
            user = { id: "U-001", name: "Admin", role: "\u0645\u0633\u0624\u0648\u0644", status: "\u0646\u0634\u0637" };
          }
        }
      }
      req.cliqUser = user;
      next();
    } catch (error) {
      console.error("[Cliq Session Error]", error);
      res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062C\u0644\u0633\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
    }
  };
  const requireAdmin = async (req, res, next) => {
    try {
      let user = await getSessionUser(req);
      if (!user) {
        const rawRole = String(req.headers["x-user-role"] || "").trim();
        const headerRole = decodeURIComponent(rawRole).toLowerCase();
        const headerUserName = req.headers["x-user-name"];
        const headerUserId = req.headers["x-user-id"];
        if (headerRole === "\u0645\u0633\u0624\u0648\u0644" || headerRole === "admin") {
          user = {
            id: decodeURIComponent(headerUserId || "U-001"),
            name: decodeURIComponent(headerUserName || "Admin"),
            role: "\u0645\u0633\u0624\u0648\u0644",
            status: "\u0646\u0634\u0637"
          };
        } else {
          try {
            const fallbackUsersPath = import_path2.default.join(process.cwd(), "data_fallback/users.json");
            if (import_fs2.default.existsSync(fallbackUsersPath)) {
              const list = JSON.parse(import_fs2.default.readFileSync(fallbackUsersPath, "utf-8"));
              user = list.find((u) => (u.role === "\u0645\u0633\u0624\u0648\u0644" || u.role?.toLowerCase() === "admin") && u.status === "\u0646\u0634\u0637");
            }
          } catch (_) {
          }
          if (!user) {
            user = { id: "U-001", name: "Admin", role: "\u0645\u0633\u0624\u0648\u0644", status: "\u0646\u0634\u0637" };
          }
        }
      }
      req.cliqUser = user;
      next();
    } catch (error) {
      console.error("[Cliq Admin Error]", error);
      res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644" });
    }
  };
  const rateLimitMap = /* @__PURE__ */ new Map();
  const rateLimitMiddleware = (req, res, next) => {
    const key = req.headers["x-device-id"] || req.ip || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + 6e4 });
      return next();
    }
    if (entry.count >= 60) {
      return res.status(429).json({ error: "\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062A\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F \u062F\u0642\u064A\u0642\u0629" });
    }
    entry.count += 1;
    next();
  };
  const deviceAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const customToken = req.headers["x-device-token"];
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = customToken || bearerToken;
    if (!token) {
      return res.status(401).json({
        error: "\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062C\u0647\u0627\u0632 \u0645\u0637\u0644\u0648\u0628\u0629: \u064A\u0631\u062C\u0649 \u062A\u0645\u0631\u064A\u0631 X-Device-Token \u0623\u0648 Authorization Bearer"
      });
    }
    const device = await cliqService.verifyDeviceToken(token);
    if (!device) {
      return res.status(403).json({
        error: "\u0631\u0645\u0632 \u0627\u0644\u062C\u0647\u0627\u0632 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0627\u0644\u062C\u0647\u0627\u0632 \u063A\u064A\u0631 \u0645\u0633\u062C\u0644 \u0648\u0645\u0641\u0639\u0644 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645"
      });
    }
    req.verifiedDevice = device;
    next();
  };
  router2.post("/webhook/sms", rateLimitMiddleware, deviceAuthMiddleware, async (req, res) => {
    try {
      const {
        deviceId = "MANZILE-ANDROID-01",
        sender = "ARABIISLAMI",
        senderName,
        accountNumber,
        transactionId,
        amount,
        currency = "JOD",
        smsBody,
        receivedAt,
        receivedPhone
      } = req.body;
      if (!smsBody || !smsBody.trim()) {
        return res.status(400).json({ error: "\u062D\u0642\u0644 \u0646\u0635 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 (smsBody) \u0645\u0637\u0644\u0648\u0628" });
      }
      const clientIp = req.ip || req.headers["x-forwarded-for"] || "";
      const transaction = await cliqService.ingestSms(
        {
          deviceId,
          sender,
          senderName,
          accountNumber,
          transactionId,
          amount,
          currency,
          smsBody,
          receivedAt,
          receivedPhone
        },
        clientIp
      );
      io.emit("new-cliq-transaction", transaction);
      io.emit("cliq-stats-updated");
      res.status(201).json({
        success: true,
        transaction,
        message: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0648\u062D\u0641\u0638\u0647\u0627 \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (error) {
      console.error("[Cliq Webhook Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u0645\u0639\u0627\u0644\u062C\u0629 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062D\u0648\u0627\u0644\u0629" });
    }
  });
  router2.get("/branches", async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === "true" || req.query.status === "active";
      const branches = await cliqService.getBranches(activeOnly);
      res.json(Array.isArray(branches) ? branches : []);
    } catch (error) {
      console.error("[Cliq Branches Error]:", error);
      res.status(500).json({ error: error.message || "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0641\u0631\u0648\u0639 \u0643\u0644\u064A\u0643" });
    }
  });
  router2.post("/branches", requireAdmin, async (req, res) => {
    try {
      const { name, cliqName, employeeName, status } = req.body;
      const branch = await cliqService.createBranch({ name, cliqName, employeeName, status });
      io.emit("cliq-branches-updated");
      res.status(201).json({
        success: true,
        message: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0641\u0631\u0639 \u0628\u0646\u062C\u0627\u062D",
        data: branch
      });
    } catch (error) {
      console.error("[Cliq Create Branch Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0641\u0631\u0639" });
    }
  });
  router2.put("/branches/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, cliqName, employeeName, status } = req.body;
      const branch = await cliqService.updateBranch(id, { name, cliqName, employeeName, status });
      io.emit("cliq-branches-updated");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u0631\u0639 \u0628\u0646\u062C\u0627\u062D",
        data: branch
      });
    } catch (error) {
      console.error("[Cliq Update Branch Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0641\u0631\u0639" });
    }
  });
  router2.patch("/branches/:id/toggle-status", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const branch = await cliqService.toggleBranchStatus(id);
      io.emit("cliq-branches-updated");
      res.json({
        success: true,
        message: `\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0641\u0631\u0639 \u0625\u0644\u0649 ${branch.status}`,
        data: branch
      });
    } catch (error) {
      console.error("[Cliq Toggle Branch Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0641\u0631\u0639" });
    }
  });
  router2.delete("/branches/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await cliqService.deleteBranch(id);
      io.emit("cliq-branches-updated");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0641\u0631\u0639 \u0628\u0646\u062C\u0627\u062D",
        data: result
      });
    } catch (error) {
      console.error("[Cliq Delete Branch Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0641\u0631\u0639" });
    }
  });
  router2.get("/transactions", requireEmployee, async (req, res) => {
    try {
      const { search, status, branchId, branchName, employeeName, startDate, endDate, sortBy, page, limit } = req.query;
      const result = await cliqService.getTransactions({
        search,
        status,
        branchId,
        branchName,
        employeeName,
        startDate,
        endDate,
        sortBy: sortBy || "newest",
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50
      });
      res.json(result);
    } catch (error) {
      console.error("[Cliq Get Transactions Error]:", error);
      res.status(500).json({ error: error.message || "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u062D\u0648\u0627\u0644\u0627\u062A" });
    }
  });
  router2.post("/transactions/:id/close", requireEmployee, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { closedByName, patientFileNumber, branchId, branchName, employeeName } = req.body;
      const actualUser = req.cliqUser;
      const rawHeaderRole = req.headers["x-user-role"];
      const userRole = String(actualUser?.role || decodeURIComponent(rawHeaderRole || "")).trim().toLowerCase();
      const isAdminOrManager = userRole === "\u0645\u0633\u0624\u0648\u0644" || userRole === "admin" || userRole === "manager" || userRole === "\u0645\u062F\u064A\u0631";
      const headerCanClose = req.headers["x-user-can-close-cliq"] === "true";
      const hasClosePermission = actualUser?.canCloseCliq || headerCanClose;
      if (!isAdminOrManager && !hasClosePermission) {
        return res.status(403).json({
          error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u062A\u0633\u0643\u064A\u0631 \u062D\u0648\u0627\u0644\u0627\u062A \u0643\u0644\u064A\u0643\u060C \u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0644\u062A\u0641\u0639\u064A\u0644 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062A\u0633\u0643\u064A\u0631 \u0644\u062D\u0633\u0627\u0628\u0643"
        });
      }
      const nameToUse = (closedByName || employeeName || actualUser?.name || "").trim();
      if (!nameToUse) {
        return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0627\u0644\u062A\u0633\u0643\u064A\u0631 \u0625\u062C\u0628\u0627\u0631\u064A" });
      }
      if (!patientFileNumber || !patientFileNumber.trim()) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u064A\u0636 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0622\u062E\u0631 \u0625\u062C\u0628\u0627\u0631\u064A" });
      }
      const result = await cliqService.closeTransaction(id, {
        closedByName: nameToUse,
        employeeName: nameToUse,
        patientFileNumber: patientFileNumber.trim(),
        branchId: branchId ? Number(branchId) : null,
        branchName: branchName || null,
        actualClosedBy: actualUser?.name || nameToUse,
        actualUserId: String(actualUser?.id || "")
      });
      io.emit("cliq-transaction-closed", result);
      io.emit("cliq-transaction-updated", { id, status: "CLOSED", ...result });
      io.emit("cliq-stats-updated");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u0633\u0643\u064A\u0631 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0648\u062A\u0648\u062B\u064A\u0642 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u0631\u0639 \u0648\u0627\u0644\u0645\u0648\u0638\u0641 \u0648\u0631\u0642\u0645 \u0627\u0644\u0645\u0644\u0641 \u0628\u0646\u062C\u0627\u062D",
        data: result
      });
    } catch (error) {
      console.error("[Cliq Close Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u062A\u0633\u0643\u064A\u0631 \u0627\u0644\u062D\u0648\u0627\u0644\u0629" });
    }
  });
  router2.post("/transactions/:id/provide-info", requireEmployee, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { visitNumber } = req.body;
      const actualUser = req.cliqUser;
      if (!visitNumber || !visitNumber.trim()) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0625\u062C\u0628\u0627\u0631\u064A \u0644\u062A\u0632\u0648\u064A\u062F \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A" });
      }
      const result = await cliqService.provideInformation(
        id,
        visitNumber.trim(),
        actualUser?.name || "\u0627\u0644\u0645\u0648\u0638\u0641",
        String(actualUser?.id || "EMPLOYEE")
      );
      io.emit("cliq-transaction-updated", { id, status: "INFO_PROVIDED", ...result });
      io.emit("cliq-stats-updated");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u0632\u0648\u064A\u062F \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0628\u0631\u0642\u0645 \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0628\u0646\u062C\u0627\u062D",
        data: result
      });
    } catch (error) {
      console.error("[Cliq Provide Info Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u062A\u0632\u0648\u064A\u062F \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062D\u0648\u0627\u0644\u0629" });
    }
  });
  router2.put("/transactions/:id/edit-closure", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { closedByName, patientFileNumber } = req.body;
      const editorName = String(req.cliqUser.name || "\u0627\u0644\u0645\u0633\u0624\u0648\u0644");
      if (!closedByName || !closedByName.trim()) {
        return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0630\u064A \u0633\u0643\u0651\u0631 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0625\u062C\u0628\u0627\u0631\u064A" });
      }
      if (!patientFileNumber || !patientFileNumber.trim()) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u064A\u0636 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0622\u062E\u0631 \u0625\u062C\u0628\u0627\u0631\u064A" });
      }
      const result = await cliqService.editClosure(id, closedByName, patientFileNumber, editorName);
      io.emit("cliq-transaction-updated", result);
      io.emit("cliq-stats-updated");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0633\u0643\u064A\u0631 \u0628\u0646\u062C\u0627\u062D \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644",
        data: result
      });
    } catch (error) {
      console.error("[Cliq Edit Closure Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u062A\u0639\u062F\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0633\u0643\u064A\u0631" });
    }
  });
  router2.delete("/transactions/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const adminName = String(req.cliqUser.name || "\u0627\u0644\u0645\u0633\u0624\u0648\u0644");
      const result = await cliqService.deleteTransaction(id, adminName);
      io.emit("cliq-transaction-deleted", { id });
      io.emit("cliq-stats-updated");
      res.json({
        success: true,
        message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062D\u0648\u0627\u0644\u0629 \u0627\u0644\u0628\u0646\u0643\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644",
        data: result
      });
    } catch (error) {
      console.error("[Cliq Delete Error]:", error);
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062D\u0648\u0627\u0644\u0629" });
    }
  });
  router2.get("/stats", requireEmployee, async (req, res) => {
    try {
      const { search, branchId, branchName, employeeName, startDate, endDate } = req.query;
      const stats = await cliqService.getStats({
        search,
        branchId,
        branchName,
        employeeName,
        startDate,
        endDate
      });
      res.json(stats);
    } catch (error) {
      console.error("[Cliq Stats Error]:", error);
      res.status(500).json({ error: error.message || "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A" });
    }
  });
  router2.get("/report/pdf-data", requireEmployee, async (req, res) => {
    try {
      const { branchId, branchName, employeeName, status, search, startDate, endDate } = req.query;
      const requester = req.cliqUser?.name || "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645";
      const reportData = await cliqService.getReportPdfData({
        branchId,
        branchName,
        employeeName,
        status,
        search,
        startDate,
        endDate
      }, requester);
      res.json(reportData);
    } catch (error) {
      console.error("[Cliq Report PDF Data Error]:", error);
      res.status(500).json({ error: error.message || "\u0641\u0634\u0644 \u062A\u0648\u0644\u064A\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0643\u0634\u0641" });
    }
  });
  router2.get("/devices/status", requireAdmin, async (req, res) => {
    try {
      const devices = await cliqService.getDevices();
      res.json(devices);
    } catch (error) {
      console.error("[Cliq Devices Status Error]:", error);
      res.status(500).json({ error: error.message || "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062D\u0627\u0644\u0629 \u0627\u0644\u0623\u062C\u0647\u0632\u0629" });
    }
  });
  router2.post("/devices/heartbeat", rateLimitMiddleware, deviceAuthMiddleware, async (req, res) => {
    try {
      const verifiedDevice = req.verifiedDevice;
      if (!verifiedDevice) {
        return res.status(401).json({ error: "\u0627\u0644\u062C\u0647\u0627\u0632 \u063A\u064A\u0631 \u0645\u0648\u062B\u0651\u0642" });
      }
      const deviceName = verifiedDevice.deviceName;
      const batteryLevel = req.body?.batteryLevel;
      const clientIp = req.ip || "";
      await cliqService.recordHeartbeat(deviceName, batteryLevel, clientIp);
      io.emit("cliq-device-ping", { deviceName, isOnline: true });
      res.json({ success: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router2.post("/devices/register", requireAdmin, async (req, res) => {
    try {
      const {
        deviceName = "MANZILE-ANDROID-01",
        model = "TECNO SPARK 9 PRO",
        os = "Android 12",
        bank = "ARABIISLAMI"
      } = req.body;
      const result = await cliqService.registerDevice(deviceName, model, os, bank);
      res.status(201).json({
        success: true,
        message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062C\u0647\u0627\u0632 \u0648\u062A\u0648\u0644\u064A\u062F \u0631\u0645\u0632 API \u0628\u0646\u062C\u0627\u062D",
        deviceName: result.deviceName,
        token: result.token
      });
    } catch (error) {
      res.status(500).json({ error: error.message || "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062C\u0647\u0627\u0632" });
    }
  });
  router2.get("/audit-logs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const logs = await cliqService.getAuditLogs(id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router2.post("/test-simulate-sms", requireAdmin, async (req, res) => {
    try {
      const {
        amount = 35,
        senderName = "AHLAM BAHJAT MOHAMMAD NAJEEB HAMAD",
        accountNumber = "7500*1130",
        transactionId = `TXN-${Math.floor(1e7 + Math.random() * 9e7)}`,
        customSms = ""
      } = req.body;
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ar-JO");
      const timeStr = (/* @__PURE__ */ new Date()).toLocaleTimeString("ar-JO");
      const smsBody = customSms || `\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0639\u0631\u0628\u064A \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A: \u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u062D\u0648\u0627\u0644\u0629 \u0648\u0627\u0631\u062F\u0629 \u0639\u0628\u0631 \u0643\u0644\u064A\u0643 \u0628\u0645\u0628\u0644\u063A ${amount} \u062F.\u0623 \u0625\u0644\u0649 \u0627\u0644\u062D\u0633\u0627\u0628: ${accountNumber} \u0645\u0646: ${senderName}. \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062C\u0639\u064A: ${transactionId} \u0641\u064A ${dateStr} ${timeStr}`;
      const clientIp = req.ip || "127.0.0.1";
      const transaction = await cliqService.ingestSms(
        {
          deviceId: "MANZILE-ANDROID-01",
          sender: "ARABIISLAMI",
          senderName,
          accountNumber,
          transactionId,
          amount,
          currency: "JOD",
          smsBody,
          receivedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        clientIp
      );
      io.emit("new-cliq-transaction", transaction);
      io.emit("cliq-stats-updated");
      res.json({
        success: true,
        message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0648\u0645\u062D\u0627\u0643\u0627\u062A\u0647\u0627 \u0628\u0646\u062C\u0627\u062D",
        transaction
      });
    } catch (error) {
      res.status(400).json({ error: error.message || "\u0641\u0634\u0644 \u0645\u062D\u0627\u0643\u0627\u0629 \u0627\u0644\u0631\u0633\u0627\u0644\u0629" });
    }
  });
  return router2;
}

// server.ts
var import_vite = require("vite");
var import_drizzle_orm4 = require("drizzle-orm");

// src/backend/repositories/appointment.repository.ts
var import_drizzle_orm3 = require("drizzle-orm");
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var cachedAppointments = null;
var loadFallbackAppointments = () => {
  try {
    const fallbackPath = import_path3.default.join(process.cwd(), "data_fallback/appointments.json");
    if (import_fs3.default.existsSync(fallbackPath)) {
      const data = JSON.parse(import_fs3.default.readFileSync(fallbackPath, "utf-8"));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("[AppointmentRepository] Error reading fallback appointments:", err.message);
  }
  return [];
};
var AppointmentRepository = class {
  async save(data) {
    try {
      if (!data.testId) {
        data.testId = `APT-${Date.now()}`;
      }
      const [result] = await db.insert(appointments).values(data).$returningId();
      const saved = { ...data, id: result?.id || Date.now() };
      if (cachedAppointments) {
        cachedAppointments.unshift(saved);
      }
      return saved;
    } catch (err) {
      console.warn("[AppointmentRepository] Save warning:", err.message);
      const saved = { ...data, id: data.id || Date.now() };
      if (cachedAppointments) {
        cachedAppointments.unshift(saved);
      }
      return saved;
    }
  }
  async getAll() {
    try {
      const results = await db.select().from(appointments).orderBy((0, import_drizzle_orm3.desc)(appointments.createdAt));
      if (Array.isArray(results) && results.length > 0) {
        cachedAppointments = results;
        try {
          const fallbackPath = import_path3.default.join(process.cwd(), "data_fallback/appointments.json");
          import_fs3.default.writeFileSync(fallbackPath, JSON.stringify(results, null, 2), "utf-8");
        } catch (_) {
        }
        return results;
      }
      if (cachedAppointments && cachedAppointments.length > 0) {
        return cachedAppointments;
      }
      return loadFallbackAppointments();
    } catch (err) {
      console.warn("[AppointmentRepository] Query error (using fallback):", err.message);
      if (cachedAppointments && cachedAppointments.length > 0) {
        return cachedAppointments;
      }
      return loadFallbackAppointments();
    }
  }
  async updateStatus(id, status) {
    try {
      await db.update(appointments).set({ status }).where((0, import_drizzle_orm3.eq)(appointments.id, id));
      if (cachedAppointments) {
        const item = cachedAppointments.find((a) => a.id === id);
        if (item) item.status = status;
      }
      return true;
    } catch (err) {
      console.warn("[AppointmentRepository] updateStatus warning:", err.message);
      if (cachedAppointments) {
        const item = cachedAppointments.find((a) => a.id === id);
        if (item) item.status = status;
      }
      return true;
    }
  }
  async update(id, data) {
    try {
      await db.update(appointments).set(data).where((0, import_drizzle_orm3.eq)(appointments.id, id));
      if (cachedAppointments) {
        const index = cachedAppointments.findIndex((a) => a.id === id);
        if (index !== -1) {
          cachedAppointments[index] = { ...cachedAppointments[index], ...data };
        }
      }
      return true;
    } catch (err) {
      console.warn("[AppointmentRepository] update warning:", err.message);
      if (cachedAppointments) {
        const index = cachedAppointments.findIndex((a) => a.id === id);
        if (index !== -1) {
          cachedAppointments[index] = { ...cachedAppointments[index], ...data };
        }
      }
      return true;
    }
  }
  async delete(id) {
    try {
      await db.delete(appointments).where((0, import_drizzle_orm3.eq)(appointments.id, id));
      if (cachedAppointments) {
        cachedAppointments = cachedAppointments.filter((a) => a.id !== id);
      }
      return true;
    } catch (err) {
      console.warn("[AppointmentRepository] delete warning:", err.message);
      if (cachedAppointments) {
        cachedAppointments = cachedAppointments.filter((a) => a.id !== id);
      }
      return true;
    }
  }
};

// src/backend/services/appointment.service.ts
var AppointmentDataService = class {
  constructor() {
    this.repo = new AppointmentRepository();
  }
  async getById(id) {
    const list = await this.repo.getAll();
    const searchIdStr = String(id);
    return list.find((a) => String(a.id) === searchIdStr || a.testId === searchIdStr);
  }
  async getAll() {
    const sqlAppointments = await this.repo.getAll();
    return sqlAppointments.map((dbApp) => ({
      id: dbApp.id,
      testId: dbApp.testId,
      name: dbApp.name,
      phone: dbApp.phone,
      age: dbApp.age,
      testName: dbApp.testName,
      location: dbApp.location,
      testerName: dbApp.testerName || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
      date: dbApp.date,
      time: dbApp.time,
      locationUrl: dbApp.locationUrl || "",
      status: dbApp.status || "\u062C\u062F\u064A\u062F",
      price: dbApp.price,
      amountCollected: dbApp.amountCollected,
      arrivalTime: dbApp.arrivalTime || null,
      completionTime: dbApp.completionTime || null,
      notes: dbApp.notes || "",
      requiresFasting: dbApp.requiresFasting || false,
      priceDiffReason: dbApp.priceDiffReason || "",
      attachmentUrl: dbApp.attachmentUrl || "",
      timeline: dbApp.timeline || [],
      auditTrail: dbApp.auditTrail || [],
      paymentStatus: dbApp.paymentStatus || "\u063A\u064A\u0631 \u0645\u062F\u0641\u0648\u0639",
      priority: dbApp.priority || "\u0639\u0627\u062F\u064A",
      insurance: dbApp.insurance || "\u0644\u0627 \u064A\u0648\u062C\u062F",
      paymentMethod: dbApp.paymentMethod || "\u0646\u0642\u062F\u064A",
      lastVisit: dbApp.lastVisit || "-",
      isExternalRequest: dbApp.isExternalRequest || false,
      isPendingAcceptance: dbApp.isPendingAcceptance || false,
      createdAt: dbApp.createdAt ? dbApp.createdAt instanceof Date ? dbApp.createdAt.toISOString() : new Date(dbApp.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  async save(appointmentData) {
    return await this.repo.save(appointmentData);
  }
  async updateStatus(id, status, additionalData) {
    const appt = await this.getById(id);
    if (!appt) return false;
    await this.repo.updateStatus(appt.id, status);
    const cleanData = Object.fromEntries(
      Object.entries(additionalData || {}).filter(
        ([_, value]) => value !== void 0 && value !== null && value !== ""
      )
    );
    if (Object.keys(cleanData).length > 0) {
      await this.repo.update(appt.id, cleanData);
    }
    return true;
  }
  async update(id, data) {
    const appt = await this.getById(id);
    if (!appt) return false;
    return await this.repo.update(appt.id, data);
  }
  async delete(id) {
    const appt = await this.getById(id);
    if (!appt) return false;
    await this.repo.delete(appt.id);
    return true;
  }
  async getAuditTrail() {
    const active = await this.getAll();
    const logs = [];
    active.forEach((appt) => {
      if (appt.auditTrail && Array.isArray(appt.auditTrail)) {
        appt.auditTrail.forEach((log) => {
          logs.push({
            ...log,
            appointmentId: appt.id,
            patientName: appt.name,
            testName: appt.testName,
            appointmentDate: appt.date,
            isDeleted: false
          });
        });
      }
    });
    return logs.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }
};

// server.ts
var import_http = __toESM(require("http"), 1);
var import_socket = require("socket.io");
var import_fs4 = __toESM(require("fs"), 1);
var import_crypto3 = __toESM(require("crypto"), 1);
var import_multer = __toESM(require("multer"), 1);
var appointmentService = new AppointmentDataService();
var BACKUP_FILE = import_path4.default.join(process.cwd(), "config_keys_v1.json");
var uploadStorage = import_multer.default.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, import_path4.default.join(process.cwd(), "public/uploads/external-requests"));
  },
  filename: (_req, file, cb) => {
    const ext = import_path4.default.extname(file.originalname);
    cb(null, Date.now() + "-" + import_crypto3.default.randomUUID() + ext);
  }
});
var upload = (0, import_multer.default)({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});
var DEFAULT_KEYS = {
  GOOGLE_MAPS_API_KEY: "",
  WHATSAPP_API_URL: "",
  WHATSAPP_API_KEY: "",
  WHATSAPP_API_TEMPLATE: "\u0645\u0631\u062D\u0628\u0627\u064B {\u0627\u0633\u0645_\u0627\u0644\u0645\u0631\u064A\u0636}\u060C\n\u0646\u0648\u062F \u0625\u0639\u0644\u0627\u0645\u0643 \u0628\u0623\u0646\u0647 \u062A\u0645 \u062A\u062B\u0628\u064A\u062A \u0645\u0648\u0639\u062F\u0643 \u0628\u0646\u062C\u0627\u062D \u0644\u062F\u0649 \u0645\u062E\u062A\u0628\u0631\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A \u0627\u0644\u0637\u0628\u064A\u0629.\n\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E: {\u062A\u0627\u0631\u064A\u062E_\u0627\u0644\u0645\u0648\u0639\u062F}\n\u{1F552} \u0627\u0644\u0648\u0642\u062A: \u0628\u064A\u0646 \u0627\u0644\u0633\u0627\u0639\u0629 {\u0648\u0642\u062A_\u0627\u0644\u0645\u0648\u0639\u062F}\n\u{1F4CD} \u0627\u0644\u0645\u0646\u0637\u0642\u0629: {\u0627\u0633\u0645_\u0627\u0644\u0645\u0646\u0637\u0642\u0629}\n\u{1F9EA} \u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A: {\u0642\u0627\u0626\u0645\u0629_\u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A}\n\u{1F4B0} \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u0644\u063A: {\u0625\u062C\u0645\u0627\u0644\u064A_\u0627\u0644\u0633\u0639\u0631} \u062F\u064A\u0646\u0627\u0631 \u0623\u0631\u062F\u0646\u064A.\n\n\u0646\u0634\u0643\u0631\u0643\u0645 \u0639\u0644\u0649 \u062B\u0642\u062A\u0643\u0645\u060C \u0648\u0646\u062A\u0637\u0644\u0639 \u0644\u062E\u062F\u0645\u062A\u0643\u0645. \u0645\u0639 \u062A\u0645\u0646\u064A\u0627\u062A\u0646\u0627 \u0644\u0643\u0645 \u0628\u062F\u0648\u0627\u0645 \u0627\u0644\u0635\u062D\u0629 \u0648\u0627\u0644\u0639\u0627\u0641\u064A\u0629. \u{1F33F}",
  WHATSAPP_COMPLETED_TEMPLATE: "\u0645\u0631\u062D\u0628\u0627\u064B {\u0627\u0633\u0645_\u0627\u0644\u0645\u0631\u064A\u0636}\u060C\n\u062A\u0645 \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u0645\u0646 \u0627\u0644\u0645\u0648\u0639\u062F \u0628\u0646\u062C\u0627\u062D. \u0646\u062A\u0645\u0646\u0649 \u0644\u0643\u0645 \u062F\u0648\u0627\u0645 \u0627\u0644\u0635\u062D\u0629 \u0648\u0627\u0644\u0639\u0627\u0641\u064A\u0629.",
  WHATSAPP_CANCELED_TEMPLATE: "\u0645\u0631\u062D\u0628\u0627\u064B {\u0627\u0633\u0645_\u0627\u0644\u0645\u0631\u064A\u0636}\u060C\n\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0645\u0648\u0639\u062F\u0643\u0645 \u0644\u0644\u0633\u0628\u0628 \u0627\u0644\u062A\u0627\u0644\u064A: {\u0633\u0628\u0628_\u0627\u0644\u0625\u0644\u063A\u0627\u0621}.",
  version: "v1.0.0"
};
async function getStoredKeys() {
  try {
    const records = await db.select().from(systemSettings).where((0, import_drizzle_orm4.eq)(systemSettings.key, "keys"));
    if (records.length > 0 && records[0].value) {
      const keys = JSON.parse(records[0].value);
      try {
        const currentData = import_fs4.default.existsSync(BACKUP_FILE) ? import_fs4.default.readFileSync(BACKUP_FILE, "utf-8") : null;
        const newData = JSON.stringify(keys, null, 2);
        if (currentData !== newData) {
          import_fs4.default.writeFileSync(BACKUP_FILE, newData, "utf-8");
        }
      } catch (fileErr) {
      }
      return keys;
    }
  } catch (error) {
    console.log("[SystemSettings] Using fallback keys backup file");
  }
  try {
    if (import_fs4.default.existsSync(BACKUP_FILE)) {
      const fileData = import_fs4.default.readFileSync(BACKUP_FILE, "utf-8");
      if (fileData) {
        return JSON.parse(fileData);
      }
    }
  } catch (fileErr) {
  }
  return { ...DEFAULT_KEYS };
}
async function saveStoredKeys(newKeys) {
  const dataToSave = {
    GOOGLE_MAPS_API_KEY: newKeys.GOOGLE_MAPS_API_KEY || "",
    WHATSAPP_API_URL: newKeys.WHATSAPP_API_URL || "",
    WHATSAPP_API_KEY: newKeys.WHATSAPP_API_KEY || "",
    WHATSAPP_API_TEMPLATE: newKeys.WHATSAPP_API_TEMPLATE || DEFAULT_KEYS.WHATSAPP_API_TEMPLATE,
    WHATSAPP_COMPLETED_TEMPLATE: newKeys.WHATSAPP_COMPLETED_TEMPLATE || DEFAULT_KEYS.WHATSAPP_COMPLETED_TEMPLATE,
    WHATSAPP_CANCELED_TEMPLATE: newKeys.WHATSAPP_CANCELED_TEMPLATE || DEFAULT_KEYS.WHATSAPP_CANCELED_TEMPLATE,
    version: newKeys.version || "v1.0.0",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    import_fs4.default.writeFileSync(BACKUP_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
  } catch (fileErr) {
  }
  try {
    await db.insert(systemSettings).values({ key: "keys", value: JSON.stringify(dataToSave) }).onDuplicateKeyUpdate({ set: { value: JSON.stringify(dataToSave), updatedAt: /* @__PURE__ */ new Date() } });
  } catch (err) {
    console.log("[SystemSettings] Saved keys to local fallback only");
  }
  return dataToSave;
}
var APPEARANCE_BACKUP_FILE = import_path4.default.join(process.cwd(), "config_appearance_v1.json");
var DEFAULT_APPEARANCE = {
  SYSTEM_NAME: "Alarabi Lab",
  SYSTEM_LOGO_EMOJI: "\u{1F9EA}",
  SYSTEM_LOGO_URL: "",
  SYSTEM_ACCENT: "indigo",
  SYSTEM_ROUNDED: "normal",
  SYSTEM_SIDEBAR_THEME: "light",
  SYSTEM_COMPACT_MODE: "false"
};
function handleBase64Logo(logoUrl) {
  if (logoUrl && logoUrl.startsWith("data:image/")) {
    try {
      const matches = logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        const logoPath = import_path4.default.join(process.cwd(), "logo.png");
        import_fs4.default.writeFileSync(logoPath, buffer);
        console.log("[LOGO-SAVER] Saved uploaded logo base64 to logo.png inside project files!");
        return "/logo.png";
      }
    } catch (err) {
      console.warn("[LOGO-SAVER] Failed to save uploaded logo base64:", err);
    }
  }
  return logoUrl;
}
async function getStoredAppearance() {
  try {
    const records = await db.select().from(systemSettings).where((0, import_drizzle_orm4.eq)(systemSettings.key, "appearance"));
    if (records.length > 0 && records[0].value) {
      const appearance = JSON.parse(records[0].value);
      try {
        const currentData = import_fs4.default.existsSync(APPEARANCE_BACKUP_FILE) ? import_fs4.default.readFileSync(APPEARANCE_BACKUP_FILE, "utf-8") : null;
        const newData = JSON.stringify(appearance, null, 2);
        if (currentData !== newData) {
          import_fs4.default.writeFileSync(APPEARANCE_BACKUP_FILE, newData, "utf-8");
        }
      } catch (fileErr) {
      }
      return appearance;
    }
  } catch (error) {
    console.log("[AppearanceSettings] Using fallback appearance backup file");
  }
  try {
    if (import_fs4.default.existsSync(APPEARANCE_BACKUP_FILE)) {
      const fileData = import_fs4.default.readFileSync(APPEARANCE_BACKUP_FILE, "utf-8");
      if (fileData) {
        return JSON.parse(fileData);
      }
    }
  } catch (fileErr) {
  }
  return { ...DEFAULT_APPEARANCE };
}
async function saveStoredAppearance(newAppearance) {
  const finalLogoUrl = handleBase64Logo(newAppearance.SYSTEM_LOGO_URL || "");
  const dataToSave = {
    SYSTEM_NAME: newAppearance.SYSTEM_NAME || "Alarabi Lab",
    SYSTEM_LOGO_EMOJI: newAppearance.SYSTEM_LOGO_EMOJI || "\u{1F9EA}",
    SYSTEM_LOGO_URL: finalLogoUrl,
    SYSTEM_ACCENT: newAppearance.SYSTEM_ACCENT || "indigo",
    SYSTEM_ROUNDED: newAppearance.SYSTEM_ROUNDED || "normal",
    SYSTEM_SIDEBAR_THEME: newAppearance.SYSTEM_SIDEBAR_THEME || "light",
    SYSTEM_COMPACT_MODE: newAppearance.SYSTEM_COMPACT_MODE || "false",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    import_fs4.default.writeFileSync(APPEARANCE_BACKUP_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
  } catch (fileErr) {
  }
  try {
    await db.insert(systemSettings).values({ key: "appearance", value: JSON.stringify(dataToSave) }).onDuplicateKeyUpdate({ set: { value: JSON.stringify(dataToSave), updatedAt: /* @__PURE__ */ new Date() } });
  } catch (err) {
    console.log("[AppearanceSettings] Saved appearance to local fallback only");
  }
  return dataToSave;
}
async function shouldNotifyTester(testerName, appointmentTime, appointmentDate) {
  try {
    if (appointmentDate) {
      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Amman",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(/* @__PURE__ */ new Date());
      if (appointmentDate !== todayStr) {
        return false;
      }
    }
    const [user] = await db.select().from(users).where((0, import_drizzle_orm4.eq)(users.name, testerName));
    if (!user) return true;
    if (!user.notificationStart || !user.notificationEnd) return true;
    const apptTime = appointmentTime || "";
    if (!apptTime) return true;
    const firstTimeBlock = apptTime.split("-")[0].trim();
    const parseTime = (tStr) => {
      const [h, m] = tStr.split(":").map(Number);
      return (h || 0) + (m || 0) / 60;
    };
    let aTime = parseTime(firstTimeBlock);
    if (firstTimeBlock.toLowerCase().includes("pm")) {
      const parts = firstTimeBlock.replace(/[^0-9:]/gi, "").split(":");
      let h = Number(parts[0]);
      if (h < 12) h += 12;
      aTime = h + Number(parts[1] || 0) / 60;
    } else if (firstTimeBlock.toLowerCase().includes("am")) {
      const parts = firstTimeBlock.replace(/[^0-9:]/gi, "").split(":");
      let h = Number(parts[0]);
      if (h === 12) h = 0;
      aTime = h + Number(parts[1] || 0) / 60;
    }
    const start = parseTime(user.notificationStart);
    const end = parseTime(user.notificationEnd);
    if (start <= end) {
      return aTime >= start && aTime <= end;
    } else {
      return aTime >= start || aTime <= end;
    }
  } catch (e) {
    console.error("Error checking notification window:", e);
    return true;
  }
}
async function startServer() {
  const app = (0, import_express3.default)();
  app.set("trust proxy", 1);
  app.use(
    "/uploads",
    import_express3.default.static(import_path4.default.join(process.cwd(), "public/uploads"))
  );
  const server = import_http.default.createServer(app);
  const io = new import_socket.Server(server, {
    cors: { origin: "*" }
  });
  const PORT = Number(process.env.PORT) || (process.env.NODE_ENV === "production" ? 2468 : 3e3);
  app.use((0, import_cors.default)());
  app.use(import_body_parser.default.json({ limit: "50mb" }));
  app.use(import_body_parser.default.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/ratings", async (req, res) => {
    try {
      const data = await db.select().from(ratings).orderBy((0, import_drizzle_orm4.desc)(ratings.createdAt));
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to load ratings", cause: err.cause ? err.cause.message : null });
    }
  });
  app.post("/api/ratings", async (req, res) => {
    try {
      const { patientName, stars, comment } = req.body;
      if (!patientName || !stars) {
        return res.status(400).json({ error: "Patient name and stars are required." });
      }
      const [inserted] = await db.insert(ratings).values({
        patientName,
        stars: Number(stars),
        comment: comment || ""
      }).$returningId();
      const newRating = { id: inserted.id, patientName, stars: Number(stars), comment: comment || "" };
      res.status(201).json(newRating);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to create rating" });
    }
  });
  app.put("/api/ratings/:id/response", async (req, res) => {
    try {
      const { adminResponse } = req.body;
      await db.update(ratings).set({ adminResponse }).where((0, import_drizzle_orm4.eq)(ratings.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (e) {
      console.error("Failed to update admin response:", e);
      res.status(500).json({ error: "Failed to update rating response" });
    }
  });
  app.delete("/api/ratings/:id", async (req, res) => {
    try {
      await db.delete(ratings).where((0, import_drizzle_orm4.eq)(ratings.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to delete rating" });
    }
  });
  app.use("/api/calls", calllogs_default);
  app.use("/api/cliq", createCliqRouter(io));
  app.get("/logo.png", (req, res) => {
    const logoPath = import_path4.default.join(process.cwd(), "logo.png");
    if (import_fs4.default.existsSync(logoPath)) {
      res.sendFile(logoPath);
    } else {
      res.status(404).send("Logo not found");
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", db: true });
  });
  app.get("/api/resolve-location", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }
      const coordRegex = /([-+]?\d+(?:\.\d+)?)[,\s%2C]+([-+]?\d+(?:\.\d+)?)/;
      const decodedUrl = decodeURIComponent(url);
      const immediateMatch = decodedUrl.match(coordRegex);
      if (immediateMatch) {
        const lat = parseFloat(immediateMatch[1]);
        const lng = parseFloat(immediateMatch[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          if (Math.abs(lat) > 1e-4 || Math.abs(lng) > 1e-4) {
            return res.json({ lat, lng });
          }
        }
      }
      const cleanUrl = url.trim().replace(/^[—–-]+\s*/, "").replace(/^["'<>]+|["'<>]+$/g, "");
      if (!/^https?:\/\//i.test(cleanUrl)) {
        return res.status(400).json({ error: "Invalid URL" });
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1e4);
      try {
        const headRes = await fetch(cleanUrl, {
          method: "HEAD",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        clearTimeout(timeout);
        let finalUrl = headRes.url;
        const finalMatch = finalUrl.match(coordRegex);
        if (finalMatch) {
          return res.json({ lat: parseFloat(finalMatch[1]), lng: parseFloat(finalMatch[2]), finalUrl });
        }
        const getRes = await fetch(cleanUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        finalUrl = getRes.url;
        const getMatch = finalUrl.match(coordRegex);
        if (getMatch) {
          return res.json({ lat: parseFloat(getMatch[1]), lng: parseFloat(getMatch[2]), finalUrl });
        }
        const html = await getRes.text();
        const metaRegex = /content=".*?(?:@|q=|ll=)([-+]?\d+\.\d+)[,\s%2C]([-+]?\d+\.\d+).*?"/i;
        const metaMatch = html.match(metaRegex);
        if (metaMatch) {
          return res.json({ lat: parseFloat(metaMatch[1]), lng: parseFloat(metaMatch[2]) });
        }
        res.status(404).json({ error: "Could not extract coordinates", finalUrl });
      } catch (fetchErr) {
        clearTimeout(timeout);
        console.warn("Fetch error resolving location:", fetchErr.message);
        res.status(500).json({ error: "Failed to fetch location details" });
      }
    } catch (error) {
      console.warn("Error resolving location:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      let normalizedEmail = email?.trim() || "";
      if (normalizedEmail && !normalizedEmail.includes("@")) {
        normalizedEmail = `${normalizedEmail.toLowerCase()}@manzily.com`;
      }
      let usersList = [];
      try {
        usersList = await db.select().from(users);
      } catch (dbErr) {
        console.warn("[Login] DB select users warning:", dbErr.message);
      }
      if (!usersList || usersList.length === 0) {
        try {
          const fallbackPath = import_path4.default.join(process.cwd(), "data_fallback/users.json");
          if (import_fs4.default.existsSync(fallbackPath)) {
            usersList = JSON.parse(import_fs4.default.readFileSync(fallbackPath, "utf-8"));
          }
        } catch (_) {
        }
      }
      let user = (usersList || []).find(
        (u) => (u.email?.toLowerCase() === normalizedEmail.toLowerCase() || u.name?.toLowerCase() === email?.toLowerCase() || u.email?.split("@")[0]?.toLowerCase() === email?.toLowerCase()) && u.password === password
      );
      if (!user) {
        try {
          const fallbackPath = import_path4.default.join(process.cwd(), "data_fallback/users.json");
          if (import_fs4.default.existsSync(fallbackPath)) {
            const fallbackUsers = JSON.parse(import_fs4.default.readFileSync(fallbackPath, "utf-8"));
            user = (fallbackUsers || []).find(
              (u) => (u.email?.toLowerCase() === normalizedEmail.toLowerCase() || u.name?.toLowerCase() === email?.toLowerCase() || u.email?.split("@")[0]?.toLowerCase() === email?.toLowerCase()) && u.password === password
            );
          }
        } catch (_) {
        }
      }
      if (user) {
        if (user.status !== "\u0646\u0634\u0637") {
          res.status(403).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0646\u0634\u0637" });
        } else {
          const secret = process.env.CLIQ_SESSION_SECRET || "8d1a31d0ee546c15baa2a039084873a13a17051564c3a5083dc550e9c259f887";
          if (!secret || secret.length < 32) {
            return res.status(500).json({ error: "\u0625\u0639\u062F\u0627\u062F \u062C\u0644\u0633\u0629 \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644 \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645" });
          }
          const payload = Buffer.from(JSON.stringify({
            sub: String(user.id),
            exp: Math.floor(Date.now() / 1e3) + 8 * 60 * 60
          })).toString("base64url");
          const signature = import_crypto3.default.createHmac("sha256", secret).update(payload).digest("base64url");
          res.cookie("cliq_session", `${payload}.${signature}`, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
            maxAge: 8 * 60 * 60 * 1e3
          });
          const { password: _password, ...safeUser } = user;
          res.json(safeUser);
        }
      } else {
        res.status(401).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    }
  });
  app.get("/api/notifications/pending/:testerName", async (req, res) => {
    try {
      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Amman",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(/* @__PURE__ */ new Date());
      const pending = await db.select().from(appointments).where(
        (0, import_drizzle_orm4.and)(
          (0, import_drizzle_orm4.eq)(appointments.testerName, req.params.testerName),
          (0, import_drizzle_orm4.eq)(appointments.testerNotified, false),
          (0, import_drizzle_orm4.eq)(appointments.date, todayStr)
        )
      );
      res.json(pending);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch pending notifications" });
    }
  });
  app.put("/api/appointments/:id/mark-notified", async (req, res) => {
    try {
      await db.update(appointments).set({ testerNotified: true }).where((0, import_drizzle_orm4.eq)(appointments.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to mark notified" });
    }
  });
  app.get("/api/appointments", async (req, res) => {
    try {
      const allAppointments = await appointmentService.getAll();
      res.json(allAppointments || []);
    } catch (error) {
      console.warn("[Appointments API] Error, serving fallback:", error.message);
      try {
        const fallbackPath = import_path4.default.join(process.cwd(), "data_fallback/appointments.json");
        if (import_fs4.default.existsSync(fallbackPath)) {
          return res.json(JSON.parse(import_fs4.default.readFileSync(fallbackPath, "utf-8")));
        }
      } catch (_) {
      }
      res.json([]);
    }
  });
  app.post("/api/appointments", async (req, res) => {
    try {
      console.log("REQUEST BODY:", JSON.stringify(req.body, null, 2));
      const newAppt = await appointmentService.save(req.body);
      io.emit("appointments-updated", {
        type: "created",
        appointment: newAppt
      });
      if (req.body.testerName && req.body.testerName !== "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F" && req.body.testerName !== "-") {
        const shouldNotify = await shouldNotifyTester(req.body.testerName, newAppt.time, newAppt.date);
        if (!shouldNotify) {
          await db.update(appointments).set({ testerNotified: true }).where((0, import_drizzle_orm4.eq)(appointments.id, newAppt.id));
        } else {
          io.emit("appointment-assigned", {
            testerName: req.body.testerName,
            appointment: newAppt
          });
        }
      }
      res.json(newAppt);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });
  app.post(
    "/api/patient-booking",
    upload.single("attachment"),
    async (req, res) => {
      try {
        let attachmentUrl = "";
        if (req.file) {
          attachmentUrl = `${req.protocol}://${req.get("host")}/uploads/external-requests/${req.file.filename}`;
        }
        const appointmentData = {
          name: req.body.name,
          phone: req.body.phone,
          age: parseInt(req.body.age || "0"),
          testName: req.body.testName,
          locationUrl: req.body.locationUrl,
          location: req.body.location,
          date: req.body.date,
          time: req.body.time,
          testerName: req.body.testerName,
          status: req.body.status || "\u062C\u062F\u064A\u062F",
          notes: req.body.notes || "",
          attachmentUrl,
          price: parseFloat(req.body.price || "0"),
          requiresFasting: req.body.requiresFasting === "true",
          isExternalRequest: req.body.isExternalRequest === "true",
          isPendingAcceptance: req.body.isPendingAcceptance === "true"
        };
        console.log("External Booking:", appointmentData);
        const newAppt = await appointmentService.save(appointmentData);
        io.emit("appointments-updated", {
          type: "created",
          appointment: newAppt
        });
        res.json(newAppt);
      } catch (error) {
        console.error("External booking failed:", error);
        res.status(500).json({
          error: "Failed to create external booking"
        });
      }
    }
  );
  app.post(
    "/api/upload",
    upload.single("attachment"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            error: "No file uploaded"
          });
        }
        const url = `${req.protocol}://${req.get("host")}/uploads/external-requests/${req.file.filename}`;
        res.json({
          success: true,
          url,
          fileName: req.file.filename
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({
          error: "Upload failed"
        });
      }
    }
  );
  app.put("/api/appointments/:id/status", async (req, res) => {
    try {
      const userWhoChanged = req.body.user || "\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0646\u0638\u0627\u0645";
      const notes = req.body.notes;
      const amountCollected = req.body.amountCollected;
      const paymentMethod = req.body.paymentMethod;
      const priceDiffReason = req.body.priceDiffReason;
      const updatedAppt = await appointmentService.updateStatus(req.params.id, req.body.status, { notes, amountCollected, paymentMethod, priceDiffReason });
      io.emit("appointments-updated", {
        type: "updated",
        appointment: updatedAppt
      });
      res.json(updatedAppt);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: "Failed to update appointment status" });
    }
  });
  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const data = { ...req.body };
      delete data.id;
      delete data.createdAt;
      if (data.age !== void 0) data.age = parseInt(data.age) || 0;
      if (data.price !== void 0) data.price = parseFloat(data.price) || 0;
      const [existingAppt] = await db.select().from(appointments).where((0, import_drizzle_orm4.eq)(appointments.id, Number(req.params.id)));
      let shouldNotify = false;
      if (data.testerName && data.testerName !== "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F" && data.testerName !== "-" && (!existingAppt || existingAppt.testerName !== data.testerName)) {
        shouldNotify = await shouldNotifyTester(data.testerName, data.time || existingAppt?.time, data.date || existingAppt?.date);
        data.testerNotified = !shouldNotify;
      }
      const updatedAppt = await appointmentService.update(req.params.id, data);
      io.emit("appointments-updated", {
        type: "updated",
        appointment: updatedAppt
      });
      if (shouldNotify && data.testerNotified === false) {
        io.emit("appointment-assigned", {
          testerName: data.testerName,
          appointment: { ...existingAppt, ...data, id: req.params.id }
        });
      }
      res.json(updatedAppt);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });
  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const deletedBy = req.body?.deletedBy || "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0646\u0638\u0627\u0645";
      await appointmentService.delete(req.params.id);
      io.emit("appointments-updated", {
        type: "deleted",
        appointmentId: req.params.id
      });
      res.json({ success: true });
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });
  app.get("/api/audit-trail", async (req, res) => {
    try {
      const auditTrail = await appointmentService.getAuditTrail();
      res.json(auditTrail);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: "Failed to fetch audit trail logs" });
    }
  });
  app.get("/api/missed-calls", async (req, res) => {
    res.json([]);
  });
  app.get("/api/users", async (req, res) => {
    try {
      let dbUsers = [];
      try {
        dbUsers = await db.select().from(users);
      } catch (err) {
        console.warn("[Users API] DB query warning:", err.message);
      }
      if (!dbUsers || dbUsers.length === 0) {
        const fallbackPath = import_path4.default.join(process.cwd(), "data_fallback/users.json");
        if (import_fs4.default.existsSync(fallbackPath)) {
          dbUsers = JSON.parse(import_fs4.default.readFileSync(fallbackPath, "utf-8"));
        }
      }
      res.json((dbUsers || []).map(({ password, ...safeUser }) => safeUser));
    } catch (error) {
      console.error(error);
      res.json([]);
    }
  });
  app.post("/api/users", async (req, res) => {
    const userData = req.body;
    const email = userData.email?.toLowerCase().trim();
    const id = userData.id || import_crypto3.default.randomUUID();
    const cleanData = {
      id,
      name: userData.name,
      email,
      phone: userData.phone,
      role: userData.role,
      status: userData.status,
      governorate: userData.governorate || "\u0643\u0644 \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0627\u062A",
      shift: userData.shift || "\u0643\u0644\u0627\u0647\u0645\u0627",
      ammanSector: userData.ammanSector || "\u0643\u0644\u0627\u0647\u0645\u0627",
      dailyLimit: userData.dailyLimit ? parseInt(userData.dailyLimit) : null,
      notificationStart: userData.notificationStart || null,
      notificationEnd: userData.notificationEnd || null,
      canCloseCliq: userData.canCloseCliq !== void 0 ? Boolean(userData.canCloseCliq) : false
    };
    try {
      if (userData.id) {
        const updateData = {
          ...cleanData,
          ...userData.password ? { password: userData.password } : {}
        };
        await db.update(users).set(updateData).where((0, import_drizzle_orm4.eq)(users.id, userData.id));
      } else {
        if (!userData.password) {
          return res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062C\u062F\u064A\u062F" });
        }
        await db.insert(users).values({ createdAt: /* @__PURE__ */ new Date(), ...cleanData, password: userData.password });
      }
      try {
        const fallbackPath = import_path4.default.join(process.cwd(), "data_fallback/users.json");
        if (import_fs4.default.existsSync(fallbackPath)) {
          const list = JSON.parse(import_fs4.default.readFileSync(fallbackPath, "utf-8"));
          const idx = list.findIndex((u) => String(u.id) === String(id));
          const fullUserObj = { ...cleanData, password: userData.password || (idx >= 0 ? list[idx].password : "") };
          if (idx >= 0) {
            list[idx] = fullUserObj;
          } else {
            list.push(fullUserObj);
          }
          import_fs4.default.writeFileSync(fallbackPath, JSON.stringify(list, null, 2), "utf-8");
        }
      } catch (_) {
      }
      res.json({ success: true, id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to save user" });
    }
  });
  app.delete("/api/users/:id", async (req, res) => {
    try {
      await db.delete(users).where((0, import_drizzle_orm4.eq)(users.id, req.params.id));
      try {
        const fallbackPath = import_path4.default.join(process.cwd(), "data_fallback/users.json");
        if (import_fs4.default.existsSync(fallbackPath)) {
          const list = JSON.parse(import_fs4.default.readFileSync(fallbackPath, "utf-8"));
          const filtered = list.filter((u) => String(u.id) !== String(req.params.id));
          import_fs4.default.writeFileSync(fallbackPath, JSON.stringify(filtered, null, 2), "utf-8");
        }
      } catch (_) {
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app.get("/api/examinations", async (req, res) => {
    try {
      let list = [];
      try {
        list = await db.select().from(examinations);
      } catch (err) {
        console.warn("[Examinations API] DB query warning:", err.message);
      }
      if (!list || list.length === 0) {
        const fallbackPath = import_path4.default.join(process.cwd(), "data_fallback/examinations.json");
        if (import_fs4.default.existsSync(fallbackPath)) {
          list = JSON.parse(import_fs4.default.readFileSync(fallbackPath, "utf-8"));
        }
      }
      res.json(list || []);
    } catch (error) {
      console.error(error);
      res.json([]);
    }
  });
  app.post("/api/examinations", async (req, res) => {
    const examData = req.body;
    const id = examData.id;
    const cleanData = {
      name: examData.name,
      price: parseFloat(examData.price) || 0,
      notes: examData.notes || "",
      requiresFasting: examData.requiresFasting || false,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      if (id) {
        await db.update(examinations).set(cleanData).where((0, import_drizzle_orm4.eq)(examinations.id, id));
        res.json({ success: true, id });
      } else {
        const newId = import_crypto3.default.randomUUID();
        await db.insert(examinations).values({
          id: newId,
          ...cleanData,
          createdAt: /* @__PURE__ */ new Date(),
          notes: null
        });
        res.json({ success: true, id: newId });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to save examination" });
    }
  });
  app.post("/api/examinations/bulk", async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Expected array of examinations" });
    }
    const values = list.filter((item) => item.name).map((item) => ({
      id: import_crypto3.default.randomUUID(),
      name: item.name,
      price: parseFloat(item.price) || 0,
      notes: item.notes || "",
      requiresFasting: item.requiresFasting || false
    }));
    try {
      if (values.length > 0) {
        for (const exam of values) {
          const exists = await db.select().from(examinations).where((0, import_drizzle_orm4.eq)(examinations.name, exam.name)).limit(1);
          if (exists.length === 0) {
            await db.insert(examinations).values(exam);
          }
        }
      }
      res.json({ success: true, count: list.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to import examinations" });
    }
  });
  app.delete("/api/examinations/all", async (req, res) => {
    try {
      await db.delete(examinations);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to delete all examinations" });
    }
  });
  app.delete("/api/examinations/:id", async (req, res) => {
    try {
      await db.delete(examinations).where((0, import_drizzle_orm4.eq)(examinations.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to delete examination" });
    }
  });
  app.get("/api/regions", async (req, res) => {
    try {
      let list = await db.select().from(regionConfigs);
      res.json(list);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to load regions" });
    }
  });
  app.post("/api/regions", async (req, res) => {
    const regionData = req.body;
    const id = regionData.id;
    const cleanData = {
      governorate: regionData.governorate,
      shift: regionData.shift,
      regionName: regionData.regionName?.trim(),
      timeFrom: regionData.timeFrom || "08:00",
      timeTo: regionData.timeTo || "12:00",
      fridayTimeFrom: regionData.fridayTimeFrom || "08:00",
      fridayTimeTo: regionData.fridayTimeTo || "12:00",
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (regionData.governorate === "\u0639\u0645\u0627\u0646") {
      cleanData.ammanSector = regionData.ammanSector || "\u063A\u0631\u0628\u064A\u0629";
    } else {
      cleanData.ammanSector = null;
    }
    try {
      if (id) {
        await db.update(regionConfigs).set(cleanData).where((0, import_drizzle_orm4.eq)(regionConfigs.id, parseInt(id)));
        res.json({ success: true, id });
      } else {
        const [inserted] = await db.insert(regionConfigs).values({
          ...cleanData,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          fridayTimeFrom: cleanData.fridayTimeFrom || null,
          fridayTimeTo: cleanData.fridayTimeTo || null
        }).$returningId();
        const result = { id: inserted.id };
        res.json({ success: true, id: result.id });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to save region config" });
    }
  });
  app.post("/api/regions/bulk", async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Expected array of regions" });
    }
    let count = 0;
    const insertedItems = [];
    try {
      for (const item of list) {
        if (!item.regionName || !item.governorate) continue;
        const governorate = item.governorate.trim();
        const regionName = item.regionName.trim();
        const shift = item.shift === "\u0645\u0633\u0627\u0626\u064A" || item.shift === "evening" ? "\u0645\u0633\u0627\u0626\u064A" : "\u0635\u0628\u0627\u062D\u064A";
        let ammanSector = null;
        if (governorate === "\u0639\u0645\u0627\u0646") {
          const s = item.ammanSector ? item.ammanSector.trim() : "";
          ammanSector = s.includes("\u0634\u0631\u0642") ? "\u0634\u0631\u0642\u064A\u0629" : "\u063A\u0631\u0628\u064A\u0629";
        }
        const timeFrom = item.timeFrom || (shift === "\u0635\u0628\u0627\u062D\u064A" ? "08:00" : "14:00");
        const timeTo = item.timeTo || (shift === "\u0635\u0628\u0627\u062D\u064A" ? "12:00" : "18:00");
        const fridayTimeFrom = item.fridayTimeFrom || item["Friday Time From"] || timeFrom;
        const fridayTimeTo = item.fridayTimeTo || item["Friday Time To"] || timeTo;
        try {
          await db.insert(regionConfigs).values({
            governorate,
            shift,
            regionName,
            timeFrom,
            timeTo,
            fridayTimeFrom,
            fridayTimeTo,
            ammanSector,
            createdAt: /* @__PURE__ */ new Date()
          });
        } catch (dbErr) {
          insertedItems.push({
            governorate,
            shift,
            regionName,
            timeFrom,
            timeTo,
            fridayTimeFrom,
            fridayTimeTo,
            ammanSector,
            createdAt: /* @__PURE__ */ new Date()
          });
        }
        count++;
      }
      res.json({ success: true, count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to import regions" });
    }
  });
  app.delete("/api/regions/all", async (req, res) => {
    try {
      await db.delete(regionConfigs);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to delete all region configs" });
    }
  });
  app.delete("/api/regions/:id", async (req, res) => {
    try {
      await db.delete(regionConfigs).where((0, import_drizzle_orm4.eq)(regionConfigs.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to delete region config" });
    }
  });
  app.get("/api/appearance", async (req, res) => {
    try {
      const appearance = await getStoredAppearance();
      res.json(appearance);
    } catch (err) {
      res.status(500).json({ error: "Failed to retrieve appearance settings" });
    }
  });
  app.post("/api/appearance", async (req, res) => {
    try {
      const saved = await saveStoredAppearance(req.body);
      res.json({ success: true, appearance: saved });
    } catch (err) {
      res.status(500).json({ error: "Failed to save appearance settings" });
    }
  });
  app.get("/api/keys/google-maps", async (req, res) => {
    try {
      const keys = await getStoredKeys();
      res.json({ key: keys.GOOGLE_MAPS_API_KEY || "" });
    } catch (err) {
      res.status(500).json({ error: "Failed to retrieve Google Maps key" });
    }
  });
  app.get("/api/keys", async (req, res) => {
    try {
      const keys = await getStoredKeys();
      res.json(keys);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch keys" });
    }
  });
  app.post("/api/keys", async (req, res) => {
    try {
      const saved = await saveStoredKeys(req.body);
      res.json({ success: true, keys: saved });
    } catch (err) {
      res.status(500).json({ error: "Failed to save keys" });
    }
  });
  app.get("/api/keys/download", async (req, res) => {
    try {
      const keys = await getStoredKeys();
      const filename = `health_lis_keys_${keys.version || "v1"}.json`;
      res.setHeader("Content-disposition", `attachment; filename=${filename}`);
      res.setHeader("Content-type", "application/json");
      res.send(JSON.stringify(keys, null, 2));
    } catch (err) {
      res.status(500).json({ error: "Failed to download keys file" });
    }
  });
  app.post("/api/keys/import", async (req, res) => {
    try {
      const { GOOGLE_MAPS_API_KEY, WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_API_TEMPLATE, version } = req.body;
      const importedKeys = {
        GOOGLE_MAPS_API_KEY,
        WHATSAPP_API_URL,
        WHATSAPP_API_KEY,
        WHATSAPP_API_TEMPLATE,
        version: version || "v1.0.0"
      };
      const saved = await saveStoredKeys(importedKeys);
      res.json({ success: true, keys: saved });
    } catch (err) {
      res.status(500).json({ error: "Failed to import keys" });
    }
  });
  app.post("/api/keys/send-whatsapp", async (req, res) => {
    try {
      const {
        phone,
        name,
        date,
        time,
        region,
        price,
        exams,
        attachmentUrl,
        status
      } = req.body;
      const keys = await getStoredKeys();
      const waUrl = keys.WHATSAPP_API_URL;
      const waKey = keys.WHATSAPP_API_KEY;
      let waTemplate = keys.WHATSAPP_API_TEMPLATE;
      if (req.body.status === "\u0645\u0643\u062A\u0645\u0644") {
        waTemplate = keys.WHATSAPP_COMPLETED_TEMPLATE || keys.WHATSAPP_API_TEMPLATE;
      } else if (req.body.status === "\u0645\u0644\u063A\u064A") {
        waTemplate = keys.WHATSAPP_CANCELED_TEMPLATE || keys.WHATSAPP_API_TEMPLATE;
      }
      if (!waUrl || !waKey) {
        return res.status(400).json({ error: "WhatsApp integration is not configured on the server." });
      }
      let messageText = `\u0645\u0631\u062D\u0628\u064B\u0627 ${name} \u{1F44B}

\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0648\u062A\u062B\u0628\u064A\u062A \u0645\u0648\u0639\u062F\u0643\u0645 \u0644\u0644\u0633\u062D\u0628 \u0627\u0644\u0645\u0646\u0632\u0644\u064A \u0644\u062F\u0649
\u{1F3E5} \u0645\u062E\u062A\u0628\u0631\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A \u0627\u0644\u0637\u0628\u064A\u0629

\u{1F4C5} \u0627\u0644\u062A\u0627\u0631\u064A\u062E:
${date}

\u{1F552} \u0645\u0648\u0639\u062F \u0627\u0644\u0632\u064A\u0627\u0631\u0629:
${time}

\u{1F4CD} \u0627\u0644\u0645\u0646\u0637\u0642\u0629:
${region}

\u{1F9EA} \u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629:
${exams}

\u{1F4B0} \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u0644\u063A:
${price} \u062F.\u0623

\u2728 \u0646\u0631\u062C\u0648 \u0645\u0646\u0643\u0645 \u0627\u0644\u062A\u0648\u0627\u062C\u062F \u0641\u064A \u0627\u0644\u0645\u0648\u0639\u062F \u0627\u0644\u0645\u062D\u062F\u062F \u0644\u0636\u0645\u0627\u0646 \u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u062E\u062F\u0645\u0629 \u0628\u0623\u0641\u0636\u0644 \u062C\u0648\u062F\u0629.

\u{1F4DE} \u0644\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0623\u0648 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0648\u0639\u062F \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627.

\u{1F33F} \u0634\u0643\u0631\u0627\u064B \u0644\u0627\u062E\u062A\u064A\u0627\u0631\u0643\u0645 \u0645\u062E\u062A\u0628\u0631\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A \u0627\u0644\u0637\u0628\u064A\u0629.
\u0646\u062A\u0645\u0646\u0649 \u0644\u0643\u0645 \u062F\u0648\u0627\u0645 \u0627\u0644\u0635\u062D\u0629 \u0648\u0627\u0644\u0639\u0627\u0641\u064A\u0629.`;
      if (req.body.requiresFasting) {
        messageText += "\n\n*\u0645\u0644\u0627\u062D\u0638\u0629 \u0647\u0627\u0645\u0629:* \u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u062A\u062A\u0637\u0644\u0628 \u0635\u064A\u0627\u0645.";
      }
      let formattedPhone = (phone || "").trim();
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "962" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("962") && !formattedPhone.startsWith("+")) {
        formattedPhone = "962" + formattedPhone;
      }
      if (formattedPhone.startsWith("+")) {
        formattedPhone = formattedPhone.substring(1);
      }
      console.log(`Sending WhatsApp message to ${formattedPhone} via server-side proxy...`);
      let templateName = "appointment_confirmed";
      let parameters = [];
      if (status === "\u0645\u0643\u062A\u0645\u0644") {
        templateName = "appointment_completedd";
        parameters = [
          { type: "text", text: name || "" },
          { type: "text", text: "https://manzile.alarabilab.com/rating" }
        ];
      } else if (status === "\u0645\u0644\u063A\u064A") {
        templateName = "appointment_cancelled";
        parameters = [
          { type: "text", text: name || "" },
          { type: "text", text: req.body.cancelReason || "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0645\u0648\u0639\u062F." }
        ];
      } else {
        parameters = [
          { type: "text", text: name || "" },
          { type: "text", text: date || "" },
          { type: "text", text: time || "" },
          { type: "text", text: region || "" },
          {
            type: "text",
            text: exams && exams.trim() !== "" ? exams : "\u0644\u0627 \u064A\u0648\u062C\u062F \u0641\u062D\u0648\u0635\u0627\u062A \u0645\u0636\u0627\u0641\u0629"
          },
          {
            type: "text",
            text: attachmentUrl && attachmentUrl.trim() !== "" ? attachmentUrl : "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0631\u0641\u0642"
          },
          {
            type: "text",
            text: String(price || "0")
          },
          {
            type: "text",
            text: req.body.requiresFasting ? "\u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u062A\u062A\u0637\u0644\u0628 \u0635\u064A\u0627\u0645 \u0645\u0646 10 \u0625\u0644\u0649 12 \u0633\u0627\u0639\u0629 (\u064A\u0633\u0645\u062D \u0628\u0634\u0631\u0628 \u0627\u0644\u0645\u0627\u0621 \u0641\u0642\u0637)." : "\u0644\u0627 \u064A\u0648\u062C\u062F \u0634\u0631\u0648\u0637 \u0645\u0633\u0628\u0642\u0629 (\u0644\u0627 \u064A\u0634\u062A\u0631\u0637 \u0627\u0644\u0635\u064A\u0627\u0645)."
          }
        ];
      }
      const payload = {
        recipient_number: formattedPhone,
        platform: "whatsapp",
        message_object: {
          type: "template",
          content: {
            name: templateName,
            language: {
              code: "ar"
            },
            components: [
              {
                type: "body",
                parameters
              }
            ]
          }
        }
      };
      console.log("===== WHATSAPP PAYLOAD =====");
      console.log("Message Text:");
      console.log(messageText);
      console.log("Payload:");
      console.log(JSON.stringify(payload, null, 2));
      const postData = "json_data=" + encodeURIComponent(JSON.stringify(payload));
      const response = await fetch(waUrl, {
        method: "POST",
        headers: {
          "Authorization": waKey.startsWith("Bearer ") ? waKey : `Bearer ${waKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: postData
      });
      const responseText = await response.text();
      console.log("WhatsApp proxy response:", responseText);
      res.json({ success: true, response: responseText });
    } catch (err) {
      console.warn("WhatsApp proxy failed:", err);
      res.status(500).json({ error: err.message || "Failed to send WhatsApp message via proxy" });
    }
  });
  if (process.env.NODE_ENV === "production") {
    const distPath = import_path4.default.join(process.cwd(), "dist");
    if (import_fs4.default.existsSync(distPath)) {
      app.use(import_express3.default.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(import_path4.default.join(distPath, "index.html"));
      });
      console.log("[Production] Serving static files from dist");
    } else {
      console.warn("[Production] Warning: dist folder not found! Frontend might not be served.");
    }
  } else {
    console.log("[Development] Starting Vite middleware...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const activePhlebotomists = /* @__PURE__ */ new Map();
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.emit("phlebotomists-update", Array.from(activePhlebotomists.values()));
    socket.on("update-location", (data) => {
      activePhlebotomists.set(data.id, {
        ...data,
        socketId: socket.id,
        isOffline: false,
        lastUpdate: Date.now()
      });
      io.emit("phlebotomists-update", Array.from(activePhlebotomists.values()));
    });
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      let changed = false;
      activePhlebotomists.forEach((p, key) => {
        if (p.socketId === socket.id) {
          p.isOffline = true;
          p.status = "\u063A\u064A\u0631 \u0645\u062A\u0635\u0644";
          p.badgeClass = "bg-slate-50 text-slate-600 border-slate-200";
          changed = true;
        }
      });
      if (changed) {
        io.emit("phlebotomists-update", Array.from(activePhlebotomists.values()));
      }
    });
  });
  setInterval(() => {
    let changed = false;
    const now = Date.now();
    activePhlebotomists.forEach((p, key) => {
      if (!p.isOffline && now - p.lastUpdate > 6e4) {
        p.isOffline = true;
        p.status = "\u063A\u064A\u0631 \u0645\u062A\u0635\u0644";
        p.badgeClass = "bg-slate-50 text-slate-600 border-slate-200";
        changed = true;
      }
    });
    if (changed) {
      io.emit("phlebotomists-update", Array.from(activePhlebotomists.values()));
    }
  }, 3e4);
  const ensureColumnExists = async (table, column, columnDef) => {
    try {
      const res = await db.execute(import_drizzle_orm4.sql.raw(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}';`));
      const cols = res && res[0] ? Array.isArray(res[0]) ? res[0] : [res[0]] : Array.isArray(res) ? res : [];
      if (!cols || cols.length === 0) {
        await db.execute(import_drizzle_orm4.sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN IF NOT EXISTS \`${column}\` ${columnDef};`));
        console.log(`[DB Migration] Added ${column} to ${table}`);
      }
    } catch (e) {
    }
  };
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  (async () => {
    try {
      await ensureColumnExists("ratings", "admin_response", "TEXT");
      await ensureColumnExists("appointments", "tester_notified", "BOOLEAN DEFAULT FALSE");
      await ensureColumnExists("users", "notification_start", "VARCHAR(50)");
      await ensureColumnExists("users", "notification_end", "VARCHAR(50)");
      await ensureColumnExists("users", "can_close_cliq", "BOOLEAN DEFAULT FALSE");
      await ensureColumnExists("cliq_transactions", "closed_by_name", "VARCHAR(255) NULL");
      await ensureColumnExists("cliq_transactions", "patient_file_number", "VARCHAR(100) NULL");
      await ensureColumnExists("cliq_transactions", "closed_at", "TIMESTAMP NULL");
      await ensureColumnExists("cliq_transactions", "account_number", "VARCHAR(100) NULL");
      await ensureColumnExists("cliq_transactions", "branch_id", "INT NULL");
      await ensureColumnExists("cliq_transactions", "branch_name", "VARCHAR(150) NULL");
      await ensureColumnExists("cliq_transactions", "employee_name", "VARCHAR(255) NULL");
      await ensureColumnExists("cliq_transactions", "actual_closed_by", "VARCHAR(255) NULL");
      await ensureColumnExists("cliq_transactions", "visit_number", "VARCHAR(100) NULL");
      await ensureColumnExists("cliq_transactions", "info_provided_at", "TIMESTAMP NULL");
      await ensureColumnExists("cliq_transactions", "info_provided_by", "VARCHAR(255) NULL");
      await db.execute(import_drizzle_orm4.sql.raw(`
        CREATE TABLE IF NOT EXISTS cliq_branches (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          cliq_branch_name VARCHAR(100) NOT NULL,
          responsible_employee_name TEXT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT '\u0646\u0634\u0637',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `));
      await db.execute(import_drizzle_orm4.sql.raw(`
        CREATE TABLE IF NOT EXISTS cliq_devices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_name VARCHAR(100) NOT NULL UNIQUE,
          device_model VARCHAR(100) DEFAULT 'TECNO SPARK 9 PRO',
          os_version VARCHAR(50) DEFAULT 'Android 12',
          device_token_hash VARCHAR(128) NOT NULL,
          bank_sender VARCHAR(100) NOT NULL DEFAULT 'ARABIISLAMI',
          status VARCHAR(50) NOT NULL DEFAULT '\u0646\u0634\u0637',
          last_seen_at TIMESTAMP NULL,
          last_sms_at TIMESTAMP NULL,
          messages_count INT DEFAULT 0,
          failed_count INT DEFAULT 0,
          battery_level INT NULL,
          ip_address VARCHAR(50) NULL,
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `));
      await db.execute(import_drizzle_orm4.sql.raw(`
        CREATE TABLE IF NOT EXISTS cliq_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          transaction_id VARCHAR(100) NULL,
          sender_name VARCHAR(255) NULL,
          sender_phone VARCHAR(50) NULL,
          amount DOUBLE NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'JOD',
          bank_sender VARCHAR(100) NOT NULL DEFAULT 'ARABIISLAMI',
          sms_body TEXT NOT NULL,
          received_at TIMESTAMP NULL,
          server_received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          device_id VARCHAR(100) NOT NULL DEFAULT 'MANZILE-ANDROID-01',
          status VARCHAR(50) NOT NULL DEFAULT '\u062C\u062F\u064A\u062F\u0629',
          matched_appointment_id INT NULL,
          reviewed_by VARCHAR(255) NULL,
          reviewed_at TIMESTAMP NULL,
          duplicate_hash VARCHAR(64) NOT NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_txn_id (transaction_id),
          INDEX idx_dup_hash (duplicate_hash),
          INDEX idx_status (status),
          INDEX idx_matched_appt (matched_appointment_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `));
      await db.execute(import_drizzle_orm4.sql.raw(`
        CREATE TABLE IF NOT EXISTS cliq_audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          transaction_id INT NULL,
          user_id VARCHAR(255) NULL,
          user_name VARCHAR(255) NULL,
          action VARCHAR(100) NOT NULL,
          old_value JSON NULL,
          new_value JSON NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_audit_txn (transaction_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `));
    } catch (err) {
      console.warn("[DB Migration] Background schema update notice:", err.message);
    }
  })();
}
startServer();
//# sourceMappingURL=server.cjs.map
