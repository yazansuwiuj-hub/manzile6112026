import React, { useState, useEffect } from 'react';
import { Calendar, User, Wallet, RefreshCw, Printer, Edit2, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Appointment, User as UserType } from "../types";

export function FinancePage({ user }: { user?: UserType }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Default to today
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local format
  );
  const [selectedTester, setSelectedTester] = useState<string>('الجميع');
  const [selectedTestAppointment, setSelectedTestAppointment] = useState<Appointment | null>(null);

  // Edit state
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editMethod, setEditMethod] = useState<string>("");

  const isAdmin = user?.role === 'مسؤول';

  const fetchFinanceData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleEditClick = (appt: Appointment) => {
    if (!isAdmin) return;
    setEditingApptId(appt.id);
    setEditPrice(appt.price?.toString() || "0");
    setEditAmount(appt.amountCollected?.toString() || "0");
    setEditMethod(appt.paymentMethod || "نقدي");
  };

  const handleSaveEdit = async (apptId: string) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: parseFloat(editPrice) || 0,
          amountCollected: parseFloat(editAmount) || 0,
          paymentMethod: editMethod,
        }),
      });
      if (res.ok) {
        setEditingApptId(null);
        fetchFinanceData();
      }
    } catch (error) {
      console.error('Error saving finance edit:', error);
    }
  };

  const handleDelete = async (apptId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل بشكل نهائي؟')) return;
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedBy: user?.name })
      });
      if (res.ok) {
        fetchFinanceData();
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const handlePrint = () => {
    let tablesHtml = testersToDisplay.map((tester) => {
      const testerAppts = completedAppointments.filter(a => (a.testerName || 'غير محدد') === tester);
      
      const testerOriginalTotal = testerAppts.reduce((sum, appt) => {
        if (appt.paymentMethod === 'كليك') return sum;
        return sum + (Number(appt.price) || 0);
      }, 0);
      
      const testerTotal = testerAppts.reduce((sum, appt) => {
        if (appt.paymentMethod === 'كليك') return sum;
        const amount = appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0;
        return sum + amount;
      }, 0);
      
      const testerDifference = testerOriginalTotal - testerTotal;
      
      const cashTotal = testerAppts.filter(a => a.paymentMethod === 'نقدي').reduce((sum, appt) => sum + (appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0), 0);
      const digitalTotal = testerAppts.filter(a => a.paymentMethod === 'دفع إلكتروني').reduce((sum, appt) => sum + (appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0), 0);
      const cliqTotal = testerAppts.filter(a => a.paymentMethod === 'كليك').reduce((sum, appt) => sum + (appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0), 0);

      const rowsHtml = testerAppts.map(appt => {
        const isCliq = appt.paymentMethod === 'كليك';
        const originalPrice = Number(appt.price) || 0;
        const amount = isCliq ? 0 : (appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0);
        const expectedFromCollector = isCliq ? 0 : originalPrice;
        const remaining = expectedFromCollector - amount;
        
        let displayPriceDiff = appt.priceDiffReason ? appt.priceDiffReason.trim() : '-';
        if (!displayPriceDiff) displayPriceDiff = '-';
        
        return `
          <tr>
            <td><strong>${appt.name}</strong></td>
            <td>${appt.testerName || 'غير محدد'}</td>
            <td>${appt.testName}</td>
            <td style="text-align: center;">${appt.paymentMethod || 'غير محدد'}</td>
            <td style="text-align: center;">${originalPrice.toFixed(1)}</td>
            <td style="text-align: center;"><strong>${amount.toFixed(1)}</strong></td>
            <td style="text-align: center; color: ${remaining > 0 ? 'red' : 'black'};">${remaining > 0 ? remaining.toFixed(1) : '0.0'}</td>
            <td style="color: #ea580c; font-weight: bold;">${displayPriceDiff}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="tester-section">
          <div class="tester-header">
            <h3>كشف حساب الساحب: ${tester}</h3>
            <div class="totals-row">
              <span>كاش: <strong>${cashTotal.toFixed(1)}</strong></span>
              <span>فيزا: <strong>${digitalTotal.toFixed(1)}</strong></span>
              <span>كليك: <strong>${cliqTotal.toFixed(1)}</strong></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>اسم المريض</th>
                <th>الساحب</th>
                <th>الفحوصات</th>
                <th>طريقة الدفع</th>
                <th>الحساب الأساسي (د.أ)</th>
                <th>المبلغ المحصل (د.أ)</th>
                <th>المتبقي / الذمة (د.أ)</th>
                <th>سبب فرق السعر</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align: left; font-weight: bold;">مجموع تحصيل الساحب لليوم:</td>
                <td style="text-align: center;">${testerOriginalTotal.toFixed(1)}</td>
                <td style="text-align: center; font-weight: bold; font-size: 16px;">${testerTotal.toFixed(1)}</td>
                <td style="text-align: center; color: ${testerDifference > 0 ? 'red' : 'black'}; font-weight: bold;">
                  ${testerDifference > 0 ? testerDifference.toFixed(1) : '0.0'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>كشف التحصيل المالي - ${selectedTester}</title>
          <style>
            @page { size: A4 landscape; margin: 1cm; }
            body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
            .meta { font-size: 14px; margin-bottom: 5px; display: flex; justify-content: center; gap: 20px; }
            .tester-section { margin-bottom: 30px; }
            .tester-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .tester-header h3 { margin: 0; font-size: 16px; }
            .totals-row { display: flex; gap: 15px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: auto; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            th, td { border: 1px solid #000; padding: 8px; text-align: right; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            tfoot { display: table-row-group; }
            tfoot td { background-color: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #555; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">كشف التحصيل المالي اليومي</div>
            <div class="meta">
              <span>التاريخ: <strong>${selectedDate}</strong></span>
              <span>المندوب: <strong>${selectedTester}</strong></span>
              <span>وقت الطباعة: <strong>${new Date().toLocaleTimeString('ar-JO')}</strong></span>
            </div>
          </div>
          
          ${tablesHtml || '<p style="text-align: center; font-size: 16px; margin-top: 50px;">لا يوجد بيانات مالية لعرضها.</p>'}
          
          <div class="footer">
            تم إصدار هذا الكشف من نظام الإدارة المالية - قسم المحاسبة
          </div>
          
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
    } else {
      alert("الرجاء السماح بالنوافذ المنبثقة (Pop-ups) للطباعة بشكل صحيح.");
    }
  };

  // Filter for completed appointments on the selected date
  const completedAppointments = appointments.filter(a => {
    if (a.status !== 'مكتمل' && a.status !== 'نتائج مستلمة') return false;
    
    // If we have completionTime (which contains the timestamp of when it was completed), use its date
    if (a.completionTime) {
      // completionTime is usually ISO string or similar, so extracting YYYY-MM-DD
      const completionDate = a.completionTime.split('T')[0];
      return completionDate === selectedDate || a.date === selectedDate;
    }
    
    // Fallback to the scheduled appointment date
    return a.date === selectedDate;
  });

  const uniqueTesters = Array.from(new Set(completedAppointments.map(a => a.testerName || 'غير محدد')));

  const testersToDisplay = selectedTester === 'الجميع' 
    ? uniqueTesters 
    : (uniqueTesters.includes(selectedTester) ? [selectedTester] : []);

  // Calculate grand total for the day based on filters
  const grandTotal = completedAppointments.reduce((sum, appt) => {
    if (selectedTester !== 'الجميع' && (appt.testerName || 'غير محدد') !== selectedTester) return sum;
    const amount = appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0;
    return sum + amount;
  }, 0);

  return (
    <div className="p-8 text-right space-y-6 w-full max-w-[1400px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[20px] shadow-sm border border-slate-100 print:hidden relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-green-500 rounded-r-[20px]" />
        <div className="pr-4">
          <h1 className="text-2xl font-black font-arabic text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            التقارير المالية اليومية
          </h1>
          <p className="text-slate-500 font-arabic text-sm mt-2 font-medium">
            تابع التحصيلات المالية للساحبين الميدانيين بناءً على المواعيد المكتملة
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            onClick={fetchFinanceData} 
            disabled={isLoading}
            variant="outline"
            className="rounded-xl h-11 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin text-green-600' : ''}`} />
            تحديث البيانات
          </Button>
          <Button 
            onClick={handlePrint} 
            variant="default"
            className="rounded-xl h-11 bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm shadow-green-200/50 transition-all"
          >
            <Printer className="w-4 h-4 ml-2" />
            طباعة الكشف المالي
          </Button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-slate-900 mb-2">كشف التحصيل المالي اليومي</h1>
        <div className="text-sm font-bold text-slate-600 flex justify-center gap-6">
          <span>التاريخ: {selectedDate}</span>
          <span>المندوب: {selectedTester}</span>
          <span>وقت الطباعة: {new Date().toLocaleTimeString('ar-JO')}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-5 bg-white p-6 rounded-[20px] shadow-sm border border-slate-100 print:hidden">
        <div className="space-y-2 flex-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            تاريخ التحصيل
          </label>
          <Input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-12 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 bg-slate-50/50 hover:bg-slate-100/50 transition-colors font-semibold"
          />
        </div>
        
        <div className="space-y-2 flex-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
            <User className="w-3.5 h-3.5" />
            الساحب الميداني
          </label>
          <select 
            value={selectedTester}
            onChange={(e) => setSelectedTester(e.target.value)}
            className="w-full h-12 border border-slate-200 focus:ring-2 focus:ring-green-500 rounded-xl px-4 outline-none text-slate-700 bg-slate-50/50 hover:bg-slate-100/50 transition-colors font-semibold"
          >
            <option value="الجميع">جميع الساحبين</option>
            {uniqueTesters.map(tester => (
              <option key={tester} value={tester}>{tester}</option>
            ))}
          </select>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50/30 border border-green-100/60 rounded-xl p-4 flex-1 flex flex-col justify-center items-center shadow-inner">
          <span className="text-[10px] font-extrabold text-green-700 mb-1 uppercase tracking-wider">إجمالي التحصيل ({selectedTester === 'الجميع' ? 'لليوم' : selectedTester})</span>
          <span className="text-3xl font-black font-mono text-green-900 tracking-tight">{grandTotal.toFixed(1)} <span className="text-sm text-green-600 font-bold ml-1">د.أ</span></span>
        </div>
      </div>

      {/* Tables per Tester */}
      {testersToDisplay.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-[20px] p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-[20px] flex items-center justify-center mx-auto mb-5">
            <Wallet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">لا يوجد بيانات مالية</h3>
          <p className="text-slate-500 font-medium">لم يتم العثور على أي مواعيد مكتملة ومحصلة في التاريخ المحدد ({selectedDate}).</p>
        </div>
      ) : (
        <div className="space-y-8">
          {testersToDisplay.map((tester) => {
            const testerAppts = completedAppointments.filter(a => (a.testerName || 'غير محدد') === tester);
            
            // Calculate totals for this tester
            const testerOriginalTotal = testerAppts.reduce((sum, appt) => {
              if (appt.paymentMethod === 'كليك') return sum;
              return sum + (Number(appt.price) || 0);
            }, 0);
            
            const testerTotal = testerAppts.reduce((sum, appt) => {
              if (appt.paymentMethod === 'كليك') return sum;
              const amount = appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0;
              return sum + amount;
            }, 0);
            
            const testerDifference = testerOriginalTotal - testerTotal;
            
            const cashTotal = testerAppts.filter(a => a.paymentMethod === 'نقدي').reduce((sum, appt) => sum + (appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0), 0);
            const digitalTotal = testerAppts.filter(a => a.paymentMethod === 'دفع إلكتروني').reduce((sum, appt) => sum + (appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0), 0);
            const cliqTotal = testerAppts.filter(a => a.paymentMethod === 'كليك').reduce((sum, appt) => sum + (appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0), 0);

            return (
              <Card key={tester} className="rounded-[20px] border border-slate-100 shadow-sm overflow-hidden print:shadow-none print:border-slate-300 print:mb-8 print:break-inside-avoid bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 print:bg-transparent print:border-b-2 print:border-slate-800">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white border border-slate-100 text-green-700 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm print:hidden">
                      {tester[0]}
                    </div>
                    كشف حساب الساحب: {tester}
                  </CardTitle>
                  
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl text-slate-600 print:border-none print:bg-transparent print:p-0">
                      كاش: <span className="font-mono text-emerald-600 font-extrabold mr-1 print:text-black">{cashTotal.toFixed(1)}</span>
                    </div>
                    <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl text-slate-600 print:border-none print:bg-transparent print:p-0">
                      فيزا: <span className="font-mono text-blue-600 font-extrabold mr-1 print:text-black">{digitalTotal.toFixed(1)}</span>
                    </div>
                    <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl text-slate-600 print:border-none print:bg-transparent print:p-0">
                      كليك: <span className="font-mono text-purple-600 font-extrabold mr-1 print:text-black">{cliqTotal.toFixed(1)}</span>
                    </div>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-right print:text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-extrabold text-slate-500 uppercase tracking-wider print:border-slate-800 print:text-black">
                        <th className="p-5 whitespace-nowrap">اسم المريض</th>
                        <th className="p-5 whitespace-nowrap">الساحب</th>
                        <th className="p-5 max-w-[200px]">الفحوصات</th>
                        <th className="p-5 text-center whitespace-nowrap">طريقة الدفع</th>
                        <th className="p-5 text-center whitespace-nowrap">الحساب الأساسي (د.أ)</th>
                        <th className="p-5 text-center whitespace-nowrap">المبلغ المحصل (د.أ)</th>
                        <th className="p-5 text-center whitespace-nowrap">المتبقي / الذمة (د.أ)</th>
                        <th className="p-5 text-center max-w-[150px]">سبب فرق السعر</th>
                        {isAdmin && <th className="p-5 text-center whitespace-nowrap print:hidden">الإجراءات</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 bg-white print:divide-slate-200">
                      {testerAppts.map((appt) => {
                        const isCliq = appt.paymentMethod === 'كليك';
                        const originalPrice = Number(appt.price) || 0;
                        const amount = isCliq ? 0 : (appt.amountCollected !== undefined && appt.amountCollected !== null ? Number(appt.amountCollected) : 0);
                        const expectedFromCollector = isCliq ? 0 : originalPrice;
                        const remaining = expectedFromCollector - amount;
                        const isFullPayment = remaining <= 0;
                        const isEditing = editingApptId === appt.id;
                        
                        return (
                          <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors print:break-inside-avoid group">
                            <td className="p-5 font-bold text-slate-800 print:text-black print:py-2">{appt.name}</td>
                            <td className="p-5 text-slate-600 font-semibold print:text-black print:py-2">{appt.testerName || 'غير محدد'}</td>
                            <td className="p-5 print:py-2 max-w-[240px]">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-800 font-bold text-xs truncate max-w-[140px] block print:max-w-none print:whitespace-normal" title={appt.testName}>
                                  {appt.testName}
                                </span>
                                <button 
                                  onClick={() => setSelectedTestAppointment(appt)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors text-[10px] font-extrabold border border-green-200/50 print:hidden cursor-pointer whitespace-nowrap opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                                >
                                  🔍 تفاصيل
                                </button>
                              </div>
                            </td>
                            <td className="p-5 text-center print:py-2">
                              {isEditing ? (
                                <select 
                                  value={editMethod} 
                                  onChange={(e) => setEditMethod(e.target.value)}
                                  className="w-full border border-slate-300 rounded-lg p-1 text-xs"
                                >
                                  <option value="نقدي">نقدي (كاش)</option>
                                  <option value="دفع إلكتروني">دفع إلكتروني (فيزا)</option>
                                  <option value="كليك">كليك (CliQ)</option>
                                </select>
                              ) : (
                                <>
                                  {appt.paymentMethod === 'نقدي' && (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200 shadow-xs print:border-none print:bg-transparent print:p-0 print:text-black tracking-wider">
                                      💵 نقدي (كاش)
                                    </span>
                                  )}
                                  {appt.paymentMethod === 'دفع إلكتروني' && (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-[11px] font-extrabold border border-blue-200 shadow-xs print:border-none print:bg-transparent print:p-0 print:text-black tracking-wider">
                                      💳 فيزا / بطاقة
                                    </span>
                                  )}
                                  {appt.paymentMethod === 'كليك' && (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-50 text-purple-800 text-[11px] font-extrabold border border-purple-200 shadow-xs print:border-none print:bg-transparent print:p-0 print:text-black tracking-wider">
                                      📱 كليك (CliQ)
                                    </span>
                                  )}
                                  {!['نقدي', 'دفع إلكتروني', 'كليك'].includes(appt.paymentMethod) && (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-extrabold border border-slate-200 shadow-xs print:border-none print:bg-transparent print:p-0 print:text-black tracking-wider">
                                      {appt.paymentMethod || 'غير محدد'}
                                    </span>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="p-5 text-center font-mono font-bold text-slate-700 print:text-black print:py-2">
                              {isEditing ? (
                                <Input 
                                  type="number" 
                                  value={editPrice} 
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-20 text-center mx-auto h-8 p-1 text-sm"
                                />
                              ) : (
                                originalPrice.toFixed(1)
                              )}
                            </td>
                            <td className="p-5 text-center print:py-2">
                              {isEditing ? (
                                <Input 
                                  type="number" 
                                  value={editAmount} 
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  className="w-20 text-center mx-auto h-8 p-1 text-sm"
                                />
                              ) : (
                                <span className={`font-extrabold font-mono text-base bg-slate-50 px-2 py-1 rounded-lg ${isFullPayment ? 'text-emerald-700' : 'text-orange-600'} print:text-black print:bg-transparent print:p-0`}>
                                  {amount.toFixed(1)}
                                </span>
                              )}
                            </td>
                            <td className="p-5 text-center print:py-2">
                              {isEditing ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                remaining > 0 ? (
                                  <span className="font-extrabold font-mono text-sm text-red-600 bg-red-50 px-2 py-1 rounded-lg print:text-black print:bg-transparent print:p-0">
                                    {remaining.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="font-bold font-mono text-sm text-slate-300 print:text-black">0.0</span>
                                )
                              )}
                            </td>
                            <td className="p-5 text-center text-xs max-w-[150px] truncate print:whitespace-normal print:py-2" title={appt.priceDiffReason}>
                              {appt.priceDiffReason ? (
                                <div className="truncate w-full text-right print:whitespace-normal">
                                  <span className="text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded-md print:text-black print:bg-transparent print:p-0">{appt.priceDiffReason.trim()}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 print:text-black">-</span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="p-5 text-center print:hidden">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <Button size="sm" onClick={() => handleSaveEdit(appt.id)} className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs rounded-md">حفظ</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingApptId(null)} className="h-7 px-3 text-xs rounded-md">إلغاء</Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => handleEditClick(appt)}>
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => handleDelete(appt.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 print:bg-transparent print:border-t-2 print:border-slate-800">
                      <tr>
                        <td colSpan={4} className="p-4 text-left font-bold text-slate-700 print:text-black">
                          مجموع تحصيل الساحب لليوم:
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-500 font-mono print:text-black">
                            {testerOriginalTotal.toFixed(1)} د.أ
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-black font-mono text-xl text-green-700 block print:text-black">
                            {testerTotal.toFixed(1)} د.أ
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {testerDifference > 0 ? (
                            <span className="font-bold font-mono text-sm text-red-600 block print:text-black">
                              {testerDifference.toFixed(1)} د.أ
                            </span>
                          ) : (
                            <span className="font-bold font-mono text-sm text-slate-300 block print:text-black">0.0 د.أ</span>
                          )}
                        </td>
                        <td></td>
                        {isAdmin && <td className="print:hidden"></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Test details modal */}
      {selectedTestAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-l from-green-50 to-slate-50 p-6 border-b border-slate-100 flex items-center justify-between flex-row-reverse">
              <h3 className="font-bold text-lg text-slate-800">تفاصيل الفحوصات المطلوبة</h3>
              <button 
                onClick={() => setSelectedTestAppointment(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 text-right" dir="rtl">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">اسم المريض:</span>
                  <span className="font-bold text-slate-900">{selectedTestAppointment.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">الساحب الميداني:</span>
                  <span className="font-semibold text-slate-700">{selectedTestAppointment.testerName || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">تاريخ الموعد:</span>
                  <span className="font-mono text-slate-600">{selectedTestAppointment.date}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block">قائمة الفحوصات:</span>
                <div className="flex flex-wrap gap-2 justify-start flex-row-reverse">
                  {(selectedTestAppointment.testName || "")
                    .split(/[،,]/)
                    .map((test) => test.trim())
                    .filter((test) => test.length > 0)
                    .map((test, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-50 text-green-800 text-xs font-bold border border-green-100 shadow-sm"
                      >
                        🧬 {test}
                      </span>
                    ))
                  }
                </div>
              </div>

              {selectedTestAppointment.notes && (
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-amber-700 block">ملاحظات:</span>
                  <p className="text-slate-600 text-xs leading-relaxed">{selectedTestAppointment.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button 
                onClick={() => setSelectedTestAppointment(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-2 rounded-xl h-auto"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

