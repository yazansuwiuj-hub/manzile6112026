import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
}

export function StatCard({ title, count, icon: Icon, gradientFrom, gradientTo }: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative rounded-[22px] text-white overflow-hidden border border-white/10 group flex flex-col justify-between"
      style={{ 
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />

      <div className="p-6 relative z-10 flex justify-between items-start gap-4">
        <div className="space-y-1 text-right" dir="rtl">
          <p className="text-sm font-medium opacity-80 tracking-wide">{title}</p>
          <h4 className="text-4xl font-extrabold tracking-tight font-mono text-white pt-1">
            {count}
          </h4>
        </div>
        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 group-hover:bg-white/20 transition-colors shrink-0">
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>

      <button className="w-full py-3 bg-black/15 hover:bg-black/25 backdrop-blur-xs transition-colors flex justify-center items-center gap-1.5 font-bold text-xs tracking-wider relative z-10 border-t border-white/5 cursor-pointer">
        <span>عرض الكل</span>
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </button>
    </motion.div>
  );
}
