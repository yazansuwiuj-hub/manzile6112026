import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Clock, MapPin, User as UserIcon, Phone, FileText, 
  DollarSign, Activity, Loader2, ArrowRight, CheckCircle, Check, Navigation, ClipboardList,
  Search, Upload, Image as ImageIcon, X, FileUp, Info, HelpCircle
} from 'lucide-react';
import { User } from '../types';
import { formatTimeTo12Hour } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface NewAppointmentPageProps {
  user: User;
  onSuccess: () => void;
  onNavigate: (page: string) => void;
}

interface Examination { requiresFasting?: boolean;
  id: string;
  name: string;
  price: number;
}

export function NewAppointmentPage({ user, onSuccess, onNavigate }: NewAppointmentPageProps) {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [testers, setTesters] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [savedAppointmentId, setSavedAppointmentId] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [requiresFasting, setRequiresFasting] = useState(false);
  const [governorate, setGovernorate] = useState('عمان');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [regions, setRegions] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState<'صباحي' | 'مسائي' | ''>('');
  const [selectedSector, setSelectedSector] = useState<'شرقية' | 'غربية' | ''>('');
  const [regionSearchQuery, setRegionSearchQuery] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [selectedTesterName, setSelectedTesterName] = useState('');
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('08:00');
  const [timeTo, setTimeTo] = useState('10:00');
  const [price, setPrice] = useState('0');
  const [notes, setNotes] = useState('');

  // Multi-select Examinations states
  const [selectedExams, setSelectedExams] = useState<Examination[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Custom single test adding state
  const [customExamName, setCustomExamName] = useState('');
  const [customExamPrice, setCustomExamPrice] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Attachments states
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Smart Patient History states
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [matchedPatient, setMatchedPatient] = useState<any | null>(null);
  const [showAutoFillBanner, setShowAutoFillBanner] = useState(false);

  // Extra scheduler-configurable fields
  const [priority, setPriority] = useState<'عادي' | 'عاجل'>('عادي');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [insurance, setInsurance] = useState('لا يوجد');

  const jordanGovernorates = ['عمان', 'إربد', 'الزرقاء'];

  // Load Examinations & Phlebotomists & Historical Bookings
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    fetchFormOptions();
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const fetchFormOptions = async () => {
    setIsLoadingData(true);
    try {
      const [examsRes, usersRes, regionsRes, apptsRes] = await Promise.all([
        fetch('/api/examinations'),
        fetch('/api/users'),
        fetch('/api/regions'),
        fetch('/api/appointments')
      ]);

      if (examsRes.ok) {
        const examsData = await examsRes.json();
        setExaminations(examsData);
      }

      if (regionsRes && regionsRes.ok) {
        const regionsData = await regionsRes.json();
        setRegions(regionsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const phlebotomists = usersData.filter((u: User) => u.role === 'ساحب منزلي' && u.status === 'نشط');
        setTesters(phlebotomists);
        if (phlebotomists.length > 0) {
          setSelectedTesterName(phlebotomists[0].name);
        } else {
          setSelectedTesterName('غير محدد');
        }
      }

      if (apptsRes && apptsRes.ok) {
        const apptsData = await apptsRes.json();
        setAllAppointments(apptsData);
      }
    } catch (err) {
      console.error('Error loading page options:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Smart Patient lookup hook
  useEffect(() => {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (cleanPhone.length >= 7) {
      const match = allAppointments.find(
        (a: any) => a.phone && a.phone.trim().replace(/\s+/g, '') === cleanPhone
      );
      if (match) {
        setMatchedPatient(match);
        setShowAutoFillBanner(true);
      } else {
        setMatchedPatient(null);
        setShowAutoFillBanner(false);
      }
    } else {
      setMatchedPatient(null);
      setShowAutoFillBanner(false);
    }
  }, [phone, allAppointments]);

  const handleAutoFill = () => {
    if (!matchedPatient) return;
    setName(matchedPatient.name || '');
    setAge(matchedPatient.age ? String(matchedPatient.age) : '');
    setNotes(matchedPatient.notes || '');
    
    // Attempt location matching
    if (matchedPatient.location) {
      const parts = matchedPatient.location.split(' - ');
      const gov = parts[0] || 'عمان';
      
      // We must invoke Governorate change
      setGovernorate(gov);
      
      if (parts[1]) {
        // Find matching region
        const cleanedRegionName = parts[1].split(' (')[0];
        const foundReg = regions.find(
          r => r.governorate === gov && r.regionName.includes(cleanedRegionName)
        );
        if (foundReg) {
          setSelectedRegionId(foundReg.id);
          if (gov === 'عمان') {
            setTimeFrom(foundReg.timeFrom);
            setTimeTo(foundReg.timeTo);
            if (foundReg.shift) setSelectedShift(foundReg.shift);
            if (foundReg.ammanSector) setSelectedSector(foundReg.ammanSector);
          }
        }
      }

      // Try to parse detailed address
      const addrDetail = matchedPatient.location.match(/\(([^)]+)\)/);
      if (addrDetail && addrDetail[1]) {
        setDetailedAddress(addrDetail[1]);
      } else if (parts[2]) {
        setDetailedAddress(parts[2]);
      } else {
        setDetailedAddress(parts[1] || '');
      }
    }

    if (matchedPatient.locationUrl) {
      setLocationUrl(matchedPatient.locationUrl);
    }

    if (matchedPatient.testerName && matchedPatient.testerName !== 'غير محدد') {
      setSelectedTesterName(matchedPatient.testerName);
    }

    if (matchedPatient.priority) {
      setPriority(matchedPatient.priority);
    }

    if (matchedPatient.paymentMethod) {
      setPaymentMethod(matchedPatient.paymentMethod);
    }

    if (matchedPatient.insurance) {
      setInsurance(matchedPatient.insurance);
    }

    setShowAutoFillBanner(false);
  };

  // Automatically update price when selectedExams list changes
  useEffect(() => {
    const total = selectedExams.reduce((sum, item) => sum + item.price, 0);
    setPrice(total.toString());
    const anyFasting = selectedExams.some(item => item.requiresFasting);
    setRequiresFasting(anyFasting);
  }, [selectedExams]);

  // Reset selected tester if they are not in the filtered list or if there is exactly 1 tester
  useEffect(() => {
    const filtered = getFilteredTesters();
    if (filtered.length === 1) {
      // As long as it's one employee, it will automatically select it
      setSelectedTesterName(filtered[0].name);
    } else if (filtered.length > 1) {
      // If there are multiple, check if current selection is still in the filtered list
      const isStillAvailable = filtered.some(t => t.name === selectedTesterName);
      if (!isStillAvailable) {
        // Auto-select the first one so it shows as selected
        setSelectedTesterName(filtered[0].name);
      }
    } else {
      setSelectedTesterName('غير محدد');
    }
  }, [governorate, selectedShift, selectedSector, selectedRegionId, testers]);

  const handleGovernorateChange = (gov: string) => {
    setGovernorate(gov);
    setSelectedRegionId('');
    setDetailedAddress('');
    setSelectedShift('');
    setSelectedSector('');
    setRegionSearchQuery('');
  };

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    if (!regionId || regionId === 'other') {
      return;
    }

    const reg = regions.find(r => r.id === regionId);
    if (reg) {
      setDetailedAddress(reg.regionName);

      if (governorate === 'عمان') {
        const isFriday = date && new Date(date).getDay() === 5;

        if (isFriday) {
          setTimeFrom(reg.fridayTimeFrom || reg.timeFrom);
          setTimeTo(reg.fridayTimeTo || reg.timeTo);
        } else {
          setTimeFrom(reg.timeFrom);
          setTimeTo(reg.timeTo);
        }
      }
    }
  };

  useEffect(() => {
    if (!selectedRegionId) return;

    const reg = regions.find(r => r.id === selectedRegionId);
    if (!reg) return;

    const isFriday = date && new Date(date).getDay() === 5;

    if (isFriday) {
      setTimeFrom(reg.fridayTimeFrom || reg.timeFrom);
      setTimeTo(reg.fridayTimeTo || reg.timeTo);
    } else {
      setTimeFrom(reg.timeFrom);
      setTimeTo(reg.timeTo);
    }
  }, [date, selectedRegionId, regions]);

  const getFilteredTesters = () => {
    let activeShift = selectedShift;
    let regionSector = selectedSector;
    
    if (governorate === 'عمان' && selectedRegionId) {
      const selectedReg = regions.find(r => r.id === selectedRegionId);
      if (selectedReg) {
        activeShift = selectedReg.shift || activeShift;
        regionSector = selectedReg.ammanSector || regionSector;
      }
    }

    return testers.filter(t => {
      const govMatch = !t.governorate || 
                       t.governorate === 'كل المحافظات' || 
                       t.governorate === governorate;
      if (!govMatch) return false;

      if (governorate === 'عمان' && activeShift) {
        const shiftMatch = !t.shift || 
                           t.shift === 'كلاهما' || 
                           t.shift === activeShift;
        if (!shiftMatch) return false;
      }

      if (governorate === 'عمان' && regionSector) {
        const sectorMatch = !t.ammanSector ||
                            t.ammanSector === 'كلاهما' ||
                            t.ammanSector === regionSector;
        if (!sectorMatch) return false;
      }

      return true;
    });
  };

  const handleToggleExam = (exam: Examination) => {
    const exists = selectedExams.some(e => e.id === exam.id);
    if (exists) {
      setSelectedExams(selectedExams.filter(e => e.id !== exam.id));
    } else {
      setSelectedExams([...selectedExams, exam]);
    }
  };

  const handleRemoveExam = (examId: string) => {
    setSelectedExams(selectedExams.filter(e => e.id !== examId));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let text = e.target.value;
    
    // First, map the 'b' key which produces 'لا' or its ligatures
    text = text.replace(/لا/g, 'b')
               .replace(/ﻻ/g, 'b')
               .replace(/لأ/g, 'b')
               .replace(/لإ/g, 'b')
               .replace(/لآ/g, 'b')
               .replace(/ﻷ/g, 'b')
               .replace(/ﻹ/g, 'b')
               .replace(/ﻵ/g, 'b');
               
    // Convert Arabic keyboard layout characters to English
    const arabicToEnglishMap: Record<string, string> = {
      'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'د': ']',
      'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k', 'م': 'l', 'ك': ';', 'ط': '\'',
      'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'ى': 'n', 'ة': 'm', 'و': ',', 'ز': '.', 'ظ': '/',
      'ذ': '`', 'ّ': '~',
      'َ': 'Q', 'ً': 'W', 'ُ': 'E', 'ٌ': 'R', 'إ': 'Y', '‘': 'U', '÷': 'I', '×': 'O', '؛': 'P',
      'ِ': 'A', 'ٍ': 'S', 'أ': 'H', 'ـ': 'J', '،': 'K', '؟': '?'
    };
    
    const converted = text.split('').map(char => arabicToEnglishMap[char] || char).join('');
    setSearchQuery(converted);
  };

  const handleAddCustomExam = () => {
    if (!customExamName.trim()) return;
    const itemPrice = parseFloat(customExamPrice) || 0;
    const tempId = `custom-${Date.now()}`;
    const newExam: Examination = {
      id: tempId,
      name: customExamName.trim(),
      price: itemPrice
    };
    setSelectedExams([...selectedExams, newExam]);
    setCustomExamName('');
    setCustomExamPrice('');
    setShowCustomInput(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. الرجاء اختيار ملف أصغر من 5 ميجابايت.');
      return;
    }

    try {
      setAttachmentName(file.name);

      const formData = new FormData();
      formData.append('attachment', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل رفع الملف');
      }

      setAttachmentUrl(data.url);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'فشل رفع الملف');
      setAttachmentUrl('');
      setAttachmentName('');
    }
  };

  const handleClearAttachment = () => {
    setAttachmentUrl('');
    setAttachmentName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !age || !notes) {
      setErrorMsg('الرجاء تعبئة حقول المريض الإلزامية (الاسم، الهاتف، العمر، والملاحظات).');
      return;
    }

    // Condition to the "add" (handleSubmit) function
    if (governorate === 'عمان') {
      if (!selectedShift) {
        setErrorMsg('الرجاء تحديد الفترة (صباحي / مسائي).');
        return;
      }
      if (selectedShift === 'صباحي' && !selectedSector) {
        setErrorMsg('الرجاء تحديد النطاق لعمان (شرقية / غربية).');
        return;
      }
      if (!selectedRegionId) {
        setErrorMsg('الرجاء البحث واختيار المنطقة الجغرافية المعرّفة.');
        return;
      }
    } else {
      if (!selectedRegionId) {
        setErrorMsg('الرجاء البحث واختيار المنطقة الجغرافية المعرّفة.');
        return;
      }
    }

    // Mode-specific validation
    if (selectedExams.length === 0 && !attachmentUrl) {
      setErrorMsg('الرجاء تحديد فحص واحد على الأقل من القائمة، أو إرفاق صورة للوصفة.');
      return;
    }

    if (
      selectedExams.length === 0 &&
      attachmentUrl &&
      (!price || Number(price) <= 0)
    ) {
      setErrorMsg('الرجاء إدخال سعر الطلب لأن الموعد يحتوي على مرفق فقط.');
      return;
    }

    if (selectedTesterName && selectedTesterName !== 'غير محدد') {
      const tester = testers.find(t => t.name === selectedTesterName);
      if (tester && tester.dailyLimit) {
        const activeCount = allAppointments.filter(a => a.testerName === tester.name && (a.status === 'جديد' || a.status === 'قائم')).length;
        if (activeCount >= tester.dailyLimit) {
          setErrorMsg(`المواعيد مكتملة للساحب المختار (${tester.name}). الرجاء اختيار ساحب آخر أو فترة أخرى.`);
          return;
        }
      }
    } else {
      const availableTesters = getFilteredTesters();
      if (availableTesters.length > 0) {
        const allFull = availableTesters.every(t => {
          const activeCount = allAppointments.filter(a => a.testerName === t.name && (a.status === 'جديد' || a.status === 'قائم')).length;
          return t.dailyLimit && activeCount >= t.dailyLimit;
        });
        if (allFull) {
          setErrorMsg('جميع المواعيد للساحبين في هذه المنطقة والفترة ممتلئة بالكامل. لا يمكن إضافة الموعد حالياً.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const regionObj = regions.find(r => r.id === selectedRegionId);
      const finalLocation = regionObj
        ? `${governorate} - ${regionObj.regionName}${detailedAddress ? ` (${detailedAddress})` : ''}`
        : `${governorate}${detailedAddress ? ` - ${detailedAddress}` : ''}`;

      let finalTestName = '';
      if (selectedExams.length > 0) {
        finalTestName = selectedExams.map(e => e.name).join(' ، ');
      }

      const payload = {
        testId: `APT-${Date.now()}`,
        name,
        phone,
        age: parseInt(age) || 0,
        requiresFasting,
        testName: finalTestName,
        location: finalLocation,
        locationUrl: locationUrl || '',
        testerName: selectedTesterName || 'غير محدد',
        date,
        time: `${timeFrom} - ${timeTo}`,
        price: parseFloat(price) || 0,
        notes: notes || '',
        attachmentUrl: attachmentUrl || '',
        status: 'جديد',
        createdByUser: user.name,
        priority,
        paymentMethod,
        insurance,
        lastVisit: matchedPatient ? matchedPatient.date : '-'
      };

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setSavedAppointmentId(data.id || '');
        setIsSavedSuccessfully(true);
        onSuccess();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'فشل في حفظ الموعد. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ في الاتصال بالخادم.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setPhone('');
    setAge('');
    setDetailedAddress('');
    setLocationUrl('');
    setNotes('');
    setSelectedExams([]);
    setAttachmentUrl('');
    setAttachmentName('');
    setIsSavedSuccessfully(false);
    setPrice('0');
    setPriority('عادي');
    setPaymentMethod('نقدي');
    setInsurance('لا يوجد');
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  };

  useEffect(() => {
    if (isSavedSuccessfully) {
      const timer = setTimeout(() => {
        onNavigate('dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSavedSuccessfully, onNavigate]);

  if (isSavedSuccessfully) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/50" dir="rtl">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center scale-110 animate-bounce">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">تم تثبيت الموعد بنجاح</h3>
            <p className="text-slate-500 text-sm">
              جاري الانتقال إلى اللوحة الرئيسية...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('dashboard')} 
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="رجوع للرئيسية"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-arabic">طلب سحب منزلي جديد</h2>
            <p className="text-slate-500 mt-1 font-arabic text-sm">قم بتعبئة بيانات المريض والخدمة لجدولة موعد زيارة السحب المنزلي بدقة.</p>
          </div>
        </div>
      </div>



      {isLoadingData ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-2" />
          <p className="text-slate-500 text-sm">جاري جلب الفحوصات والساحبين المتوفرين...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Step 1: Patient Information Card */}
            <Card className="lg:col-span-2 shadow-sm border border-slate-200/60 hover:shadow-md hover:border-green-200/50 transition-all duration-300 rounded-[20px] overflow-hidden">
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 p-6">
                <CardTitle className="text-[1.1rem] font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100/50">
                    <UserIcon className="w-4 h-4 text-green-600" />
                  </div>
                  بيانات المريض الأساسية
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500 mr-10 mt-1">
                  الرجاء إدخال الاسم الرباعي ورقم الهاتف للتواصل وتأكيد الحضور.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {showAutoFillBanner && matchedPatient && (
                  <div className="bg-gradient-to-r from-green-50 to-green-100/50 border border-green-200/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-300 text-right shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0 border border-green-200/50">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <p className="text-sm font-extrabold text-green-900 leading-tight">تم العثور على ملف مريض سابق مطابق!</p>
                        <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                          الاسم: <span className="font-bold text-slate-900">{matchedPatient.name}</span> | 
                          آخر زيارة: <span className="font-mono font-bold text-slate-900">{matchedPatient.date}</span> | 
                          الساحب المفضل: <span className="font-bold text-green-700">{matchedPatient.testerName}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          العنوان السابق: {matchedPatient.location}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAutoFill}
                      className="h-10 px-5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shrink-0 flex items-center gap-2 self-end md:self-center shadow-sm shadow-green-100 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      استيراد وتعبئة البيانات تلقائياً
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">اسم المريض الكامل *</label>
                    <div className="relative group">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100/50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors">
                        <UserIcon className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                      </div>
                      <Input 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: أحمد محمد علي حسن" 
                        className="pr-12 h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl bg-slate-50/50 font-semibold text-sm transition-all hover:bg-slate-100/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">رقم الهاتف *</label>
                    <div className="relative group">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100/50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors">
                        <Phone className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                      </div>
                      <Input 
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="مثال: 0791234567" 
                        className="pr-12 h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl font-mono text-right bg-slate-50/50 font-semibold text-sm transition-all hover:bg-slate-100/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">العمر (بالسنوات) *</label>
                    <Input 
                      required
                      type="number"
                      min="0"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="مثال: 32" 
                      className="h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl bg-slate-50/50 font-mono text-right font-semibold text-sm transition-all hover:bg-slate-100/50"
                    />
                  </div>

                  {requiresFasting && (
                    <div className="space-y-2 flex flex-col justify-end">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">ملاحظات طبية خاصة للمريض *</label>
                    <button 
                      type="button" 
                      onClick={() => setNotes("لا يوجد")}
                      className="text-xs text-green-700 hover:text-green-800 font-extrabold bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors border border-green-100 cursor-pointer"
                    >
                      لا يوجد ملاحظات
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100/50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors">
                      <FileText className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                    </div>
                    <Input 
                      required
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="مثال: المريض مقعد، لديه فوبيا من الإبر" 
                      className="pr-12 h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl bg-slate-50/50 font-semibold text-sm transition-all hover:bg-slate-100/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Address & Location Info */}
            <Card className="shadow-sm border border-slate-200/60 hover:shadow-md hover:border-green-200/50 transition-all duration-300 rounded-[20px] overflow-hidden">
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 p-6">
                <CardTitle className="text-[1.1rem] font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100/50">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  الموقع الجغرافي والعنوان
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500 mr-10 mt-1">
                  اختر المحافظة والمنطقة لتحديد الجولة والوقت والساحب بدقة.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-right">
                {/* 1. Governorate Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">المحافظة</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {jordanGovernorates.map((gov) => (
                      <button
                        key={gov}
                        type="button"
                        onClick={() => handleGovernorateChange(gov)}
                        className={`h-12 px-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center cursor-pointer ${
                          governorate === gov
                            ? 'bg-green-600 border-green-600 text-white shadow-sm shadow-green-100 ring-2 ring-green-600 ring-offset-1'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {gov}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Under Amman: Morning/Evening Selection */}
                {governorate === 'عمان' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-slate-700 block">الفترة الزمنية لجولات عمان *</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShift('صباحي');
                          setSelectedSector('');
                          setSelectedRegionId('');
                          setRegionSearchQuery('');
                        }}
                        className={`h-12 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          selectedShift === 'صباحي'
                            ? 'bg-green-600 border-green-600 text-white shadow-sm shadow-green-100 ring-2 ring-green-600 ring-offset-1'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span>☀️ صباحي (صباحاً)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShift('مسائي');
                          setSelectedSector('');
                          setSelectedRegionId('');
                          setRegionSearchQuery('');
                        }}
                        className={`h-12 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          selectedShift === 'مسائي'
                            ? 'bg-green-600 border-green-600 text-white shadow-sm shadow-green-100 ring-2 ring-green-600 ring-offset-1'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span>🌙 مسائي (مساءً)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Under Amman & Morning selection: Show East/West */}
                {governorate === 'عمان' && selectedShift === 'صباحي' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-bold text-slate-700 block">نطاق التغطية داخل عمان *</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSector('شرقية');
                          setSelectedRegionId('');
                          setRegionSearchQuery('');
                        }}
                        className={`h-12 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          selectedSector === 'شرقية'
                            ? 'bg-green-600 border-green-600 text-white shadow-sm shadow-green-100 ring-2 ring-green-600 ring-offset-1'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span>📍 عمان الشرقية</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSector('غربية');
                          setSelectedRegionId('');
                          setRegionSearchQuery('');
                        }}
                        className={`h-12 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          selectedSector === 'غربية'
                            ? 'bg-green-600 border-green-600 text-white shadow-sm shadow-green-100 ring-2 ring-green-600 ring-offset-1'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span>📍 عمان الغربية</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Region Specification & Search */}
                {((governorate !== 'عمان') || 
                  (governorate === 'عمان' && selectedShift === 'مسائي') ||
                  (governorate === 'عمان' && selectedShift === 'صباحي' && selectedSector)) && (
                  <div className="space-y-3 animate-in fade-in duration-200 pt-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>تحديد المنطقة الجغرافية المحددة للطلب *</span>
                      <span className="text-[10px] text-green-700 bg-green-50 px-2 py-1 rounded-md font-bold">ابحث أو تصفّح لاختيار المنطقة</span>
                    </label>

                    <div className="relative group">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100/50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors">
                        <Search className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                      </div>
                      <Input
                        type="text"
                        value={regionSearchQuery}
                        onChange={(e) => setRegionSearchQuery(e.target.value)}
                        placeholder="ابحث عن منطقتك هنا..."
                        className="pr-11 h-11 border-slate-200 focus-visible:ring-green-500 rounded-xl text-right"
                      />
                    </div>

                    {/* Filtered Region Results */}
                    <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-2.5 max-h-[180px] overflow-y-auto space-y-1.5">
                      {regions
                        .filter(r => {
                          if (r.governorate !== governorate) return false;
                          if (governorate === 'عمان') {
                            if (r.shift !== selectedShift) return false;
                            if (selectedShift === 'صباحي' && selectedSector && r.ammanSector !== selectedSector) return false;
                          }
                          if (regionSearchQuery) {
                            return r.regionName.toLowerCase().includes(regionSearchQuery.toLowerCase());
                          }
                          return true;
                        })
                        .map((r) => {
                          const isSelected = selectedRegionId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleRegionChange(r.id)}
                              className={`w-full text-right px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-sm border border-emerald-600'
                                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/40'
                              }`}
                            >
                              <span>{r.regionName}</span>
                              <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                {formatTimeTo12Hour(r.timeFrom)} - {formatTimeTo12Hour(r.timeTo)}
                              </span>
                            </button>
                          );
                        })
                      }
                      {regions.filter(r => {
                        if (r.governorate !== governorate) return false;
                        if (governorate === 'عمان') {
                          if (r.shift !== selectedShift) return false;
                          if (selectedShift === 'صباحي' && selectedSector && r.ammanSector !== selectedSector) return false;
                        }
                        if (regionSearchQuery) {
                          return r.regionName.toLowerCase().includes(regionSearchQuery.toLowerCase());
                        }
                        return true;
                      }).length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400 font-medium">
                          لا يوجد مناطق تطابق خياراتك الحالية.
                        </div>
                      )}
                    </div>

                    {/* Display Selected Region Success Feedback */}
                    {selectedRegionId && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center justify-between animate-in zoom-in-95 duration-150">
                        <span>
                          📍 المنطقة المحددة: {regions.find(r => r.id === selectedRegionId)?.regionName}
                        </span>
                        <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                          تم الاختيار بنجاح
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Address notes input (replacing the detailed address textarea) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">تفاصيل العنوان أو رقم الشقة (اختياري)</label>
                  <Input 
                    value={detailedAddress}
                    onChange={(e) => setDetailedAddress(e.target.value)}
                    placeholder="مثال: عمارة رقم 12، الطابق الثالث، شقة 5"
                    className="h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl bg-slate-50/50 text-right text-xs font-semibold hover:bg-slate-100/50 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>رابط Google Maps للموقع (اختياري)</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-bold">تسهيل كبير للساحب</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100/50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors">
                      <Navigation className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                    </div>
                    <Input 
                      value={locationUrl}
                      onChange={(e) => setLocationUrl(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..." 
                      className="pr-12 h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl font-mono text-left bg-slate-50/50 font-semibold hover:bg-slate-100/50 transition-colors"
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Medical Exam & Appointment Scheduling */}
            <Card className="lg:col-span-3 shadow-sm border border-slate-200/60 hover:shadow-md hover:border-green-200/50 transition-all duration-300 rounded-[20px] overflow-hidden">
              <CardHeader className="border-b border-slate-100/50 bg-slate-50/30 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-[1.1rem] font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100/50">
                        <ClipboardList className="w-4 h-4 text-green-600" />
                      </div>
                      تفاصيل الفحوصات والجدولة وتكلفة الخدمة
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-slate-500 mr-10 mt-1">
                      اختر طريقة تقديم الفحوصات (يدوياً من النظام أو عبر صورة وصفة طبية)، ثم جدول نافذة موعد السحب.
                    </CardDescription>
                  </div>
                  
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Mode 1: Manual search and multi-select exams and Attachments combined */}
                  <div className="lg:col-span-1 space-y-5 bg-green-50/30 p-5 rounded-2xl border border-green-100/50 flex flex-col h-fit">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-green-900 flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-green-600" />
                        البحث في الفحوصات الطبية
                      </label>
                      <div className="relative group">
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors shadow-xs border border-slate-100">
                          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                        </div>
                        <Input
                          type="text"
                          dir="ltr"
                          lang="en"
                          inputMode="email"
                          placeholder="ابحث بالاسم... (مثال: CBC, ب12)"
                          value={searchQuery}
                          onChange={handleSearchChange}
                          className="pr-12 h-11 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl bg-white font-semibold text-xs text-right transition-all hover:bg-slate-50 shadow-sm"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg border border-slate-100 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtered Examinations List */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">انقر لتحديد الفحوصات المطلوبة:</span>
                      <div className="border border-slate-200/80 rounded-xl bg-white max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-sm p-1">
                        {examinations
                          .filter(exam => exam.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((exam) => {
                            const isSelected = selectedExams.some(e => e.id === exam.id);
                            return (
                              <div
                                key={exam.id}
                                onClick={() => handleToggleExam(exam)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-xs transition-all duration-200 ${
                                  isSelected ? 'bg-green-50 text-green-700 font-bold border border-green-100/50' : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                                }`}
                              >
                                <span>{exam.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border border-slate-100">
                                    {exam.price} د.أ
                                  </span>
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'bg-green-600 border-green-600 text-white' : 'border-slate-300'}`}>
                                    {isSelected && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Selected Badges Section */}
                    {selectedExams.length > 0 && (
                      <div className="space-y-3 border-t border-green-100/80 pt-4">
                        <label className="text-[10px] font-extrabold text-green-900 flex items-center justify-between uppercase tracking-wider">
                          <span>الفحوصات المختارة ({selectedExams.length})</span>
                          <button
                            type="button"
                            onClick={() => setSelectedExams([])}
                            className="text-red-500 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            مسح الكل
                          </button>
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-white/60 rounded-xl border border-slate-100/80 shadow-inner">
                          {selectedExams.map((exam) => (
                            <span
                              key={exam.id}
                              className="inline-flex items-center gap-1.5 bg-white text-green-700 border border-green-200/80 shadow-sm rounded-lg pl-1 pr-2 py-1 text-[10px] font-bold transition-all hover:border-green-300 group"
                            >
                              <span>{exam.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExam(exam.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Option to add custom exam */}
                    <div className="border-t border-green-100/80 pt-4 space-y-2">
                      {!showCustomInput ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowCustomInput(true)}
                          className="w-full h-9 text-xs text-green-700 hover:text-green-800 hover:bg-green-100/50 border border-dashed border-green-300 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة فحص مخصص يدوياً</span>
                        </Button>
                      ) : (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-green-200/60 shadow-sm animate-in fade-in duration-200">
                          <span className="text-[10px] font-extrabold text-slate-700 block uppercase tracking-wider">تفاصيل الفحص المخصص</span>
                          <Input
                            placeholder="اسم الفحص (مثال: فحص جينات خاص)"
                            value={customExamName}
                            onChange={(e) => setCustomExamName(e.target.value)}
                            className="h-10 text-xs border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg bg-slate-50/50 font-semibold transition-all hover:bg-slate-100/50"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="any"
                              placeholder="السعر د.أ"
                              value={customExamPrice}
                              onChange={(e) => setCustomExamPrice(e.target.value)}
                              className="h-10 text-xs border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg flex-1 bg-slate-50/50 font-mono font-semibold transition-all hover:bg-slate-100/50"
                            />
                            <Button
                              type="button"
                              onClick={handleAddCustomExam}
                              className="h-10 text-xs bg-green-600 hover:bg-green-700 text-white px-4 rounded-lg font-bold shadow-sm shadow-green-100 cursor-pointer"
                            >
                              إضافة
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setShowCustomInput(false)}
                              className="h-10 text-xs text-slate-500 px-3 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                            >
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Attachment Upload Field */}
                    <div className="border-t border-green-100/80 pt-4 space-y-2 mt-2">
                      <span className="text-[10px] font-extrabold text-slate-500 block mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                        <FileUp className="w-3.5 h-3.5 text-slate-400" />
                        صورة الوصفة أو المرفق (اختياري)
                      </span>
                      {!attachmentUrl ? (
                        <div className="relative border-2 border-dashed border-slate-200 hover:border-green-400 rounded-xl p-4 bg-white hover:bg-green-50/30 text-center transition-all cursor-pointer group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-green-100 flex items-center justify-center mx-auto mb-2 transition-colors">
                            <Upload className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 group-hover:text-green-700 transition-colors">اضغط لرفع صورة مرفقة للفحص أو الوصفة</p>
                        </div>
                      ) : (
                        <div className="space-y-2 bg-white p-3 rounded-xl border border-emerald-200 shadow-sm animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                <ImageIcon className="w-4 h-4 text-emerald-600" />
                              </div>
                              <span className="font-bold text-slate-800 truncate text-[11px] leading-tight" title={attachmentName}>{attachmentName || 'Prescription.png'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleClearAttachment}
                              className="text-red-500 hover:text-red-700 font-bold text-[10px] bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              إزالة
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Total Price display inside selector */}
                    <div className="space-y-2 border-t border-green-100/80 pt-4 mt-auto">
                      <label className="text-xs font-extrabold text-green-900 uppercase tracking-wider block">سعر الخدمة الإجمالي (د.أ) *</label>
                      <div className="relative group">
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-100 group-focus-within:text-green-700 transition-colors">
                          <DollarSign className="w-4 h-4 text-green-600 transition-colors" />
                        </div>
                        <Input
                          required
                          type="number"
                          step="0.5"
                          min="0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="pr-12 h-11 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl font-mono bg-white text-slate-900 font-extrabold text-sm transition-all hover:bg-slate-50 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Scheduling & Phlebotomist selection */}
                  <div className="lg:col-span-2 space-y-6 text-right">
                    
                    {governorate === 'عمان' && selectedRegionId && selectedRegionId !== 'other' ? (
                      <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-5 text-xs text-emerald-900 leading-relaxed font-arabic flex items-start gap-3.5 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-emerald-100/80 flex items-center justify-center shrink-0 border border-emerald-200/50">
                          <Info className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div className="pt-1">
                          <strong className="block text-[13px] mb-2">📍 تم تحديد موعد الجولة تلقائياً لمنطقة ( {regions.find(r => r.id === selectedRegionId)?.regionName} ):</strong>
                          <div className="space-y-1.5 text-emerald-800/90 font-medium">
                            <p>• تتبع المنطقة للجولة: <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-600 text-white mr-1 shadow-sm">{regions.find(r => r.id === selectedRegionId)?.shift}</span></p>
                            <p>• النافذة الزمنية المخصصة: <span className="font-mono font-bold text-emerald-900 bg-white/60 px-1.5 py-0.5 rounded mr-1 shadow-xs border border-emerald-100/50">من {formatTimeTo12Hour(timeFrom)} إلى {formatTimeTo12Hour(timeTo)}</span>.</p>
                          </div>
                        </div>
                      </div>
                    ) : governorate !== 'عمان' ? (
                      <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl p-5 text-xs text-amber-900 leading-relaxed font-arabic flex items-start gap-3.5 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-amber-100/80 flex items-center justify-center shrink-0 border border-amber-200/50">
                          <HelpCircle className="w-4 h-4 text-amber-700" />
                        </div>
                        <div className="pt-1">
                          <strong className="block text-[13px] mb-2">📞 التنسيق المباشر والمواعيد لمحافظة {governorate}:</strong>
                          <p className="font-medium text-amber-800/90 leading-relaxed">
                            باقي المحافظات (إربد والزرقاء) لا ترتبط بجولات صارمة؛ سيقوم المندوب/الساحب بالتواصل الهاتفي المباشر مع المريض للاتفاق وتثبيت الوقت الأنسب لراحته.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      
                      <div className="space-y-2 sm:col-span-1">
                        <label className="text-xs font-bold text-slate-700 block">تاريخ الزيارة المطلوبة *</label>
                        <div className="relative group">
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100/50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors">
                            <Calendar className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                          </div>
                          <Input 
                            required
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="pr-12 h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl font-mono text-sm font-semibold bg-slate-50/50 transition-all hover:bg-slate-100/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">النافذة الزمنية (من)</label>
                        <div className="relative group">
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100/50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors">
                            <Clock className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                          </div>
                          <Input 
                            type="time"
                            value={timeFrom}
                            disabled={governorate === 'عمان' && selectedRegionId !== '' && selectedRegionId !== 'other'}
                            onChange={(e) => setTimeFrom(e.target.value)}
                            className="pr-12 h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl font-mono text-sm font-semibold bg-slate-50/50 transition-all hover:bg-slate-100/50 disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">النافذة الزمنية (إلى)</label>
                        <div className="relative group">
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-100/50 flex items-center justify-center pointer-events-none group-focus-within:bg-green-50 group-focus-within:text-green-600 transition-colors">
                            <Clock className="w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                          </div>
                          <Input 
                            type="time"
                            value={timeTo}
                            disabled={governorate === 'عمان' && selectedRegionId !== '' && selectedRegionId !== 'other'}
                            onChange={(e) => setTimeTo(e.target.value)}
                            className="pr-12 h-12 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl font-mono text-sm font-semibold bg-slate-50/50 transition-all hover:bg-slate-100/50 disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100"
                          />
                        </div>
                      </div>

                    </div>

                     <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">الساحب المنزلي المفضل للطلب</label>
                      <select
                        value={selectedTesterName}
                        onChange={(e) => setSelectedTesterName(e.target.value)}
                        className="w-full h-12 px-4 bg-slate-50/50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-xl text-slate-800 text-sm font-semibold transition-all hover:bg-slate-100/50"
                      >
                        <option value="غير محدد" className="text-slate-500">دع النظام يختار تلقائياً (غير محدد)</option>
                        {getFilteredTesters().map((t) => {
                           const activeCount = allAppointments.filter(a => a.testerName === t.name && (a.status === 'جديد' || a.status === 'قائم')).length;
                           const isFull = t.dailyLimit && activeCount >= t.dailyLimit;
                           return (
                             <option key={t.id} value={t.name} disabled={isFull}>
                               {t.name} (يغطي: {t.governorate} - جولة: {t.shift}) - ({activeCount} نشط{t.dailyLimit ? ` / ${t.dailyLimit}` : ''}) {isFull ? '🚨 (ممتلئ)' : ''}
                             </option>
                           );
                        })}
                      </select>
                      <p className="text-[10px] text-slate-500 font-medium">
                        * تم تصفية الساحبين النشطين تلقائياً ليعرض فقط من يغطي محافظة {governorate} {governorate === 'عمان' && selectedRegionId && selectedRegionId !== 'other' ? `والفترة الزمنية المحددة.` : '.'}
                      </p>
                    </div>



                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <Info className="w-4 h-4 text-green-500" />
                        ملخص تفاصيل الطلب الحالي
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-400 block mb-1">اسم المريض</span>
                          <span className="text-slate-800 font-semibold">{name || 'لم يكتب بعد'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 block mb-1">العنوان</span>
                          <span className="text-slate-800 font-semibold">{governorate} - {detailedAddress || 'لم يكتب بعد'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-bold text-slate-400 block mb-1">الفحوصات/الخدمة</span>
                          <span className="text-green-700 font-bold leading-relaxed">
                            {selectedExams.length > 0 
                              ? selectedExams.map(e => e.name).join(' ، ') + (attachmentName ? ` + مرفق طبي (${attachmentName})` : '')
                              : attachmentName 
                                ? `مرفق طبي (${attachmentName})`
                                : 'لا يوجد فحوصات أو مرفقات محددة'
                            }
                          </span>
                        </div>
                        <div className="col-span-2 border-t border-slate-100 pt-3 mt-1 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 uppercase tracking-wider">السعر الإجمالي للطلب</span>
                          <span className="font-extrabold text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-1.5 text-sm font-mono shadow-sm">
                            {price} دينار أردني
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

          </div>

          {/* Action Footer Button */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onNavigate('dashboard')} 
              disabled={isSubmitting}
              className="px-6 h-12 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-600 font-bold transition-colors shadow-sm"
            >
              إلغاء والعودة
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm shadow-green-200/50 flex items-center gap-2 transition-all group hover:-translate-y-0.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تسجيل الطلب وتأكيده...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  <span>تأكيد موعد السحب وحفظه</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
      {/* Toast Notification */}
      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2 slide-in-from-right-8 fade-in duration-300">
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 shadow-xl text-sm font-bold flex items-center gap-3 max-w-sm">
            <span className="text-xl shrink-0">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
