import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { safeGetItem } from '@/lib/storage';
import { User } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const [systemName, setSystemName] = useState(() => safeGetItem('localStorage', 'SYSTEM_NAME') || 'Alarabi Lab');
  const [systemEmoji, setSystemEmoji] = useState(() => safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🧪');
  const [systemLogoUrl, setSystemLogoUrl] = useState(() => safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');

  useEffect(() => {
    setSystemName(safeGetItem('localStorage', 'SYSTEM_NAME') || 'Alarabi Lab');
    setSystemEmoji(safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🧪');
    setSystemLogoUrl(safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');
  }, []);

  const effectiveLogo = systemLogoUrl || '/logo.png';

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
        setIsSuccess(true);
        setTimeout(() => onLogin(user), 600);
      } else {
        const data = await res.json();
        setError(data.error || 'فشل تسجيل الدخول. يرجى التحقق من اسم المستخدم وكلمة المرور.');
        setLoading(false);
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم. يرجى التحقق من الشبكة.');
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#F6FAF8] text-[#12201B] flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 relative overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-800" 
      dir="rtl"
    >
      {/* BACKGROUND AMBIENT LAYERS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Soft Radial Gradients */}
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-emerald-200/40 via-teal-100/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-100/50 via-teal-50/40 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-b from-white/60 to-emerald-50/20 blur-2xl rounded-full" />

        {/* Delicate Medical Grid */}
        <div 
          className="absolute inset-0 opacity-[0.25]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #CBDCD5 1px, transparent 0)`,
            backgroundSize: '36px 36px'
          }}
        />

        {/* Subtle Laboratory HUD Circles */}
        <div className="absolute top-12 left-12 opacity-20 hidden md:block">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="58" stroke="#009B68" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="60" cy="60" r="42" stroke="#009B68" strokeWidth="0.75" />
            <circle cx="60" cy="60" r="6" fill="#009B68" />
          </svg>
        </div>
        <div className="absolute bottom-16 right-12 opacity-20 hidden md:block">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <rect x="2" y="2" width="96" height="96" rx="20" stroke="#009B68" strokeWidth="1" strokeDasharray="6 4" />
            <path d="M20 50H80M50 20V80" stroke="#009B68" strokeWidth="0.75" />
          </svg>
        </div>
      </div>

      {/* TOP STATUS BAR (ORDERLY & INFORMATIVE) */}
      <header className="w-full max-w-xl flex items-center justify-between py-2 px-1 relative z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-emerald-100 shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-800 tracking-wide">
            نظام المختبر نشط ومؤمن
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white/60 px-3 py-1.5 rounded-full border border-slate-200/60 shadow-sm backdrop-blur-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>تشفير متقدم SSL 256-bit</span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-md my-auto py-4 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "bg-white/95 backdrop-blur-2xl rounded-3xl border border-emerald-100/80 shadow-[0_20px_50px_-12px_rgba(0,120,80,0.08),0_1px_3px_rgba(0,0,0,0.02)] p-6 sm:p-9 transition-all duration-500 relative",
            isSuccess && "scale-[0.98] opacity-0"
          )}
        >
          {/* Top Subtle Emerald Glow Edge */}
          <div className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent rounded-full" />

          {/* HEADER / LOGO & BRANDING */}
          <div className="flex flex-col items-center text-center mb-7">
            {/* Logo Emblem */}
            <div className="relative mb-4 group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-white to-emerald-50/50 p-2.5 shadow-md shadow-emerald-700/10 border border-emerald-100/90 flex items-center justify-center relative overflow-hidden transition-transform duration-300 group-hover:scale-105">
                {effectiveLogo && !logoLoadError ? (
                  <img 
                    src={effectiveLogo} 
                    alt={systemName} 
                    onError={() => setLogoLoadError(true)}
                    className="w-full h-full object-contain filter drop-shadow-sm" 
                  />
                ) : (
                  <span className="text-4xl">{systemEmoji}</span>
                )}
                {/* Micro Ambient Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute -inset-1.5 bg-emerald-500/10 rounded-3xl blur-md -z-10" />
            </div>

            {/* Titles */}
            {/* Titles */}
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
                {systemName}
              </h1>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5 text-right">
              <label className="block text-xs font-bold text-slate-700 px-1">
                اسم المستخدم أو البريد
              </label>
              <div className="relative">
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <UserIcon className="w-4 h-4" />
                </div>
                <Input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="h-12 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 rounded-xl transition-all text-right font-medium text-sm text-slate-900 placeholder:text-slate-400 pr-10 pl-3 shadow-none"
                  placeholder="أدخل اسم المستخدم"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-between px-1">
                <label className="block text-xs font-bold text-slate-700">
                  كلمة المرور
                </label>
                <span className="text-[11px] text-emerald-700/80 hover:text-emerald-800 cursor-pointer font-medium select-none">
                  نظام محمي
                </span>
              </div>
              <div className="relative">
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-12 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 rounded-xl transition-all text-right font-medium text-sm text-slate-900 placeholder:text-slate-400 pr-10 pl-10 shadow-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-700 rounded-md transition-colors"
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Notification */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading || isSuccess}
                className={cn(
                  "w-full h-12 text-sm font-bold rounded-xl transition-all duration-300 relative overflow-hidden group shadow-md shadow-emerald-700/20",
                  loading || isSuccess
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white hover:shadow-lg hover:shadow-emerald-700/25 active:scale-[0.99]"
                )}
              >
                <div className={cn("flex items-center justify-center gap-2 transition-opacity", loading ? "opacity-0" : "opacity-100")}>
                  <span>دخول إلى النظام</span>
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>

                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
              </Button>
            </div>

          </form>
        </motion.div>
      </main>

      {/* FOOTER WATERMARK / BRANDING */}
      <footer className="w-full max-w-xl py-3 flex flex-col items-center justify-center gap-1 text-center relative z-20">
        <img 
          src="/yzn_watermark.png" 
          alt="YZN Technologies" 
          className="h-10 sm:h-12 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity drop-shadow-sm"
          onError={(e) => {
            // If image fails, fallback gracefully
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="text-[11px] font-semibold text-slate-500 tracking-wide">
          نظام مشغّل ومطور بواسطة <span className="text-emerald-700 font-bold">YZN Technologies</span>
        </div>
      </footer>

      {/* SUCCESS OVERLAY ANIMATION */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-white/70 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white rounded-3xl p-8 shadow-2xl border border-emerald-100 flex flex-col items-center text-center max-w-xs w-full"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-600 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">تم التحقق بنجاح</h3>
              <p className="text-xs text-slate-500 font-medium">جاري تحويلك إلى لوحة التحكم...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
