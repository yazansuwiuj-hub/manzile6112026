import React, { useState, useEffect, useMemo } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Battery, Navigation2, Phone, AlertCircle, Search, 
  Users, CheckCircle, XCircle, Clock, Sparkles, RefreshCw, 
  UserCheck, DollarSign, Calendar, Filter, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { io, Socket } from 'socket.io-client';

interface Phlebotomist {
  id: string;
  name: string;
  initials: string;
  lat: number;
  lng: number;
  battery?: number;
  speed?: number;
  status?: string;
  isOffline?: boolean;
  color?: string;
  badgeClass?: string;
}

import { Appointment } from "../types";

// Robust helper to extract coordinates from Google Maps, Apple Maps, or raw coordinate string
function parseCoordinates(url: string | null | undefined): { lat: number; lng: number } | null {
  if (!url) return null;
  const decoded = decodeURIComponent(url.trim());
  if (!decoded) return null;

  // Pattern to match coordinates: lat,lng (supporting minus signs and decimals)
  // Handles commas, encoded commas (%2C), or spaces
  const coordRegex = /([-+]?\d+(?:\.\d+)?)[,\s%2C]+([-+]?\d+(?:\.\d+)?)/;
  const match = decoded.match(coordRegex);
  
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      // Basic validation: coordinates in the middle of nowhere (0,0) or too small are often placeholders
      if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null;
      return { lat, lng };
    }
  }
  return null;
}

// Helper to calculate distance in km using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;  
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d;
}

// Helper to calculate estimated time of arrival (ETA) in minutes
function calculateEstimatedTime(distanceKm: number, speedKmh: number = 40): number {
  if (speedKmh <= 0) return 0;
  return Math.round((distanceKm / speedKmh) * 60);
}

const colorPalette = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
  '#a855f7', '#f43f5e', '#22c55e', '#eab308'
];

export function getStringColor(str: string): string {
  if (!str) return '#94a3b8'; // default slate for empty
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
}

