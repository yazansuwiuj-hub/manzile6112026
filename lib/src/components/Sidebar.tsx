import React, { useState, useEffect } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { 
  Home, ClipboardList, Phone,  Calendar, Car, Map, BarChart2, DollarSign, Package, Building, Settings, ChevronRight, FileText, Star
} from 'lucide-react';
import { User } from '../types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  roles?: string[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'اللوحة الرئيسية', icon: Home },
  { id: 'new-request', label: 'طلب جديد', icon: ClipboardList },
  { id: 'calls', label: 'المكالمات', icon: Phone },
  { id: 'map', label: 'الخريطة المباشرة', icon: Map, roles: ['مسؤول'] },
  { id: 'analytics', label: 'التحليلات', icon: BarChart2, roles: ['مسؤول', 'مدير'] },
  { id: 'finance', label: 'المالية', icon: DollarSign, roles: ['مسؤول', 'مبرمج مواعيد'] },
  { id: 'ratings', label: 'التقييمات', icon: Star, roles: ['مسؤول', 'مدير', 'مبرمج مواعيد'] },
];

export function Sidebar({ 
  currentPage, 
  setCurrentPage, 
  user,
  isOpen,
  onClose,
  isExpanded,
  onToggleExpanded
}: { 
  currentPage: string, 
  setCurrentPage: (page: string) => void, 
  user: User,
  isOpen?: boolean,
  onClose?: () => void,
  isExpanded: boolean,
  onToggleExpanded: (expanded: boolean) => void
}) {
  const [systemName, setSystemName] = useState(() => safeGetItem('localStorage', 'SYSTEM_NAME') || 'HealthLIS');
  const [systemEmoji, setSystemEmoji] = useState(() => safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🧪');
  const [systemLogoUrl, setSystemLogoUrl] = useState(() => safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');

  let hoverTimeout: NodeJS.Timeout;

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeout);
    onToggleExpanded(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout = setTimeout(() => {
      onToggleExpanded(false);
    }, 300);
  };

  useEffect(() => {
    return () => clearTimeout(hoverTimeout);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setSystemName(safeGetItem('localStorage', 'SYSTEM_NAME') || 'HealthLIS');
      setSystemEmoji(safeGetItem('localStorage', 'SYSTEM_LOGO_EMOJI') || '🧪');
      setSystemLogoUrl(safeGetItem('localStorage', 'SYSTEM_LOGO_URL') || '');
    };

    window.addEventListener('system-appearance-changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('system-appearance-changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity" 
          onClick={onClose}
        />
      )}

      <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "sidebar-container bg-white/95 backdrop-blur-md min-h-screen border-l border-slate-100 flex flex-col fixed right-0 top-0 z-50 transition-all duration-300 ease-in-out shadow-lg overflow-hidden",
          isExpanded ? "w-72" : "w-20",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand/Logo Section */}
        <div className="sidebar-header h-20 px-6 border-b border-slate-100 flex items-center justify-between">
          <h1 className="sidebar-title text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            {systemLogoUrl ? (
              <img src={systemLogoUrl} alt="Logo" className="w-9 h-9 object-contain shrink-0 rounded-xl p-0.5 border border-slate-100 bg-slate-50 shadow-sm" />
            ) : (
              <span className="text-2xl shrink-0 p-1.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">{systemEmoji}</span>
            )}
            <span className={cn("truncate bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent font-bold transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0")}>{systemName}</span>
          </h1>
          {onClose && (
            <button 
              onClick={onClose} 
              className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              title="إغلاق القائمة"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-6">
            <div>
              <div className={cn("sidebar-section-title text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5 px-3 transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0")}>
                القائمة الرئيسية
              </div>
              <div className="space-y-1.5">
                {navItems.map((item) => {
                  if (item.roles && !item.roles.includes(user.role)) return null;
                  if (user.role === 'ساحب منزلي' && item.id !== 'dashboard') return null;
                  if (user.role === 'مشاهد' && item.id !== 'dashboard' && item.id !== 'calls') return null;
                  
                  const isActive = currentPage === item.id;
                  const Icon = item.icon;
                  
                  return (
                    <button 
                      key={item.id}
                      onClick={() => {
                        setCurrentPage(item.id);
                        onClose?.();
                      }}
                      className={cn(
                        "w-full flex items-center px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-300 group relative cursor-pointer",
                        isActive 
                          ? "bg-green-600 text-white shadow-lg shadow-green-600/15" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      )}
                    >
                      {/* Active Indicator bar */}
                      {isActive && (
                        <span className="absolute right-0 top-3 bottom-3 w-1 bg-white rounded-l-md" />
                      )}
                      
                      <div className="flex items-center gap-3.5">
                        <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-green-600")} />
                        <span className={cn("whitespace-nowrap transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0")}>{item.label}</span>
                      </div>
                      {item.badge && isExpanded && (
                        <Badge 
                          variant={isActive ? "secondary" : "default"} 
                          className={cn(
                            "px-2 min-w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold border-0", 
                            isActive ? "bg-white/20 text-white" : "bg-green-50 text-green-600"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer / User & Settings Section */}
        <div className="sidebar-footer p-4 border-t border-slate-100 mt-auto">
          {/* User Profile */}
          <div className={cn(
            "flex items-center gap-3 px-2 mb-4 transition-all duration-300",
            !isExpanded && "justify-center"
          )}>
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black text-sm shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            {isExpanded && (
              <div className="overflow-hidden">
                <p className="font-bold text-slate-900 text-sm truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.role}</p>
              </div>
            )}
          </div>

          {user.role === 'مسؤول' && (
            <button 
              onClick={() => {
                setCurrentPage('settings');
                onClose?.();
              }}
              className={cn(
                "w-full flex items-center px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group cursor-pointer",
                currentPage === 'settings' 
                  ? "bg-slate-100 text-slate-900 shadow-xs" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <Settings className={cn("w-5 h-5 transition-transform group-hover:rotate-45 duration-500", isExpanded ? "ml-3" : "ml-0", currentPage === 'settings' ? "text-green-600" : "text-slate-400 group-hover:text-green-600")} />
              <span className={cn("whitespace-nowrap transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0")}>الإعدادات المتقدمة</span>
            </button>
          )}

          {/* Watermark */}
          <div className="mt-4 flex flex-col items-center justify-center w-full cursor-default px-2">
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
      </div>
    </>
  );
}

