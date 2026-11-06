/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { cn } from './lib/utils';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { MissedCalls } from './pages/MissedCalls';
import { Settings } from './pages/Settings';
import { PatientRatingPage } from './pages/PatientRatingPage';
import { RatingsPage } from './pages/RatingsPage';
import { Login } from './pages/Login';
import { MapPage } from './pages/MapPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FinancePage } from './pages/FinancePage';
import CallLogs from './pages/CallLogs';
import { User } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { NewAppointmentPage } from './pages/NewAppointmentPage';
import { PatientBookingPage } from './pages/PatientBookingPage';
import { io, Socket } from 'socket.io-client';
import { Bell, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = safeGetItem('sessionStorage', 'CURRENT_USER');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [currentPage, setCurrentPage] = useState(() => {
    return safeGetItem('sessionStorage', 'CURRENT_PAGE') || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Persist user and page in sessionStorage
  useEffect(() => {
    if (user) {
      safeSetItem('sessionStorage', 'CURRENT_USER', JSON.stringify(user));
    } else {
      safeRemoveItem('sessionStorage', 'CURRENT_USER');
    }
  }, [user]);

  useEffect(() => {
    safeSetItem('sessionStorage', 'CURRENT_PAGE', currentPage);
  }, [currentPage]);

  // Handle Notifications
  useEffect(() => {
    if (!user) return;
    
    if (user.role === 'ساحب منزلي' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const socket = io();
    socket.on('appointment-assigned', (data) => {
      if (user.role === 'ساحب منزلي' && data.testerName === user.name) {
        setNotifications(prev => [...prev, data]);
        setRefreshKey(prev => prev + 1);
        
        // Auto-dismiss after 15 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n !== data));
        }, 15000);
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play prevented by browser', e));
        
        // Show system notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('تم إسناد موعد جديد لك', {
              body: `المريض: ${data.appointment?.name}\nالمنطقة: ${data.appointment?.location}`,
              icon: '/favicon.ico',
              tag: `appt-${data.appointment?.id}`
            });
          } catch (e) {
            console.error('Notification error:', e);
          }
        }
      }
    });

    return () => {
      socket.off('appointment-assigned');
      socket.disconnect();
    };
  }, [user]);

  // Apply appearance settings dynamically
  useEffect(() => {
    const applyAppearance = () => {
      const accent = safeGetItem('localStorage', 'SYSTEM_ACCENT') || 'green';
      const rounded = safeGetItem('localStorage', 'SYSTEM_ROUNDED') || 'normal';
      const sidebarTheme = safeGetItem('localStorage', 'SYSTEM_SIDEBAR_THEME') || 'light';
      const compactMode = safeGetItem('localStorage', 'SYSTEM_COMPACT_MODE') || 'false';
      
      const colors = {
        green: { 50: '#f5f3ff', 100: '#e0e7ff', 200: '#c7d2fe', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', shadow: 'rgba(99, 102, 241, 0.2)' },
        emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', shadow: 'rgba(16, 185, 129, 0.2)' },
        blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', shadow: 'rgba(59, 130, 246, 0.2)' },
        violet: { 50: '#f9f5ff', 100: '#f3e8ff', 200: '#e9d5ff', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', shadow: 'rgba(139, 92, 246, 0.2)' },
        rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', shadow: 'rgba(244, 63, 94, 0.2)' },
        amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', shadow: 'rgba(245, 158, 11, 0.2)' },
        slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', shadow: 'rgba(71, 85, 105, 0.2)' },
      };

      const selectedColor = colors[accent as keyof typeof colors] || colors.green;

      let css = `
        :root {
          --color-green-50: ${selectedColor[50]} !important;
          --color-green-100: ${selectedColor[100]} !important;
          --color-green-200: ${selectedColor[200]} !important;
          --color-green-500: ${selectedColor[500]} !important;
          --color-green-600: ${selectedColor[600]} !important;
          --color-green-700: ${selectedColor[700]} !important;
          --color-green-800: ${selectedColor[800]} !important;
          --shadow-green-200: 0 10px 15px -3px ${selectedColor.shadow}, 0 4px 6px -4px ${selectedColor.shadow} !important;
        }
      `;

      if (rounded === 'sharp') {
        css += `
          :root {
            --radius-sm: 0px !important;
            --radius-md: 0px !important;
            --radius-lg: 0px !important;
            --radius-xl: 0px !important;
            --radius-2xl: 0px !important;
            --radius-3xl: 0px !important;
          }
        `;
      } else if (rounded === 'medium') {
        css += `
          :root {
            --radius-sm: 2px !important;
            --radius-md: 4px !important;
            --radius-lg: 6px !important;
            --radius-xl: 8px !important;
            --radius-2xl: 12px !important;
            --radius-3xl: 16px !important;
          }
        `;
      } else if (rounded === 'high') {
        css += `
          :root {
            --radius-sm: 8px !important;
            --radius-md: 12px !important;
            --radius-lg: 16px !important;
            --radius-xl: 20px !important;
            --radius-2xl: 28px !important;
            --radius-3xl: 36px !important;
          }
        `;
      }

      if (sidebarTheme === 'dark') {
        css += `
          .sidebar-container {
            background-color: #0f172a !important;
            border-left: 1px solid #1e293b !important;
          }
          .sidebar-container .sidebar-header {
            background-color: #1e293b !important;
            border-bottom: 1px solid #334155 !important;
          }
          .sidebar-container .sidebar-title {
            color: #f8fafc !important;
          }
          .sidebar-container .sidebar-section-title {
            color: #94a3b8 !important;
          }
          .sidebar-container button:not(.bg-green-600) {
            color: #cbd5e1 !important;
          }
          .sidebar-container button:not(.bg-green-600):hover {
            background-color: #1e293b !important;
            color: #ffffff !important;
          }
          .sidebar-container .sidebar-footer {
            background-color: #1e293b !important;
            border-top: 1px solid #334155 !important;
          }
        `;
      } else if (sidebarTheme === 'green') {
        css += `
          .sidebar-container {
            background-color: ${selectedColor[800]} !important;
            border-left: 1px solid ${selectedColor[700]} !important;
          }
          .sidebar-container .sidebar-header {
            background-color: ${selectedColor[700]} !important;
            border-bottom: 1px solid ${selectedColor[600]} !important;
          }
          .sidebar-container .sidebar-title {
            color: #ffffff !important;
          }
          .sidebar-container .sidebar-section-title {
            color: ${selectedColor[200]} !important;
          }
          .sidebar-container button:not(.bg-green-600) {
            color: ${selectedColor[50]} !important;
          }
          .sidebar-container button:not(.bg-green-600):hover {
            background-color: ${selectedColor[600]} !important;
            color: #ffffff !important;
          }
          .sidebar-container .sidebar-footer {
            background-color: ${selectedColor[700]} !important;
            border-top: 1px solid ${selectedColor[600]} !important;
          }
        `;
      }

      if (compactMode === 'true') {
        css += `
          th, td {
            padding: 8px 12px !important;
          }
          .p-4 {
            padding: 12px !important;
          }
          .p-6 {
            padding: 16px !important;
          }
          .p-8 {
            padding: 20px !important;
          }
          .space-y-6 > * + * {
            margin-top: 16px !important;
          }
        `;
      }

      let styleEl = document.getElementById('system-appearance-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'system-appearance-styles';
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = css;
    };

    applyAppearance();
    
    // Listen to changes
    window.addEventListener('storage', applyAppearance);
    window.addEventListener('system-appearance-changed', applyAppearance);
    
    return () => {
      window.removeEventListener('storage', applyAppearance);
      window.removeEventListener('system-appearance-changed', applyAppearance);
    };
  }, []);

  // Sync secure appearance settings from backend on startup
  useEffect(() => {
    fetch('/api/appearance')
      .then(res => res.json())
      .then(data => {
        if (data) {
          const keys = [
            'SYSTEM_NAME',
            'SYSTEM_LOGO_EMOJI',
            'SYSTEM_LOGO_URL',
            'SYSTEM_ACCENT',
            'SYSTEM_ROUNDED',
            'SYSTEM_SIDEBAR_THEME',
            'SYSTEM_COMPACT_MODE'
          ];
          let changed = false;
          keys.forEach(key => {
            const val = data[key] !== undefined ? String(data[key]) : '';
            if (safeGetItem('localStorage', key) !== val) {
              safeSetItem('localStorage', key, val);
              changed = true;
            }
          });
          if (changed) {
            window.dispatchEvent(new Event('system-appearance-changed'));
          }
        }
      })
      .catch(err => console.error('Error syncing appearance settings:', err));
  }, []);

  // Track Phlebotomist Location
  useEffect(() => {
    if (!user || user.role !== 'ساحب منزلي') return;

    const socket: Socket = io(); // Connect to same origin
    let watchId: number;

    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    const startTracking = async () => {
      let batteryLevel = 100;
      if ('getBattery' in navigator) {
        try {
          const battery: any = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
          battery.addEventListener('levelchange', () => {
            batteryLevel = Math.round(battery.level * 100);
          });
        } catch (e) {
          console.error("Battery API error", e);
        }
      }

      const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
      const userColor = colors[String(user.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length];

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed } = position.coords;
          
          socket.emit('update-location', {
            id: user.id,
            name: user.name,
            initials: initials,
            lat: latitude,
            lng: longitude,
            speed: speed ? Math.round(speed * 3.6) : 0, // convert m/s to km/h
            battery: batteryLevel,
            status: 'نشط',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            color: userColor
          });
        },
        (error) => {
          // Fallback or ignore if geolocation fails, e.g., permission denied
          console.warn("Geolocation warning:", error.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    };

    startTracking();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [user]);

  if (window.location.pathname.includes('/book')) {
    return <PatientBookingPage />;
  }
  if (window.location.pathname.includes('/rating')) {
    return <PatientRatingPage />;
  }

  if (!user) {
    return <Login onLogin={(user) => {
      setUser(user);
      setCurrentPage('dashboard');
    }} />;
  }

  const renderPage = () => {
    if (user.role === 'ساحب منزلي') {
      return <Dashboard user={user} refreshKey={refreshKey} />;
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} refreshKey={refreshKey} />;
      case 'new-request': return <NewAppointmentPage user={user} onSuccess={() => setRefreshKey(prev => prev + 1)} onNavigate={setCurrentPage} />;
      case 'missed-calls': return <MissedCalls />;
      case 'map': return user.role === 'مسؤول' ? <MapPage /> : <Dashboard user={user} refreshKey={refreshKey} />;
      case 'analytics': return user.role === 'مسؤول' || user.role === 'مدير' ? <AnalyticsPage /> : <Dashboard user={user} />;
      case 'finance': return (user.role === 'مسؤول' || user.role === 'مبرمج مواعيد') ? <FinancePage user={user} /> : <Dashboard user={user} refreshKey={refreshKey} />;
      case 'calls': return <CallLogs />;
      case 'settings': return user.role === 'مسؤول' ? <Settings user={user} /> : <Dashboard user={user} />;
      case 'ratings': return ['مسؤول', 'مدير', 'مبرمج مواعيد'].includes(user.role) ? <RatingsPage user={user} /> : <Dashboard user={user} />;
      default: return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <h2 className="text-2xl font-bold mb-2">قريباً</h2>
          <p>هذه الصفحة قيد التطوير</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex" dir="rtl">
      {/* Notifications Overlay */}
      {notifications.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-md pointer-events-none">
          <AnimatePresence>
            {notifications.map((notif, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border-r-4 border-green-500 rounded-xl shadow-2xl p-4 flex items-start gap-4 pointer-events-auto"
              >
                <div className="bg-green-100 p-2 rounded-full text-green-600 shrink-0">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm">تم إسناد موعد جديد لك</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    المريض: <span className="font-bold">{notif.appointment?.name}</span>
                    <br />
                    المنطقة: {notif.appointment?.location}
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        user={user} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isExpanded={isSidebarExpanded}
        onToggleExpanded={setIsSidebarExpanded}
      />
      
      <div className={cn(
        "flex-1 w-full flex flex-col min-h-screen overflow-hidden transition-all duration-300",
        isSidebarExpanded ? "lg:mr-72" : "lg:mr-20"
      )}>
        <Header 
          user={user} 
          onLogout={() => setUser(null)} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewRequestClick={() => setCurrentPage('new-request')}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}


