import React from 'react';
import { 
  Bell, Search, Plus, LogOut, ChevronDown, Activity, DollarSign, Clock, Users, Menu
} from 'lucide-react';
import { User } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function Header({ user, onLogout, onToggleSidebar, onNewRequestClick }: { user: User, onLogout: () => void, onToggleSidebar?: () => void, onNewRequestClick?: () => void }) {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3 md:gap-6 flex-1">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar} 
            className="lg:hidden p-2.5 text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all cursor-pointer"
            title="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notification Bell */}
        <button className="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all cursor-pointer">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
        </button>

        <div className="h-6 w-[1px] bg-slate-200/60" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-all border border-slate-100 shadow-xs outline-none cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-extrabold text-slate-900 leading-none">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{user.role}</p>
            </div>
            <Avatar className="w-9 h-9 border-2 border-green-50 shadow-xs">
              <AvatarFallback className="bg-green-600 text-white font-extrabold text-xs">
                {user.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 mt-2 rounded-2xl shadow-lg border-slate-100 p-2">
            <div className="px-3 py-2.5 text-right" dir="rtl">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-extrabold text-slate-900 leading-none">{user.name}</p>
                <p className="text-xs font-semibold text-slate-400">{user.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1.5 bg-slate-100" />
            <DropdownMenuItem className="text-red-600 focus:text-white focus:bg-red-600 cursor-pointer rounded-xl font-bold text-sm py-2 px-3 flex justify-between" onClick={onLogout}>
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
