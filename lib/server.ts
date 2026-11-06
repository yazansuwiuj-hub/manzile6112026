import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import callLogsRoutes from './server/routes/calllogs';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db';
import { appointments, users, systemSettings, examinations, regionConfigs, ratings } from './src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { AppointmentDataService } from './src/backend/services/appointment.service';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { Request } from 'express';


const appointmentService = new AppointmentDataService();
const BACKUP_FILE = path.join(process.cwd(), 'config_keys_v1.json');

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "public/uploads/external-requests"));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + crypto.randomUUID() + ext);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});



const DEFAULT_KEYS = {
  GOOGLE_MAPS_API_KEY: '',
  WHATSAPP_API_URL: '',
  WHATSAPP_API_KEY: '',
  WHATSAPP_API_TEMPLATE: 'مرحباً {اسم_المريض}،\nنود إعلامك بأنه تم تثبيت موعدك بنجاح لدى مختبرات العربي الطبية.\n📅 التاريخ: {تاريخ_الموعد}\n🕒 الوقت: بين الساعة {وقت_الموعد}\n📍 المنطقة: {اسم_المنطقة}\n🧪 الفحوصات: {قائمة_الفحوصات}\n💰 إجمالي المبلغ: {إجمالي_السعر} دينار أردني.\n\nنشكركم على ثقتكم، ونتطلع لخدمتكم. مع تمنياتنا لكم بدوام الصحة والعافية. 🌿',
  WHATSAPP_COMPLETED_TEMPLATE: 'مرحباً {اسم_المريض}،\nتم الانتهاء من الموعد بنجاح. نتمنى لكم دوام الصحة والعافية.',
  WHATSAPP_CANCELED_TEMPLATE: 'مرحباً {اسم_المريض}،\nتم إلغاء موعدكم للسبب التالي: {سبب_الإلغاء}.',
  version: 'v1.0.0'
};

async function getStoredKeys() {
  try {
    const records = await db.select().from(systemSettings).where(eq(systemSettings.key, 'keys'));
    if (records.length > 0 && records[0].value) {
      const keys = JSON.parse(records[0].value);
      try {
        const currentData = fs.existsSync(BACKUP_FILE) ? fs.readFileSync(BACKUP_FILE, 'utf-8') : null;
        const newData = JSON.stringify(keys, null, 2);
        if (currentData !== newData) {
          fs.writeFileSync(BACKUP_FILE, newData, 'utf-8');
        }
      } catch (fileErr) {
        // Noisy logs removed
      }
      return keys;
    }
  } catch (error) {
    console.log('[SystemSettings] Using fallback keys backup file');
  }

  // Fallback to local backup file
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const fileData = fs.readFileSync(BACKUP_FILE, 'utf-8');
      if (fileData) {
        return JSON.parse(fileData);
      }
    }
  } catch (fileErr) {
    // Noisy logs removed
  }

  return { ...DEFAULT_KEYS };
}

async function saveStoredKeys(newKeys: any) {
  const dataToSave = {
    GOOGLE_MAPS_API_KEY: newKeys.GOOGLE_MAPS_API_KEY || '',
    WHATSAPP_API_URL: newKeys.WHATSAPP_API_URL || '',
    WHATSAPP_API_KEY: newKeys.WHATSAPP_API_KEY || '',
    WHATSAPP_API_TEMPLATE: newKeys.WHATSAPP_API_TEMPLATE || DEFAULT_KEYS.WHATSAPP_API_TEMPLATE,
    WHATSAPP_COMPLETED_TEMPLATE: newKeys.WHATSAPP_COMPLETED_TEMPLATE || DEFAULT_KEYS.WHATSAPP_COMPLETED_TEMPLATE,
    WHATSAPP_CANCELED_TEMPLATE: newKeys.WHATSAPP_CANCELED_TEMPLATE || DEFAULT_KEYS.WHATSAPP_CANCELED_TEMPLATE,
    version: newKeys.version || 'v1.0.0',
    updatedAt: new Date().toISOString()
  };
  
  // 1. Save to local JSON file
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (fileErr) {
    // Noisy logs removed
  }

  // 2. Save to mariadb
  try {
    await db.insert(systemSettings)
      .values({ key: 'keys', value: JSON.stringify(dataToSave) } as any)
      .onDuplicateKeyUpdate({ set: { value: JSON.stringify(dataToSave), updatedAt: new Date() } });
  } catch (err) {
    console.log('[SystemSettings] Saved keys to local fallback only');
  }
  return dataToSave;
}