export function MapPage() {
  const [apiKey, setApiKey] = useState('');
  const [loadingKey, setLoadingKey] = useState(true);
  const [phlebotomists, setPhlebotomists] = useState<Phlebotomist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTesterFilter, setSelectedTesterFilter] = useState<string>('all');

  const [mapCenter, setMapCenter] = useState({ lat: 31.9522, lng: 35.2332 });
  const [mapZoom, setMapZoom] = useState(12);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'phlebotomist' | 'appointment';
    data: any;
  } | null>(null);

  // Secure API key retrieval
  useEffect(() => {
    fetch('/api/keys/google-maps')
      .then(res => res.json())
      .then(data => {
        if (data && data.key) {
          setApiKey(data.key);
        } else {
          setApiKey(safeGetItem('localStorage', 'GOOGLE_MAPS_API_KEY') || '');
        }
      })
      .catch(() => {
        setApiKey(safeGetItem('localStorage', 'GOOGLE_MAPS_API_KEY') || '');
      })
      .finally(() => {
        setLoadingKey(false);
      });
  }, []);

  const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || apiKey || safeGetItem('localStorage', 'GOOGLE_MAPS_API_KEY') || '';
  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

  // Connect to Socket.io for live tracking of phlebotomists
  useEffect(() => {
    if (!hasValidKey) return;
    
    const socket: Socket = io();

    socket.on('phlebotomists-update', (data: any[]) => {
      setPhlebotomists(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [hasValidKey]);

  // Fetch appointments
  const fetchAppointments = () => {
    setIsLoadingAppointments(true);
    fetch('/api/appointments')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAppointments(data);
          
          // Asynchronously resolve locations for URLs that don't have direct coordinates
          data.forEach(app => {
            const urlToResolve = app.locationUrl || app.location;
            if (urlToResolve && urlToResolve.includes('http') && !parseCoordinates(urlToResolve)) {
              fetch(`/api/resolve-location?url=${encodeURIComponent(urlToResolve)}`)
                .then(r => r.json())
                .then(resolved => {
                  if (resolved.lat && resolved.lng) {
                    setAppointments(prev => prev.map(p => {
                      if (p.id === app.id) {
                        return { ...p, coords: { lat: resolved.lat, lng: resolved.lng } };
                      }
                      return p;
                    }));
                  }
                })
                .catch(err => console.error('Failed to resolve URL', urlToResolve, err));
            }
          });
        }
      })
      .catch(err => console.error('Error fetching appointments for map:', err))
      .finally(() => setIsLoadingAppointments(false));
  };

  useEffect(() => {
    if (hasValidKey) {
      fetchAppointments();
    }
  }, [hasValidKey]);

  // Parse coordinates for each appointment
  const parsedAppointments = useMemo(() => {
    return appointments
      .filter(app => app.status === 'قائم')
      .map(app => {
      // Use pre-resolved coords if available
      if ((app as any).coords) return app;
      
      let coords = parseCoordinates(app.locationUrl);
      if (!coords && app.location) {
        coords = parseCoordinates(app.location);
      }
      return {
        ...app,
        coords
      };
    }).filter(app => (app as any).coords !== null);
  }, [appointments]);

  // Filtered appointments for list display
  const filteredAppointments = useMemo(() => {
    return parsedAppointments.filter(app => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        app.name.toLowerCase().includes(query) ||
        app.phone.includes(query) ||
        app.testName.toLowerCase().includes(query) ||
        (app.testerName || '').toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [parsedAppointments, searchQuery]);

  const combinedList = useMemo(() => {
    const list: Array<{ type: 'phlebotomist' | 'appointment', data: any }> = [];
    const query = searchQuery.trim().toLowerCase();
    
    phlebotomists.forEach(p => {
      if (selectedTesterFilter !== 'all' && p.name !== selectedTesterFilter) return;
      if (!query || p.name.toLowerCase().includes(query)) {
        list.push({ type: 'phlebotomist', data: p });
      }
    });
    
    filteredAppointments.forEach(a => {
      if (selectedTesterFilter !== 'all' && a.testerName !== selectedTesterFilter) return;
      list.push({ type: 'appointment', data: a });
    });
    
    // Sort combined list alphabetically by name
    return list.sort((a, b) => {
      const nameA = a.type === 'phlebotomist' ? a.data.name : a.data.name;
      const nameB = b.type === 'phlebotomist' ? b.data.name : b.data.name;
      return nameA.localeCompare(nameB, 'ar');
    });
  }, [phlebotomists, filteredAppointments, searchQuery, selectedTesterFilter]);
  
  // Also filter map pins similarly
  const mapPhlebotomists = useMemo(() => {
    if (selectedTesterFilter === 'all') return phlebotomists;
    return phlebotomists.filter(p => p.name === selectedTesterFilter);
  }, [phlebotomists, selectedTesterFilter]);

  const mapAppointments = useMemo(() => {
    if (selectedTesterFilter === 'all') return filteredAppointments;
    return filteredAppointments.filter(a => a.testerName === selectedTesterFilter);
  }, [filteredAppointments, selectedTesterFilter]);
  

  // Handle entity click (cards or markers)
  const handleEntitySelect = (type: 'phlebotomist' | 'appointment', data: any) => {
    setSelectedEntity({ type, data });
    const coords = type === 'phlebotomist' ? { lat: data.lat, lng: data.lng } : data.coords;
    if (coords) {
      setMapCenter(coords);
      setMapZoom(14);
    }
  };

  // Helper to color patient pins by status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'جديد': return '#3b82f6'; // Blue
      case 'قائم': return '#f59e0b'; // Amber/Orange
      case 'مكتمل':
      case 'نتائج مستلمة': return '#10b981'; // Emerald
      case 'ملغي': return '#ef4444'; // Red
      default: return '#64748b'; // Slate
    }
  };

  if (loadingKey) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500 font-bold flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-green-600" />
          <span>جاري تحميل إعدادات الخريطة الآمنة...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 p-8 w-full max-w-[1600px] mx-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[20px] shadow-sm border border-slate-100 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-2 h-full bg-green-500 rounded-r-[20px]" />
        <div className="pr-4">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            الخريطة المباشرة والطلبات المحددة
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">متابعة مواقع الساحبين في الميدان وتوزيع دبابيس المرضى جغرافيّاً لتسهيل التوجيه.</p>
        </div>
        
        {hasValidKey && (
          <Button 
            onClick={fetchAppointments} 
            variant="outline" 
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 h-11 font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAppointments ? 'animate-spin text-green-600' : ''}`} />
            <span>تحديث الطلبات</span>
          </Button>
        )}
      </div>

      {!hasValidKey ? (
        <div className="flex-1 bg-white rounded-[20px] shadow-sm border border-slate-100 p-12 flex items-center justify-center flex-col text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
            <MapPin className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-black mb-3 text-slate-800">مطلوب مفتاح Google Maps API</h2>
          <div className="max-w-md text-slate-600 space-y-5 text-sm font-medium">
            <p className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-100 font-bold shadow-sm">
              <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener" className="text-green-700 hover:text-green-900 hover:underline flex items-center justify-center gap-2">
                الخطوة ١: احصل على مفتاح API من جوجل
                <Navigation2 className="w-4 h-4" />
              </a>
            </p>
            <div className="text-right bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-3 dir-rtl shadow-sm">
              <p className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">الخطوة ٢: إضافة المفتاح في إعدادات التطبيق</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> اذهب إلى صفحة <strong>الإعدادات</strong> من القائمة الجانبية.</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> انتقل إلى تبويب <strong>إعدادات التكنولوجيا</strong>.</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> أدخل مفتاح <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-xs text-slate-800 mx-1 shadow-sm">GOOGLE_MAPS_API_KEY</code></li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> سيتم تفعيل الخريطة فوراً.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[650px] lg:h-[750px] flex flex-col lg:flex-row gap-6 relative">
          {/* Sidebar */}
          <div className="w-full lg:w-[380px] flex flex-col h-full bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden p-5 shrink-0">
            {/* Unified List Search & Filter */}
            <div className="space-y-3 mb-4 shrink-0 flex flex-col gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 pr-1">تصفية حسب الساحب</label>
                <Select value={selectedTesterFilter} onValueChange={setSelectedTesterFilter}>
                  <SelectTrigger className="w-full h-10 border-slate-200 focus:ring-green-500 rounded-xl bg-slate-50/50 text-xs font-semibold text-right" dir="rtl">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <SelectValue placeholder="اختر الساحب..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all" className="text-right text-xs font-semibold">جميع الساحبين والمرضى</SelectItem>
                    {phlebotomists.map(p => (
                      <SelectItem key={p.id} value={p.name} className="text-right text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStringColor('tester_' + p.name) }} />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="ابحث باسم المريض، الفحص، أو الساحب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-10 border-slate-200 focus-visible:ring-2 focus-visible:ring-green-500 rounded-xl bg-slate-50/50 text-xs text-right font-medium"
                />
              </div>
            </div>

            {/* Unified List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pl-1 pb-4">
              {combinedList.length === 0 ? (
                <div className="text-center p-6 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                  <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                    لا يوجد نتائج مطابقة.
                  </p>
                </div>
              ) : (
                combinedList.map((item, idx) => {
                  if (item.type === 'phlebotomist') {
                    const p = item.data;
                    const isSelected = selectedEntity?.type === 'phlebotomist' && selectedEntity.data.id === p.id;
                    return (
                      <Card 
                        key={`p-${p.id}-${idx}`} 
                        className={`border-slate-100 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all shrink-0 bg-white group border ${
                          isSelected ? 'ring-2 ring-green-500 border-transparent bg-green-50/10' : 'hover:border-green-200'
                        }`}
                        onClick={() => handleEntitySelect('phlebotomist', p)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div 
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-sm border ${p.isOffline ? 'opacity-50 grayscale' : ''}`}
                                style={{ backgroundColor: p.isOffline ? '#94a3b8' : getStringColor('tester_' + p.name) }}
                              >
                                {p.initials}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-green-700 transition-colors">{p.name}</h3>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{p.isOffline ? 'غير متصل' : p.status}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-[9px] font-bold ${p.isOffline ? 'bg-slate-50 text-slate-500 border-slate-200' : p.badgeClass || 'bg-green-50 text-green-700 border-green-200'}`}>
                              {p.isOffline ? 'غير متصل' : 'متصل'}
                            </Badge>
                          </div>

                          {!p.isOffline && p.battery !== undefined && (
                            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-2">
                              <span className="flex items-center gap-1">🔋 البطارية: {p.battery}%</span>
                              {p.speed !== undefined && <span>⚡ السرعة: {p.speed} كم/س</span>}
                            </div>
                          )}

                          {selectedEntity?.type === 'appointment' && selectedEntity.data.coords && !p.isOffline && (
                            <div className="bg-slate-50 p-1.5 rounded flex flex-col gap-1 text-[10px] font-bold mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">المسافة عن {selectedEntity.data.name}:</span>
                                <span className="text-green-600 font-mono">
                                  {calculateDistance(selectedEntity.data.coords.lat, selectedEntity.data.coords.lng, p.lat, p.lng).toFixed(1)} كم
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" /> الوقت المقدر للوصول:
                                </span>
                                <span className="text-slate-700 font-bold">
                                  {calculateEstimatedTime(calculateDistance(selectedEntity.data.coords.lat, selectedEntity.data.coords.lng, p.lat, p.lng), p.speed || 40)} دقيقة
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  } else {
                    const app = item.data;
                    const isSelected = selectedEntity?.type === 'appointment' && selectedEntity.data.id === app.id;
                    return (
                      <Card
                        key={`a-${app.id}-${idx}`}
                        onClick={() => handleEntitySelect('appointment', app)}
                        className={`border-slate-100 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all shrink-0 bg-white group border ${
                          isSelected ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/10' : 'hover:border-blue-200'
                        }`}
                      >
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: getStringColor('patient_' + app.name) }}
                              />
                              <h3 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-600 transition-colors line-clamp-1">{app.name}</h3>
                            </div>
                            <Badge variant="outline" className={`text-[9px] font-black tracking-wide shrink-0 ${
                              app.status === 'جديد' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              app.status === 'قائم' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {app.status}
                            </Badge>
                          </div>

                          <p className="text-[11px] text-slate-500 font-semibold line-clamp-1">📍 المنطقة: {app.location}</p>
                          
                          {selectedEntity?.type === 'phlebotomist' && app.coords && (
                            <div className="bg-slate-50 p-1.5 rounded flex flex-col gap-1 text-[10px] font-bold mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">المسافة عن {selectedEntity.data.name}:</span>
                                <span className="text-blue-600 font-mono">
                                  {calculateDistance(selectedEntity.data.lat, selectedEntity.data.lng, app.coords.lat, app.coords.lng).toFixed(1)} كم
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" /> الوقت المقدر للوصول:
                                </span>
                                <span className="text-slate-700 font-bold">
                                  {calculateEstimatedTime(calculateDistance(selectedEntity.data.lat, selectedEntity.data.lng, app.coords.lat, app.coords.lng), selectedEntity.data.speed || 40)} دقيقة
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-50">
                            <span>📅 {app.date}</span>
                            <span className="text-slate-500">🛵 {app.testerName || 'غير محدد'}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                })
              )}
            </div>

            {/* Helpful Tip box */}
            <div className="mt-3 shrink-0 p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[10px] text-amber-800 font-semibold flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>تلميح:</strong> لعرض الطلب على الخريطة، احرص على لصق رابط خرائط جوجل أو الإحداثيات في حقل موقع المريض.
              </p>
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 bg-slate-50 rounded-[24px] border border-slate-100 overflow-hidden relative shadow-sm h-full">
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                center={mapCenter}
                zoom={mapZoom}
                onCameraChanged={(ev) => {
                  setMapCenter(ev.detail.center);
                  setMapZoom(ev.detail.zoom);
                }}
                mapId="DISPATCH_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{width: '100%', height: '100%'}}
              >
                {/* 1. Live Phlebotomist Markers */}
                {mapPhlebotomists.map(p => {
                  const driverColor = getStringColor('tester_' + p.name);
                  return (
                    <AdvancedMarker 
                      key={`p-${p.id}`} 
                      position={{lat: p.lat, lng: p.lng}} 
                      zIndex={100}
                      onClick={() => setSelectedEntity({ type: 'phlebotomist', data: p })}
                    >
                      <Pin 
                        background={p.isOffline ? '#94a3b8' : driverColor} 
                        borderColor={p.isOffline ? '#64748b' : driverColor} 
                        scale={1.2} 
                      />
                    </AdvancedMarker>
                  );
                })}

                {/* 2. Patient Appointment Pins */}
                {mapAppointments.map(app => {
                  if (!app.coords) return null;
                  const patientColor = getStringColor('patient_' + app.name);
                  return (
                    <AdvancedMarker
                      key={`a-${app.id}`}
                      position={app.coords}
                      zIndex={10}
                      onClick={() => setSelectedEntity({ type: 'appointment', data: app })}
                    >
                      <Pin
                        background={patientColor}
                        borderColor={patientColor}
                        scale={1.0}
                      />
                    </AdvancedMarker>
                  );
                })}
              </Map>
            </APIProvider>

            {/* Float Legends overlay */}
            <div className="absolute top-6 left-6 z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 space-y-2.5 pointer-events-auto">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">دليل الخريطة</h5>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
                <span className="text-[11px] font-bold text-slate-700">الساحب الميداني (Live)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                <span className="text-[11px] font-bold text-slate-700">طلب جديد</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                <span className="text-[11px] font-bold text-slate-700">طلب قائم</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-[11px] font-bold text-slate-700">طلب مكتمل</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

