import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, XCircle, DollarSign, Activity, RefreshCw, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Appointment {
  id: string;
  testerName: string;
  status: string;
  price: number;
  amountCollected?: number | null;
}

interface User {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface TesterStats {
  name: string;
  completed: number;
  canceled: number;
  totalCollected: number;
}

export function AnalyticsPage() {
  const [stats, setStats] = useState<TesterStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, apptsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/appointments')
      ]);

      if (usersRes.ok && apptsRes.ok) {
        const users: User[] = await usersRes.json();
        const appointments: Appointment[] = await apptsRes.json();

        const testers = users.filter(u => u.role === 'ساحب منزلي');

        const statsMap = new Map<string, TesterStats>();

        testers.forEach(t => {
          statsMap.set(t.name.trim(), {
            name: t.name,
            completed: 0,
            canceled: 0,
            totalCollected: 0
          });
        });

        appointments.forEach(app => {
          const tName = (app.testerName || "").trim();
          if (tName && statsMap.has(tName)) {
            const stat = statsMap.get(tName)!;
            
            if (app.status === 'مكتمل' || app.status === 'نتائج مستلمة') {
              stat.completed += 1;
              const collected = (app.amountCollected !== undefined && app.amountCollected !== null && (app.amountCollected as any) !== "") 
                ? Number(app.amountCollected) 
                : Number(app.price || 0);
              stat.totalCollected += isNaN(collected) ? 0 : collected;
            } else if (app.status === 'ملغي') {
              stat.canceled += 1;
            }
          }
        });

        setStats(Array.from(statsMap.values()));
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  return (
    <div className="p-8 text-right space-y-6 w-full max-w-[1400px] mx-auto" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[20px] shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 rounded-r-[20px]" />
        <div className="pr-4">
          <h1 className="text-2xl font-black font-arabic text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            تحليلات أداء الساحبين
          </h1>
          <p className="text-slate-500 mt-2 font-arabic text-sm font-medium">
            نظرة شاملة على أداء جميع الساحبين الميدانيين المسجلين في النظام، متضمنة المواعيد المكتملة، الملغاة، وإجمالي المبالغ المحصلة.
          </p>
        </div>
        <Button 
          onClick={fetchAnalyticsData} 
          disabled={isLoading}
          variant="outline" 
          className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-11 font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>تحديث البيانات</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stats.length === 0 && !isLoading ? (
          <div className="col-span-full h-48 flex flex-col items-center justify-center text-slate-400 text-sm font-medium bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
            <Users className="w-8 h-8 text-slate-300 mb-3" />
            لا يوجد ساحبين مسجلين في النظام حالياً.
          </div>
        ) : (
          stats.map((tester, idx) => (
            <Card key={idx} className="shadow-sm border-slate-100 rounded-[20px] bg-white group hover:shadow-md hover:border-blue-100 transition-all duration-300 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-700">
                    <UserCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">{tester.name}</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-500">محلل طبي / ساحب منزلي</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group-hover:bg-emerald-50 transition-colors">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-bold">مكتملة</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 font-mono">{tester.completed}</span>
                  </div>
                  <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group-hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-1.5 text-red-800">
                      <XCircle className="w-4 h-4" />
                      <span className="text-xs font-bold">ملغاة</span>
                    </div>
                    <span className="text-2xl font-black text-red-600 font-mono">{tester.canceled}</span>
                  </div>
                  <div className="col-span-2 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group-hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-1.5 text-blue-800">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-bold">المبلغ المحصل</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-blue-600 font-mono">{tester.totalCollected.toFixed(2)}</span>
                      <span className="text-sm font-bold text-blue-800">د.أ</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
