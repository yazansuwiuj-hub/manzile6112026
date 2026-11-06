import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '../../src/db';
import { cliqTransactions, cliqDevices, cliqAuditLogs, cliqBranches } from '../../src/db/schema';
import { eq, desc, asc, and, or, sql, gte, lte, like, inArray } from 'drizzle-orm';

const FALLBACK_BRANCHES_PATH = path.join(process.cwd(), 'data_fallback/cliq_branches.json');

const readFallbackBranches = (): any[] => {
  try {
    if (fs.existsSync(FALLBACK_BRANCHES_PATH)) {
      return JSON.parse(fs.readFileSync(FALLBACK_BRANCHES_PATH, 'utf-8'));
    }
  } catch (err: any) {
    console.warn('[CliqService] Error reading fallback branches:', err.message);
  }
  return [];
};

const saveFallbackBranches = (branches: any[]) => {
  try {
    fs.writeFileSync(FALLBACK_BRANCHES_PATH, JSON.stringify(branches, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[CliqService] Error writing fallback branches:', err.message);
  }
};

export interface SmsPayload {
  deviceId: string;
  sender?: string;
  senderName?: string | null;
  accountNumber?: string | null;
  transactionId?: string | null;
  amount?: number | null;
  currency?: string;
  smsBody: string;
  receivedAt?: string;
  receivedPhone?: string;
}

export interface CliqFilterOptions {
  search?: string;
  status?: string; // 'all' | 'NEW' | 'INFO_PROVIDED' | 'CLOSED'
  branchId?: number | string;
  branchName?: string;
  employeeName?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export class CliqService {
  /**
   * Hashes a device token using SHA-256
   */
  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Computes an idempotency / duplicate hash for incoming SMS
   */
  public computeDuplicateHash(
    sender: string,
    transactionId: string | null | undefined,
    amount: number | null | undefined,
    receivedAt: string | null | undefined,
    smsBody: string
  ): string {
    const normBody = smsBody.replace(/\s+/g, ' ').trim();
    const raw = `${sender || 'ARABIISLAMI'}_${transactionId || ''}_${amount || ''}_${receivedAt || ''}_${normBody}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Verifies if a given device token matches an active device
   */
  public async verifyDeviceToken(token: string): Promise<any | null> {
    if (!token) return null;
    const tokenHash = this.hashToken(token);
    try {
      const records = await db
        .select()
        .from(cliqDevices)
        .where(and(eq(cliqDevices.deviceTokenHash, tokenHash), eq(cliqDevices.status, 'نشط')))
        .limit(1);

      return records.length > 0 ? records[0] : null;
    } catch (e: any) {
      console.error('[CliqService] Error verifying device token:', e.message);
      return null;
    }
  }

  /**
   * Parses SMS body to extract bank transfer details.
   */
  public parseSms(
    smsBody: string,
    explicitData?: Partial<{ 
      amount: number | null; 
      transactionId: string | null; 
      senderName: string | null; 
      accountNumber: string | null;
      bank: string 
    }>
  ) {
    // 1. Strict Security Guard: Never process OTP or Verification passwords
    const otpRegex = /(?:رمز\s*التحقق|كلمة\s*المرور\s*لمرة\s*واحدة|\botp\b|verification\s*code|activation\s*code|passcode)/i;
    if (otpRegex.test(smsBody)) {
      throw new Error('لا يتم قبول رسائل رموز التحقق أو كلمات المرور البنكية لضمان الأمان والخصوصية');
    }

    let amount: number | null = explicitData?.amount !== undefined ? explicitData.amount : null;
    let transactionId: string | null = explicitData?.transactionId || null;
    let senderName: string | null = explicitData?.senderName || null;
    let accountNumber: string | null = explicitData?.accountNumber || null;

    const cleanBody = smsBody.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

    // 2. Extract Amount if not explicitly provided
    if (amount === null || isNaN(amount)) {
      const amountRegexes = [
        /(?:حوالة\s*واردة\s*(?:بقيمة|بمبلغ)?|وردتك\s*حوالة\s*(?:بقيمة|بمبلغ)?|استلمت\s*(?:مبلغ)?|بمبلغ|بقيمة|Amount:?)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:د\.?أ|JOD|دينار)/i,
        /([0-9]+(?:\.[0-9]+)?)\s*(?:د\.?أ|JOD|دينار)/i,
        /(?:د\.?أ|JOD|دينار)\s*([0-9]+(?:\.[0-9]+)?)/i,
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

    // 3. Extract Transaction Reference if not explicitly provided
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

    // 4. Extract Sender Name if not explicitly provided
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

    // 5. Extract Account Number if not explicitly provided
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
      accountNumber = '7500*1130';
    }

    return {
      amount,
      transactionId,
      senderName,
      accountNumber,
      status: 'NEW'
    };
  }

  /**
   * Ingests an incoming SMS from the Android device
   */
  public async ingestSms(payload: SmsPayload, clientIp?: string) {
    const {
      deviceId,
      sender = 'ARABIISLAMI',
      smsBody,
      receivedAt,
      receivedPhone
    } = payload;

    if (!smsBody || !smsBody.trim()) {
      throw new Error('نص الرسالة فارغ');
    }

    // Parse SMS
    const parsed = this.parseSms(smsBody, {
      amount: payload.amount,
      transactionId: payload.transactionId,
      senderName: payload.senderName,
      accountNumber: payload.accountNumber
    });

    // Compute duplicate hash
    const duplicateHash = this.computeDuplicateHash(
      sender,
      parsed.transactionId,
      parsed.amount,
      receivedAt,
      smsBody
    );

    // Check for duplicates
    let finalStatus = 'NEW';
    let duplicateReason: string | null = null;

    if (parsed.transactionId) {
      const existingByTxn = await db
        .select()
        .from(cliqTransactions)
        .where(eq(cliqTransactions.transactionId, parsed.transactionId))
        .limit(1);

      if (existingByTxn.length > 0) {
        finalStatus = 'NEW';
        duplicateReason = `رقم العملية البنكية (${parsed.transactionId}) مسجل مسبقاً في النظام`;
      }
    }

    if (!duplicateReason) {
      const existingByHash = await db
        .select()
        .from(cliqTransactions)
        .where(eq(cliqTransactions.duplicateHash, duplicateHash))
        .limit(1);

      if (existingByHash.length > 0) {
        finalStatus = 'NEW';
        duplicateReason = 'تم استلام نفس الرسالة مسبقاً بنفس التوقيت والبيانات';
      }
    }

    const phoneDate = receivedAt ? new Date(receivedAt) : new Date();
    const validReceivedAt = !isNaN(phoneDate.getTime()) ? phoneDate : new Date();

    const insertData = {
      transactionId: parsed.transactionId,
      senderName: parsed.senderName,
      senderPhone: receivedPhone || null,
      accountNumber: parsed.accountNumber || '7500*1130',
      amount: parsed.amount,
      currency: payload.currency || 'JOD',
      bankSender: sender || 'ARABIISLAMI',
      smsBody: smsBody.trim(),
      receivedAt: validReceivedAt,
      deviceId: deviceId || 'MANZILE-ANDROID-01',
      status: finalStatus,
      duplicateHash,
      notes: duplicateReason,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [insertResult] = await db.insert(cliqTransactions).values(insertData as any).$returningId();
    const newTransactionId = insertResult.id;

    // Update device stats
    try {
      await db
        .update(cliqDevices)
        .set({
          lastSeenAt: new Date(),
          lastSmsAt: new Date(),
          messagesCount: sql`messages_count + 1`,
          ipAddress: clientIp || null
        })
        .where(eq(cliqDevices.deviceName, deviceId || 'MANZILE-ANDROID-01'));
    } catch (devErr: any) {
      console.warn('[CliqService] Could not update device stats:', devErr.message);
    }

    // Create Audit Log
    try {
      await db.insert(cliqAuditLogs).values({
        transactionId: newTransactionId,
        userId: 'DEVICE_GATEWAY',
        userName: `جهاز SMS (${deviceId})`,
        action: 'RECEIVE_SMS',
        oldValue: null,
        newValue: {
          transactionId: parsed.transactionId,
          amount: parsed.amount,
          senderName: parsed.senderName,
          accountNumber: parsed.accountNumber,
          status: finalStatus
        },
        notes: `استقبال رسالة SMS من البنك ${sender}`,
        createdAt: new Date()
      } as any);
    } catch (auditErr: any) {
      console.warn('[CliqService] Could not write audit log:', auditErr.message);
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
  public async getBranches(activeOnly = false): Promise<any[]> {
    const normalize = (b: any) => ({
      ...b,
      cliqName: b.cliqName || b.cliqBranchName || b.name,
      employeeName: b.employeeName || b.responsibleEmployeeName || ''
    });

    try {
      const query = db.select().from(cliqBranches);
      const rows = activeOnly 
        ? await query.where(eq(cliqBranches.status, 'نشط')).orderBy(asc(cliqBranches.name))
        : await query.orderBy(asc(cliqBranches.name));
      if (rows && rows.length > 0) {
        const normalized = rows.map(normalize);
        saveFallbackBranches(normalized);
        return normalized;
      }
    } catch (err: any) {
      console.warn('[CliqService] Falling back to local branches file:', err.message);
    }
    const fallback = readFallbackBranches().map(normalize);
    return activeOnly ? fallback.filter((b: any) => b.status === 'نشط') : fallback;
  }

  public async createBranch(data: { name: string; cliqName?: string; employeeName?: string; status?: string }) {
    const cleanName = (data.name || '').trim();
    if (!cleanName) throw new Error('اسم الفرع إجباري');

    const cleanCliqName = (data.cliqName || '').trim();
    const cleanEmployee = (data.employeeName || '').trim();
    const branchStatus = data.status === 'معطل' ? 'معطل' : 'نشط';

    const newBranch = {
      name: cleanName,
      cliqName: cleanCliqName || cleanName,
      employeeName: cleanEmployee,
      status: branchStatus,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const [result] = await db.insert(cliqBranches).values(newBranch as any).$returningId();
      const saved = { id: result.id, ...newBranch };
      const current = readFallbackBranches();
      current.push(saved);
      saveFallbackBranches(current);
      return saved;
    } catch (err: any) {
      console.warn('[CliqService] DB error creating branch, saving to fallback:', err.message);
      const current = readFallbackBranches();
      const newId = current.length > 0 ? Math.max(...current.map((b: any) => Number(b.id) || 0)) + 1 : 1;
      const saved = { id: newId, ...newBranch };
      current.push(saved);
      saveFallbackBranches(current);
      return saved;
    }
  }

  public async updateBranch(id: number, data: { name: string; cliqName?: string; employeeName?: string; status?: string }) {
    const cleanName = (data.name || '').trim();
    if (!cleanName) throw new Error('اسم الفرع إجباري');

    const cleanCliqName = (data.cliqName || '').trim();
    const cleanEmployee = (data.employeeName || '').trim();
    const branchStatus = data.status === 'معطل' ? 'معطل' : 'نشط';

    const updateData = {
      name: cleanName,
      cliqName: cleanCliqName || cleanName,
      employeeName: cleanEmployee,
      status: branchStatus,
      updatedAt: new Date()
    };

    try {
      await db.update(cliqBranches).set(updateData).where(eq(cliqBranches.id, id));
    } catch (err: any) {
      console.warn('[CliqService] DB error updating branch:', err.message);
    }

    const current = readFallbackBranches();
    const idx = current.findIndex((b: any) => Number(b.id) === Number(id));
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updateData };
      saveFallbackBranches(current);
      return current[idx];
    }
    return { id, ...updateData };
  }

  public async toggleBranchStatus(id: number) {
    const branches = await this.getBranches(false);
    const branch = branches.find((b: any) => Number(b.id) === Number(id));
    if (!branch) throw new Error('الفرع غير موجود');

    const newStatus = branch.status === 'نشط' ? 'معطل' : 'نشط';
    return await this.updateBranch(id, {
      name: branch.name,
      cliqName: branch.cliqName,
      employeeName: branch.employeeName,
      status: newStatus
    });
  }

  public async deleteBranch(id: number) {
    const branches = await this.getBranches(false);
    const branch = branches.find((b: any) => Number(b.id) === Number(id));
    if (!branch) throw new Error('الفرع غير موجود');

    // Safety check: Don't allow deletion if transactions are linked to this branch
    try {
      const linked = await db
        .select({ count: sql<number>`count(*)` })
        .from(cliqTransactions)
        .where(or(
          eq(cliqTransactions.branchId, id),
          eq(cliqTransactions.branchName, branch.name)
        ));
      if (linked && Number(linked[0]?.count || 0) > 0) {
        throw new Error('لا يمكن حذف الفرع لوجود حوالات مرتبطة به، يمكنك تعطيل الفرع بدلاً من ذلك للمحافظة على السجلات التاريخية');
      }
    } catch (err: any) {
      if (err.message.includes('لا يمكن حذف الفرع')) throw err;
      console.warn('[CliqService] Could not check linked transactions in DB:', err.message);
    }

    try {
      await db.delete(cliqBranches).where(eq(cliqBranches.id, id));
    } catch (err: any) {
      console.warn('[CliqService] DB error deleting branch:', err.message);
    }

    const current = readFallbackBranches().filter((b: any) => Number(b.id) !== Number(id));
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
  public async closeTransaction(
    transferId: number,
    data: {
      closedByName: string;
      patientFileNumber: string;
      branchId?: number | null;
      branchName?: string | null;
      employeeName?: string | null;
      actualClosedBy?: string | null;
      actualUserId?: string | null;
    }
  ) {
    const cleanName = (data.closedByName || data.employeeName || '').trim();
    const cleanFileNo = (data.patientFileNumber || '').trim();
    const branchName = (data.branchName || '').trim() || null;
    const branchId = data.branchId ? Number(data.branchId) : null;
    const actualClosedBy = (data.actualClosedBy || cleanName).trim();

    if (!cleanName) {
      throw new Error('اسم الموظف المسؤول عن التسكير إجباري');
    }

    if (!cleanFileNo) {
      throw new Error('رقم ملف المريض في النظام الآخر إجباري');
    }

    const [transfer] = await db
      .select()
      .from(cliqTransactions)
      .where(eq(cliqTransactions.id, transferId))
      .limit(1);

    if (!transfer) {
      throw new Error('الحوالة غير موجودة');
    }

    if (transfer.status === 'CLOSED') {
      throw new Error('تم تسكير هذه الحوالة مسبقاً ولا يمكن تسكيرها مرتين');
    }

    if (transfer.amount === null || transfer.amount === undefined || isNaN(Number(transfer.amount)) || Number(transfer.amount) <= 0) {
      throw new Error('بيانات الحوالة غير مكتملة (المبلغ غير محدد ولا يمكن تسكيرها)');
    }

    const serverNow = new Date();

    // Atomic update
    await db
      .update(cliqTransactions)
      .set({
        status: 'CLOSED',
        closedByName: cleanName,
        employeeName: cleanName,
        patientFileNumber: cleanFileNo, // Preserves leading zeros as VARCHAR
        branchId: branchId,
        branchName: branchName,
        actualClosedBy: actualClosedBy,
        closedAt: serverNow,
        updatedAt: serverNow
      })
      .where(eq(cliqTransactions.id, transferId));

    // Record Audit Log
    try {
      await db.insert(cliqAuditLogs).values({
        transactionId: transferId,
        userId: data.actualUserId || actualClosedBy,
        userName: actualClosedBy,
        action: 'CLOSE_TRANSACTION',
        oldValue: { status: transfer.status },
        newValue: {
          status: 'CLOSED',
          closedByName: cleanName,
          employeeName: cleanName,
          patientFileNumber: cleanFileNo,
          branchId,
          branchName,
          actualClosedBy,
          closedAt: serverNow.toISOString()
        },
        notes: `تم تسكير الحوالة بواسطة ${actualClosedBy} - الفرع: ${branchName || 'غير محدد'} - الموظف: ${cleanName} - رقم الملف: ${cleanFileNo}`,
        createdAt: serverNow
      } as any);
    } catch (auditErr: any) {
      console.warn('[CliqService] Could not write audit log:', auditErr.message);
    }

    return {
      id: transferId,
      status: 'CLOSED',
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
  public async provideInformation(
    transferId: number,
    visitNumber: string,
    actualUserName: string = 'الموظف',
    actualUserId: string = 'EMPLOYEE'
  ) {
    const cleanVisitNo = (visitNumber || '').trim();
    if (!cleanVisitNo) {
      throw new Error('رقم الزيارة إجباري لتزويد المعلومات');
    }

    const [transfer] = await db
      .select()
      .from(cliqTransactions)
      .where(eq(cliqTransactions.id, transferId))
      .limit(1);

    if (!transfer) {
      throw new Error('الحوالة غير موجودة');
    }

    if (transfer.status === 'CLOSED') {
      throw new Error('لا يمكن تعديل معلومات الزيارة لحوالة مسكرة، يمكنك تعديلها من خلال صلاحيات المسؤول');
    }

    const serverNow = new Date();

    await db
      .update(cliqTransactions)
      .set({
        visitNumber: cleanVisitNo,
        status: 'INFO_PROVIDED',
        infoProvidedAt: serverNow,
        infoProvidedBy: actualUserName,
        updatedAt: serverNow
      })
      .where(eq(cliqTransactions.id, transferId));

    try {
      await db.insert(cliqAuditLogs).values({
        transactionId: transferId,
        userId: actualUserId,
        userName: actualUserName,
        action: 'PROVIDE_INFO',
        oldValue: {
          status: transfer.status,
          visitNumber: transfer.visitNumber
        },
        newValue: {
          status: 'INFO_PROVIDED',
          visitNumber: cleanVisitNo,
          infoProvidedBy: actualUserName,
          infoProvidedAt: serverNow.toISOString()
        },
        notes: `تم تزويد الحوالة برقم الزيارة (${cleanVisitNo}) بواسطة ${actualUserName}`,
        createdAt: serverNow
      } as any);
    } catch (auditErr: any) {
      console.warn('[CliqService] Could not write audit log:', auditErr.message);
    }

    return {
      id: transferId,
      status: 'INFO_PROVIDED',
      visitNumber: cleanVisitNo,
      infoProvidedAt: serverNow,
      infoProvidedBy: actualUserName
    };
  }

  /**
   * Returns list of transactions with universal search, status filters, branch, employee, date range, and sorting.
   */
  public async getTransactions(options: CliqFilterOptions = {}) {
    const {
      search = '',
      status = 'all',
      branchId,
      branchName,
      employeeName,
      startDate = '',
      endDate = '',
      sortBy = 'newest',
      page = 1,
      limit = 50
    } = options;

    const conditions: any[] = [];

    // Status filter
    if (status && status !== 'all') {
      conditions.push(eq(cliqTransactions.status, status));
    }

    // Branch filter
    if (branchId && String(branchId) !== 'all') {
      conditions.push(eq(cliqTransactions.branchId, Number(branchId)));
    } else if (branchName && branchName !== 'all') {
      conditions.push(eq(cliqTransactions.branchName, branchName));
    }

    // Employee filter
    if (employeeName && employeeName !== 'all') {
      const names = String(employeeName).split(/[،,]/).map(n => n.trim()).filter(Boolean);
      if (names.length > 0) {
        conditions.push(or(
          inArray(cliqTransactions.employeeName, names),
          inArray(cliqTransactions.closedByName, names)
        ));
      }
    }

    // Date range filter (receivedAt)
    if (startDate && endDate) {
      conditions.push(
        and(
          sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`,
          sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`
        )
      );
    } else if (startDate) {
      conditions.push(sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`);
    } else if (endDate) {
      conditions.push(sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`);
    }

    // Universal search across all required fields
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          like(cliqTransactions.senderName, s),
          like(cliqTransactions.accountNumber, s),
          like(cliqTransactions.transactionId, s),
          like(cliqTransactions.closedByName, s),
          like(cliqTransactions.employeeName, s),
          like(cliqTransactions.patientFileNumber, s),
          like(cliqTransactions.visitNumber, s),
          like(cliqTransactions.branchName, s),
          like(cliqTransactions.senderPhone, s),
          like(cliqTransactions.status, s),
          like(cliqTransactions.smsBody, s),
          sql`CAST(${cliqTransactions.amount} AS CHAR) LIKE ${s}`,
          sql`DATE_FORMAT(${cliqTransactions.receivedAt}, '%Y-%m-%d %H:%i:%s') LIKE ${s}`,
          sql`DATE_FORMAT(${cliqTransactions.closedAt}, '%Y-%m-%d %H:%i:%s') LIKE ${s}`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const orderExpr = sortBy === 'oldest' 
      ? [asc(cliqTransactions.receivedAt), asc(cliqTransactions.id)]
      : [desc(cliqTransactions.receivedAt), desc(cliqTransactions.id)];

    const [rows, countRes] = await Promise.all([
      db
        .select()
        .from(cliqTransactions)
        .where(whereClause)
        .orderBy(...orderExpr)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(cliqTransactions)
        .where(whereClause)
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
  public async getStats(options: CliqFilterOptions = {}) {
    const {
      branchId,
      branchName,
      employeeName,
      startDate = '',
      endDate = '',
      search = ''
    } = options;

    const conditions: any[] = [];

    if (branchId && String(branchId) !== 'all') {
      conditions.push(eq(cliqTransactions.branchId, Number(branchId)));
    } else if (branchName && branchName !== 'all') {
      conditions.push(eq(cliqTransactions.branchName, branchName));
    }

    if (employeeName && employeeName !== 'all') {
      const names = String(employeeName).split(/[،,]/).map(n => n.trim()).filter(Boolean);
      if (names.length > 0) {
        conditions.push(or(
          inArray(cliqTransactions.employeeName, names),
          inArray(cliqTransactions.closedByName, names)
        ));
      }
    }

    if (startDate && endDate) {
      conditions.push(
        and(
          sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`,
          sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`
        )
      );
    } else if (startDate) {
      conditions.push(sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`);
    } else if (endDate) {
      conditions.push(sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          like(cliqTransactions.senderName, s),
          like(cliqTransactions.accountNumber, s),
          like(cliqTransactions.transactionId, s),
          like(cliqTransactions.closedByName, s),
          like(cliqTransactions.employeeName, s),
          like(cliqTransactions.patientFileNumber, s),
          like(cliqTransactions.visitNumber, s),
          like(cliqTransactions.branchName, s)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const all = await db.select().from(cliqTransactions).where(whereClause);

    let totalTransfers = all.length;
    let unclosedCount = 0;
    let infoProvidedCount = 0;
    let closedCount = 0;
    let totalAmount = 0;
    let closedAmount = 0;

    all.forEach((tx) => {
      const amt = (tx.amount && !isNaN(Number(tx.amount))) ? Number(tx.amount) : 0;
      totalAmount += amt;

      if (tx.status === 'CLOSED') {
        closedCount++;
        closedAmount += amt;
      } else if (tx.status === 'INFO_PROVIDED') {
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
  public async getReportPdfData(options: CliqFilterOptions = {}, requesterName: string = 'المستخدم') {
    const {
      branchId,
      branchName,
      employeeName,
      status,
      search,
      startDate = '',
      endDate = ''
    } = options;

    const conditions: any[] = [];

    // Filter by status if selected
    if (status && status !== 'all') {
      conditions.push(eq(cliqTransactions.status, status));
    }

    if (branchId && String(branchId) !== 'all') {
      conditions.push(eq(cliqTransactions.branchId, Number(branchId)));
    } else if (branchName && branchName !== 'all') {
      conditions.push(eq(cliqTransactions.branchName, branchName));
    }

    if (employeeName && employeeName !== 'all') {
      const names = String(employeeName).split(/[،,]/).map(n => n.trim()).filter(Boolean);
      if (names.length > 0) {
        conditions.push(or(
          inArray(cliqTransactions.employeeName, names),
          inArray(cliqTransactions.closedByName, names)
        ));
      }
    }

    if (startDate && endDate) {
      conditions.push(
        and(
          sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`,
          sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`
        )
      );
    } else if (startDate) {
      conditions.push(sql`DATE(${cliqTransactions.receivedAt}) >= ${startDate}`);
    } else if (endDate) {
      conditions.push(sql`DATE(${cliqTransactions.receivedAt}) <= ${endDate}`);
    }

    // Universal search across all required fields
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          like(cliqTransactions.senderName, s),
          like(cliqTransactions.accountNumber, s),
          like(cliqTransactions.transactionId, s),
          like(cliqTransactions.closedByName, s),
          like(cliqTransactions.employeeName, s),
          like(cliqTransactions.patientFileNumber, s),
          like(cliqTransactions.visitNumber, s),
          like(cliqTransactions.branchName, s),
          like(cliqTransactions.senderPhone, s),
          like(cliqTransactions.status, s),
          like(cliqTransactions.smsBody, s)
        )
      );
    }

    const rows = await db
      .select()
      .from(cliqTransactions)
      .where(and(...conditions))
      .orderBy(asc(cliqTransactions.closedAt), asc(cliqTransactions.receivedAt));

    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return {
      summary: {
        totalClosed: rows.length,
        totalAmount: Number(totalAmount.toFixed(3)),
        branchName: (branchName && branchName !== 'all') ? branchName : (branchId && String(branchId) !== 'all' ? `فرع رقم ${branchId}` : 'جميع الفروع'),
        employeeName: (employeeName && employeeName !== 'all') ? String(employeeName).replace(/,/g, '، ') : 'جميع الموظفين',
        status: status || 'all',
        statusText: status === 'CLOSED' ? 'تم التسكير' : status === 'INFO_PROVIDED' ? 'مزود بالمعلومات' : status === 'NEW' ? 'لم يتم التسكير' : 'إجمالي الحوالات',
        startDate: startDate || null,
        endDate: endDate || null,
        generatedAt: new Date().toISOString(),
        generatedBy: requesterName
      },
      items: rows.map((r, index) => ({
        index: index + 1,
        id: r.id,
        transactionId: r.transactionId || 'غير متوفر',
        senderName: r.senderName || 'غير متوفر',
        amount: Number(r.amount || 0).toFixed(3),
        currency: r.currency || 'JOD',
        accountNumber: r.accountNumber || '',
        receivedAt: r.receivedAt,
        closedAt: r.closedAt,
        branchName: r.branchName || 'غير محدد',
        employeeName: r.employeeName || r.closedByName || 'غير محدد',
        actualClosedBy: r.actualClosedBy || r.closedByName || 'غير محدد',
        patientFileNumber: r.patientFileNumber || 'غير متوفر',
        visitNumber: r.visitNumber || '-'
      }))
    };
  }

  /**
   * Returns device status and heartbeats
   */
  public async getDevices() {
    const devices = await db.select().from(cliqDevices);
    const now = Date.now();

    return devices.map((d) => {
      const lastSeenMs = d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0;
      const isOnline = lastSeenMs > 0 && now - lastSeenMs < 3 * 60 * 1000;

      return {
        id: d.id,
        deviceName: d.deviceName,
        deviceModel: d.deviceModel || 'TECNO SPARK 9 PRO',
        osVersion: d.osVersion || 'Android 12',
        bankSender: d.bankSender || 'ARABIISLAMI',
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
  public async recordHeartbeat(deviceName: string, batteryLevel?: number, clientIp?: string) {
    await db
      .update(cliqDevices)
      .set({
        lastSeenAt: new Date(),
        batteryLevel: batteryLevel !== undefined ? batteryLevel : undefined,
        ipAddress: clientIp || undefined
      })
      .where(eq(cliqDevices.deviceName, deviceName));

    return { success: true };
  }

  /**
   * Registers or updates a device and generates a secure API token
   */
  public async registerDevice(deviceName: string, model?: string, os?: string, bank?: string) {
    const rawToken = `cliq_dev_${crypto.randomBytes(16).toString('hex')}`;
    const tokenHash = this.hashToken(rawToken);

    const existing = await db.select().from(cliqDevices).where(eq(cliqDevices.deviceName, deviceName));

    if (existing.length > 0) {
      await db
        .update(cliqDevices)
        .set({
          deviceModel: model || existing[0].deviceModel,
          osVersion: os || existing[0].osVersion,
          deviceTokenHash: tokenHash,
          bankSender: bank || existing[0].bankSender,
          status: 'نشط',
          lastSeenAt: new Date()
        })
        .where(eq(cliqDevices.deviceName, deviceName));
    } else {
      await db.insert(cliqDevices).values({
        deviceName,
        deviceModel: model || 'TECNO SPARK 9 PRO',
        osVersion: os || 'Android 12',
        deviceTokenHash: tokenHash,
        bankSender: bank || 'ARABIISLAMI',
        status: 'نشط',
        lastSeenAt: new Date()
      } as any);
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
  public async getAuditLogs(transactionId: number) {
    return await db
      .select()
      .from(cliqAuditLogs)
      .where(eq(cliqAuditLogs.transactionId, transactionId))
      .orderBy(desc(cliqAuditLogs.createdAt));
  }

  /**
   * Edit closed transfer details (closedByName and patientFileNumber)
   * Only permitted by Admin
   */
  public async editClosure(
    transferId: number,
    closedByName: string,
    patientFileNumber: string,
    editorName: string = 'المسؤول'
  ) {
    const cleanName = (closedByName || '').trim();
    const cleanFileNo = (patientFileNumber || '').trim();

    if (!cleanName) {
      throw new Error('اسم الموظف الذي سكّر الحوالة إجباري');
    }
    if (!cleanFileNo) {
      throw new Error('رقم ملف المريض في النظام الآخر إجباري');
    }

    const [transfer] = await db
      .select()
      .from(cliqTransactions)
      .where(eq(cliqTransactions.id, transferId))
      .limit(1);

    if (!transfer) {
      throw new Error('الحوالة غير موجودة');
    }

    const serverNow = new Date();

    await db
      .update(cliqTransactions)
      .set({
        closedByName: cleanName,
        patientFileNumber: cleanFileNo,
        updatedAt: serverNow
      })
      .where(eq(cliqTransactions.id, transferId));

    // Audit log
    await db.insert(cliqAuditLogs).values({
      transactionId: transferId,
      userId: editorName,
      userName: editorName,
      action: 'EDIT_CLOSURE',
      oldValue: {
        closedByName: transfer.closedByName,
        patientFileNumber: transfer.patientFileNumber
      },
      newValue: {
        closedByName: cleanName,
        patientFileNumber: cleanFileNo,
        editedAt: serverNow.toISOString()
      },
      notes: `تم تعديل بيانات التسكير بواسطة المسؤول ${editorName} (اسم الموظف: ${cleanName}، رقم الملف: ${cleanFileNo})`,
      createdAt: serverNow
    } as any);

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
  public async deleteTransaction(transferId: number, adminName: string = 'المسؤول') {
    const [transfer] = await db
      .select()
      .from(cliqTransactions)
      .where(eq(cliqTransactions.id, transferId))
      .limit(1);

    if (!transfer) {
      throw new Error('الحوالة غير موجودة');
    }

    // Delete audit logs first
    await db
      .delete(cliqAuditLogs)
      .where(eq(cliqAuditLogs.transactionId, transferId));

    // Delete transaction
    await db
      .delete(cliqTransactions)
      .where(eq(cliqTransactions.id, transferId));

    return { success: true, id: transferId, deletedBy: adminName };
  }
}

export const cliqService = new CliqService();
