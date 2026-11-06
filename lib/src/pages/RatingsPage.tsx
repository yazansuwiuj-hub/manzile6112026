import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { User } from '../types';

export function RatingsPage({ user }: { user?: User }) {
  const [ratings, setRatings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'مسؤول';

  const fetchRatings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ratings');
      if (res.ok) {
        const data = await res.json();
        setRatings(data);
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRating = async (id: number) => {
    if (!isAdmin) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    
    try {
      const res = await fetch(`/api/ratings/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRatings(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Error deleting rating:', err);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((acc, curr) => acc + curr.stars, 0) / ratings.length).toFixed(1)
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">تقييمات المرضى</h1>
          <p className="text-sm text-slate-500 mt-1">عرض وتقييم آراء المرضى حول الخدمة</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchRatings} disabled={isLoading} className="h-10 bg-emerald-600 hover:bg-emerald-700">
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">إجمالي التقييمات</p>
              <h3 className="text-3xl font-black text-slate-800">{ratings.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">متوسط التقييم</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-800">{avgRating}</h3>
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : ratings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Star className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد تقييمات بعد</h3>
            <p className="text-slate-500">شارك الرابط مع المرضى للحصول على تقييماتهم.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ratings.map((rating, idx) => (
              <motion.div 
                key={rating.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800">{rating.patientName}</h4>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${star <= rating.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {rating.comment || <span className="text-slate-400 italic">لا يوجد تعليق</span>}
                  </p>
                </div>
                
                <div className="flex items-center text-xs text-slate-400 gap-1.5 mt-auto">
                  <div className="flex items-center gap-1.5 flex-1">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(rating.createdAt), 'yyyy/MM/dd HH:mm')}
                  </div>
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteRating(rating.id)}
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      حذف
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
