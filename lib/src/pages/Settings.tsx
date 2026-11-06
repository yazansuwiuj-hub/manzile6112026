import React, { useState, useEffect, useRef } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { User, Role, RegionConfig } from '../types';
import { dummyUsers } from '../data';
import { 
  Settings as SettingsIcon, 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  FileDown, 
  Upload, 
  Activity, 
  DollarSign, 
  Check,
  MapPin,
  Map,
  Palette,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Calendar,
  History,
  Star
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { formatTimeTo12Hour } from '../lib/utils';

interface Examination {
  id: string;
  name: string;
  price: number;
  notes?: string;
  requiresFasting?: boolean;
}

export function Settings({ user }: { user?: User }) {
  const [activeTab, setActiveTab] = useState<'users' | 'examinations' | 'regions' | 'appearance' | 'technology' | 'booking_link' | 'audit_trail'>('users');
  
  // Appearance states
  const [systemName, setSystemName] = useState(() => safeGetItem('localStorage', 'SYSTEM_NAME') || 'HealthLIS');
  const [systemLogoEmoji, setSystemLogoEmoji] = useState(() => safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🧪');
  const [systemLogoUrl, setSystemLogoUrl] = useState(() => safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');
  const [systemAccent, setSystemAccent] = useState(() => safeGetItem('localStorage', 'SYSTEM_ACCENT') || 'green');
  const [systemRounded, setSystemRounded] = useState(() => safeGetItem('localStorage', 'SYSTEM_ROUNDED') || 'normal');
  const [systemSidebarTheme, setSystemSidebarTheme] = useState(() => safeGetItem('localStorage', 'SYSTEM_SIDEBAR_THEME') || 'light');
  const [systemCompactMode, setSystemCompactMode] = useState(() => safeGetItem('localStorage', 'SYSTEM_COMPACT_MODE') || 'false');

  const saveAppearanceSettings = async () => {
    safeSetItem('localStorage', 'SYSTEM_NAME', systemName.trim());
    safeSetItem('localStorage', 'SYSTEM_LOGO_EMOJI', systemLogoEmoji);
    safeSetItem('localStorage', 'SYSTEM_LOGO_URL', systemLogoUrl);
    safeSetItem('localStorage', 'SYSTEM_ACCENT', systemAccent);
    safeSetItem('localStorage', 'SYSTEM_ROUNDED', systemRounded);
    safeSetItem('localStorage', 'SYSTEM_SIDEBAR_THEME', systemSidebarTheme);
    safeSetItem('localStorage', 'SYSTEM_COMPACT_MODE', systemCompactMode);
    
    // Dispatch system event to update theme in real-time
    window.dispatchEvent(new Event('system-appearance-changed'));
    
    // Save to server & Firestore securely
    try {
      const res = await fetch('/api/appearance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          SYSTEM_NAME: systemName.trim(),
          SYSTEM_LOGO_EMOJI: systemLogoEmoji,
          SYSTEM_LOGO_URL: systemLogoUrl,
          SYSTEM_ACCENT: systemAccent,
          SYSTEM_ROUNDED: systemRounded,
          SYSTEM_SIDEBAR_THEME: systemSidebarTheme,
          SYSTEM_COMPACT_MODE: systemCompactMode
        })
      });

      if (res.ok) {
        showAlert('نجاح', 'تم حفظ وتطبيق إعدادات مظهر النظام بنجاح ومزامنتها على الخادم والملفات!', 'success');
      } else {
        showAlert('تنبيه', 'تم تطبيق المظهر محلياً ولكن فشلت المزامنة على الخادم.', 'warning');
      }
    } catch (err) {
      console.error('Failed to save appearance to server:', err);
      showAlert('تنبيه', 'تم تطبيق المظهر محلياً ولكن تعذر الاتصال بالخادم للحفظ.', 'warning');
    }
  };

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Custom Alert Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'ساحب منزلي' as Role,
    status: 'نشط' as 'نشط' | 'غير نشط',
    governorate: 'كل المحافظات',
    shift: 'كلاهما',
    ammanSector: 'كلاهما' as 'شرقية' | 'غربية' | 'كلاهما',
    dailyLimit: ''
  });

  // Examinations state
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [examSearch, setExamSearch] = useState('');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [examFormData, setExamFormData] = useState({
    name: '',
    price: '',
    notes: '',
    requiresFasting: false
  });

  // Regions state
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(true);
  const [regionSearch, setRegionSearch] = useState('');
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionConfig | null>(null);
  const [regionFormData, setRegionFormData] = useState({
    governorate: 'عمان' as 'عمان' | 'إربد' | 'الزرقاء',
    shift: 'صباحي' as 'صباحي' | 'مسائي',
    regionName: '',
    timeFrom: '08:00',
    timeTo: '12:00',
    fridayTimeFrom: '08:00',
    fridayTimeTo: '12:00',
    ammanSector: 'غربية' as 'شرقية' | 'غربية'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const regionFileInputRef = useRef<HTMLInputElement>(null);
  const keysFileInputRef = useRef<HTMLInputElement>(null);

  // Secure API key states
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [whatsappKey, setWhatsappKey] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [whatsappCompletedTemplate, setWhatsappCompletedTemplate] = useState('');
  const [whatsappCanceledTemplate, setWhatsappCanceledTemplate] = useState('');
  const [appVersion, setAppVersion] = useState('v1.0.0');
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  // Audit Trail states & functions
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditFilterField, setAuditFilterField] = useState('all');

  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const res = await fetch('/api/audit-trail');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (error) {
      console.error('Error fetching audit trail logs:', error);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit_trail') {
      fetchAppointments();
    }
  }, [activeTab]);

  const allAuditLogs = React.useMemo(() => {
    return auditLogs;
  }, [auditLogs]);

  const filteredAuditLogs = React.useMemo(() => {
    return allAuditLogs.filter(log => {
      const matchesSearch = 
        !auditSearchQuery ||
        log.patientName?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.user?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.field?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.oldValue?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.newValue?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        String(log.appointmentId).includes(auditSearchQuery);
      
      const matchesField = 
        auditFilterField === 'all' || 
        log.field === auditFilterField;

      return matchesSearch && matchesField;
    });
  }, [allAuditLogs, auditSearchQuery, auditFilterField]);

  const uniqueFields = React.useMemo(() => {
    const fields = new Set<string>();
    allAuditLogs.forEach(log => {
      if (log.field) fields.add(log.field);
    });
    return Array.from(fields);
  }, [allAuditLogs]);

  const exportAuditTrailToExcel = () => {
    if (filteredAuditLogs.length === 0) {
      showAlert('تنبيه', 'لا توجد بيانات لتصديرها', 'warning');
      return;
    }

    const data = filteredAuditLogs.map((log, index) => ({
      '#': index + 1,
      'تاريخ الإجراء': log.timestamp ? new Date(log.timestamp).toLocaleString('ar-JO') : '',
      'المستخدم المسؤول': log.user || 'غير معروف',
      'اسم المريض': log.patientName || '',
      'رقم الموعد': log.appointmentId || '',
      'الفحوصات': log.testName || '',
      'الحقل المعدل': log.field || '',
      'القيمة السابقة': log.oldValue || '',
      'القيمة الجديدة': log.newValue || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل تدقيق المواعيد');
    XLSX.writeFile(workbook, `سجل_تدقيق_المواعيد_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const formatAuditTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('ar-JO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'جديد':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold">جديد</Badge>;
      case 'قائم':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold">قائم</Badge>;
      case 'مكتمل':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">مكتمل</Badge>;
      case 'نتائج مستلمة':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">نتائج مستلمة</Badge>;
      case 'ملغي':
        return <Badge className="bg-red-50 text-red-700 border-red-200 font-bold">ملغي</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200 font-bold">{status}</Badge>;
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchExaminations();
    fetchRegions();
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setGoogleMapsKey(data.GOOGLE_MAPS_API_KEY || '');
        setWhatsappUrl(data.WHATSAPP_API_URL || '');
        setWhatsappKey(data.WHATSAPP_API_KEY || '');
        setWhatsappTemplate(data.WHATSAPP_API_TEMPLATE || '');
        setWhatsappCompletedTemplate(data.WHATSAPP_COMPLETED_TEMPLATE || '');
        setWhatsappCanceledTemplate(data.WHATSAPP_CANCELED_TEMPLATE || '');
        setAppVersion(data.version || 'v1.0.0');
      }
    } catch (error) {
      console.error('Error fetching keys:', error);
    }
    setIsLoadingKeys(false);
  };

  const handleSaveKeys = async () => {
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          GOOGLE_MAPS_API_KEY: googleMapsKey,
          WHATSAPP_API_URL: whatsappUrl,
          WHATSAPP_API_KEY: whatsappKey,
          WHATSAPP_API_TEMPLATE: whatsappTemplate,
          WHATSAPP_COMPLETED_TEMPLATE: whatsappCompletedTemplate,
          WHATSAPP_CANCELED_TEMPLATE: whatsappCanceledTemplate,
          version: appVersion
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Also sync local storage if client code wants it (though we proxy WA, Maps still queries backend or falls back)
        if (googleMapsKey) safeSetItem('localStorage', 'GOOGLE_MAPS_API_KEY', googleMapsKey);
        else safeRemoveItem('localStorage', 'GOOGLE_MAPS_API_KEY');

        showAlert('نجاح', 'تم حفظ المفاتيح والرموز السرية بأمان في خلفية النظام والملفات بنجاح!', 'success');
      } else {
        showAlert('خطأ', 'فشل حفظ المفاتيح على الخادم.', 'error');
      }
    } catch (error) {
      showAlert('خطأ', 'حدث خطأ في الاتصال بالخادم لحفظ المفاتيح.', 'error');
    }
  };

  const handleImportKeys = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/keys/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(json)
        });

        if (res.ok) {
          const data = await res.json();
          setGoogleMapsKey(data.keys.GOOGLE_MAPS_API_KEY || '');
          setWhatsappUrl(data.keys.WHATSAPP_API_URL || '');
          setWhatsappKey(data.keys.WHATSAPP_API_KEY || '');
          setWhatsappTemplate(data.keys.WHATSAPP_API_TEMPLATE || '');
          setAppVersion(data.keys.version || 'v1.0.0');
          showAlert('نجاح', 'تم استيراد وتحديث إعدادات المفاتيح الآمنة من النسخة الاحتياطية بنجاح!', 'success');
        } else {
          showAlert('خطأ', 'فشل استيراد ملف الإعدادات.', 'error');
        }
      } catch (error) {
        showAlert('خطأ', 'الملف المحدد ليس ملف JSON صالح للإعدادات.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data && data.length > 0 ? data : dummyUsers);
      } else {
        setUsers(dummyUsers);
      }
    } catch (error) {
      setUsers(dummyUsers);
    }
    setIsLoadingUsers(false);
  };

  const fetchExaminations = async () => {
    setIsLoadingExams(true);
    try {
      const res = await fetch('/api/examinations');
      if (res.ok) {
        const data = await res.json();
        setExaminations(data);
      }
    } catch (error) {
      console.error('Error fetching examinations:', error);
    }
    setIsLoadingExams(false);
  };

  const fetchRegions = async () => {
    setIsLoadingRegions(true);
    try {
      const res = await fetch('/api/regions');
      if (res.ok) {
        const data = await res.json();
        setRegions(data);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
    setIsLoadingRegions(false);
  };

  // User Actions
  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: user.password || '',
        role: user.role,
        status: user.status,
        governorate: user.governorate || 'كل المحافظات',
        shift: user.shift || 'كلاهما',
        ammanSector: user.ammanSector || 'كلاهما',
        dailyLimit: user.dailyLimit ? user.dailyLimit.toString() : ''
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'ساحب منزلي',
        status: 'نشط',
        governorate: 'كل المحافظات',
        shift: 'كلاهما',
        ammanSector: 'كلاهما',
        dailyLimit: ''
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    let userData: any = { ...userFormData };
    if (editingUser) {
      userData.id = editingUser.id;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        fetchUsers();
        setIsUserModalOpen(false);
      } else {
        const errData = await res.json();
        showAlert('خطأ', errData.error || 'فشل حفظ بيانات المستخدم', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('خطأ', 'حدث خطأ غير متوقع أثناء حفظ المستخدم.', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    showConfirm('تأكيد الحذف', 'هل أنت متأكد من حذف هذا المستخدم؟', async () => {
      const originalUsers = [...users];
      // Optimistic state update
      setUsers(prev => prev.filter(u => u.id !== id));
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          throw new Error('Failed to delete user on server');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        setUsers(originalUsers);
        showAlert('خطأ', 'حدث خطأ أثناء حذف المستخدم من الخادم. تم استعادة البيانات.', 'error');
      }
    });
  };

  // Examination Actions
  const handleOpenExamModal = (exam?: Examination) => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    if (exam) {
      setEditingExam(exam);
      setExamFormData({
        name: exam.name,
        price: exam.price.toString(),
        notes: exam.notes || '',
        requiresFasting: exam.requiresFasting || false
      });
    } else {
      setEditingExam(null);
      setExamFormData({
        name: '',
        price: '',
        notes: '',
        requiresFasting: false
      });
    }
    setIsExamModalOpen(true);
  };

  const handleSaveExam = async () => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    if (!examFormData.name) {
      showAlert('خطأ', 'الرجاء إدخال اسم الفحص', 'warning');
      return;
    }
    const cleanPrice = parseFloat(examFormData.price) || 0;
    let examData: any = {
      name: examFormData.name,
      price: cleanPrice,
      notes: examFormData.notes,
      requiresFasting: examFormData.requiresFasting
    };
    if (editingExam) {
      examData.id = editingExam.id;
    }

    try {
      const res = await fetch('/api/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData)
      });
      if (res.ok) {
        fetchExaminations();
      }
    } catch (error) {
      console.error(error);
    }
    setIsExamModalOpen(false);
  };

  const handleDeleteExam = async (id: string) => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    showConfirm('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الفحص؟', async () => {
      const originalExams = [...examinations];
      // Optimistic state update
      setExaminations(prev => prev.filter(e => e.id !== id));
      try {
        const res = await fetch(`/api/examinations/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          throw new Error('Failed to delete examination on server');
        }
      } catch (error) {
        console.error('Error deleting examination:', error);
        setExaminations(originalExams);
        showAlert('خطأ', 'حدث خطأ أثناء حذف الفحص من الخادم. تم استعادة البيانات.', 'error');
      }
    });
  };

  const handleDeleteAllExams = async () => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    showConfirm(
      'تأكيد مسح كافة الفحوصات',
      'هل أنت متأكد من حذف جميع الفحوصات والأسعار بشكل كامل؟ لا يمكن التراجع عن هذا الإجراء.',
      async () => {
        const originalExams = [...examinations];
        setExaminations([]);
        try {
          const res = await fetch('/api/examinations/all', { method: 'DELETE' });
          if (res.ok) {
            showAlert('نجاح', 'تم حذف كافة الفحوصات الطبية والأسعار بنجاح!', 'success');
          } else {
            throw new Error('Failed to delete all exams on server');
          }
        } catch (error) {
          console.error('Error deleting all exams:', error);
          setExaminations(originalExams);
          showAlert('خطأ', 'حدث خطأ أثناء مسح الفحوصات من الخادم. تم استعادة البيانات.', 'error');
        }
      }
    );
  };

  // Region Actions
  const handleOpenRegionModal = (reg?: RegionConfig) => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    if (reg) {
      setEditingRegion(reg);
      setRegionFormData({
        governorate: reg.governorate,
        shift: reg.shift,
        regionName: reg.regionName,
        timeFrom: reg.timeFrom,
        timeTo: reg.timeTo,
        fridayTimeFrom: reg.fridayTimeFrom || reg.timeFrom || '08:00',
        fridayTimeTo: reg.fridayTimeTo || reg.timeTo || '12:00',
        ammanSector: reg.ammanSector || 'غربية'
      });
    } else {
      setEditingRegion(null);
      setRegionFormData({
        governorate: 'عمان',
        shift: 'صباحي',
        regionName: '',
        timeFrom: '08:00',
        timeTo: '12:00',
        fridayTimeFrom: '08:00',
        fridayTimeTo: '12:00',
        ammanSector: 'غربية'
      });
    }
    setIsRegionModalOpen(true);
  };

  const handleSaveRegion = async () => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    if (!regionFormData.regionName) {
      showAlert('خطأ', 'الرجاء إدخال اسم المنطقة', 'warning');
      return;
    }

    let regData: any = { ...regionFormData };
    if (editingRegion) {
      regData.id = editingRegion.id;
    }

    try {
      const res = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });
      if (res.ok) {
        fetchRegions();
        setIsRegionModalOpen(false);
      } else {
        showAlert('خطأ', 'فشل حفظ المنطقة', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('خطأ', 'حدث خطأ أثناء حفظ المنطقة', 'error');
    }
  };

  const handleDeleteRegion = async (id: string) => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    showConfirm('تأكيد الحذف', 'هل أنت متأكد من حذف هذه المنطقة؟', async () => {
      const originalRegions = [...regions];
      setRegions(prev => prev.filter(r => r.id !== id));
      try {
        const res = await fetch(`/api/regions/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          throw new Error('Failed to delete region');
        }
      } catch (error) {
        console.error('Error deleting region:', error);
        setRegions(originalRegions);
        showAlert('خطأ', 'حدث خطأ أثناء حذف المنطقة.', 'error');
      }
    });
  };

  const handleDeleteAllRegions = async () => {
    if (user?.role !== 'مسؤول') {
      showAlert('تنبيه', 'هذه الميزة متاحة للمسؤول فقط.', 'warning');
      return;
    }
    showConfirm(
      'تأكيد مسح كافة المناطق',
      'هل أنت متأكد من حذف جميع المناطق الجغرافية المعرفة بالكامل؟ لا يمكن التراجع عن هذا الإجراء.',
      async () => {
        const originalRegions = [...regions];
        setRegions([]);
        try {
          const res = await fetch('/api/regions/all', { method: 'DELETE' });
          if (res.ok) {
            showAlert('نجاح', 'تم حذف جميع المناطق الجغرافية وتوزيعاتها بنجاح!', 'success');
          } else {
            throw new Error('Failed to delete all regions on server');
          }
        } catch (error) {
          console.error('Error deleting all regions:', error);
          setRegions(originalRegions);
          showAlert('خطأ', 'حدث خطأ أثناء مسح المناطق من الخادم. تم استعادة البيانات.', 'error');
        }
      }
    );
  };

  // Excel Operations
  const handleExportTemplate = () => {
    const data = examinations.map(e => ({
      'اسم الفحص': e.name,
      'السعر (بالدينار)': e.price,
      'ملاحظات / شروط الفحص': e.notes || ''
    }));
    if (data.length === 0) {
      data.push({ 
        'اسم الفحص': 'فحص دم شامل (CBC)', 
        'السعر (بالدينار)': 10,
        'ملاحظات / شروط الفحص': 'يفضل الصيام 8 ساعات'
      });
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الفحوصات والأسعار');
    XLSX.writeFile(workbook, 'الفحوصات_والأسعار.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const importedExams = json.map(row => {
          const name = row['اسم الفحص'] || row['Examination Name'] || row['الاسم'] || row['name'] || Object.values(row)[0];
          const priceStr = row['السعر'] || row['السعر (بالدينار)'] || row['Price'] || row['price'] || Object.values(row)[1];
          const notesStr = row['ملاحظات / شروط الفحص'] || row['الشروط'] || row['ملاحظات'] || row['Notes'] || row['notes'] || '';
          const price = parseFloat(priceStr) || 0;
          return { name, price, notes: notesStr };
        }).filter(item => item && item.name);

        if (importedExams.length === 0) {
          showAlert('تنبيه', 'لم يتم العثور على فحوصات صالحة في الملف. تأكد من وجود عمود باسم "اسم الفحص".', 'warning');
          return;
        }

        const res = await fetch('/api/examinations/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedExams)
        });

        if (res.ok) {
          showAlert('نجاح', `تم استيراد ${importedExams.length} فحص بنجاح!`, 'success');
          fetchExaminations();
        } else {
          showAlert('خطأ', 'حدث خطأ أثناء استيراد الفحوصات.', 'error');
        }
      } catch (err) {
        console.error(err);
        showAlert('خطأ', 'فشل قراءة ملف Excel. يرجى التحقق من صيغة الملف.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportRegionsTemplate = () => {
    const data = regions.map(r => ({
      'المحافظة': r.governorate,
      'اسم المنطقة': r.regionName,
      'الجولة': r.shift,
      'نطاق عمان': r.ammanSector || '',
      'وقت البدء': r.timeFrom,
      'وقت الانتهاء': r.timeTo,
      'وقت البدء يوم الجمعة': r.fridayTimeFrom || '',
      'وقت الانتهاء يوم الجمعة': r.fridayTimeTo || ''
    }));
    if (data.length === 0) {
      data.push({
        'المحافظة': 'عمان',
        'اسم المنطقة': 'الجبيهة',
        'الجولة': 'صباحي',
        'نطاق عمان': 'غربية',
        'وقت البدء': '09:00',
        'وقت الانتهاء': '13:00',
        'وقت البدء يوم الجمعة': '09:00',
        'وقت الانتهاء يوم الجمعة': '13:00'
      });
      data.push({
        'المحافظة': 'إربد',
        'اسم المنطقة': 'وسط البلد',
        'الجولة': 'صباحي',
        'نطاق عمان': '',
        'وقت البدء': '08:00',
        'وقت الانتهاء': '14:00',
        'وقت البدء يوم الجمعة': '08:00',
        'وقت الانتهاء يوم الجمعة': '12:00'
      });
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'توزيع وإعدادات المناطق');
    XLSX.writeFile(workbook, 'المناطق_وتوزيعها.xlsx');
  };

  const parseFlexibleTime = (str: string): string => {
    let cleaned = str.trim().toLowerCase();
    if (!cleaned) return '';

    // Standardize Arabic and English terms
    const isPM = cleaned.includes('م') || cleaned.includes('مساء') || cleaned.includes('pm');
    const isAM = cleaned.includes('ص') || cleaned.includes('صباح') || cleaned.includes('am');

    // Strip non-digit, non-colon chars to extract the numbers
    let timePart = cleaned.replace(/[^0-9:]/g, '');
    if (!timePart) return '';

    let hours = 0;
    let minutes = 0;

    if (timePart.includes(':')) {
      const parts = timePart.split(':');
      hours = parseInt(parts[0]) || 0;
      minutes = parseInt(parts[1]) || 0;
    } else {
      hours = parseInt(timePart) || 0;
    }

    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const formatExcelTime = (val: any): string => {
    if (val === undefined || val === null) return '';
    
    // If it's a number (Excel fractional time)
    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'string' && num >= 0 && num < 1) {
      const totalMinutes = Math.round(num * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    let str = String(val).trim();
    if (!str) return '';

    // Handle case where it might be parsed as "0.375" string
    const strNum = Number(str);
    if (!isNaN(strNum) && strNum >= 0 && strNum < 1) {
      const totalMinutes = Math.round(strNum * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    if (str.includes('T')) {
      const parts = str.split('T');
      str = parts[1];
    }

    // Clean common prefix/suffix words first
    str = str.replace(/^(من|إلى|وقت)\s+/g, '').trim();

    return parseFlexibleTime(str);
  };

  const parseTimeRange = (timeFromVal: any, timeToVal: any) => {
    let fromStr = String(timeFromVal || '').trim();
    let toStr = String(timeToVal || '').trim();

    // If timeFrom contains a range (e.g. "8ص-10ص" or "8-12" or "من 8 إلى 12")
    if (fromStr.includes('-') || fromStr.includes('إلى') || fromStr.toLowerCase().includes('to')) {
      const parts = fromStr.split(/[-]|إلى|to/);
      if (parts.length >= 2) {
        fromStr = parts[0];
        toStr = parts[1];
      }
    }

    return {
      timeFrom: formatExcelTime(fromStr) || '08:00',
      timeTo: formatExcelTime(toStr) || '12:00'
    };
  };

  const findRowValue = (row: any, keywords: string[]): any => {
    const keys = Object.keys(row);
    const foundKey = keys.find(key => {
      const k = key.toLowerCase().trim();
      return keywords.some(keyword => k.includes(keyword.toLowerCase()));
    });
    return foundKey ? row[foundKey] : undefined;
  };

  const handleImportRegionsExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const importedRegions = json.map(row => {
          const governorate = findRowValue(row, ['محافظة', 'governorate', 'gov']);
          const regionName = findRowValue(row, ['اسم المنطقة', 'المنطقة', 'region', 'name']);
          const shift = findRowValue(row, ['الجولة', 'الفترة', 'shift', 'period']) || 'صباحي';
          const ammanSector = findRowValue(row, ['نطاق', 'القطاع', 'sector']) || '';
          
          const rawTimeFrom = findRowValue(row, ['وقت البدء', 'البداية', 'time from', 'timefrom', 'start', 'from']) || '';
          const rawTimeTo = findRowValue(row, ['وقت الانتهاء', 'النهاية', 'time to', 'timeto', 'end', 'to']) || '';
          const rawFridayTimeFrom = findRowValue(row, ['وقت البدء يوم الجمعة', 'بداية الجمعة', 'friday from', 'friday start']) || '';
          const rawFridayTimeTo = findRowValue(row, ['وقت الانتهاء يوم الجمعة', 'نهاية الجمعة', 'friday to', 'friday end']) || '';

          const { timeFrom, timeTo } = parseTimeRange(rawTimeFrom, rawTimeTo);
          
          let fridayTimeFrom = undefined;
          let fridayTimeTo = undefined;
          
          if (rawFridayTimeFrom || rawFridayTimeTo) {
            const fridayTimes = parseTimeRange(rawFridayTimeFrom, rawFridayTimeTo);
            fridayTimeFrom = fridayTimes.timeFrom;
            fridayTimeTo = fridayTimes.timeTo;
          }

          return { 
            governorate: governorate ? String(governorate).trim() : '', 
            regionName: regionName ? String(regionName).trim() : '', 
            shift: shift ? String(shift).trim() : 'صباحي', 
            ammanSector: ammanSector ? String(ammanSector).trim() : '', 
            timeFrom, 
            timeTo,
            fridayTimeFrom,
            fridayTimeTo
          };
        }).filter(item => item && item.regionName && item.governorate);

        if (importedRegions.length === 0) {
          showAlert('تنبيه', 'لم يتم العثور على مناطق صالحة في الملف. تأكد من وجود أعمدة باسم "المحافظة" و"اسم المنطقة".', 'warning');
          return;
        }

        const res = await fetch('/api/regions/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedRegions)
        });

        if (res.ok) {
          const resData = await res.json();
          showAlert('نجاح', `تم استيراد ${resData.count || importedRegions.length} منطقة وتوزيعها بنجاح!`, 'success');
          fetchRegions();
        } else {
          showAlert('خطأ', 'حدث خطأ أثناء استيراد وتوزيع المناطق.', 'error');
        }
      } catch (err) {
        console.error(err);
        showAlert('خطأ', 'فشل قراءة ملف Excel. يرجى التحقق من صيغة الملف.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    if (regionFileInputRef.current) regionFileInputRef.current.value = '';
  };

  // Filters
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    user.phone.includes(userSearch) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredExams = examinations.filter(exam => 
    exam.name.toLowerCase().includes(examSearch.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col space-y-4 font-arabic" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 text-right">إدارة النظام</h2>
        <p className="text-slate-500 mt-1 text-right">إدارة المستخدمين والصلاحيات، وإدارة قائمة الفحوصات وأسعارها.</p>
      </div>

      {/* Modern Tabs Row */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'users' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          المستخدمين والموظفين
        </button>
        <button 
          onClick={() => setActiveTab('examinations')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'examinations' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          الفحوصات والأسعار (Excel)
        </button>
        <button 
          onClick={() => setActiveTab('regions')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'regions' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-500" />
          تعريف وتوزيع المناطق
        </button>
        <button 
          onClick={() => setActiveTab('appearance')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'appearance' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Palette className="w-4 h-4 text-pink-500" />
          مظهر النظام (Appearance)
        </button>
        <button 
          onClick={() => setActiveTab('technology')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'technology' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <SettingsIcon className="w-4 h-4 text-slate-500" />
          إعدادات التكنولوجيا
        </button>
        <button 
          onClick={() => setActiveTab('booking_link')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'booking_link' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <LinkIcon className="w-4 h-4 text-blue-500" />
          رابط حجز المرضى
        </button>
        <button 
          onClick={() => setActiveTab('audit_trail')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'audit_trail' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4 text-amber-500" />
          سجل المتابعة والتدقيق (Audit Trail)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col min-h-0">
        {activeTab === 'users' ? (
          /* USERS TAB CONTENT */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="بحث بالاسم أو الهاتف..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-4 pr-10 bg-slate-50 text-right font-medium" 
                />
              </div>
              <Button onClick={() => handleOpenUserModal()} className="bg-green-600 hover:bg-green-700 text-white gap-2 whitespace-nowrap w-full sm:w-auto font-semibold">
                <UserPlus className="w-4 h-4" />
                إضافة مستخدم
              </Button>
            </div>

            <div className="rounded-md border border-slate-200 flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-600 text-right">المستخدم</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-right">رقم الهاتف</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-right">الصلاحية</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-center">الحالة</TableHead>
                    <TableHead className="text-center w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/70 border-b border-slate-50/80 transition-colors group">
                      <TableCell>
                        <div className="font-black text-slate-800 text-right text-[15px]">{user.name}</div>
                        <div className="text-xs text-slate-500 font-medium mt-1 text-right flex gap-2 items-center justify-end flex-wrap">
                          <span className="font-mono text-slate-400 font-bold" dir="ltr">({user.email})</span>
                          {user.password && (
                            <span className="bg-green-50/50 text-green-700 px-2 py-0.5 rounded-md font-mono text-[10px] font-black border border-green-100 shadow-sm">
                              كلمة المرور: {user.password}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm font-mono font-bold text-slate-600" dir="ltr">{user.phone}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`font-extrabold shadow-sm ${user.role === 'مسؤول' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''} ${user.role === 'مبرمج مواعيد' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''} ${user.role === 'ساحب منزلي' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}`}>
                          {user.role}
                        </Badge>
                        {user.role === 'ساحب منزلي' && (
                          <div className="text-[10px] text-emerald-700 mt-1.5 font-bold flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              تغطية: {user.governorate} {user.shift ? `(${user.shift})` : ''}
                              {user.governorate === 'عمان' && user.ammanSector && ` - ${user.ammanSector}`}
                            </div>
                            {user.dailyLimit && (
                              <div className="flex items-center gap-1 opacity-80">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                أقصى عدد مواعيد يومي: <span className="font-mono">{user.dailyLimit}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`font-extrabold shadow-sm ${user.status === 'نشط' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenUserModal(user)} className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-3">
                            <Users className="w-5 h-5 text-slate-300" />
                          </div>
                          <span className="font-medium text-sm">لا يوجد مستخدمين مطابقين للبحث.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : activeTab === 'examinations' ? (
          /* EXAMINATIONS TAB CONTENT */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 w-full">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="بحث باسم الفحص..." 
                  value={examSearch}
                  onChange={e => setExamSearch(e.target.value)}
                  className="pl-4 pr-11 bg-white border-slate-200 text-right font-bold h-11 rounded-[14px] shadow-sm focus:border-green-500 focus:ring-green-500" 
                />
              </div>
              
              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                  accept=".xlsx, .xls"
                  className="hidden" 
                />
                
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 gap-2 font-bold transition-all shadow-sm rounded-xl h-11 px-5"
                >
                  <Upload className="w-4 h-4" />
                  استيراد من Excel
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handleExportTemplate}
                  className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 gap-2 font-bold transition-all shadow-sm rounded-xl h-11 px-5"
                >
                  <FileDown className="w-4 h-4" />
                  تصدير نموذج Excel
                </Button>

                <Button 
                  onClick={() => handleOpenExamModal()} 
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold shadow-sm shadow-green-200/50 hover:-translate-y-0.5 transition-all rounded-xl h-11 px-6"
                >
                  <Activity className="w-4 h-4" />
                  إضافة فحص يدوي
                </Button>

                {examinations.length > 0 && (
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleDeleteAllExams}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2 whitespace-nowrap font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف جميع الفحوصات
                  </Button>
                )}
              </div>
            </div>

            {/* Explanatory text */}
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 border border-slate-100 mb-4 text-right">
              💡 يمكنك تحميل ملف Excel وتعديل أسعار الفحوصات به، ثم إعادة استيراده لتحديث قائمة الأسعار فوراً. سيقوم النظام بحساب إجمالي سعر الفحوصات تلقائياً عند حجز المواعيد الجديدة.
            </div>

            <div className="rounded-[20px] border border-slate-100 flex-1 overflow-auto bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-extrabold text-slate-500 text-right uppercase tracking-wider text-xs">اسم الفحص الطبي</TableHead>
                    <TableHead className="font-extrabold text-slate-500 text-right uppercase tracking-wider text-xs w-48">السعر (دينار أردني)</TableHead>
                    <TableHead className="text-center w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => (
                    <TableRow key={exam.id} className="hover:bg-slate-50/70 border-b border-slate-50/80 transition-colors group">
                      <TableCell className="text-right">
                        <div className="font-black text-slate-800 text-[15px]">{exam.name}</div>
                        {exam.notes && (
                          <div className="text-xs text-amber-700 mt-1 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            الشروط: {exam.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-[15px] font-black font-mono text-green-700 bg-green-50/50 inline-block px-3 py-1 rounded-lg border border-green-100/50 shadow-sm">{exam.price} د.أ</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenExamModal(exam)} className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExam(exam.id)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-48 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-3">
                            <Activity className="w-5 h-5 text-slate-300" />
                          </div>
                          <span className="font-medium text-sm">لا يوجد فحوصات مسجلة حالياً. قم بإضافة فحوصات يدوياً أو استيرادها من ملف Excel.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : activeTab === 'regions' ? (
          /* REGIONS TAB CONTENT */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="بحث باسم المنطقة أو المحافظة..." 
                  value={regionSearch}
                  onChange={e => setRegionSearch(e.target.value)}
                  className="pl-4 pr-11 bg-white border-slate-200 text-right font-bold h-11 rounded-[14px] shadow-sm focus:border-green-500 focus:ring-green-500" 
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <input 
                  type="file" 
                  ref={regionFileInputRef}
                  onChange={handleImportRegionsExcel}
                  accept=".xlsx, .xls"
                  className="hidden" 
                />

                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => regionFileInputRef.current?.click()}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 gap-2 font-bold transition-all shadow-sm rounded-xl h-11 px-5"
                >
                  <Upload className="w-4 h-4" />
                  استيراد توزيع المناطق
                </Button>

                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleExportRegionsTemplate}
                  className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 gap-2 font-bold transition-all shadow-sm rounded-xl h-10"
                >
                  <FileDown className="w-4 h-4" />
                  تصدير نموذج المناطق
                </Button>

                <Button onClick={() => handleOpenRegionModal()} className="bg-green-600 hover:bg-green-700 text-white gap-2 font-bold shadow-sm shadow-green-200/50 hover:-translate-y-0.5 transition-all rounded-xl h-10">
                  <MapPin className="w-4 h-4" />
                  إضافة منطقة جديدة
                </Button>

                {regions.length > 0 && (
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleDeleteAllRegions}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2 font-bold transition-all shadow-sm rounded-xl h-10"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف جميع المناطق
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-l from-green-50 to-white rounded-[20px] p-5 text-sm font-medium text-slate-700 border border-green-100/50 mb-6 text-right shadow-sm flex items-start gap-4 leading-relaxed">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 border border-green-200">
                <span className="text-xl">💡</span>
              </div>
              <p className="mt-1.5">
                يمكنك هنا ربط وتوزيع المناطق وتحديد فترات التغطية صباحي / مسائي لكل منطقة مع تحديد مواعيدها. عند حجز موعد جديد في هذه المنطقة، سيتم تحديد فترة وساعات الموعد تلقائياً للتسهيل والسرعة.
              </p>
            </div>

            <div className="rounded-[20px] border border-slate-100 flex-1 overflow-auto bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-extrabold text-slate-500 text-right uppercase tracking-wider text-xs">المحافظة</TableHead>
                    <TableHead className="font-extrabold text-slate-500 text-right uppercase tracking-wider text-xs">اسم المنطقة</TableHead>
                    <TableHead className="font-extrabold text-slate-500 text-right uppercase tracking-wider text-xs">الجولة (الفترة)</TableHead>
                    <TableHead className="font-extrabold text-slate-500 text-right uppercase tracking-wider text-xs">نافذة التغطية الزمنية</TableHead>
                    <TableHead className="text-center w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions
                    .filter(r => 
                      r.regionName.toLowerCase().includes(regionSearch.toLowerCase()) ||
                      r.governorate.toLowerCase().includes(regionSearch.toLowerCase())
                    )
                    .map((reg) => (
                      <TableRow key={reg.id} className="hover:bg-slate-50/70 border-b border-slate-50/80 transition-colors group">
                        <TableCell className="text-right font-black text-slate-800">
                          <div className="flex flex-col items-start gap-1">
                            {reg.governorate}
                            {reg.governorate === 'عمان' && reg.ammanSector && (
                              <span className="text-[10px] text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-md font-extrabold shadow-sm">
                                عمان {reg.ammanSector}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-700">
                          {reg.regionName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`font-extrabold shadow-sm ${
                            reg.shift === 'صباحي' 
                              ? 'bg-amber-50 text-amber-800 border-amber-200' 
                              : 'bg-green-50 text-green-800 border-green-200'
                          }`}>
                            {reg.shift}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-slate-600 text-xs">
                          <div className="font-mono font-bold">
                            <span className="text-slate-400 text-[10px] ml-1">الأيام العادية:</span>
                            من {formatTimeTo12Hour(reg.timeFrom)} إلى {formatTimeTo12Hour(reg.timeTo)}
                          </div>
                          {(reg.fridayTimeFrom || reg.fridayTimeTo) && (
                            <div className="font-mono text-indigo-600 mt-1">
                              <span className="text-indigo-400 text-[10px] ml-1">الجمعة:</span>
                              من {formatTimeTo12Hour(reg.fridayTimeFrom || reg.timeFrom || '08:00')} إلى {formatTimeTo12Hour(reg.fridayTimeTo || reg.timeTo || '12:00')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenRegionModal(reg)} className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {reg.id && (
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteRegion(reg.id!)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  {regions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-3">
                            <MapPin className="w-5 h-5 text-slate-300" />
                          </div>
                          <span className="font-medium text-sm">لا يوجد مناطق مسجلة حالياً.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : activeTab === 'technology' ? (
          /* SECURE TECHNOLOGY & KEY MANAGEMENT CONTENT */
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full mt-4 space-y-6 pb-8 px-4" dir="rtl">
              {/* Security Header Card */}
              <div className="bg-gradient-to-r from-emerald-50/50 via-teal-50/10 to-green-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2 flex-row-reverse text-right">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <SettingsIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">إدارة المفاتيح والرموز السرية الآمنة</h3>
                    <p className="text-xs text-slate-500">مخفية بالكامل في خلفية الخادم ومحمية بشكل مشفر.</p>
                  </div>
                </div>
              </div>

              {/* Form Config */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">مفتاح Google Maps API</h4>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block text-right">Google Maps API Key</label>
                    <input
                      type="password"
                      value={googleMapsKey}
                      onChange={e => setGoogleMapsKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-left"
                      dir="ltr"
                    />
                    <p className="text-xs text-slate-500 text-right leading-relaxed">
                      يتم حفظ هذا المفتاح بأمان في الخادم المباشر ومزامنتها على قاعدة البيانات في الخلفية.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <span className="text-sm font-bold">W</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">إعدادات ربط واتساب الآمنة (WhatsApp Server Proxy)</h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 block text-right">رابط WhatsApp API URL</label>
                      <input
                        type="url"
                        value={whatsappUrl}
                        onChange={e => setWhatsappUrl(e.target.value)}
                        placeholder="https://api.whatsapp.com/send..."
                        className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 block text-right">رمز الوصول الخفي (WhatsApp Token / Key)</label>
                      <input
                        type="password"
                        value={whatsappKey}
                        onChange={e => setWhatsappKey(e.target.value)}
                        placeholder="Bearer token or API Key..."
                        className="w-full h-10 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                        dir="ltr"
                      />
                      <p className="text-[10px] text-red-500 font-medium">مخفي بالكامل! لن يظهر رمز الوصول هذا في متصفح المستخدمين أو في أدوات فحص المطورين، ويتم تشغيل الاتصال والرسائل من الخادم المباشر في الخلفية.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block text-right">نموذج رسالة تأكيد الموعد</label>
                        <textarea
                          value={whatsappTemplate}
                          onChange={e => setWhatsappTemplate(e.target.value)}
                          placeholder="مرحباً {اسم_المريض}، تم تثبيت الموعد..."
                          className="w-full h-24 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right font-arabic"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block text-right">نموذج رسالة إكتمال الموعد (تم سحب الدم)</label>
                        <textarea
                          value={whatsappCompletedTemplate}
                          onChange={e => setWhatsappCompletedTemplate(e.target.value)}
                          placeholder="مرحباً {اسم_المريض}، تم الانتهاء من الموعد بنجاح..."
                          className="w-full h-24 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right font-arabic"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block text-right">نموذج رسالة إلغاء الموعد</label>
                        <textarea
                          value={whatsappCanceledTemplate}
                          onChange={e => setWhatsappCanceledTemplate(e.target.value)}
                          placeholder="مرحباً {اسم_المريض}، تم إلغاء الموعد للسبب التالي: {سبب_الإلغاء}"
                          className="w-full h-24 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right font-arabic"
                        />
                      </div>

                      <p className="text-[10px] text-slate-500 text-right">
                        متغيرات متاحة: {'{اسم_المريض}'}, {'{تاريخ_الموعد}'}, {'{وقت_الموعد}'}, {'{اسم_المنطقة}'}, {'{قائمة_الفحوصات}'}, {'{إجمالي_السعر}'}, {'{سبب_الإلغاء}'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveKeys}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full font-bold h-11"
                >
                  حفظ وتطبيق التغييرات في الخلفية
                </Button>
              </div>
            </div>
          </div>
        ) : activeTab === 'appearance' ? (
          /* APPEARANCE TAB CONTENT */
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full mt-4 space-y-6 pb-8">
              {/* Header card */}
              <div className="bg-gradient-to-r from-green-50/50 via-pink-50/20 to-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2 flex-row-reverse text-right">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">إعدادات مظهر النظام المتقدمة</h3>
                    <p className="text-xs text-slate-500">قم بتخصيص الألوان والسمات والاسم والشعار وتنسيق الأبعاد بالكامل</p>
                  </div>
                </div>
              </div>

              {/* Grid sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name & Logo Logo Card */}
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold text-slate-800 text-right border-b border-slate-200 pb-2">اسم النظام وشعار العلامة التجارية</h4>
                  
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-semibold text-slate-700">الاسم الأساسي للنظام</label>
                    <Input 
                      value={systemName}
                      onChange={e => setSystemName(e.target.value)}
                      placeholder="HealthLIS"
                      className="text-right font-bold bg-white"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="text-sm font-semibold text-slate-700 block mb-1">شعار النظام الأساسي (رمز إيموجي)</label>
                    <div className="grid grid-cols-6 gap-2">
                      {['🧪', '🏥', '🔬', '🩸', '🩺', '🧬', '🛡️', '❤️', '⚕️', '📋', '💉', '🤖'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setSystemLogoEmoji(emoji)}
                          className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                            systemLogoEmoji === emoji 
                              ? 'bg-green-600 text-white shadow-md' 
                              : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo Image Upload Section */}
                  <div className="space-y-2 text-right border-t border-slate-200 pt-4">
                    <label className="text-sm font-semibold text-slate-700 block mb-1">رفع شعار مخصص (صورة)</label>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-2">يمكنك رفع صورة شعار خاصة بمؤسستك لتظهر في القائمة الجانبية وصفحة الدخول بدلاً من الإيموجي.</p>
                    
                    {systemLogoUrl ? (
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setSystemLogoUrl('')}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                          title="حذف الشعار"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 font-medium">الشعار الحالي مفعّل</span>
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center overflow-hidden">
                            <img src={systemLogoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setSystemLogoUrl(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        onClick={() => document.getElementById('logo-upload-input')?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-green-400 hover:bg-green-50/10 transition-all rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 bg-white"
                      >
                        <input 
                          id="logo-upload-input"
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === 'string') {
                                  setSystemLogoUrl(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">اسحب صورة الشعار هنا أو انقر للتصفح</span>
                        <span className="text-[10px] text-slate-400">يدعم صيغ PNG, JPG, WebP أو SVG</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accent Colors Card */}
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold text-slate-800 text-right border-b border-slate-200 pb-2">اللون الأساسي للنظام (Accent Color)</h4>
                  <p className="text-xs text-slate-500 text-right">اختر لون السمة الأساسي ليتم تطبيقه على كافة الأزرار، علامات التبويب، والروابط النشطة.</p>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'green', name: 'أزرق نيلي (الافتراضي)', color: '#4f46e5', bg: 'bg-green-600' },
                      { id: 'emerald', name: 'أخضر زمردي مريح', color: '#059669', bg: 'bg-emerald-600' },
                      { id: 'blue', name: 'أزرق طبي كلاسيكي', color: '#2563eb', bg: 'bg-blue-600' },
                      { id: 'violet', name: 'بنفسجي ملكي فخم', color: '#7c3aed', bg: 'bg-violet-600' },
                      { id: 'rose', name: 'أحمر وردي جذاب', color: '#e11d48', bg: 'bg-rose-600' },
                      { id: 'amber', name: 'برتقالي دافئ مميز', color: '#d97706', bg: 'bg-amber-600' },
                      { id: 'slate', name: 'رمادي داكن كلاسيكي', color: '#475569', bg: 'bg-slate-700' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSystemAccent(item.id)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 justify-end text-xs font-semibold transition-all cursor-pointer ${
                          systemAccent === item.id 
                            ? 'bg-white border-green-600 ring-2 ring-green-100 text-green-900 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        dir="rtl"
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${item.bg} block shrink-0`} />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border Radius Card */}
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold text-slate-800 text-right border-b border-slate-200 pb-2">درجة انحناء الحواف (Border Radius)</h4>
                  <p className="text-xs text-slate-500 text-right">قم بالتحكم في مدى انحناء الزوايا والبطاقات والحقول لتناسب هويتك المفضلة.</p>
                  
                  <div className="space-y-2">
                    {[
                      { id: 'sharp', title: 'حواف حادة ومستقيمة (Sharp)', desc: '0px - مظهر تقني ومستقيم ومربع بالكامل' },
                      { id: 'medium', title: 'حواف ناعمة بسيطة (Medium)', desc: '6px - مظهر رسمي ومناسب للأعمال والشركات' },
                      { id: 'normal', title: 'انحناء طبيعي وعصري (Normal - الافتراضي)', desc: '12px - مظهر مرن وجميل ومريح للعين' },
                      { id: 'high', title: 'دائرية وانحناء عالي (Highly Rounded)', desc: '24px - مظهر ودود، ناعم جداً ومستقبلي' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSystemRounded(item.id)}
                        className={`w-full p-3 rounded-xl border flex flex-col items-end text-right transition-all cursor-pointer ${
                          systemRounded === item.id 
                            ? 'bg-white border-green-600 ring-2 ring-green-100 shadow-sm' 
                            : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm font-bold text-slate-800">{item.title}</span>
                        <span className="text-xs text-slate-500 mt-1">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar customization card */}
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold text-slate-800 text-right border-b border-slate-200 pb-2">مظهر ولون القائمة الجانبية (Sidebar)</h4>
                  <p className="text-xs text-slate-500 text-right">تحكم في طابع وتصميم القائمة الجانبية للتنقل.</p>
                  
                  <div className="space-y-2.5">
                    {[
                      { id: 'light', title: 'القائمة الجانبية الفاتحة (Light)', desc: 'خلفية ناصعة مريحة ومطابقة لتصميم النظام العام' },
                      { id: 'dark', title: 'القائمة الجانبية الداكنة الفخمة (Dark)', desc: 'خلفية بلون داكن أنيق لتباين أفضل وأكثر راحة للمسؤول' },
                      { id: 'green', title: 'لون السمة الممتد (Accent Theme)', desc: 'خلفية بلون مستوحى مباشرة من اللون الأساسي المختار' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSystemSidebarTheme(item.id)}
                        className={`w-full p-3 rounded-xl border flex flex-col items-end text-right transition-all cursor-pointer ${
                          systemSidebarTheme === item.id 
                            ? 'bg-white border-green-600 ring-2 ring-green-100 shadow-sm' 
                            : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm font-bold text-slate-800">{item.title}</span>
                        <span className="text-xs text-slate-500 mt-1">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Extra / Dense Settings Card */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-4 text-right">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">خيارات تنسيق الأبعاد الإضافية</h4>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 flex-row-reverse">
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">الوضع المضغوط العالي للكثافة (Compact Mode)</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">تقليل الهوامش والمسافات والحشوات داخل الجداول لعرض أكبر كمية ممكنة من المواعيد دون الحاجة للتمرير كثيراً</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemCompactMode(systemCompactMode === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      systemCompactMode === 'true' ? 'bg-green-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        systemCompactMode === 'true' ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onClick={saveAppearanceSettings}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl h-auto flex items-center gap-2 flex-row-reverse cursor-pointer"
                >
                  <Palette className="w-5 h-5" />
                  حفظ وتطبيق المظهر الجديد
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('هل أنت متأكد من رغبتك في إعادة ضبط مظهر النظام إلى الإعدادات الافتراضية؟')) {
                      safeSetItem('localStorage', 'SYSTEM_NAME', 'HealthLIS');
                      safeSetItem('localStorage', 'SYSTEM_LOGO_EMOJI', '🧪');
                      safeRemoveItem('localStorage', 'SYSTEM_LOGO_URL');
                      safeSetItem('localStorage', 'SYSTEM_ACCENT', 'green');
                      safeSetItem('localStorage', 'SYSTEM_ROUNDED', 'normal');
                      safeSetItem('localStorage', 'SYSTEM_SIDEBAR_THEME', 'light');
                      safeSetItem('localStorage', 'SYSTEM_COMPACT_MODE', 'false');
                      
                      setSystemName('HealthLIS');
                      setSystemLogoEmoji('🧪');
                      setSystemLogoUrl('');
                      setSystemAccent('green');
                      setSystemRounded('normal');
                      setSystemSidebarTheme('light');
                      setSystemCompactMode('false');
                      
                      window.dispatchEvent(new Event('system-appearance-changed'));
                      showAlert('تمت الإعادة', 'تم إعادة ضبط مظهر النظام للافتراضيات.', 'success');
                    }
                  }}
                  className="border-slate-300 hover:bg-slate-100 text-slate-600 font-bold px-6 py-3 rounded-xl h-auto cursor-pointer"
                >
                  إعادة ضبط المصنع
                </Button>
              </div>
            </div>
          </div>
        ) : activeTab === 'booking_link' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto w-full mt-4 space-y-6" dir="rtl">
              <div className="bg-gradient-to-r from-blue-50/50 via-indigo-50/10 to-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2 flex-row-reverse text-right">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">رابط حجز المواعيد المباشر</h3>
                    <p className="text-xs text-slate-500">شارك هذا الرابط مع المرضى ليتمكنوا من حجز المواعيد مباشرة</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <h4 className="font-bold text-slate-800 text-right">الرابط الخاص بك</h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-left font-mono text-sm text-slate-600 overflow-x-auto whitespace-nowrap">
                    {window.location.origin}/book
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/book`);
                      showAlert('تم النسخ', 'تم نسخ رابط الحجز بنجاح', 'success');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-auto py-3 px-6 shrink-0 flex items-center gap-2 font-bold"
                  >
                    <Copy className="w-4 h-4" />
                    نسخ الرابط
                  </Button>
                  <Button
                    onClick={() => window.open('/book', '_blank')}
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl h-auto py-3 px-4 shrink-0 flex items-center gap-2 font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    تجربة الرابط
                  </Button>
                </div>
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm leading-relaxed">
                  <strong>ملاحظة:</strong> سيتم إدراج المواعيد المحجوزة عبر هذا الرابط في صفحة "لوحة التحكم" بحالة <strong>"جديد"</strong>، لتتمكن من مراجعتها وتعيينها لساحب.
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 mt-6">
                <div className="flex items-center gap-3 justify-end mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 text-right">رابط تقييم الخدمة</h3>
                    <p className="text-xs text-slate-500 text-right">شارك هذا الرابط مع المرضى ليتمكنوا من تقييم خدماتكم</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Star className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-left font-mono text-sm text-slate-600 overflow-x-auto whitespace-nowrap">
                    {window.location.origin}/rating
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/rating`);
                      showAlert('تم النسخ', 'تم نسخ رابط التقييم بنجاح', 'success');
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-auto py-3 px-6 shrink-0 flex items-center gap-2 font-bold"
                  >
                    <Copy className="w-4 h-4" />
                    نسخ الرابط
                  </Button>
                  <Button
                    onClick={() => window.open('/rating', '_blank')}
                    variant="outline"
                    className="border-amber-200 text-amber-600 hover:bg-amber-50 rounded-xl h-auto py-3 px-4 shrink-0 flex items-center gap-2 font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    تجربة الرابط
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'audit_trail' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="بحث باسم المريض، الحقل، المسؤول..." 
                    value={auditSearchQuery}
                    onChange={e => setAuditSearchQuery(e.target.value)}
                    className="pl-4 pr-10 bg-slate-50 text-right font-semibold" 
                  />
                </div>
                {/* Field Filter */}
                <div className="w-full sm:w-52">
                  <Select value={auditFilterField} onValueChange={setAuditFilterField}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-right font-semibold">
                      <SelectValue placeholder="تصفية حسب الحقل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحقول</SelectItem>
                      {uniqueFields.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Actions */}
              <Button 
                onClick={exportAuditTrailToExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold whitespace-nowrap rounded-xl shadow-sm h-11"
              >
                <FileDown className="w-4 h-4" />
                تصدير سجل المواعيد
              </Button>
            </div>

            {/* Audit Trail List/Table */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/50">
              {isLoadingAppointments ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="font-bold text-sm">جاري تحميل سجل التدقيق...</span>
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <History className="w-12 h-12 text-slate-300" />
                  <span className="font-bold">لا يوجد سجلات تدقيق تطابق معايير البحث</span>
                </div>
              ) : (
                <div className="p-1">
                  <Table className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-right font-black text-slate-700">تاريخ الإجراء</TableHead>
                        <TableHead className="text-right font-black text-slate-700">المسؤول</TableHead>
                        <TableHead className="text-right font-black text-slate-700">المريض والطلب</TableHead>
                        <TableHead className="text-right font-black text-slate-700">الحقل المعدل</TableHead>
                        <TableHead className="text-right font-black text-slate-700">القيمة السابقة</TableHead>
                        <TableHead className="text-right font-black text-slate-700">القيمة الجديدة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditLogs.map((log) => (
                        <TableRow 
                          key={log.id} 
                          className={log.isDeleted ? "bg-rose-50/20 hover:bg-rose-50/35 transition-colors border-rose-100" : "hover:bg-slate-50/80 transition-colors"}
                        >
                          <TableCell className="font-semibold text-slate-600 font-mono text-xs whitespace-nowrap">
                            {formatAuditTimestamp(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-800 border border-slate-200 shadow-3xs">
                              {log.user || 'نظام ذكي'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-sm truncate">{log.patientName}</span>
                                {log.isDeleted && (
                                  <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-md font-black select-none">
                                    محذوف
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                <span>ID: {log.appointmentId}</span>
                                {log.testName && <span className="text-slate-300">|</span>}
                                <span className="truncate max-w-[120px]">{log.testName}</span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-700">
                            {log.field}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-500">
                            {log.field === 'الحالة' ? getStatusBadge(log.oldValue) : (
                              <span className="line-through opacity-85">{log.oldValue || '—'}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900">
                            {log.field === 'الحالة' ? (
                              getStatusBadge(log.newValue)
                            ) : log.field === 'حذف الموعد' ? (
                              <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 font-bold">
                                {log.newValue || '—'}
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                {log.newValue || '—'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* USER MODAL */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-right font-bold">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">الاسم الكامل</label>
              <Input 
                value={userFormData.name} 
                onChange={e => setUserFormData({...userFormData, name: e.target.value})} 
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">اسم المستخدم</label>
              <Input 
                type="text" 
                dir="ltr" 
                value={userFormData.email} 
                onChange={e => setUserFormData({...userFormData, email: e.target.value})} 
                placeholder="مثال: khaled"
                className="text-left font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">رقم الهاتف</label>
                <Input 
                  dir="ltr" 
                  value={userFormData.phone} 
                  onChange={e => setUserFormData({...userFormData, phone: e.target.value})} 
                  placeholder="07XXXXXXXX"
                  className="text-left font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">كلمة المرور</label>
                <Input 
                  type="password" 
                  dir="ltr" 
                  value={userFormData.password || ""} 
                  onChange={e => setUserFormData({...userFormData, password: e.target.value})} 
                  className="text-left font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">الصلاحية</label>
                <Select value={userFormData.role} onValueChange={v => setUserFormData({...userFormData, role: v as Role})}>
                  <SelectTrigger className="text-right font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مسؤول" className="text-right font-medium">مسؤول</SelectItem>
                    <SelectItem value="مبرمج مواعيد" className="text-right font-medium">مبرمج مواعيد</SelectItem>
                    <SelectItem value="منسق مواعيد" className="text-right font-medium">منسق مواعيد</SelectItem>
                    <SelectItem value="ساحب منزلي" className="text-right font-medium">ساحب منزلي</SelectItem>
                    <SelectItem value="مشاهد" className="text-right font-medium">مشاهد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">الحالة</label>
                <Select value={userFormData.status} onValueChange={v => setUserFormData({...userFormData, status: v as 'نشط' | 'غير نشط'})}>
                  <SelectTrigger className="text-right font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نشط" className="text-right font-medium">نشط</SelectItem>
                    <SelectItem value="غير نشط" className="text-right font-medium">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {userFormData.role === 'ساحب منزلي' && (
              <div className="space-y-4 border-t border-slate-100 pt-4 bg-slate-50 p-3 rounded-lg text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">المحافظة المغطاة</label>
                    <Select value={userFormData.governorate} onValueChange={v => setUserFormData({...userFormData, governorate: v})}>
                      <SelectTrigger className="text-right font-medium bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="عمان" className="text-right font-medium">عمان</SelectItem>
                        <SelectItem value="إربد" className="text-right font-medium">إربد</SelectItem>
                        <SelectItem value="الزرقاء" className="text-right font-medium">الزرقاء</SelectItem>
                        <SelectItem value="كل المحافظات" className="text-right font-medium">كل المحافظات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">جولة التغطية</label>
                    <Select value={userFormData.shift} onValueChange={v => setUserFormData({...userFormData, shift: v})}>
                      <SelectTrigger className="text-right font-medium bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="صباحي" className="text-right font-medium">صباحي</SelectItem>
                        <SelectItem value="مسائي" className="text-right font-medium">مسائي</SelectItem>
                        <SelectItem value="كلاهما" className="text-right font-medium">كلاهما</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {userFormData.governorate === 'عمان' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">نطاق التغطية داخل عمان</label>
                    <Select value={userFormData.ammanSector || 'كلاهما'} onValueChange={v => setUserFormData({...userFormData, ammanSector: v as any})}>
                      <SelectTrigger className="text-right font-medium bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="شرقية" className="text-right font-medium">عمان الشرقية</SelectItem>
                        <SelectItem value="غربية" className="text-right font-medium">عمان الغربية</SelectItem>
                        <SelectItem value="كلاهما" className="text-right font-medium">كلاهما (الشرقية والغربية)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">الحد الأقصى للمواعيد يومياً (اختياري)</label>
                  <Input 
                    type="number"
                    min="1"
                    dir="ltr"
                    value={userFormData.dailyLimit || ''} 
                    onChange={e => setUserFormData({...userFormData, dailyLimit: e.target.value})} 
                    placeholder="مثال: 14"
                    className="text-left font-mono bg-white"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 flex justify-start">
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)} className="font-semibold">إلغاء</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={handleSaveUser}>حفظ المستخدم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EXAMINATION MODAL */}
      <Dialog open={isExamModalOpen} onOpenChange={setIsExamModalOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-right font-bold">{editingExam ? 'تعديل فحص' : 'إضافة فحص جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">اسم الفحص الطبي</label>
              <Input 
                value={examFormData.name} 
                placeholder="مثال: فحص السكر التراكمي (HbA1c)"
                onChange={e => setExamFormData({...examFormData, name: e.target.value})} 
                className="text-right font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">السعر (بالدينار الأردني)</label>
              <Input 
                type="number"
                step="any"
                value={examFormData.price} 
                placeholder="مثال: 6.5"
                onChange={e => setExamFormData({...examFormData, price: e.target.value})} 
                className="text-right font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">شروط أو ملاحظات الفحص (اختياري)</label>
              <textarea
                value={examFormData.notes} 
                placeholder="مثال: بحاجة إلى ترتيبات خاصة"
                onChange={e => setExamFormData({...examFormData, notes: e.target.value})} 
                className="w-full min-h-[80px] rounded-md border border-slate-200 p-2 text-sm text-right outline-none focus:border-green-500 font-arabic bg-white"
              />
            </div>
            
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <input 
                type="checkbox" 
                id="requiresFasting" 
                checked={examFormData.requiresFasting || false} 
                onChange={e => setExamFormData({...examFormData, requiresFasting: e.target.checked})} 
                className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="requiresFasting" className="text-sm font-semibold text-slate-700 cursor-pointer">
                يتطلب صيام لمدة 10-12 ساعة مع السماح بشرب الماء
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2 flex justify-start">
            <Button variant="outline" onClick={() => setIsExamModalOpen(false)} className="font-semibold">إلغاء</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={handleSaveExam}>حفظ الفحص</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REGION CONFIGURATION MODAL */}
      <Dialog open={isRegionModalOpen} onOpenChange={setIsRegionModalOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-right font-bold">{editingRegion ? 'تعديل تعريف المنطقة' : 'تعريف منطقة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">المحافظة</label>
              <Select value={regionFormData.governorate} onValueChange={v => setRegionFormData({...regionFormData, governorate: v as any})}>
                <SelectTrigger className="text-right font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="عمان" className="text-right font-medium">عمان</SelectItem>
                  <SelectItem value="إربد" className="text-right font-medium">إربد</SelectItem>
                  <SelectItem value="الزرقاء" className="text-right font-medium">الزرقاء</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {regionFormData.governorate === 'عمان' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">نطاق تغطية المنطقة داخل عمان</label>
                <Select value={regionFormData.ammanSector || 'غربية'} onValueChange={v => setRegionFormData({...regionFormData, ammanSector: v as any})}>
                  <SelectTrigger className="text-right font-medium bg-white border border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="شرقية" className="text-right font-medium">عمان الشرقية</SelectItem>
                    <SelectItem value="غربية" className="text-right font-medium">عمان الغربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">اسم المنطقة / الحي / الشارع</label>
              <Input 
                value={regionFormData.regionName} 
                placeholder="مثال: خلدا، وسط البلد، الجبيهة..."
                onChange={e => setRegionFormData({...regionFormData, regionName: e.target.value})} 
                className="text-right font-semibold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">الجولة (الفترة المتاحة)</label>
              <Select value={regionFormData.shift} onValueChange={v => setRegionFormData({...regionFormData, shift: v as any})}>
                <SelectTrigger className="text-right font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="صباحي" className="text-right font-medium">صباحي</SelectItem>
                  <SelectItem value="مسائي" className="text-right font-medium">مسائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-bold text-slate-700">توقيت الأيام (الأحد - الخميس والسبت)</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">من الساعة</label>
                  <Input 
                    type="time" 
                    value={regionFormData.timeFrom} 
                    onChange={e => setRegionFormData({...regionFormData, timeFrom: e.target.value})} 
                    className="text-right font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">إلى الساعة</label>
                  <Input 
                    type="time" 
                    value={regionFormData.timeTo} 
                    onChange={e => setRegionFormData({...regionFormData, timeTo: e.target.value})} 
                    className="text-right font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-xl space-y-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-bold text-indigo-700">توقيت يوم الجمعة</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-indigo-600">من الساعة</label>
                  <Input 
                    type="time" 
                    value={regionFormData.fridayTimeFrom || ''} 
                    onChange={e => setRegionFormData({...regionFormData, fridayTimeFrom: e.target.value})} 
                    className="text-right font-mono border-indigo-200 focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-indigo-600">إلى الساعة</label>
                  <Input 
                    type="time" 
                    value={regionFormData.fridayTimeTo || ''} 
                    onChange={e => setRegionFormData({...regionFormData, fridayTimeTo: e.target.value})} 
                    className="text-right font-mono border-indigo-200 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 flex justify-start">
            <Button variant="outline" onClick={() => setIsRegionModalOpen(false)} className="font-semibold">إلغاء</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={handleSaveRegion}>حفظ المنطقة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CUSTOM CONFIRMATION MODAL */}
      <Dialog open={confirmModal.isOpen} onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg text-right font-bold text-slate-900">{confirmModal.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-right text-sm text-slate-600 font-arabic">
            {confirmModal.message}
          </div>
          <DialogFooter className="gap-2 flex justify-start">
            <Button variant="outline" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="font-semibold">إلغاء</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={confirmModal.onConfirm}>تأكيد الحذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CUSTOM ALERT MODAL */}
      <Dialog open={alertModal.isOpen} onOpenChange={(open) => setAlertModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg text-right font-bold text-slate-900">{alertModal.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-right text-sm text-slate-600 font-arabic flex items-center gap-2">
            {alertModal.type === 'success' && <span className="text-emerald-600 text-xl">✓</span>}
            {alertModal.type === 'error' && <span className="text-red-600 text-xl">⚠️</span>}
            {alertModal.type === 'warning' && <span className="text-amber-600 text-xl">⚠️</span>}
            {alertModal.type === 'info' && <span className="text-blue-600 text-xl">ℹ️</span>}
            <span>{alertModal.message}</span>
          </div>
          <DialogFooter className="flex justify-start">
            <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}>حسناً</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
