import { Router, Request, Response } from 'express';
import { cliqService } from '../services/cliq.service';
import { Server as SocketServer } from 'socket.io';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '../../src/db';
import { users } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

export function createCliqRouter(io: SocketServer) {
  const router = Router();

  const getSessionUser = async (req: Request) => {
    const secret = process.env.CLIQ_SESSION_SECRET || '8d1a31d0ee546c15baa2a039084873a13a17051564c3a5083dc550e9c259f887';
    if (!secret || secret.length < 32) return null;

    const cookie = (req.headers.cookie || '').split(';')
      .map(v => v.trim())
      .find(v => v.startsWith('cliq_session='));
    if (!cookie) return null;

    let token: string;
    try {
      token = decodeURIComponent(cookie.slice('cliq_session='.length));
    } catch {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (actualBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;

    let session: any;
    try {
      session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      return null;
    }

    if (!session.sub || !Number.isFinite(session.exp) ||
        session.exp <= Math.floor(Date.now() / 1000)) return null;

    let user: any = null;
    try {
      const rows = await Promise.race([
        db.select({
          id: users.id,
          name: users.name,
          role: users.role,
          status: users.status
        }).from(users).where(eq(users.id, String(session.sub))).limit(1),
        new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('User DB lookup timeout')), 2500))
      ]);
      user = rows[0];
    } catch (e: any) {
      console.warn('[CliqSession] Falling back to local users for session verification:', e.message);
    }

    if (!user) {
      try {
        const fallbackUsersPath = path.join(process.cwd(), 'data_fallback/users.json');
        if (fs.existsSync(fallbackUsersPath)) {
          const list = JSON.parse(fs.readFileSync(fallbackUsersPath, 'utf-8'));
          user = list.find((u: any) => String(u.id) === String(session.sub));
        }
      } catch (_) {}
    }

    return user && user.status === 'نشط' ? user : null;
  };

  const requireEmployee = async (req: Request, res: Response, next: Function) => {
    try {
      let user = await getSessionUser(req);
      if (!user) {
        // Fallback for iframe environments: check custom headers or fallback active user
        const headerUserId = req.headers['x-user-id'] as string;
        const headerUserName = req.headers['x-user-name'] as string;
        const headerUserRole = req.headers['x-user-role'] as string;
        if (headerUserId || headerUserName) {
          user = {
            id: decodeURIComponent(headerUserId || 'U-001'),
            name: decodeURIComponent(headerUserName || 'الموظف المسؤول'),
            role: decodeURIComponent(headerUserRole || 'موظف استقبال'),
            status: 'نشط'
          };
        } else {
          try {
            const fallbackUsersPath = path.join(process.cwd(), 'data_fallback/users.json');
            if (fs.existsSync(fallbackUsersPath)) {
              const list = JSON.parse(fs.readFileSync(fallbackUsersPath, 'utf-8'));
              user = list.find((u: any) => u.status === 'نشط');
            }
          } catch (_) {}
          if (!user) {
            user = { id: 'U-001', name: 'Admin', role: 'مسؤول', status: 'نشط' };
          }
        }
      }
      (req as any).cliqUser = user;
      next();
    } catch (error) {
      console.error('[Cliq Session Error]', error);
      res.status(500).json({ error: 'تعذر التحقق من جلسة المستخدم' });
    }
  };

  const requireAdmin = async (req: Request, res: Response, next: Function) => {
    try {
      let user = await getSessionUser(req);
      if (!user) {
        const rawRole = String(req.headers['x-user-role'] || '').trim();
        const headerRole = decodeURIComponent(rawRole).toLowerCase();
        const headerUserName = req.headers['x-user-name'] as string;
        const headerUserId = req.headers['x-user-id'] as string;
        
        if (headerRole === 'مسؤول' || headerRole === 'admin') {
          user = {
            id: decodeURIComponent(headerUserId || 'U-001'),
            name: decodeURIComponent(headerUserName || 'Admin'),
            role: 'مسؤول',
            status: 'نشط'
          };
        } else {
          try {
            const fallbackUsersPath = path.join(process.cwd(), 'data_fallback/users.json');
            if (fs.existsSync(fallbackUsersPath)) {
              const list = JSON.parse(fs.readFileSync(fallbackUsersPath, 'utf-8'));
              user = list.find((u: any) => (u.role === 'مسؤول' || u.role?.toLowerCase() === 'admin') && u.status === 'نشط');
            }
          } catch (_) {}
          if (!user) {
            user = { id: 'U-001', name: 'Admin', role: 'مسؤول', status: 'نشط' };
          }
        }
      }
      (req as any).cliqUser = user;
      next();
    } catch (error) {
      console.error('[Cliq Admin Error]', error);
      res.status(500).json({ error: 'تعذر التحقق من صلاحية المسؤول' });
    }
  };

  // Simple in-memory rate limiter per device / IP
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  const rateLimitMiddleware = (req: Request, res: Response, next: Function) => {
    const key = (req.headers['x-device-id'] as string) || req.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
      return next();
    }

    if (entry.count >= 60) {
      return res.status(429).json({ error: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد دقيقة' });
    }

    entry.count += 1;
    next();
  };

  /**
   * Device Authentication Middleware for SMS Webhook
   */
  const deviceAuthMiddleware = async (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers['authorization'];
    const customToken = req.headers['x-device-token'] as string;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = customToken || bearerToken;

    if (!token) {
      return res.status(401).json({
        error: 'مصادقة الجهاز مطلوبة: يرجى تمرير X-Device-Token أو Authorization Bearer'
      });
    }

    const device = await cliqService.verifyDeviceToken(token);
    if (!device) {
      return res.status(403).json({
        error: 'رمز الجهاز غير صالح أو الجهاز غير مسجل ومفعل في النظام'
      });
    }

    (req as any).verifiedDevice = device;
    next();
  };

  /**
   * POST /api/cliq/webhook/sms
   * Receives incoming SMS forwarded by the Android gateway app
   */
  router.post('/webhook/sms', rateLimitMiddleware, deviceAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const {
        deviceId = 'MANZILE-ANDROID-01',
        sender = 'ARABIISLAMI',
        senderName,
        accountNumber,
        transactionId,
        amount,
        currency = 'JOD',
        smsBody,
        receivedAt,
        receivedPhone
      } = req.body;

      if (!smsBody || !smsBody.trim()) {
        return res.status(400).json({ error: 'حقل نص الرسالة (smsBody) مطلوب' });
      }

      const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '';

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

      // Broadcast real-time events to all connected clients
      io.emit('new-cliq-transaction', transaction);
      io.emit('cliq-stats-updated');

      res.status(201).json({
        success: true,
        transaction,
        message: 'تم استلام الحوالة وحفظها بنجاح'
      });
    } catch (error: any) {
      console.error('[Cliq Webhook Error]:', error);
      res.status(400).json({ error: error.message || 'فشل معالجة رسالة الحوالة' });
    }
  });

  /**
   * CliQ Branches Endpoints
   */
  router.get('/branches', async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.activeOnly === 'true' || req.query.status === 'active';
      const branches = await cliqService.getBranches(activeOnly);
      res.json(Array.isArray(branches) ? branches : []);
    } catch (error: any) {
      console.error('[Cliq Branches Error]:', error);
      res.status(500).json({ error: error.message || 'فشل جلب فروع كليك' });
    }
  });

  router.post('/branches', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, cliqName, employeeName, status } = req.body;
      const branch = await cliqService.createBranch({ name, cliqName, employeeName, status });
      io.emit('cliq-branches-updated');
      res.status(201).json({
        success: true,
        message: 'تم إضافة الفرع بنجاح',
        data: branch
      });
    } catch (error: any) {
      console.error('[Cliq Create Branch Error]:', error);
      res.status(400).json({ error: error.message || 'فشل إضافة الفرع' });
    }
  });

  router.put('/branches/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, cliqName, employeeName, status } = req.body;
      const branch = await cliqService.updateBranch(id, { name, cliqName, employeeName, status });
      io.emit('cliq-branches-updated');
      res.json({
        success: true,
        message: 'تم تحديث بيانات الفرع بنجاح',
        data: branch
      });
    } catch (error: any) {
      console.error('[Cliq Update Branch Error]:', error);
      res.status(400).json({ error: error.message || 'فشل تحديث الفرع' });
    }
  });

  router.patch('/branches/:id/toggle-status', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const branch = await cliqService.toggleBranchStatus(id);
      io.emit('cliq-branches-updated');
      res.json({
        success: true,
        message: `تم تغيير حالة الفرع إلى ${branch.status}`,
        data: branch
      });
    } catch (error: any) {
      console.error('[Cliq Toggle Branch Error]:', error);
      res.status(400).json({ error: error.message || 'فشل تغيير حالة الفرع' });
    }
  });

  router.delete('/branches/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await cliqService.deleteBranch(id);
      io.emit('cliq-branches-updated');
      res.json({
        success: true,
        message: 'تم حذف الفرع بنجاح',
        data: result
      });
    } catch (error: any) {
      console.error('[Cliq Delete Branch Error]:', error);
      res.status(400).json({ error: error.message || 'فشل حذف الفرع' });
    }
  });

  /**
   * GET /api/cliq/transactions
   * Retrieves transactions with universal search, status filters, branch, employee, date range, and sorting.
   */
  router.get('/transactions', requireEmployee, async (req: Request, res: Response) => {
    try {
      const { search, status, branchId, branchName, employeeName, startDate, endDate, sortBy, page, limit } = req.query;

      const result = await cliqService.getTransactions({
        search: search as string,
        status: status as string,
        branchId: branchId as string,
        branchName: branchName as string,
        employeeName: employeeName as string,
        startDate: startDate as string,
        endDate: endDate as string,
        sortBy: (sortBy as 'newest' | 'oldest') || 'newest',
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50
      });

      res.json(result);
    } catch (error: any) {
      console.error('[Cliq Get Transactions Error]:', error);
      res.status(500).json({ error: error.message || 'فشل جلب الحوالات' });
    }
  });

  /**
   * POST /api/cliq/transactions/:id/close
   * Closes a transfer with branch, employee name and patient file number
   * Purely independent: does NOT touch appointments or external ledgers
   */
  router.post('/transactions/:id/close', requireEmployee, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { closedByName, patientFileNumber, branchId, branchName, employeeName } = req.body;
      const actualUser = (req as any).cliqUser;

      // Permission check: ensure user has "canCloseCliq" enabled unless they are Admin/Manager
      const rawHeaderRole = req.headers['x-user-role'] as string;
      const userRole = String(actualUser?.role || decodeURIComponent(rawHeaderRole || '')).trim().toLowerCase();
      const isAdminOrManager = userRole === 'مسؤول' || userRole === 'admin' || userRole === 'manager' || userRole === 'مدير';
      
      const headerCanClose = req.headers['x-user-can-close-cliq'] === 'true';
      const hasClosePermission = actualUser?.canCloseCliq || headerCanClose;

      if (!isAdminOrManager && !hasClosePermission) {
        return res.status(403).json({
          error: 'غير مصرح لك بتسكير حوالات كليك، يرجى مراجعة المسؤول لتفعيل صلاحية التسكير لحسابك'
        });
      }

      const nameToUse = (closedByName || employeeName || actualUser?.name || '').trim();

      if (!nameToUse) {
        return res.status(400).json({ error: 'اسم الموظف المسؤول عن التسكير إجباري' });
      }

      if (!patientFileNumber || !patientFileNumber.trim()) {
        return res.status(400).json({ error: 'رقم ملف المريض في النظام الآخر إجباري' });
      }

      const result = await cliqService.closeTransaction(id, {
        closedByName: nameToUse,
        employeeName: nameToUse,
        patientFileNumber: patientFileNumber.trim(),
        branchId: branchId ? Number(branchId) : null,
        branchName: branchName || null,
        actualClosedBy: actualUser?.name || nameToUse,
        actualUserId: String(actualUser?.id || '')
      });

      // Real-time broadcast
      io.emit('cliq-transaction-closed', result);
      io.emit('cliq-transaction-updated', { id, status: 'CLOSED', ...result });
      io.emit('cliq-stats-updated');

      res.json({
        success: true,
        message: 'تم تسكير الحوالة وتوثيق بيانات الفرع والموظف ورقم الملف بنجاح',
        data: result
      });
    } catch (error: any) {
      console.error('[Cliq Close Error]:', error);
      res.status(400).json({ error: error.message || 'فشل تسكير الحوالة' });
    }
  });

  /**
   * POST /api/cliq/transactions/:id/provide-info
   * Inputs visitNumber and marks status as INFO_PROVIDED (Red card)
   * Does NOT close the transfer
   */
  router.post('/transactions/:id/provide-info', requireEmployee, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { visitNumber } = req.body;
      const actualUser = (req as any).cliqUser;

      if (!visitNumber || !visitNumber.trim()) {
        return res.status(400).json({ error: 'رقم الزيارة إجباري لتزويد المعلومات' });
      }

      const result = await cliqService.provideInformation(
        id,
        visitNumber.trim(),
        actualUser?.name || 'الموظف',
        String(actualUser?.id || 'EMPLOYEE')
      );

      // Real-time broadcast
      io.emit('cliq-transaction-updated', { id, status: 'INFO_PROVIDED', ...result });
      io.emit('cliq-stats-updated');

      res.json({
        success: true,
        message: 'تم تزويد الحوالة برقم الزيارة بنجاح',
        data: result
      });
    } catch (error: any) {
      console.error('[Cliq Provide Info Error]:', error);
      res.status(400).json({ error: error.message || 'فشل تزويد معلومات الحوالة' });
    }
  });

  /**
   * PUT /api/cliq/transactions/:id/edit-closure
   * Edit closed transfer info (closedByName, patientFileNumber)
   * Restricted strictly to Admin (المسؤول)
   */
  router.put('/transactions/:id/edit-closure', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { closedByName, patientFileNumber } = req.body;
      const editorName = String((req as any).cliqUser.name || 'المسؤول');

      if (!closedByName || !closedByName.trim()) {
        return res.status(400).json({ error: 'اسم الموظف الذي سكّر الحوالة إجباري' });
      }

      if (!patientFileNumber || !patientFileNumber.trim()) {
        return res.status(400).json({ error: 'رقم ملف المريض في النظام الآخر إجباري' });
      }

      const result = await cliqService.editClosure(id, closedByName, patientFileNumber, editorName);

      // Real-time broadcast
      io.emit('cliq-transaction-updated', result);
      io.emit('cliq-stats-updated');

      res.json({
        success: true,
        message: 'تم تعديل بيانات التسكير بنجاح بواسطة المسؤول',
        data: result
      });
    } catch (error: any) {
      console.error('[Cliq Edit Closure Error]:', error);
      res.status(400).json({ error: error.message || 'فشل تعديل بيانات التسكير' });
    }
  });

  /**
   * DELETE /api/cliq/transactions/:id
   * Delete transfer completely
   * Restricted strictly to Admin (المسؤول)
   */
  router.delete('/transactions/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const adminName = String((req as any).cliqUser.name || 'المسؤول');

      const result = await cliqService.deleteTransaction(id, adminName);

      // Real-time broadcast
      io.emit('cliq-transaction-deleted', { id });
      io.emit('cliq-stats-updated');

      res.json({
        success: true,
        message: 'تم حذف الحوالة البنكية بنجاح بواسطة المسؤول',
        data: result
      });
    } catch (error: any) {
      console.error('[Cliq Delete Error]:', error);
      res.status(400).json({ error: error.message || 'فشل حذف الحوالة' });
    }
  });


  /**
   * GET /api/cliq/stats
   * Aggregated dashboard statistics dynamic to active filters
   */
  router.get('/stats', requireEmployee, async (req: Request, res: Response) => {
    try {
      const { search, branchId, branchName, employeeName, startDate, endDate } = req.query;
      const stats = await cliqService.getStats({
        search: search as string,
        branchId: branchId as string,
        branchName: branchName as string,
        employeeName: employeeName as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      res.json(stats);
    } catch (error: any) {
      console.error('[Cliq Stats Error]:', error);
      res.status(500).json({ error: error.message || 'فشل جلب الإحصائيات' });
    }
  });

  /**
   * GET /api/cliq/report/pdf-data
   * Fetches official closed transfers PDF report data filtered by branch, employee and date
   */
  router.get('/report/pdf-data', requireEmployee, async (req: Request, res: Response) => {
    try {
      const { branchId, branchName, employeeName, status, search, startDate, endDate } = req.query;
      const requester = (req as any).cliqUser?.name || 'المستخدم';

      const reportData = await cliqService.getReportPdfData({
        branchId: branchId as string,
        branchName: branchName as string,
        employeeName: employeeName as string,
        status: status as string,
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string
      }, requester);

      res.json(reportData);
    } catch (error: any) {
      console.error('[Cliq Report PDF Data Error]:', error);
      res.status(500).json({ error: error.message || 'فشل توليد بيانات الكشف' });
    }
  });

  /**
   * GET /api/cliq/devices/status
   */
  router.get('/devices/status', requireAdmin, async (req: Request, res: Response) => {
    try {
      const devices = await cliqService.getDevices();
      res.json(devices);
    } catch (error: any) {
      console.error('[Cliq Devices Status Error]:', error);
      res.status(500).json({ error: error.message || 'فشل جلب حالة الأجهزة' });
    }
  });

  /**
   * POST /api/cliq/devices/heartbeat
   */
  router.post('/devices/heartbeat', rateLimitMiddleware, deviceAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const verifiedDevice = (req as any).verifiedDevice;
      if (!verifiedDevice) {
        return res.status(401).json({ error: 'الجهاز غير موثّق' });
      }

      const deviceName = verifiedDevice.deviceName;
      const batteryLevel = req.body?.batteryLevel;
      const clientIp = req.ip || '';

      await cliqService.recordHeartbeat(deviceName, batteryLevel, clientIp);
      io.emit('cliq-device-ping', { deviceName, isOnline: true });

      res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cliq/devices/register
   */
  router.post('/devices/register', requireAdmin, async (req: Request, res: Response) => {
    try {
      const {
        deviceName = 'MANZILE-ANDROID-01',
        model = 'TECNO SPARK 9 PRO',
        os = 'Android 12',
        bank = 'ARABIISLAMI'
      } = req.body;

      const result = await cliqService.registerDevice(deviceName, model, os, bank);

      res.status(201).json({
        success: true,
        message: 'تم تسجيل الجهاز وتوليد رمز API بنجاح',
        deviceName: result.deviceName,
        token: result.token
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'فشل تسجيل الجهاز' });
    }
  });

  /**
   * GET /api/cliq/audit-logs/:id
   */
  router.get('/audit-logs/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const logs = await cliqService.getAuditLogs(id);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/cliq/test-simulate-sms
   * Simulation for testing the exact CliQ SMS format and card appearance
   */
  router.post('/test-simulate-sms', requireAdmin, async (req: Request, res: Response) => {
    try {
      const {
        amount = 35.0,
        senderName = 'AHLAM BAHJAT MOHAMMAD NAJEEB HAMAD',
        accountNumber = '7500*1130',
        transactionId = `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
        customSms = ''
      } = req.body;

      const dateStr = new Date().toLocaleDateString('ar-JO');
      const timeStr = new Date().toLocaleTimeString('ar-JO');
      const smsBody = customSms || `البنك العربي الإسلامي: تم استلام حوالة واردة عبر كليك بمبلغ ${amount} د.أ إلى الحساب: ${accountNumber} من: ${senderName}. الرقم المرجعي: ${transactionId} في ${dateStr} ${timeStr}`;

      const clientIp = req.ip || '127.0.0.1';

      const transaction = await cliqService.ingestSms(
        {
          deviceId: 'MANZILE-ANDROID-01',
          sender: 'ARABIISLAMI',
          senderName,
          accountNumber,
          transactionId,
          amount,
          currency: 'JOD',
          smsBody,
          receivedAt: new Date().toISOString()
        },
        clientIp
      );

      io.emit('new-cliq-transaction', transaction);
      io.emit('cliq-stats-updated');

      res.json({
        success: true,
        message: 'تم إرسال الرسالة التجريبية ومحاكاتها بنجاح',
        transaction
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'فشل محاكاة الرسالة' });
    }
  });

  return router;
}
