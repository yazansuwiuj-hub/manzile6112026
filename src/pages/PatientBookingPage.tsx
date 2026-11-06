import React, { useState, useEffect, useRef } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Phone, MapPin, TestTube, CheckCircle2, Navigation, FileUp, Image as ImageIcon, Map , Search, X } from 'lucide-react';

const formatTimeWithPeriod = (timeStr: string) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 || 12;
  const m = minutes !== '00' ? `:${minutes}` : '';
  return `${h12}${m} ${period}`;
};

export function PatientBookingPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    date: '',
    shift: '',
    governorate: 'عمان',
    regionId: '',
    locationUrl: '',
    detailedAddress: '',
    notes: '',
    attachmentUrl: '',
    attachmentName: '',
    requiresFasting: false
  });

  const [regions, setRegions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [examinations, setExaminations] = useState<any[]>([]);
  const [regionSearch, setRegionSearch] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    const anyFasting = examinations
      .filter(e => selectedExams.includes(e.name))
      .some(e => e.requiresFasting);
    setFormData(prev => ({ ...prev, requiresFasting: anyFasting }));
  }, [selectedExams, examinations]);

  const examDropdownRef = useRef<HTMLDivElement>(null);
  const regionDropdownRef = useRef<HTMLDivElement>(null);

  const [systemName, setSystemName] = useState(safeGetItem('localStorage', 'SYSTEM_NAME') || 'نظام إدارة سحب الدم');
  const [logoEmoji, setLogoEmoji] = useState(safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🩸');
  const [logoUrl, setLogoUrl] = useState(safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');

  const jordanGovernorates = ['عمان', 'إربد', 'الزرقاء'];



  useEffect(() => {
    fetch('/api/appearance')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.SYSTEM_NAME) setSystemName(data.SYSTEM_NAME);
          if (data.SYSTEM_LOGO_EMOJI) setLogoEmoji(data.SYSTEM_LOGO_EMOJI);
          if (data.SYSTEM_LOGO_URL) setLogoUrl(data.SYSTEM_LOGO_URL);
        }
      })
      .catch(err => console.error('Error fetching appearance:', err));

    const handleAppearanceChange = () => {
      setSystemName(safeGetItem('localStorage', 'SYSTEM_NAME') || 'نظام إدارة سحب الدم');
      setLogoEmoji(safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🩸');
      setLogoUrl(safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');
    };
    
    window.addEventListener('system-appearance-changed', handleAppearanceChange);
    return () => window.removeEventListener('system-appearance-changed', handleAppearanceChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target as Node)) {
        setIsExamDropdownOpen(false);
      }
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
        setIsRegionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/regions').then(res => res.json()),
      fetch('/api/users').then(res => res.json()),
      fetch('/api/examinations').then(res => res.json()),
      fetch('/api/appointments').then(res => res.json())
    ])
      .then(([regionsData, usersData, examsData, appointmentsData]) => {
        setRegions(regionsData || []);
        setUsers(usersData || []);
        setExaminations(examsData || []);
        setAppointments(appointmentsData || []);
      })
      .catch(err => console.error("Error fetching data:", err));
      
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData(prev => ({ ...prev, date: tomorrow.toISOString().split('T')[0] }));
  }, []);

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData({
            ...formData,
            locationUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("حدث خطأ أثناء محاولة الحصول على موقعك. يرجى التأكد من السماح بالوصول إلى الموقع.");
        }
      );
    } else {
      alert("متصفحك لا يدعم خاصية تحديد الموقع.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setAttachmentFile(file);

    setFormData(prev => ({
      ...prev,
      attachmentName: file.name,
      attachmentUrl: URL.createObjectURL(file)
    }));
  };


  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (dateError) {
      const timer = setTimeout(() => setDateError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [dateError]);

  const checkDayAvailability = (dateStr: string) => {
    if (!formData.governorate || !formData.shift) return 'unknown';
    // Check if regions exist for this governorate and shift
    const hasRegionsDay = regions.some(r => r.governorate === formData.governorate && r.shift === formData.shift);
    
    if (hasRegionsDay && !formData.regionId) return 'unknown';

    let eligibleTesters = [];
    if (hasRegionsDay) {
      const selectedRegion = regions.find(r => r.id === formData.regionId);
      if (!selectedRegion) return 'unknown';
      eligibleTesters = users.filter(u => 
        u.role === 'ساحب منزلي' && 
        u.status !== 'غير نشط' &&
        (u.governorate === selectedRegion.governorate || u.governorate === 'كل المحافظات') &&
        (u.shift === selectedRegion.shift || u.shift === 'كلاهما') &&
        (selectedRegion.governorate === 'عمان' ? (u.ammanSector === selectedRegion.ammanSector || u.ammanSector === 'كلاهما') : true)
      );
    } else {
      eligibleTesters = users.filter(u => 
        u.role === 'ساحب منزلي' && 
        u.status !== 'غير نشط' &&
        (u.governorate === formData.governorate || u.governorate === 'كل المحافظات') &&
        (u.shift === formData.shift || u.shift === 'كلاهما')
      );
    }

    if (eligibleTesters.length === 0) return 'full'; // No testers match at all

    let isAnyAvailable = false;
    for (const t of eligibleTesters) {
      const limit = t.dailyLimit || 1000;
      const activeCount = appointments.filter(a => 
        a.testerName === t.name && 
        a.date === dateStr &&
        a.status !== 'ملغي'
      ).length;
      
      if (activeCount < limit) {
        isAnyAvailable = true;
        break;
      }
    }

    return isAnyAvailable ? 'available' : 'full';
  };

  const generateFiveDays = () => {
    const days = [];
    const start = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (!formData.name || !formData.phone || !formData.age || !formData.date || !formData.locationUrl) {
        throw new Error('الرجاء تعبئة جميع الحقول الإلزامية');
      }

      const isDuplicate = appointments.some(app => 
        app.name.trim() === formData.name.trim() && 
        app.phone.trim().replace(/\s+/g, '') === formData.phone.trim().replace(/\s+/g, '') && 
        app.date === formData.date
      );

      if (isDuplicate) {
        throw new Error(`يوجد لديك موعد مؤكد مسبقاً في نفس هذا التاريخ (${formData.date}). لا يمكن حجز أكثر من موعد واحد في نفس اليوم.`);
      }

      if (checkDayAvailability(formData.date) === 'full') {
        throw new Error('المواعيد مكتملة للساحب في المنطقة المحددة في هذا التاريخ. يرجى اختيار تاريخ آخر أو فترة أخرى.');
      }

      if (selectedExams.length === 0 && !formData.attachmentUrl) {
        throw new Error('الرجاء إما إرفاق صورة للوصفة أو اختيار الفحوصات المطلوبة');
      }

      const hasRegionsValid = regions.some(r => r.governorate === formData.governorate && r.shift === formData.shift);
      if (hasRegionsValid && (!formData.shift || !formData.regionId)) {
        throw new Error('الرجاء اختيار الفترة والمنطقة');
      }

      const selectedRegion = regions.find(r => r.id === formData.regionId);
      
      let finalLocation = formData.governorate;
      let finalTime = 'غير محدد';
      let phlebName = 'غير محدد';
      
      const hasRegionsLoc = regions.some(r => r.governorate === formData.governorate && r.shift === formData.shift);
      
      if (hasRegionsLoc && selectedRegion) {
        const phleb = users.find(u => 
          u.role === 'ساحب منزلي' && 
          u.status !== 'غير نشط' &&
          (u.governorate === selectedRegion.governorate || u.governorate === 'كل المحافظات') &&
          (u.shift === selectedRegion.shift || u.shift === 'كلاهما') &&
          (selectedRegion.governorate === 'عمان' ? (u.ammanSector === selectedRegion.ammanSector || u.ammanSector === 'كلاهما') : true)
        );
        phlebName = phleb ? phleb.name : 'غير محدد';
        finalLocation = `${formData.governorate} - ${selectedRegion.regionName}${phleb ? ` (الساحب: ${phleb.name})` : ''}`;
        
        const isFriday = formData.date && new Date(formData.date).getDay() === 5;
        if (isFriday) {
          finalTime = `من الساعة ${formatTimeWithPeriod(selectedRegion.fridayTimeFrom || selectedRegion.timeFrom || '08:00')} لغاية الساعة ${formatTimeWithPeriod(selectedRegion.fridayTimeTo || selectedRegion.timeTo || '12:00')}`;
        } else {
          finalTime = `من الساعة ${formatTimeWithPeriod(selectedRegion.timeFrom)} لغاية الساعة ${formatTimeWithPeriod(selectedRegion.timeTo)}`;
        }
      } else {
        const isFriday = formData.date && new Date(formData.date).getDay() === 5;
        if (isFriday) {
          finalTime = formData.shift === 'مسائي' ? 'من الساعة 2 م لغاية الساعة 6 م' : 'من الساعة 8 ص لغاية الساعة 12 م'; // Default friday fallback if no regions
        } else {
          finalTime = formData.shift === 'مسائي' ? 'من الساعة 2 م لغاية الساعة 6 م' : 'من الساعة 8 ص لغاية الساعة 12 م';
        }
      }

      if (formData.detailedAddress) {
        finalLocation += ` | ${formData.detailedAddress}`;
      }

      const totalPrice = examinations
        .filter(e => selectedExams.includes(e.name))
        .reduce((sum, e) => sum + (Number(e.price) || 0), 0);

      const form = new FormData();

      form.append('name', formData.name);
      form.append('phone', formData.phone);
      form.append('age', formData.age);
      form.append('testName', selectedExams.length > 0 ? selectedExams.join(' + ') : 'الرجوع للمرفقات/الملاحظات');
      form.append('locationUrl', formData.locationUrl);
      form.append('location', finalLocation);
      form.append('date', formData.date);
      form.append('time', finalTime);
      form.append('testerName', phlebName);
      form.append('status', 'جديد');
      form.append('isExternalRequest', 'true');
      form.append('isPendingAcceptance', 'true');
      form.append('notes', formData.notes);
      form.append('price', String(totalPrice));
      form.append('requiresFasting', String(formData.requiresFasting));

      if (attachmentFile) {
        form.append('attachment', attachmentFile);
      }

      const res = await fetch('/api/patient-booking', {
        method: 'POST',
        body: form
      });

      if (!res.ok) {
        throw new Error('حدث خطأ أثناء الحفظ');
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter regions based on governorate and shift
  const filteredRegions = regions.filter(r => 
    r.governorate === formData.governorate && r.shift === formData.shift
  );

  const selectedRegionDetails = regions.find(r => r.id === formData.regionId);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md border-0 shadow-xl overflow-hidden rounded-[24px]">
          <CardContent className="p-10 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mt-4">تم استلام طلبك بنجاح</h2>
            <p className="text-slate-500 leading-relaxed text-lg mb-2">
              شكراً لثقتكم بنا
            </p>
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mt-4 w-full">
              <p className="font-bold text-sm">سيتم الرد عليك بتثبيت الموعد برسالة على الواتساب</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSelectedDateFull = formData.date ? checkDayAvailability(formData.date) === 'full' : false;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center text-4xl mb-4">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-2xl p-2" /> : logoEmoji}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            احجز موعداً لسحب الدم
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            {systemName}
          </p>
        </div>

        <Card className="border-0 shadow-xl rounded-[24px] overflow-hidden bg-white">
          <CardContent className="p-6 sm:p-8">

            
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Personal Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  المعلومات الشخصية
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-sm font-bold text-slate-700">الاسم الثلاثي *</Label>
                    <div className="relative">
                      <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="أدخل اسمك الكامل" 
                        className="pr-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-green-500" 
                      />

                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-700">رقم الهاتف *</Label>
                    <div className="relative">
                      <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        type="tel" 
                        placeholder="079XXXXXXX" 
                        className="pr-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-green-500" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-700">العمر *</Label>
                    <div className="relative">
                      <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        required
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                        type="number"
                        min="1"
                        max="120"
                        placeholder="أدخل العمر" 
                        className="pr-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-green-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Time & Location Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  الزمان والمكان
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-700">المحافظة *</Label>
                    <Select 
                      value={formData.governorate} 
                      onValueChange={(v) => { setFormData({...formData, governorate: v, regionId: '', shift: ''}); setDateError(''); }}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-green-500 font-medium">
                        <SelectValue placeholder="اختر المحافظة..." />
                      </SelectTrigger>
                      <SelectContent>
                        {jordanGovernorates.map(gov => (
                          <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-700">موعد صباحي ام مسائي *</Label>
                    <Select 
                      value={formData.shift} 
                      onValueChange={(v) => { setFormData({...formData, shift: v, regionId: ''}); setDateError(''); }}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-green-500 font-medium">
                        <SelectValue placeholder="اختر الفترة..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="صباحي">صباحي</SelectItem>
                        <SelectItem value="مسائي">مسائي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredRegions.length > 0 && formData.shift && (
                    <div className="space-y-1.5 relative" ref={regionDropdownRef}>
                      <Label className="text-sm font-bold text-slate-700">المنطقة *</Label>
                      <div className="relative">
                        <div 
                          className="flex items-center justify-between h-12 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 cursor-pointer"
                          onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                        >
                          <span className="text-sm font-medium text-slate-700">
                            {formData.regionId ? (
                              (() => {
                                const r = regions.find(x => x.id === formData.regionId);
                                if (!r) return 'اختر المنطقة...';
                                // Find phlebotomist
                                const phleb = users.find(u => 
                                  u.role === 'ساحب منزلي' && 
                                  u.status !== 'غير نشط' &&
                                  (u.governorate === r.governorate || u.governorate === 'كل المحافظات') &&
                                  (u.shift === r.shift || u.shift === 'كلاهما') &&
                                  (r.governorate === 'عمان' ? (u.ammanSector === r.ammanSector || u.ammanSector === 'كلاهما') : true)
                                );
                                return phleb ? `${r.regionName} (الساحب: ${phleb.name})` : r.regionName;
                              })()
                            ) : 'اختر المنطقة...'}
                          </span>
                          {isRegionDropdownOpen ? <X className="w-4 h-4 text-slate-400" /> : <Search className="w-4 h-4 text-slate-400" />}
                        </div>
                        
                        {isRegionDropdownOpen && (
                          <div className="absolute top-full mt-1 w-full z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-80">
                            <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                              <div className="relative">
                                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                  autoFocus
                                  placeholder="ابحث عن اسم المنطقة..."
                                  value={regionSearch}
                                  onChange={(e) => setRegionSearch(e.target.value)}
                                  className="h-9 pr-9 rounded-lg text-sm bg-slate-50 border-transparent focus-visible:ring-green-500"
                                />
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-1 min-h-0 max-h-64">
                              {filteredRegions.filter(r => r.regionName.toLowerCase().includes(regionSearch.toLowerCase())).length === 0 ? (
                                <div className="p-3 text-center text-sm text-slate-500">لا يوجد مناطق مطابقة</div>
                              ) : (
                                filteredRegions
                                  .filter(r => r.regionName.toLowerCase().includes(regionSearch.toLowerCase()))
                                  .map(r => {
                                    const phleb = users.find(u => 
                                      u.role === 'ساحب منزلي' && 
                                      u.status !== 'غير نشط' &&
                                      (u.governorate === r.governorate || u.governorate === 'كل المحافظات') &&
                                      (u.shift === r.shift || u.shift === 'كلاهما') &&
                                      (r.governorate === 'عمان' ? (u.ammanSector === r.ammanSector || u.ammanSector === 'كلاهما') : true)
                                    );
                                    
                                    return (
                                      <div 
                                        key={r.id} 
                                        onClick={() => {
                                          setFormData({...formData, regionId: r.id});
                                          setIsRegionDropdownOpen(false);
                                          setRegionSearch('');
                                          setDateError('');
                                        }}
                                        className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${formData.regionId === r.id ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-700'}`}
                                      >
                                        {r.regionName} {phleb && <span className="text-slate-400 text-xs mr-1 font-normal">(الساحب: {phleb.name})</span>}
                                      </div>
                                    );
                                  })
                              )}

                  
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label className="text-sm font-bold text-slate-700">تاريخ الموعد لسحب الدم *</Label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {generateFiveDays().map(dateStr => {
                         const status = checkDayAvailability(dateStr);
                         const isSelected = formData.date === dateStr;
                         return (
                           <div 
                             key={dateStr}
                             onClick={() => {
                               if (status === 'full') {
                                 setDateError(`المواعيد مكتملة للساحب في المنطقة المحددة في التاريخ ${dateStr}. يمكن اختيار جولة أخرى أو تغيير تاريخ الموعد.`);
                               } else {
                                 setFormData({...formData, date: dateStr});
                                 setDateError('');
                               }
                             }}
                             className={`relative min-w-[110px] h-20 rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all shrink-0 ${
                               isSelected ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                             } ${
                               status === 'available' ? 'bg-green-100 border-green-500 text-green-800 hover:bg-green-200' :
                               status === 'full' ? 'bg-red-100 border-red-500 text-red-800 opacity-80 hover:bg-red-200' :
                               'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                             }`}
                           >
                             {status === 'full' && (
                               <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border border-white shadow-sm flex items-center justify-center" title="المواعيد مكتملة">
                                 <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
                               </div>
                             )}
                             <span className="text-sm font-bold">{new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long' })}</span>
                             <span className="text-xs mt-1">{dateStr}</span>
                           </div>
                         );
                      })}
                    </div>
                    
                    {(!formData.shift || !formData.governorate || (filteredRegions.length > 0 && !formData.regionId)) ? (
                      <p className="text-xs text-slate-500 mt-1">يرجى تحديد المحافظة والمنطقة وفترة الموعد للتحقق من المواعيد المتاحة.</p>
                    ) : null}
                  </div>

                </div>

                {((filteredRegions.length > 0 && selectedRegionDetails) || (filteredRegions.length === 0 && formData.shift && formData.date)) && (
                  <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-sm flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="text-slate-500 block text-xs font-bold mb-0.5">وقت تواجد مندوب السحب التقريبي وسوف يتم التواصل معك قبل الموعد بربع ساعة</span>
                      <strong className="text-blue-700">
                        {selectedRegionDetails ? (
                          formData.date && new Date(formData.date).getDay() === 5 ? (
                             <>من الساعة {formatTimeWithPeriod(selectedRegionDetails.fridayTimeFrom || selectedRegionDetails.timeFrom || '08:00')} لغاية الساعة {formatTimeWithPeriod(selectedRegionDetails.fridayTimeTo || selectedRegionDetails.timeTo || '12:00')}</>
                          ) : (
                             <>من الساعة {formatTimeWithPeriod(selectedRegionDetails.timeFrom)} لغاية الساعة {formatTimeWithPeriod(selectedRegionDetails.timeTo)}</>
                          )
                        ) : (
                          formData.date && new Date(formData.date).getDay() === 5 ? (
                            <>{formData.shift === 'مسائي' ? 'من الساعة 2 م لغاية الساعة 6 م' : 'من الساعة 8 ص لغاية الساعة 12 م'}</>
                          ) : (
                            <>{formData.shift === 'مسائي' ? 'من الساعة 2 م لغاية الساعة 6 م' : 'من الساعة 8 ص لغاية الساعة 12 م'}</>
                          )
                        )}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-700">العنوان التفصيلي</Label>
                    <Input 
                      value={formData.detailedAddress}
                      onChange={(e) => setFormData({...formData, detailedAddress: e.target.value})}
                      placeholder="رقم البناية، الطابق، رقم الشقة..." 
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-green-500" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-700">موقع خرائط جوجل *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          value={formData.locationUrl}
                          onChange={(e) => setFormData({...formData, locationUrl: e.target.value})}
                          placeholder="ألصق رابط خرائط جوجل هنا" 
                          className="pr-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-green-500" 
                        />
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleGetCurrentLocation}
                        variant="outline" 
                        className="h-12 px-4 rounded-xl shrink-0 font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      >
                        <Navigation className="w-4 h-4 ml-2 text-blue-500" />
                        موقعي
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tests & Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-green-600" />
                  تفاصيل الفحوصات
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                      <FileUp className="w-4 h-4 text-slate-400" />
                      ارفق صورة الوصفة او اختر الفحوصات من الاسفل
                    </Label>
                    {!formData.attachmentUrl ? (
                      <div className="relative border-2 border-dashed border-slate-200 hover:border-green-400 rounded-xl p-6 bg-slate-50 hover:bg-green-50/30 text-center transition-all cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-green-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-600 mt-2">اضغط هنا لرفع صورة الروشتة</p>
                          <p className="text-xs text-slate-400">تدعم جميع صيغ الصور</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                              <ImageIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="font-bold text-emerald-800 truncate text-sm">
                              {formData.attachmentName || 'تم إرفاق صورة الوصفة بنجاح'}
                            </span>
                          </div>
                          <Button
                            type="button"
                            onClick={() => setFormData({ ...formData, attachmentUrl: '', attachmentName: '' })}
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            إزالة
                          </Button>
                        </div>

                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5 relative" ref={examDropdownRef}>
                      <Label className="text-sm font-bold text-slate-700">الفحوصات المطلوبة</Label>
                      <div 
                        className="min-h-12 w-full p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer flex flex-wrap gap-2 items-center"
                        onClick={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
                      >
                        {selectedExams.length === 0 ? (
                          <span className="text-slate-400 text-sm px-2">اختر الفحوصات...</span>
                        ) : (
                          selectedExams.map(exam => (
                            <span key={exam} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                              {exam}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedExams(selectedExams.filter(e => e !== exam));
                                }}
                                className="hover:text-blue-900"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      
                      {isExamDropdownOpen && (
                        <div className="absolute top-full mt-1 w-full z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-60">
                          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                            <div className="relative">
                              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input 
                                autoFocus
                                placeholder="ابحث عن اسم الفحص..."
                                value={examSearch}
                                onChange={(e) => setExamSearch(e.target.value)}
                                className="h-9 pr-9 rounded-lg text-sm bg-slate-50 border-transparent focus-visible:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-1 min-h-0 max-h-64">
                            {examinations.filter(e => e.name.toLowerCase().includes(examSearch.toLowerCase())).length === 0 ? (
                              <div className="p-3 text-center text-sm text-slate-500">لا يوجد فحوصات مطابقة</div>
                            ) : (
                              examinations
                                .filter(e => e.name.toLowerCase().includes(examSearch.toLowerCase()))
                                .map(exam => {
                                  const isSelected = selectedExams.includes(exam.name);
                                  return (
                                    <div 
                                      key={exam.id}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedExams(selectedExams.filter(e => e !== exam.name));
                                        } else {
                                          setSelectedExams([...selectedExams, exam.name]);
                                        }
                                        setExamSearch('');
                                      }}
                                      className={`w-full text-right p-3 rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${
                                        isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex flex-col">
                                        <span>{exam.name}</span>
                                        <span className={`text-xs mt-1 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                                          {exam.price} دينار
                                        </span>
                                      </div>
                                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">ملاحظات أخرى (اختياري)</Label>
                      <textarea 
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="أي ملاحظات إضافية للساحب..." 
                        className="w-full min-h-[100px] p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 resize-y text-sm" 
                      />
                    </div>
                    
                    {formData.requiresFasting && (
                      <div className="flex justify-end pt-2">
                        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl w-full text-xs font-bold leading-relaxed">
                          شروط الفحص الذي تم اختياره :<br/>
                          <br/>
                          صيام من 10-12 ساعة بعد تناول وجبة وافية (لا أكثر ولا أقل عن الأكل فقط).<br/>
                          <br/>
                          شرب الماء لا يؤثر على الفحص
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                {selectedExams.length > 0 && (
                  <div className="flex justify-between items-center mb-4 p-4 bg-green-50 rounded-xl border border-green-100">
                    <span className="font-bold text-slate-700 text-sm">التكلفة الإجمالية للفحوصات:</span>
                    <span className="font-bold text-lg text-green-700">
                      {examinations.filter(e => selectedExams.includes(e.name)).reduce((sum, e) => sum + (Number(e.price) || 0), 0)} دينار أردني
                    </span>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className={`w-full h-14 rounded-xl font-bold text-lg shadow-sm hover:shadow-md transition-all text-white ${
                    isSelectedDateFull ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={isSubmitting || (selectedExams.length === 0 && !formData.attachmentUrl) || isSelectedDateFull}
                >
                  {isSubmitting ? 'جاري الإرسال...' : isSelectedDateFull ? 'المواعيد مكتملة' : 'تأكيد وحجز الموعد'}
                </Button>
                {(selectedExams.length === 0 && !formData.attachmentUrl) && (
                  <p className="text-center text-xs text-red-500 mt-2 font-bold">
                    الرجاء إرفاق صورة للوصفة أو اختيار الفحوصات المطلوبة.
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      {/* Toast Notification */}
      {(error || dateError) && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2 slide-in-from-right-8 fade-in duration-300">
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 shadow-xl text-sm font-bold flex items-center gap-3 max-w-sm">
            <span className="text-xl shrink-0">⚠️</span>
            <span>{error || dateError}</span>
          </div>
        </div>
      )}
    </div>
  );
}

