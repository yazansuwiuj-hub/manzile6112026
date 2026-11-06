import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle, Stethoscope } from 'lucide-react';
import { Button } from '../components/ui/button';

export function PatientRatingPage() {
  const [patientName, setPatientName] = useState('');
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setError('يرجى إدخال اسمك الكريم');
      return;
    }
    if (stars === 0) {
      setError('يرجى اختيار التقييم (عدد النجوم)');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName, stars, comment })
      });

      if (res.ok) {
        setIsSuccess(true);
      } else {
        setError('حدث خطأ أثناء إرسال التقييم. يرجى المحاولة لاحقاً.');
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم. تأكد من اتصالك بالإنترنت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">شكراً لتقييمك!</h2>
          <p className="text-slate-600">
            تم استلام تقييمك بنجاح. نحن نقدر ملاحظاتك ونعمل دائماً على تحسين خدماتنا.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -z-10" />
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">تقييم الخدمة</h1>
            <p className="text-sm text-slate-500">مختبرات العربي الطبية</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">الاسم الكريم</label>
            <input 
              type="text" 
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="أدخل اسمك الكامل"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 block">كيف تقيم تجربتك معنا؟</label>
            <div className="flex items-center justify-center gap-2 flex-row-reverse">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverStars(star)}
                  onMouseLeave={() => setHoverStars(0)}
                  onClick={() => setStars(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star 
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoverStars || stars)
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-slate-200'
                    }`} 
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-sm font-medium text-emerald-600 h-5">
              {stars > 0 ? (
                stars === 5 ? 'ممتاز' :
                stars === 4 ? 'جيد جداً' :
                stars === 3 ? 'جيد' :
                stars === 2 ? 'مقبول' : 'ضعيف'
              ) : ''}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">ملاحظات إضافية (اختياري)</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="اكتب أي تعليقات أو اقتراحات هنا..."
              className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 resize-none"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
          >
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
