import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, CreditCard, Receipt, FileText, CheckCircle2, 
  AlertTriangle, Save, Clock, Download, FileSpreadsheet, ShieldCheck, Check, Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  appointmentId: string;
  onBack: () => void;
}

export function FinancialCollectionPage({ appointmentId, onBack }: Props) {
  const [appt, setAppt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collectedAmountInput, setCollectedAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAppointment = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        const found = data.find((a: any) => String(a.id) === String(appointmentId));
        if (found) {
          setAppt(found);
          setCollectedAmountInput(
            found.amountCollected !== undefined && found.amountCollected !== null 
              ? String(found.amountCollected) 
              : ''
          );
          setPaymentMethod(found.paymentMethod || 'نقدي');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  if (isLoading || !appt) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const price = Number(appt.price) || 0;
  const currentCollected = Number(collectedAmountInput) || 0;
  const remaining = Math.max(0, price - currentCollected);
  
  let dynamicStatus = 'غير مدفوع';
  let statusColor = 'text-red-600 bg-red-50 border-red-100';
  let statusIcon = <AlertTriangle className="w-4 h-4" />;
  
  if (currentCollected >= price && price > 0) {
    dynamicStatus = 'مدفوع';
    statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
    statusIcon = <CheckCircle2 className="w-4 h-4" />;
  } else if (currentCollected > 0 && currentCollected < price) {
    dynamicStatus = 'دفعة جزئية';
    statusColor = 'text-orange-700 bg-orange-50 border-orange-100';
    statusIcon = <AlertTriangle className="w-4 h-4" />;
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const payload = {
        ...appt,
        amountCollected: currentCollected,
        paymentStatus: dynamicStatus,
        paymentMethod: paymentMethod,
        updatedByUser: 'أمين الصندوق'
      };
      
      if (notes) {
        payload.notes = (appt.notes ? appt.notes + ' | ' : '') + `[دفعة ${dynamicStatus} - ${currentCollected} د.أ: ${notes}]`;
      }

      await fetch(`/api/appointments/${appt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setSuccessMsg('✅ تم حفظ المعاملة المالية بنجاح وارتباطها بالموعد.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchAppointment();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Extract financial events from timeline
  const financialEvents = appt.timeline?.filter((t: any) => 
    t.title.includes('المبلغ المحصل') || t.title.includes('دفعة')
  ) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl shrink-0">
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span className="text-blue-600">💰</span> التحصيل المالي
            </h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm">
              <span className="font-mono text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">APT-{appt.testId || appt.id}</span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-700">{appt.name}</span>
            </div>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${statusColor} font-bold shadow-sm`}>
          {statusIcon}
          <span>{dynamicStatus}</span>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Patient & Appointment Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg font-bold text-slate-800">ملخص الموعد</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="p-4 flex justify-between items-center text-sm">
                  <span className="text-slate-500">اسم المريض</span>
                  <span className="font-bold text-slate-900">{appt.name}</span>
                </div>
                <div className="p-4 flex justify-between items-center text-sm">
                  <span className="text-slate-500">رقم الهاتف</span>
                  <span className="font-mono font-bold text-slate-700" dir="ltr">{appt.phone}</span>
                </div>
                <div className="p-4 flex justify-between items-center text-sm">
                  <span className="text-slate-500">تاريخ الزيارة</span>
                  <span className="font-bold text-slate-700">{appt.date}</span>
                </div>
                <div className="p-4 flex justify-between items-center text-sm">
                  <span className="text-slate-500">الساحب الميداني</span>
                  <span className="font-bold text-green-700">{appt.testerName}</span>
                </div>
                <div className="p-4 flex justify-between items-start text-sm bg-slate-50/50">
                  <span className="text-slate-500 mt-1">الفحوصات المطلوبة</span>
                  <div className="text-left font-semibold text-slate-800 max-w-[150px] leading-relaxed">
                    {appt.testName}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-slate-900 text-white">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">التفاصيل المالية للفاتورة</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">إجمالي الفحوصات</span>
                  <span className="font-mono">{price.toFixed(1)} د.أ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">رسوم الزيارة المنزلية</span>
                  <span className="font-mono">0.0 د.أ</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400">
                  <span>خصم التأمين ({appt.insurance})</span>
                  <span className="font-mono">-0.0 د.أ</span>
                </div>
                
                <div className="border-t border-slate-800 pt-3 mt-4 flex justify-between items-center">
                  <span className="font-bold">المجموع الإجمالي الكلي</span>
                  <span className="font-mono text-xl font-bold">{price.toFixed(1)} د.أ</span>
                </div>
                <div className="flex justify-between items-center mt-2 text-orange-400 font-bold bg-orange-950/30 p-2 rounded-lg">
                  <span>الرصيد المتبقي (ذمة)</span>
                  <span className="font-mono text-lg">{remaining.toFixed(1)} د.أ</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Financial Collection Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm border-t-4 border-t-blue-600">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black text-slate-900">نموذج التحصيل والقبض</CardTitle>
              <CardDescription>أدخل المبلغ المحصل لتحديث ذمة المريض تلقائياً</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Amounts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">المبلغ المطلوب (د.أ)</label>
                  <div className="h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4 font-mono text-2xl font-bold text-slate-400">
                    {price.toFixed(1)}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">المبلغ المحصل (د.أ)</label>
                  <Input 
                    type="number" 
                    step="0.5"
                    value={collectedAmountInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d{0,3}(\.\d{0,1})?$/.test(val)) {
                        setCollectedAmountInput(val);
                      }
                    }}
                    className="h-14 text-2xl font-mono font-black text-blue-700 bg-blue-50/50 border-blue-200 focus-visible:ring-blue-600 rounded-xl"
                    dir="ltr"
                    placeholder="0.0"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400">ملاحظة: حد أقصى 4 خانات (مثل 120.5).</p>
                </div>
              </div>

              {/* Status Indicator Bar */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full transition-all duration-500 ${remaining === 0 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                  style={{ width: price > 0 ? `${Math.min(100, (currentCollected / price) * 100)}%` : '0%' }}
                />
              </div>

              {/* Price Difference Reason (Visible only if there's a difference) */}
              {remaining > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-sm font-bold text-red-600">سبب فرق السعر (مطلوب)</label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg border-red-200 text-red-700 hover:bg-red-50" onClick={() => setNotes(n => n + (n ? '، ' : '') + 'خطأ في التسعير (PE)')}>خطأ في التسعير (PE)</Button>
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg border-red-200 text-red-700 hover:bg-red-50" onClick={() => setNotes(n => n + (n ? '، ' : '') + 'خصم (D)')}>خصم (D)</Button>
                    </div>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="الرجاء توضيح سبب الاختلاف في المبلغ المحصل..."
                      className="w-full h-24 bg-red-50/30 border border-red-100 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-red-500 outline-none"
                      required
                    />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">طريقة الدفع</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="نقدي">💵 نقدي (Cash)</option>
                    <option value="دفع إلكتروني">💳 بطاقة ائتمان (Visa/Mastercard)</option>
                    <option value="حوالة بنكية">🏦 حوالة بنكية / CliQ</option>
                    <option value="تأمين">🛡️ مغطى بالتأمين</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">الرقم المرجعي (اختياري)</label>
                  <Input 
                    placeholder="رقم الحوالة أو الإيصال..."
                    className="h-12 border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-200"
                >
                  <Save className="w-5 h-5 ml-2" />
                  {isSaving ? 'جاري الحفظ...' : 'تأكيد وحفظ الدفعة'}
                </Button>
                <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 font-bold text-slate-700">
                  <Printer className="w-5 h-5 ml-2 text-slate-400" />
                  طباعة الإيصال
                </Button>
                <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 font-bold text-slate-700">
                  <FileText className="w-5 h-5 ml-2 text-slate-400" />
                  إصدار فاتورة
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Audit & Timeline */}
          {financialEvents.length > 0 && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  سجل الحركات المالية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {financialEvents.map((ev: any, idx: number) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-sm">{ev.title}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{new Date(ev.time).toLocaleTimeString('ar-JO')}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">بواسطة: <span className="font-semibold text-slate-700">{ev.user}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