const APPEARANCE_BACKUP_FILE = path.join(process.cwd(), 'config_appearance_v1.json');

const DEFAULT_APPEARANCE = {
  SYSTEM_NAME: 'HealthLIS',
  SYSTEM_LOGO_EMOJI: '🧪',
  SYSTEM_LOGO_URL: '',
  SYSTEM_ACCENT: 'indigo',
  SYSTEM_ROUNDED: 'normal',
  SYSTEM_SIDEBAR_THEME: 'light',
  SYSTEM_COMPACT_MODE: 'false'
};

function handleBase64Logo(logoUrl: string): string {
  if (logoUrl && logoUrl.startsWith('data:image/')) {
    try {
      const matches = logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const logoPath = path.join(process.cwd(), 'logo.png');
        fs.writeFileSync(logoPath, buffer);
        console.log('[LOGO-SAVER] Saved uploaded logo base64 to logo.png inside project files!');
        return '/logo.png';
      }
    } catch (err) {
      console.warn('[LOGO-SAVER] Failed to save uploaded logo base64:', err);
    }
  }
  return logoUrl;
}

async function getStoredAppearance() {
  try {
    const records = await db.select().from(systemSettings).where(eq(systemSettings.key, 'appearance'));
    if (records.length > 0 && records[0].value) {
      const appearance = JSON.parse(records[0].value);
      try {
        const currentData = fs.existsSync(APPEARANCE_BACKUP_FILE) ? fs.readFileSync(APPEARANCE_BACKUP_FILE, 'utf-8') : null;
        const newData = JSON.stringify(appearance, null, 2);
        if (currentData !== newData) {
          fs.writeFileSync(APPEARANCE_BACKUP_FILE, newData, 'utf-8');
        }
      } catch (fileErr) {
        // Noisy logs removed
      }
      return appearance;
    }
  } catch (error) {
    console.log('[AppearanceSettings] Using fallback appearance backup file');
  }

  // Fallback to local backup file
  try {
    if (fs.existsSync(APPEARANCE_BACKUP_FILE)) {
      const fileData = fs.readFileSync(APPEARANCE_BACKUP_FILE, 'utf-8');
      if (fileData) {
        return JSON.parse(fileData);
      }
    }
  } catch (fileErr) {
    // Noisy logs removed
  }

  return { ...DEFAULT_APPEARANCE };
}

