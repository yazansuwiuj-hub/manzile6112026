import React, { useState, useEffect } from 'react';
import { safeGetItem } from '@/lib/storage';
import { 
  Home, ClipboardList, Phone, Map, BarChart2, DollarSign, Settings, ChevronRight, Star, ShieldCheck, Activity, Smartphone
} from 'lucide-react';
import { User } from '../types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  enLabel: string;
  icon: React.ElementType;
  badge?: number;
  roles?: string[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'الصفحة الرئيسية', enLabel: 'Dashboard', icon: Home },
  { id: 'new-request', label: 'طلب جديد', enLabel: 'New Request', icon: ClipboardList },
  { id: 'calls', label: 'المكالمات', enLabel: 'Calls', icon: Phone },
  { id: 'map', label: 'الخريطة المباشرة', enLabel: 'Live Map', icon: Map, roles: ['مسؤول'] },
  { id: 'analytics', label: 'التحليلات', enLabel: 'Analytics', icon: BarChart2, roles: ['مسؤول', 'مدير'] },
  { id: 'finance', label: 'المالية', enLabel: 'Finance', icon: DollarSign, roles: ['مسؤول', 'مبرمج مواعيد'] },
  { id: 'cliq-transactions', label: 'حوالات CliQ', enLabel: 'CliQ Transfers', icon: Smartphone },
  { id: 'ratings', label: 'التقييمات', enLabel: 'Reviews', icon: Star, roles: ['مسؤول', 'مدير', 'مبرمج مواعيد'] },
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
  const [systemName, setSystemName] = useState(() => safeGetItem('localStorage', 'SYSTEM_NAME') || 'Alarabi Lab Home');
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
      setSystemName(safeGetItem('localStorage', 'SYSTEM_NAME') || 'Alarabi Lab Home');
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
        dir="rtl"
        className={cn(
          "sidebar-container flex flex-col fixed right-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_0_40px_rgba(0,0,0,0.03)] border-l border-[#E0ECE7] select-none",
          "bg-white/92 backdrop-blur-[20px] h-[100dvh] overflow-hidden",
          isExpanded ? "w-[clamp(280px,20vw,340px)]" : "w-[clamp(72px,6vw,84px)]",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <ScrollArea className="h-full w-full overflow-y-auto">
          <div className="flex flex-col min-h-full">
            {/* Decorative 2027 Element (Abstract Scientific Visualization) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.07] overflow-hidden">
              <svg className="absolute bottom-0 left-0 w-full h-[30vh]" viewBox="0 0 400 200" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 100C50 80 150 120 200 100C250 80 350 120 400 100V200H0V100Z" fill="url(#paint0_linear)" />
                <path d="M0 130C70 110 130 150 200 130C270 110 330 150 400 130" stroke="#009B68" strokeWidth="0.5" />
                <path d="M0 150C90 130 110 170 200 150C290 130 310 170 400 150" stroke="#009B68" strokeWidth="0.5" />
                <defs>
                  <linearGradient id="paint0_linear" x1="200" y1="100" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#009B68" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#009B68" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Brand Header */}
            <div className="sidebar-header min-h-[110px] h-[13dvh] max-h-[130px] px-[clamp(0.75rem,1.5vw,1.25rem)] flex flex-col justify-center border-b border-[#E0ECE7]/50 relative z-10">
              <div className="flex items-center gap-[clamp(0.5rem,1vw,0.875rem)]">
                <div className={cn("flex flex-col text-right transition-all duration-500 flex-1 min-w-0", isExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none")}>
                  <h1 className="text-[#17231F] font-bold text-[clamp(0.95rem,1.1vw,1.05rem)] leading-tight tracking-tight">
                    {systemName}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-2 bg-[#EFFAF6] border border-[#E8F8F1] px-2 py-0.5 rounded-full w-fit">
                    <span className="text-[#009B68] text-[8px] font-bold tracking-wider">SYSTEM ONLINE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#009B68]" />
                  </div>
                </div>

                <div className="relative shrink-0">
                  <div className="w-[clamp(48px,4.5vw,60px)] h-[clamp(48px,4.5vw,60px)] rounded-[clamp(1rem,2vw,1.25rem)] bg-white border border-[#E0ECE7] shadow-sm flex items-center justify-center overflow-hidden p-1.5 transition-transform duration-500 hover:scale-105">
                    {systemLogoUrl ? (
                      <img src={systemLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[clamp(1.75rem,3.5vw,2.25rem)]">{systemEmoji}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-[clamp(14px,1.4vw,18px)] h-[clamp(14px,1.4vw,18px)] rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                    <div className="w-[60%] h-[60%] rounded-full bg-[#009B68] animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 px-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(1rem,3dvh,2rem)] relative z-10">
              <div className="space-y-[clamp(0.25rem,0.8dvh,0.5rem)]">
                {navItems.map((item) => {
                  if (item.roles && !item.roles.includes(user.role)) return null;
                  if (user.role === 'ساحب منزلي' && item.id !== 'dashboard' && item.id !== 'cliq-transactions') return null;
                  if (user.role === 'مشاهد' && item.id !== 'dashboard' && item.id !== 'calls' && item.id !== 'cliq-transactions') return null;
                  
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
                        "w-full flex items-center px-[clamp(0.75rem,1.2vw,1rem)] py-[clamp(0.6rem,1.2dvh,0.875rem)] rounded-[clamp(0.75rem,1.5vw,1rem)] transition-all duration-300 group relative overflow-hidden",
                        isActive 
                          ? "bg-gradient-to-l from-[#E5F8F0] to-[#F4FCF8] border border-[#E0ECE7] shadow-[0_4px_12px_rgba(0,155,104,0.06)]" 
                          : "hover:bg-[#F4FBF8] hover:-translate-x-0.5"
                      )}
                    >
                      {/* Active Indicator bar */}
                      {isActive && (
                        <span className="absolute right-0 top-3 bottom-3 w-[clamp(3px,0.4vw,4px)] bg-[#009B68] rounded-l-full shadow-[0_0_8px_rgba(0,155,104,0.4)]" />
                      )}
                      
                      <div className="flex items-center gap-[clamp(0.75rem,1.2vw,1rem)] w-full">
                        <div className={cn(
                          "p-[clamp(0.4rem,0.8vw,0.5rem)] rounded-[clamp(0.5rem,1vw,0.75rem)] transition-all duration-300",
                          isActive ? "bg-white shadow-sm" : "bg-transparent"
                        )}>
                          <Icon className={cn(
                            "w-[clamp(18px,1.5vw,20px)] h-[clamp(18px,1.5vw,20px)] transition-all duration-500 group-hover:scale-110",
                            isActive ? "text-[#009B68]" : "text-[#71817B] group-hover:text-[#009B68]"
                          )} strokeWidth={isActive ? 2.2 : 1.8} />
                        </div>
                        
                        <div className={cn("flex flex-col text-right transition-all duration-500 flex-1 min-w-0", isExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4")}>
                          <span className={cn(
                            "text-[clamp(13px,1vw,14px)] font-bold whitespace-nowrap transition-colors duration-300 truncate",
                            isActive ? "text-[#009B68]" : "text-[#17231F] group-hover:text-[#17231F]"
                          )}>
                            {item.label}
                          </span>
                          <span className="text-[clamp(8px,0.7vw,10px)] text-[#71817B] font-medium tracking-tight uppercase opacity-60 truncate">
                            {item.enLabel}
                          </span>
                        </div>

                        {item.badge && isExpanded && (
                          <div className="mr-auto shrink-0">
                            <div className={cn(
                              "px-2 min-w-[20px] h-[clamp(18px,1.5vw,20px)] flex items-center justify-center rounded-full text-[clamp(8px,0.7vw,10px)] font-black border border-white/20", 
                              isActive ? "bg-[#009B68] text-white" : "bg-[#EFFAF6] text-[#009B68]"
                            )}>
                              {item.badge}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Section */}
            <div className="sidebar-footer p-[clamp(1rem,2vw,1.5rem)] space-y-[clamp(1rem,2dvh,1.5rem)] relative z-10 bg-white/50 backdrop-blur-sm border-t border-[#E0ECE7]/50 mt-auto">
              
              {/* User Profile Card */}
              <div className={cn(
                "p-[clamp(0.5rem,1vw,0.75rem)] rounded-[clamp(0.75rem,1.5vw,1rem)] bg-white border border-[#E0ECE7] shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-500",
                !isExpanded && "p-1.5 border-transparent bg-transparent shadow-none"
              )}>
                <div className={cn("flex items-center gap-[clamp(0.5rem,1vw,0.75rem)]", !isExpanded && "justify-center")}>
                  <div className="relative shrink-0">
                    <div className="w-[clamp(36px,3.5vw,44px)] h-[clamp(36px,3.5vw,44px)] rounded-[clamp(0.5rem,1vw,0.75rem)] bg-gradient-to-br from-[#009B68] to-[#00A875] text-white flex items-center justify-center font-bold text-[clamp(0.875rem,1.2vw,1rem)] shadow-[0_4px_10px_rgba(0,155,104,0.2)] transition-transform duration-500 hover:rotate-3">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-[clamp(10px,1vw,14px)] h-[clamp(10px,1vw,14px)] rounded-full bg-[#009B68] border-2 border-white shadow-sm" />
                  </div>
                  
                  {isExpanded && (
                    <div className="flex-1 overflow-hidden text-right">
                      <p className="font-bold text-[#17231F] text-[clamp(12px,1vw,14px)] truncate">{user.name}</p>
                      <p className="text-[clamp(8px,0.7vw,10px)] font-bold text-[#71817B] uppercase tracking-wider truncate">{user.role}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings Item */}
              {user.role === 'مسؤول' && (
                <button 
                  onClick={() => {
                    setCurrentPage('settings');
                    onClose?.();
                  }}
                  className={cn(
                    "w-full flex items-center px-[clamp(0.75rem,1.2vw,1rem)] py-[clamp(0.6rem,1.2dvh,0.875rem)] rounded-[clamp(0.75rem,1.5vw,1rem)] transition-all duration-300 group",
                    currentPage === 'settings' 
                      ? "bg-[#EFFAF6] text-[#009B68] border border-[#E8F8F1]" 
                      : "text-[#71817B] hover:bg-[#F4FBF8] hover:text-[#17231F]"
                  )}
                >
                  <div className="flex items-center gap-[clamp(0.75rem,1.2vw,1rem)] w-full">
                    <div className={cn(
                      "p-[clamp(0.4rem,0.8vw,0.5rem)] rounded-[clamp(0.5rem,1vw,0.75rem)] transition-all duration-300",
                      currentPage === 'settings' ? "bg-white shadow-sm" : "bg-transparent"
                    )}>
                      <Settings className={cn(
                        "w-[clamp(18px,1.5vw,20px)] h-[clamp(18px,1.5vw,20px)] transition-all duration-700 group-hover:rotate-90",
                        currentPage === 'settings' ? "text-[#009B68]" : "text-[#71817B] group-hover:text-[#009B68]"
                      )} />
                    </div>
                    <div className={cn("flex flex-col text-right transition-all duration-500 flex-1 min-w-0", isExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4")}>
                      <span className="text-[clamp(13px,1vw,14px)] font-bold whitespace-nowrap truncate">الإعدادات المتقدمة</span>
                      <span className="text-[clamp(8px,0.7vw,10px)] font-medium tracking-tight uppercase opacity-60 truncate">Advanced Settings</span>
                    </div>
                  </div>
                </button>
              )}

            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

