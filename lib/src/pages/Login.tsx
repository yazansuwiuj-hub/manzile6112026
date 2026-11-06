import React, { useState, useEffect } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { User } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [systemName, setSystemName] = useState(() => safeGetItem('localStorage', 'SYSTEM_NAME') || 'HealthLIS');
  const [systemEmoji, setSystemEmoji] = useState(() => safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🧪');
  const [systemLogoUrl, setSystemLogoUrl] = useState(() => safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');

  useEffect(() => {
    setSystemName(safeGetItem('localStorage', 'SYSTEM_NAME') || 'HealthLIS');
    setSystemEmoji(safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🧪');
    setSystemLogoUrl(safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });

      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const data = await res.json();
        setError(data.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-50/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50/30 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="w-full max-w-md bg-white rounded-[26px] shadow-lg border border-slate-100 p-8 sm:p-11 relative z-10">
        <div className="text-center mb-9">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-green-50 to-white rounded-2xl flex items-center justify-center mb-6 text-3xl overflow-hidden p-2.5 border border-green-100/40 shadow-xs">
            {systemLogoUrl ? (
              <img src={systemLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <span>{systemEmoji}</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{systemName}</h2>
          <p className="text-sm text-slate-400 font-medium mt-2 leading-relaxed">أدخل بياناتك للوصول إلى نظام إدارة العمليات</p>
        </div>

        {error && (
          <div className="bg-red-50/60 border border-red-100/50 text-red-600 p-4 rounded-xl mb-6 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">اسم المستخدم</label>
            <Input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="h-12 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-green-600 text-left font-semibold text-sm placeholder:text-slate-400"
              dir="ltr"
              placeholder="username"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">كلمة المرور</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-12 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-green-600 text-left font-semibold text-sm placeholder:text-slate-400"
              dir="ltr"
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-sm font-extrabold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md shadow-green-600/10 mt-6 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'دخول النظام'}
          </Button>
        </form>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-10">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
            <span>POWERED BY</span>
            <span className="text-[#0070c0] font-black text-[11px]">YZN</span>
            <span>TECHNOLOGIES</span>
          </div>
          <div className="text-[7px] font-medium uppercase tracking-[0.2em] text-slate-400 mt-0.5">
            LABORATORY QUALITY CONTROL SYSTEM
          </div>
        </div>
      </div>
    </div>
  );
}