async function saveStoredAppearance(newAppearance: any) {
  const finalLogoUrl = handleBase64Logo(newAppearance.SYSTEM_LOGO_URL || '');

  const dataToSave = {
    SYSTEM_NAME: newAppearance.SYSTEM_NAME || 'HealthLIS',
    SYSTEM_LOGO_EMOJI: newAppearance.SYSTEM_LOGO_EMOJI || '🧪',
    SYSTEM_LOGO_URL: finalLogoUrl,
    SYSTEM_ACCENT: newAppearance.SYSTEM_ACCENT || 'indigo',
    SYSTEM_ROUNDED: newAppearance.SYSTEM_ROUNDED || 'normal',
    SYSTEM_SIDEBAR_THEME: newAppearance.SYSTEM_SIDEBAR_THEME || 'light',
    SYSTEM_COMPACT_MODE: newAppearance.SYSTEM_COMPACT_MODE || 'false',
    updatedAt: new Date().toISOString()
  };

  // 1. Save to local JSON file
  try {
    fs.writeFileSync(APPEARANCE_BACKUP_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (fileErr) {
    // Noisy logs removed
  }

  // 2. Save to mariadb
  try {
    await db.insert(systemSettings)
      .values({ key: 'appearance', value: JSON.stringify(dataToSave) } as any)
      .onDuplicateKeyUpdate({ set: { value: JSON.stringify(dataToSave), updatedAt: new Date() } });
  } catch (err) {
    console.log('[AppearanceSettings] Saved appearance to local fallback only');
  }

  return dataToSave;
}


async function startServer() {
  const app = express();

  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'public/uploads'))
  );
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });
  const PORT = Number(process.env.PORT) || 2468;

  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


  // === API ROUTES ===

  // Ratings routes
  app.get('/api/ratings', async (req, res) => {
    try {
      const data = await db.select().from(ratings).orderBy(desc(ratings.createdAt));
      res.json(data);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to load ratings" });
    }
  });

  app.post('/api/ratings', async (req, res) => {
    try {
      const { patientName, stars, comment } = req.body;
      if (!patientName || !stars) {
        return res.status(400).json({ error: 'Patient name and stars are required.' });
      }
      const [inserted] = await db.insert(ratings).values({
        patientName,
        stars: Number(stars),
        comment: comment || '',
      } as any).$returningId();
      const newRating = { id: inserted.id, patientName, stars: Number(stars), comment: comment || '' };
      res.status(201).json(newRating);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to create rating" });
    }
  });

  app.delete('/api/ratings/:id', async (req, res) => {
    try {
      await db.delete(ratings).where(eq(ratings.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to delete rating" });
    }
  });

  app.use('/api/calls', callLogsRoutes);
  
  app.get('/logo.png', (req, res) => {
    const logoPath = path.join(process.cwd(), 'logo.png');
    if (fs.existsSync(logoPath)) {
      res.sendFile(logoPath);
    } else {
      res.status(404).send('Logo not found');
    }
  });
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: true });
  });

  app.get('/api/resolve-location', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }

      // If it's already got coordinates, return it
      const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
      const match = url.match(coordRegex);
      if (match) {
        return res.json({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
      }

      // Otherwise try to follow redirects
      const fetchResponse = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      
      const finalUrl = fetchResponse.url;
      const urlRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const qRegex = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const llRegex = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/;

      const finalMatch = finalUrl.match(urlRegex) || finalUrl.match(qRegex) || finalUrl.match(llRegex);
      if (finalMatch) {
        return res.json({ lat: parseFloat(finalMatch[1]), lng: parseFloat(finalMatch[2]), finalUrl });
      }

      // Try GET if HEAD didn't work (sometimes headers are different)
      const getResponse = await fetch(url, { 
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      const getFinalUrl = getResponse.url;
      const getFinalMatch = getFinalUrl.match(urlRegex) || getFinalUrl.match(qRegex) || getFinalUrl.match(llRegex);
      
      if (getFinalMatch) {
        return res.json({ lat: parseFloat(getFinalMatch[1]), lng: parseFloat(getFinalMatch[2]), finalUrl: getFinalUrl });
      }

      // Try parsing HTML for meta tags just in case
      const html = await getResponse.text();
      const metaRegex = /content=".*?(?:@|q=|ll=)(-?\d+\.\d+),(-?\d+\.\d+).*?"/i;
      const metaMatch = html.match(metaRegex);
      if (metaMatch) {
        return res.json({ lat: parseFloat(metaMatch[1]), lng: parseFloat(metaMatch[2]) });
      }

      res.status(404).json({ error: 'Could not extract coordinates', finalUrl: getFinalUrl });
    } catch (error) {
      console.warn('Error resolving location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      let normalizedEmail = email?.trim() || '';
      if (normalizedEmail && !normalizedEmail.includes('@')) {
        normalizedEmail = `${normalizedEmail.toLowerCase()}@manzily.com`;
      }
      
      let usersList: any[] = [];
      try {
        usersList = await db.select().from(users);
      } catch (dbErr) {
        console.error(dbErr);
      }

      const user = usersList.find((u: any) => 
        (u.email?.toLowerCase() === normalizedEmail.toLowerCase() || 
         u.name?.toLowerCase() === email?.toLowerCase() ||
         u.email?.split('@')[0]?.toLowerCase() === email?.toLowerCase()) && 
        u.password === password
      );
      
      if (user) {
        if (user.status !== 'نشط') {
          res.status(403).json({ error: 'الحساب غير نشط' });
        } else {
          res.json(user);
        }
      } else {
        res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
    }
  });

  // Get appointments
  app.get('/api/appointments', async (req, res) => {
    try {
      const allAppointments = await appointmentService.getAll();
      res.json(allAppointments);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  // Create appointment
  app.post('/api/appointments', async (req, res) => {
    try {
    console.log('REQUEST BODY:', JSON.stringify(req.body, null, 2));
      const newAppt = await appointmentService.save(req.body);
      
      if (req.body.testerName && req.body.testerName !== 'غير محدد' && req.body.testerName !== '-') {
        io.emit('appointment-assigned', {
          testerName: req.body.testerName,
          appointment: newAppt
        });
      }
      
      res.json(newAppt);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: 'Failed to create appointment' });
    }
  });
// ================================
// External Patient Booking
// ================================
app.post(
  '/api/patient-booking',
  upload.single('attachment'),
  async (req, res) => {
    try {
      let attachmentUrl = '';

      if (req.file) {
        attachmentUrl =
          `${req.protocol}://${req.get('host')}/uploads/external-requests/${req.file.filename}`;
      }

      const appointmentData = {
        name: req.body.name,
        phone: req.body.phone,
        age: parseInt(req.body.age || '0'),
        testName: req.body.testName,
        locationUrl: req.body.locationUrl,
        location: req.body.location,
        date: req.body.date,
        time: req.body.time,
        testerName: req.body.testerName,
        status: req.body.status || 'جديد',
        notes: req.body.notes || '',
        attachmentUrl,
        price: parseFloat(req.body.price || '0'),
        requiresFasting: req.body.requiresFasting === 'true',
        isExternalRequest: req.body.isExternalRequest === 'true',
        isPendingAcceptance: req.body.isPendingAcceptance === 'true'
      };

      console.log('External Booking:', appointmentData);

      const newAppt = await appointmentService.save(appointmentData);

      res.json(newAppt);

    } catch (error) {
      console.error('External booking failed:', error);
      res.status(500).json({
        error: 'Failed to create external booking'
      });
    }
  }
);
app.post(
  '/api/upload',
  upload.single('attachment'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded'
        });
      }

      const url =
        `${req.protocol}://${req.get('host')}` +
        `/uploads/external-requests/${req.file.filename}`;

      res.json({
        success: true,
        url,
        fileName: req.file.filename
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Upload failed'
      });
    }
  }
);
  // Update appointment status
  app.put('/api/appointments/:id/status', async (req, res) => {
    try {
      const userWhoChanged = req.body.user || 'مستخدم النظام';
      const notes = req.body.notes;
      const amountCollected = req.body.amountCollected;
      const paymentMethod = req.body.paymentMethod;
      const priceDiffReason = req.body.priceDiffReason;
      const updatedAppt = await appointmentService.updateStatus(req.params.id, req.body.status, { notes, amountCollected, paymentMethod, priceDiffReason });
      res.json(updatedAppt);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: 'Failed to update appointment status' });
    }
  });

  // Update appointment details
  app.put('/api/appointments/:id', async (req, res) => {
    try {
      const data = { ...req.body };
      delete data.id;
      delete data.createdAt;
      if (data.age !== undefined) data.age = parseInt(data.age) || 0;
      if (data.price !== undefined) data.price = parseFloat(data.price) || 0;
      const updatedAppt = await appointmentService.update(req.params.id, data);
      
      if (data.testerName && data.testerName !== 'غير محدد' && data.testerName !== '-') {
        io.emit('appointment-assigned', {
          testerName: data.testerName,
          appointment: updatedAppt
        });
      }
      
      res.json(updatedAppt);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: 'Failed to update appointment' });
    }
  });

  // Delete appointment
  app.delete('/api/appointments/:id', async (req, res) => {
    try {
      const deletedBy = req.body?.deletedBy || 'مسؤول النظام';
      await appointmentService.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: 'Failed to delete appointment' });
    }
  });

  // Get complete Audit Trail (combining current and deleted appointments)
  app.get('/api/audit-trail', async (req, res) => {
    try {
      const auditTrail = await appointmentService.getAuditTrail();
      res.json(auditTrail);
    } catch (error) {
      console.warn(error);
      res.status(500).json({ error: 'Failed to fetch audit trail logs' });
    }
  });

  // Get missed calls (mock)
  app.get('/api/missed-calls', async (req, res) => {
    res.json([]);
  });

  // Get users
  app.get('/api/users', async (req, res) => {
    try {
      let dbUsers = await db.select().from(users);
      res.json(dbUsers);
    } catch (error) {
      console.error(error);
    }
  });

  // Add/Update user
  app.post('/api/users', async (req, res) => {
    const userData = req.body;
    const email = userData.email?.toLowerCase().trim();
    const id = userData.id || crypto.randomUUID();
    const cleanData = {
      id,
      name: userData.name,
      email: email,
      phone: userData.phone,
      password: userData.password,
      role: userData.role,
      status: userData.status,
      governorate: userData.governorate || 'كل المحافظات',
      shift: userData.shift || 'كلاهما',
      ammanSector: userData.ammanSector || 'كلاهما',
      dailyLimit: userData.dailyLimit ? parseInt(userData.dailyLimit) : null
    };

    try {
      if (userData.id) {
         await db.update(users).set(cleanData).where(eq(users.id, userData.id));
      } else {
         // @ts-ignore
          await db.insert(users).values({ createdAt: new Date(), dailyLimit: null, ...cleanData } as any);
      }
      res.json({ success: true, id });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to save user" });
    }
  });

  // Delete user
  app.delete('/api/users/:id', async (req, res) => {
    try {
      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Get examinations
  app.get('/api/examinations', async (req, res) => {
    try {
      let list = await db.select().from(examinations);
      res.json(list);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to load examinations" });
    }
  });

  // Add/Update examination
  app.post('/api/examinations', async (req, res) => {
    const examData = req.body;
    const id = examData.id;
    
    const cleanData = {
      name: examData.name,
      price: parseFloat(examData.price) || 0,
      notes: examData.notes || '',
      requiresFasting: examData.requiresFasting || false,
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await db.update(examinations).set(cleanData).where(eq(examinations.id, id));
        res.json({ success: true, id });
      } else {
        const newId = crypto.randomUUID();
        // @ts-ignore
          await db.insert(examinations).values({
          id: newId,
          ...cleanData
        , createdAt: new Date(), notes: null } as any);
        res.json({ success: true, id: newId });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to save examination" });
    }
  });

  // Bulk add examinations (for Excel import)
  app.post('/api/examinations/bulk', async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Expected array of examinations' });
    }

    const values = list.filter(item => item.name).map(item => ({
      id: crypto.randomUUID(),
      name: item.name,
      price: parseFloat(item.price) || 0,
      notes: item.notes || '',
      requiresFasting: item.requiresFasting || false
    }));

    try {
      if (values.length > 0) {
        for (const exam of values) {
          const exists = await db
            .select()
            .from(examinations)
            .where(eq(examinations.name, exam.name))
            .limit(1);

          if (exists.length === 0) {
            // @ts-ignore
            await db.insert(examinations).values(exam as any);
          }
        }
      }
      res.json({ success: true, count: list.length });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to import examinations" });
    }
  });

  // Delete all examinations
  app.delete('/api/examinations/all', async (req, res) => {
    try {
      await db.delete(examinations);
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to delete all examinations" });
    }
  });

  // Delete examination
  app.delete('/api/examinations/:id', async (req, res) => {
    try {
      await db.delete(examinations).where(eq(examinations.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to delete examination" });
    }
  });

  // === REGIONS CONFIG API ===
  // Get all regions (seeds default ones if empty)
  app.get('/api/regions', async (req, res) => {
    try {
      let list = await db.select().from(regionConfigs);
      res.json(list);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to load regions" });
    }
  });

  // Save/Update region config
  app.post('/api/regions', async (req, res) => {
    const regionData = req.body;
    const id = regionData.id;

    const cleanData: any = {
      governorate: regionData.governorate,
      shift: regionData.shift,
      regionName: regionData.regionName?.trim(),
      timeFrom: regionData.timeFrom || '08:00',
      timeTo: regionData.timeTo || '12:00',
      fridayTimeFrom: regionData.fridayTimeFrom || '08:00',
      fridayTimeTo: regionData.fridayTimeTo || '12:00',
      updatedAt: new Date()
    };

    if (regionData.governorate === 'عمان') {
      cleanData.ammanSector = regionData.ammanSector || 'غربية';
    } else {
      cleanData.ammanSector = null;
    }

    try {
      if (id) {
        await db.update(regionConfigs).set(cleanData).where(eq(regionConfigs.id, parseInt(id)));
        res.json({ success: true, id });
      } else {
                const [inserted] = await db.insert(regionConfigs).values({
          ...cleanData,
          createdAt: new Date(),
          updatedAt: new Date(),
          fridayTimeFrom: cleanData.fridayTimeFrom || null,
          fridayTimeTo: cleanData.fridayTimeTo || null
        } as any).$returningId();
        const result = { id: inserted.id };
        res.json({ success: true, id: result.id });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to save region config" });
    }
  });

  // Bulk add regions (for Excel import)
  app.post('/api/regions/bulk', async (req, res) => {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Expected array of regions' });
    }

    let count = 0;
    const insertedItems: any[] = [];

    try {
      for (const item of list) {
        if (!item.regionName || !item.governorate) continue;

        const governorate = item.governorate.trim();
        const regionName = item.regionName.trim();
        const shift = item.shift === 'مسائي' || item.shift === 'evening' ? 'مسائي' : 'صباحي';
        
        let ammanSector = null;
        if (governorate === 'عمان') {
          const s = item.ammanSector ? item.ammanSector.trim() : '';
          ammanSector = s.includes('شرق') ? 'شرقية' : 'غربية';
        }

        const timeFrom = item.timeFrom || (shift === 'صباحي' ? '08:00' : '14:00');
        const timeTo = item.timeTo || (shift === 'صباحي' ? '12:00' : '18:00');

        const fridayTimeFrom =
          item.fridayTimeFrom ||
          item['Friday Time From'] ||
          timeFrom;

        const fridayTimeTo =
          item.fridayTimeTo ||
          item['Friday Time To'] ||
          timeTo;

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
            createdAt: new Date() } as any);
        } catch (dbErr) {
          // Keep item to insert in fallback store if needed
          insertedItems.push({
            governorate,
            shift,
            regionName,
            timeFrom,
            timeTo,
            fridayTimeFrom,
            fridayTimeTo,
            ammanSector,
            createdAt: new Date()
          });
        }
        count++;
      }
      res.json({ success: true, count });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to import regions" });
    }
  });

  // Delete all regions
  app.delete('/api/regions/all', async (req, res) => {
    try {
      await db.delete(regionConfigs);
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to delete all region configs" });
    }
  });

  // Delete region config
  app.delete('/api/regions/:id', async (req, res) => {
    try {
      await db.delete(regionConfigs).where(eq(regionConfigs.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to delete region config" });
    }
  });

  // === SECURE API KEY MANAGEMENT & BACKEND PROXY ENDPOINTS ===

  // Get appearance settings
  app.get('/api/appearance', async (req, res) => {
    try {
      const appearance = await getStoredAppearance();
      res.json(appearance);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve appearance settings' });
    }
  });

  // Save appearance settings
  app.post('/api/appearance', async (req, res) => {
    try {
      const saved = await saveStoredAppearance(req.body);
      res.json({ success: true, appearance: saved });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save appearance settings' });
    }
  });

  // 1. Get Google Maps API Key safely
  app.get('/api/keys/google-maps', async (req, res) => {
    try {
      const keys = await getStoredKeys();
      res.json({ key: keys.GOOGLE_MAPS_API_KEY || '' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve Google Maps key' });
    }
  });

  // 2. Get all keys
  app.get('/api/keys', async (req, res) => {
    try {
      const keys = await getStoredKeys();
      res.json(keys);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch keys' });
    }
  });

  // 3. Save all keys
  app.post('/api/keys', async (req, res) => {
    try {
      const saved = await saveStoredKeys(req.body);
      res.json({ success: true, keys: saved });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save keys' });
    }
  });

  // 4. Download keys configuration with version
  app.get('/api/keys/download', async (req, res) => {
    try {
      const keys = await getStoredKeys();
      const filename = `health_lis_keys_${keys.version || 'v1'}.json`;
      res.setHeader('Content-disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-type', 'application/json');
      res.send(JSON.stringify(keys, null, 2));
    } catch (err) {
      res.status(500).json({ error: 'Failed to download keys file' });
    }
  });

  // 5. Import keys configuration
  app.post('/api/keys/import', async (req, res) => {
    try {
      const { GOOGLE_MAPS_API_KEY, WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_API_TEMPLATE, version } = req.body;
      const importedKeys = {
        GOOGLE_MAPS_API_KEY,
        WHATSAPP_API_URL,
        WHATSAPP_API_KEY,
        WHATSAPP_API_TEMPLATE,
        version: version || 'v1.0.0'
      };
      const saved = await saveStoredKeys(importedKeys);
      res.json({ success: true, keys: saved });
    } catch (err) {
      res.status(500).json({ error: 'Failed to import keys' });
    }
  });

  // 6. Send WhatsApp message securely from the server (completely hidden in the background!)
  app.post('/api/keys/send-whatsapp', async (req, res) => {
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
      if (req.body.status === 'مكتمل') {
        waTemplate = keys.WHATSAPP_COMPLETED_TEMPLATE || keys.WHATSAPP_API_TEMPLATE;
      } else if (req.body.status === 'ملغي') {
        waTemplate = keys.WHATSAPP_CANCELED_TEMPLATE || keys.WHATSAPP_API_TEMPLATE;
      }

      if (!waUrl || !waKey) {
        return res.status(400).json({ error: 'WhatsApp integration is not configured on the server.' });
      }

      // Replace variables in template
      let messageText = `مرحبًا ${name} 👋

تم تأكيد وتثبيت موعدكم للسحب المنزلي لدى
🏥 مختبرات العربي الطبية

📅 التاريخ:
${date}

🕒 موعد الزيارة:
${time}

📍 المنطقة:
${region}

🧪 الفحوصات المطلوبة:
${exams}

💰 إجمالي المبلغ:
${price} د.أ

✨ نرجو منكم التواجد في الموعد المحدد لضمان تقديم الخدمة بأفضل جودة.

📞 للاستفسار أو تعديل الموعد يرجى التواصل معنا.

🌿 شكراً لاختياركم مختبرات العربي الطبية.
نتمنى لكم دوام الصحة والعافية.`;

      if (req.body.requiresFasting) {
        messageText += '\n\n*ملاحظة هامة:* الفحوصات المطلوبة تتطلب صيام.';
      }

      // Prepare phone number (strip leading zeros and add country code Jordan 962)
      let formattedPhone = (phone || '').trim();
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '962' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('962') && !formattedPhone.startsWith('+')) {
        formattedPhone = '962' + formattedPhone;
      }
      if (formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.substring(1);
      }

      console.log(`Sending WhatsApp message to ${formattedPhone} via server-side proxy...`);
      
      let templateName = 'appointment_confirmed';
      let parameters: any[] = [];

      if (status === 'مكتمل') {
        templateName = 'appointment_completedd';
        parameters = [
          { type: 'text', text: name || '' },
          { type: 'text', text: 'https://manzile.alarabilab.com/rating' }
        ];
      } else if (status === 'ملغي') {
        templateName = 'appointment_cancelled';
        parameters = [
          { type: 'text', text: name || '' },
          { type: 'text', text: req.body.cancelReason || 'تم إلغاء الموعد.' }
        ];
      } else {
        parameters = [
          { type: 'text', text: name || '' },
          { type: 'text', text: date || '' },
          { type: 'text', text: time || '' },
          { type: 'text', text: region || '' },
          {
            type: 'text',
            text: exams && exams.trim() !== ''
              ? exams
              : 'لا يوجد فحوصات مضافة'
          },
          {
            type: 'text',
            text: attachmentUrl && attachmentUrl.trim() !== ''
              ? attachmentUrl
              : 'لا يوجد مرفق'
          },
          {
            type: 'text',
            text: String(price || '0')
          }
        ];
      }

      const payload = {
        recipient_number: formattedPhone,
        platform: 'whatsapp',
        message_object: {
          type: 'template',
          content: {
            name: templateName,
            language: {
              code: 'ar'
            },
            components: [
              {
                type: 'body',
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

      const postData =
        'json_data=' + encodeURIComponent(JSON.stringify(payload));

      const response = await fetch(waUrl, {
        method: 'POST',
        headers: {
          'Authorization': waKey.startsWith('Bearer ')
            ? waKey
            : `Bearer ${waKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: postData
      });

      const responseText = await response.text();
      console.log('WhatsApp proxy response:', responseText);

      res.json({ success: true, response: responseText });
    } catch (err: any) {
      console.warn('WhatsApp proxy failed:', err);
      res.status(500).json({ error: err.message || 'Failed to send WhatsApp message via proxy' });
    }
  });

  
  // === VITE MIDDLEWARE ===
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const activePhlebotomists = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send existing locations immediately
    socket.emit('phlebotomists-update', Array.from(activePhlebotomists.values()));

    socket.on('update-location', (data) => {
      // Expecting data: { id, name, initials, lat, lng, battery, speed, status }
      activePhlebotomists.set(data.id, {
        ...data,
        socketId: socket.id,
        isOffline: false,
        lastUpdate: Date.now()
      });
      // Broadcast to everyone else
      io.emit('phlebotomists-update', Array.from(activePhlebotomists.values()));
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      let changed = false;
      activePhlebotomists.forEach((p, key) => {
        if (p.socketId === socket.id) {
          p.isOffline = true;
          p.status = 'غير متصل';
          p.badgeClass = 'bg-slate-50 text-slate-600 border-slate-200';
          changed = true;
        }
      });
      if (changed) {
        io.emit('phlebotomists-update', Array.from(activePhlebotomists.values()));
      }
    });
  });

  // Check for stale connections every 30 seconds
  setInterval(() => {
    let changed = false;
    const now = Date.now();
    activePhlebotomists.forEach((p, key) => {
      if (!p.isOffline && (now - p.lastUpdate > 60000)) { // 1 minute timeout
        p.isOffline = true;
        p.status = 'غير متصل';
        p.badgeClass = 'bg-slate-50 text-slate-600 border-slate-200';
        changed = true;
      }
    });
    if (changed) {
      io.emit('phlebotomists-update', Array.from(activePhlebotomists.values()));
    }
  }, 30000);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
