import React, { useState, useEffect } from 'react';
import { PhoneOff, Printer, Search, Download } from 'lucide-react';

// Dummy data for calls
const dummyIncoming = [
  { mobile: '0791234567', time: '10:15:30', status: 'ANSWERED', employee: '101' },
  { mobile: '0787600000', time: '11:20:45', status: 'ANSWERED', employee: '102' },
  { mobile: '0771122334', time: '13:05:12', status: 'ANSWERED', employee: '109' },
];

const dummyMissed = [
  { mobile: '0799887766', time: '09:30:00', status: 'NO ANSWER' },
  { mobile: '0785544332', time: '14:45:10', status: 'NO ANSWER' },
];

const dummyOutgoing = [
  { mobile: '0791112223', time: '10:00:00', status: 'ANSWERED', name: 'أحمد' },
  { mobile: '0783334445', time: '12:30:00', status: 'NO ANSWER', name: 'سارة' },
];

const extensions = [
  { ext: '101', loc: 'الاشرفية', total: 15, morning: 10, evening: 5 },
  { ext: '102', loc: 'الاشرفية', total: 12, morning: 8, evening: 4 },
  { ext: '109', loc: 'شفا بدران', total: 8, morning: 5, evening: 3 },
  { ext: '107', loc: 'الزرقاء', total: 20, morning: 12, evening: 8 },
  { ext: '104', loc: 'تلاع العلي', total: 5, morning: 3, evening: 2 },
  { ext: '112', loc: 'طبربور', total: 18, morning: 10, evening: 8 },
  { ext: '108', loc: 'مرج الحمام', total: 7, morning: 4, evening: 3 },
  { ext: '119', loc: 'البقعة', total: 9, morning: 6, evening: 3 },
  { ext: '120', loc: 'نادي السباق', total: 4, morning: 2, evening: 2 },
  { ext: '118', loc: 'جرش', total: 11, morning: 7, evening: 4 },
];

function CallStatCard({ extension, location, total, morning, evening }: any) {
  return (
    <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-[20px] text-white shadow-sm overflow-hidden transform hover:-translate-y-1 hover:shadow-md transition-all">
      <div className="p-5 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex justify-between items-center mb-3 relative z-10">
          <div className="text-4xl font-black tracking-tighter">{total}</div>
          <div className="text-xs font-bold bg-white/20 px-2 py-1 rounded-md">مكالمة</div>
        </div>
        <div className="flex justify-between text-[11px] font-bold font-mono relative z-10">
          <span className="flex items-center gap-1 opacity-90"><span className="w-1.5 h-1.5 rounded-full bg-amber-300" /> D:{morning}</span>
          <span className="flex items-center gap-1 opacity-90"><span className="w-1.5 h-1.5 rounded-full bg-blue-300" /> N:{evening}</span>
        </div>
      </div>
      <div className="bg-green-800/80 backdrop-blur p-3 text-[11px] flex justify-between items-center px-5 border-t border-green-500/30">
        <span className="font-black bg-green-900/50 px-2 py-0.5 rounded text-green-100">{extension}</span>
        <span className="font-bold opacity-90">{location}</span>
      </div>
    </div>
  );
}

function CallsTable({ title, calls, type }: { title: string, calls: any[], type: 'incoming' | 'missed' | 'outgoing' }) {
  return (
    <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-slate-100 flex-1 flex flex-col">
      <div className="p-5 flex justify-between items-center border-b border-slate-100/80 bg-slate-50/50 text-slate-800">
        <h3 className="font-black text-sm flex items-center gap-2">
          {type === 'missed' && <div className="w-2 h-2 rounded-full bg-red-500" />}
          {type === 'incoming' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
          {type === 'outgoing' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
          {title}
        </h3>
        <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-sm">{calls.length}</span>
      </div>
      <div className="overflow-x-auto h-[450px] overflow-y-auto custom-scrollbar bg-white">
        <table className="w-full text-right">
          <thead className="bg-slate-50/50 text-slate-500 text-[11px] sticky top-0 shadow-sm uppercase tracking-wider font-extrabold z-10 backdrop-blur-md">
            <tr>
              <th className="p-4 border-b border-slate-100">الموبايل</th>
              <th className="p-4 border-b border-slate-100">الوقت</th>
              <th className="p-4 text-center border-b border-slate-100">الحالة</th>
              {type === 'incoming' && <th className="p-4 border-b border-slate-100">الموظف</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {calls.map((call, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors group">
                <td className="p-4 font-mono font-bold text-slate-700 text-sm">{call.mobile}</td>
                <td className="p-4 font-mono font-semibold text-slate-500 text-xs">{call.time}</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold inline-block w-full shadow-xs tracking-wider
                    ${type === 'missed' ? 'bg-red-50 text-red-700 border border-red-200' 
                    : type === 'incoming' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {type === 'outgoing' && call.name ? <span className="opacity-75 font-normal ml-1">{call.name} - </span> : ''}
                    {call.status}
                  </span>
                </td>
                {type === 'incoming' && (
                  <td className="p-4">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md">{call.employee}</span>
                  </td>
                )}
              </tr>
            ))}
            {calls.length === 0 && (
              <tr>
                <td colSpan={type === 'incoming' ? 4 : 3} className="p-12 text-center text-slate-400 font-medium text-sm">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                    <PhoneOff className="w-5 h-5 text-slate-300" />
                  </div>
                  لا يوجد مكالمات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MissedCalls() {
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [callsData, setCallsData] = useState({
    incoming: dummyIncoming,
    missed: dummyMissed,
    outgoing: dummyOutgoing
  });

  useEffect(() => {
    fetchCalls();
  }, [dateStr]);

  const fetchCalls = async () => {
    try {
      const res = await fetch(`/api/missed-calls?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        // If the API returns structure {incoming, missed, outgoing} use it, else fallback
        if (data && data.missed) {
          setCallsData({
            incoming: data.incoming || dummyIncoming,
            missed: data.missed || dummyMissed,
            outgoing: data.outgoing || dummyOutgoing
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main className="p-8 text-right space-y-6 w-full max-w-[1400px] mx-auto" dir="rtl">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[20px] shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-green-500 rounded-r-[20px]" />
        <div className="pr-4">
          <h1 className="text-2xl font-black font-arabic text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
              <PhoneOff className="w-5 h-5 text-green-600" />
            </div>
            سجل المكالمات
          </h1>
          <p className="text-slate-500 mt-2 font-arabic text-sm font-medium">متابعة المكالمات الواردة، الصادرة، والفائتة مع إحصائيات الفروع.</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 shadow-inner">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap uppercase tracking-wider">تاريخ السجل:</label>
          <input 
            type="date" 
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="h-11 border border-slate-200 rounded-xl px-4 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none font-semibold bg-white hover:bg-slate-50 transition-colors" 
          />
          <button className="h-11 bg-green-600 text-white px-6 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-sm shadow-green-200/50 hover:-translate-y-0.5">
            سحب تقرير
          </button>
          <button className="h-11 w-11 flex items-center justify-center text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors border border-slate-200 hover:border-green-100 bg-white">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-8">
        {extensions.map((ext) => (
          <CallStatCard 
            key={ext.ext}
            extension={ext.ext}
            location={ext.loc}
            total={ext.total}
            morning={ext.morning}
            evening={ext.evening}
          />
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CallsTable title="المكالمات الواردة" calls={callsData.incoming} type="incoming" />
        <CallsTable title="لم يرد عليها" calls={callsData.missed} type="missed" />
        <CallsTable title="المكالمات الصادرة" calls={callsData.outgoing} type="outgoing" />
      </div>
    </main>
  );
}
