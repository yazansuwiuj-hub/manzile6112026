import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Users,
  Activity,
  CheckCircle,
  Clock,
  MapPin,
  DollarSign,
  XCircle,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Image as ImageIcon,
  Trash2,
  Eye,
  ExternalLink,
  Phone,
  MessageCircle,
  Copy,
  Calendar,
  CreditCard,
  FileText,
  Printer,
  Navigation,
  Map,
  Edit,
  X,
  User as UserIcon,
  Search,
  ZoomIn,
  ZoomOut,
  RefreshCcw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Appointment, User } from "../types";
import { formatTimeRangeTo12Hour } from "../lib/utils";

export function Dashboard({
  user,
  refreshKey,
}: {
  user?: User;
  refreshKey?: number;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<
    | "overview"
    | "newRequests"
    | "pendingRequests"
    | "completedRequests"
    | "canceledRequests"
  >(user?.role === "مشاهد" ? "pendingRequests" : "overview");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusActionDialog, setStatusActionDialog] = useState<{id: string | number, type: 'complete' | 'cancel'} | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [amountCollected, setAmountCollected] = useState("");
  const [completionPaymentMethod, setCompletionPaymentMethod] = useState("نقدي");
  const [priceDiffReason, setPriceDiffReason] = useState("");
  const [editForm, setEditForm] = useState<Partial<Appointment>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [completedDateFilter, setCompletedDateFilter] = useState("");
  const [completedVisibleCount, setCompletedVisibleCount] = useState(20);
  const [canceledVisibleCount, setCanceledVisibleCount] = useState(20);
  const [examSearchQuery, setExamSearchQuery] = useState("");
  const [printTesterId, setPrintTesterId] = useState("");
  const [testers, setTesters] = useState<User[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [successBanner, setSuccessBanner] = useState("");
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      text: "موعد جديد بانتظار الإسناد الجغرافي والساحب لعميل في عمان الغربية",
      type: "warning",
      time: "منذ دقيقة",
    },
    {
      id: 2,
      text: 'تم وصول عينات العميل "أحمد الروابدة" للمختبر المركزي بنجاح',
      type: "success",
      time: "منذ 10 دقائق",
    },
    {
      id: 3,
      text: 'تمت مطابقة عهدة الساحب "رامي العلي" المالية لليوم بنجاح',
      type: "info",
      time: "منذ 25 دقيقة",
    },
  ]);

  const [examinations, setExaminations] = useState<{id: string, name: string, price: number}[]>([]);

  useEffect(() => {
    fetchAppointments();
    fetchTesters();
    fetchExaminations();
  }, [refreshKey]);

  const fetchExaminations = async () => {
    try {
      const res = await fetch("/api/examinations");
      if (res.ok) {
        const data = await res.json();
        setExaminations(data);
      }
    } catch (error) {
      console.error("Failed to fetch examinations:", error);
    }
  };

  const fetchTesters = async () => {
    try {
      const res = await fetch("/api/users");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        const activeTesters = data.filter(
          (u: User) => u.role === "ساحب منزلي" && u.status === "نشط",
        );
        setTesters(activeTesters);
      }
    } catch (error) {
      console.error("Failed to fetch testers:", error);
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/appointments");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
    setIsLoading(false);
  };

  const handleSelectAppointment = (app: Appointment) => {
    setSelectedAppointment(app);
    setEditForm({ ...app });
    setIsEditing(false);
  };

  const saveAppointmentChanges = async (shouldConfirm: boolean = false) => {
    if (!selectedAppointment) return;
    setIsSaving(true);
    try {
      const updatedData = {
        ...editForm,
        ...(shouldConfirm ? { status: "قائم" } : {}),
      };

      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (res.ok) {
        const result = await res.json();
        
        // Show success banner if confirmed from new request
        if (shouldConfirm && selectedAppointment.status === "جديد") {
          setSuccessBanner("تم تأكيد الموعد وإضافته إلى قائمة المواعيد القائمة بنجاح");
          setTimeout(() => setSuccessBanner(""), 5000);
        }
        
        // Update local states
        setAppointments((prev) =>
          prev.map((app) => (String(app.id) === String(selectedAppointment.id) ? { ...app, ...updatedData } : app))
        );
        if (shouldConfirm) {
          sendWhatsAppMessage({ ...selectedAppointment, ...updatedData } as Appointment, "قائم");
          setSelectedAppointment(null);
        } else {
          setSelectedAppointment((prev) => prev ? { ...prev, ...updatedData } : null);
        }
        
        // We can fetch silently to ensure everything is synced
        fetchAppointments();
      } else {
        console.error("Failed to update appointment details");
      }
    } catch (error) {
      console.error("Failed to update appointment details:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const sendWhatsAppMessage = (app: Appointment, newStatus: string, cancelReason?: string) => {
    if (!["قائم", "مكتمل", "ملغي"].includes(newStatus)) return;

    try {
      fetch('/api/keys/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: app.phone,
          name: app.name,
          date: app.date,
          time: app.time,
          region: app.location.split("-")[1]?.trim() || app.location,
          price: app.price,
          exams: app.testName,
          attachmentUrl: app.attachmentUrl || '',
          status: newStatus,
          cancelReason: cancelReason
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log("WhatsApp message sent successfully via backend proxy.");
        } else {
          console.warn("WhatsApp background send returned non-success:", data.error);
        }
      })
      .catch(e => console.error("WhatsApp proxy send error:", e));
    } catch (waError) {
      console.error("Failed to trigger secure server-side WhatsApp message:", waError);
    }
  };

  const updateAppointmentStatus = async (
    id: string | number,
    status: string,
    notes?: string,
    amountCollected?: number,
    paymentMethod?: string,
    priceDiffReason?: string
  ) => {
    const stringId = String(id);
    const existingAppt = appointments.find(a => String(a.id) === stringId);
    let finalNotes = existingAppt?.notes || "";
    
    if (notes) {
       finalNotes = finalNotes ? finalNotes + '\n' + notes : notes.trim();
    }
    
    // Optimistic Update
    setAppointments((prev) =>
      prev.map((app) => (String(app.id) === stringId ? { 
        ...app, 
        status, 
        ...(finalNotes && {notes: finalNotes}), 
        ...(amountCollected !== undefined && {amountCollected}),
        ...(paymentMethod && {paymentMethod}),
        ...(priceDiffReason !== undefined && {priceDiffReason})
      } : app))
    );
    
    const appToSend = appointments.find(a => String(a.id) === stringId);
    if (appToSend) {
      sendWhatsAppMessage(appToSend, status, notes);
    }

    if (selectedAppointment && String(selectedAppointment.id) === stringId) {
      setSelectedAppointment(null);
    }

    try {
      const isCompleteAction = status === 'مكتمل';
      const endpoint = isCompleteAction ? `/api/appointments/${stringId}` : `/api/appointments/${stringId}/status`;
      
      const payload = isCompleteAction ? {
        ...existingAppt,
        status,
        ...(finalNotes && {notes: finalNotes}),
        ...(amountCollected !== undefined && {amountCollected}),
        ...(paymentMethod && {paymentMethod}),
        ...(priceDiffReason !== undefined && {priceDiffReason}),
        completionTime: new Date().toISOString()
      } : { 
        status, 
        ...(finalNotes && {notes: finalNotes}), 
        ...(amountCollected !== undefined && {amountCollected}),
        ...(paymentMethod && {paymentMethod}),
        ...(priceDiffReason !== undefined && {priceDiffReason})
      };

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // Revert on failure
        fetchAppointments();
      } else {
        if (status === "قائم" && existingAppt?.status === "جديد") {
          setSuccessBanner("تم تأكيد الموعد وإضافته إلى قائمة المواعيد القائمة بنجاح");
          setTimeout(() => setSuccessBanner(""), 5000);
        }
        // Refresh silently to ensure sync
        fetchAppointments();
      }
    } catch (error) {
      console.error("Failed to update status", error);
      fetchAppointments();
    }
  };

  // Filter appointments for home phlebotomist ('ساحب منزلي') so they only see appointments registered in their name
  const filteredAppointments =
    user?.role === "ساحب منزلي"
      ? appointments.filter((a) => a.testerName === user.name)
      : appointments;

  const parseTimeForSorting = (timeStr?: string) => {
    if (!timeStr) return 9999;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      return h * 60 + m;
    }
    return 9999;
  };

  // Search filter implementation
  const filteredBySearch = filteredAppointments.filter((a) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.phone.includes(query) ||
      (a.location && a.location.toLowerCase().includes(query)) ||
      (a.testerName && a.testerName.toLowerCase().includes(query)) ||
      (a.testName && a.testName.toLowerCase().includes(query))
    );
  }).sort((a, b) => parseTimeForSorting(a.time) - parseTimeForSorting(b.time));

  const newRequests = filteredBySearch.filter((a) => a.status === "جديد");
  const pendingRequests = filteredBySearch.filter((a) => a.status === "قائم");
  const completedRequests = filteredBySearch.filter(
    (a) => (a.status === "مكتمل" || a.status === "نتائج مستلمة") && (!completedDateFilter || a.date === completedDateFilter)
  );
  const canceledRequests = filteredBySearch.filter((a) => a.status === "ملغي");

  const handleDeleteAppointment = (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    if (user?.role !== "مسؤول") return;
    setDeleteConfirmId(appId);
  };

  const confirmDeleteAppointment = async () => {
    if (!deleteConfirmId || user?.role !== "مسؤول") return;

    try {
      const res = await fetch(`/api/appointments/${deleteConfirmId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deletedBy: user?.name || user?.email || "مسؤول النظام",
        }),
      });
      if (res.ok) {
        fetchAppointments();
        setDeleteConfirmId(null);
        if (selectedAppointment && selectedAppointment.id === deleteConfirmId) {
          setSelectedAppointment(null);
        }
      } else {
        console.error("حدث خطأ أثناء حذف الموعد");
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
    }
  };

  const renderTableContent = (data: Appointment[]) => (
    <div className="p-0">
      <div className="flex-1 overflow-y-auto pr-1 pb-4">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-lg">
            لا يوجد طلبات حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((app) => {
              let statusBg = "bg-slate-500/10 text-slate-700 border-slate-200";
              let dotColor = "bg-slate-400";
              let statusBorderClass = "border-r-slate-400";
              
              if (app.status === "جديد") { statusBg = "bg-blue-50 text-blue-700 border-blue-100"; dotColor = "bg-blue-500"; statusBorderClass = "border-r-blue-500"; }
              else if (app.status === "قائم") { statusBg = "bg-amber-50 text-amber-700 border-amber-100"; dotColor = "bg-amber-500"; statusBorderClass = "border-r-amber-500"; }
              else if (app.status === "مكتمل") { statusBg = "bg-emerald-50 text-emerald-700 border-emerald-100"; dotColor = "bg-emerald-500"; statusBorderClass = "border-r-emerald-500"; }
              else if (app.status === "نتائج مستلمة") { statusBg = "bg-green-50 text-green-700 border-green-100"; dotColor = "bg-green-500"; statusBorderClass = "border-r-green-500"; }
              else if (app.status === "ملغي") { statusBg = "bg-red-50 text-red-700 border-red-100"; dotColor = "bg-red-500"; statusBorderClass = "border-r-red-500"; }

              const testChips = app.testName ? app.testName.split(/[,،]/).map(t => t.trim()).filter(t => t && !t.includes('مرفق طبي')) : [];

              let cardClasses = `bg-white border-slate-200/60 hover:border-green-200/50 ${statusBorderClass}`;
              if (app.isExternalRequest) {
                cardClasses = `bg-pink-50/20 border-pink-200/60 hover:border-pink-300/80 ${statusBorderClass}`;
              }

              return (
                <div
                  key={app.id}
                  className={`rounded-[20px] border border-r-4 shadow-xs relative overflow-hidden flex flex-col group hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer p-6 ${cardClasses}`}
                  onClick={() => handleSelectAppointment(app)}
                >
                  {/* Status & Price Header */}
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100/50">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusBg}`}>
                        {app.status}
                      </span>
                      {app.isExternalRequest && (
                        <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-pink-50 text-pink-700 border border-pink-100 uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                          حجز خارجي
                        </span>
                      )}
                    </div>
                    <div className="text-left font-mono font-bold text-green-700 bg-green-50/50 px-3 py-1.5 rounded-lg text-sm border border-green-100/30">
                      {app.price} د.أ
                    </div>
                  </div>

                  {/* Patient Name Section */}
                  <div className="mb-5">
                    <h3 className="font-bold text-[1.35rem] text-slate-900 group-hover:text-green-700 transition-colors leading-tight">
                      {app.name}
                    </h3>
                  </div>

                  {/* Basic Info - Organized Grid */}
                  <div className="grid grid-cols-1 gap-4 mb-6 flex-1">
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/80 group-hover:bg-green-50/50 group-hover:border-green-100/30 transition-colors">
                        <Phone className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                      </div>
                      <span className="font-mono text-sm font-medium" dir="ltr">{app.phone}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/80 group-hover:bg-green-50/50 group-hover:border-green-100/30 transition-colors">
                        <MapPin className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                      </div>
                      <span className="text-sm truncate font-medium text-slate-600" title={app.location}>{app.location}</span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/80 group-hover:bg-green-50/50 group-hover:border-green-100/30 transition-colors">
                        <UserIcon className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">الساحب الميداني</span>
                        <span className="text-sm font-bold text-slate-700">{app.testerName || "لم يتم التعيين"}</span>
                      </div>
                    </div>

                    {/* Date and Time Section Card */}
                    <div className="flex items-center gap-4 p-3.5 bg-slate-50/60 rounded-xl border border-slate-100/80 mt-2">
                      <div className="flex items-center gap-2.5 flex-1 border-l border-slate-200/50 pl-3">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">{app.date}</span>
                      </div>
                      <div className="flex items-center gap-2.5 flex-1 pr-3 text-left">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-mono font-bold text-slate-700" dir="ltr">{formatTimeRangeTo12Hour(app.time)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tests Section */}
                  <div className="mb-5 pb-4 border-b border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 block">الفحوصات المطلوبة</span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {testChips.length > 0 ? (
                        testChips.map((test, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-slate-50 text-slate-700 hover:bg-green-50 hover:text-green-700 border border-slate-200/50 rounded-xl px-2 py-0.5 text-xs font-semibold">
                            {test}
                          </Badge>
                        ))
                      ) : !app.attachmentUrl ? (
                        <span className="text-xs text-slate-400 font-medium">لا يوجد فحوصات محددة</span>
                      ) : null}
                      
                      {app.attachmentUrl && (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 flex items-center gap-1 border border-emerald-100/50 rounded-xl px-2 py-0.5 text-xs font-semibold">
                          <ImageIcon className="w-3 h-3" />
                          <span>وصفة طبية مرفقة</span>
                        </Badge>
                      )}
                      {app.requiresFasting ? (
                        <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200/60 flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          <span>يحتاج صيام</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60 flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-medium opacity-70">
                          <span>لا يحتاج صيام</span>
                        </Badge>
                      )}
                      {app.notes && (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100/50 flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          <span>ملاحظات خاصة</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-2.5 mt-auto">
                    <a 
                      href={`tel:${app.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 h-11 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-sm font-bold transition-all duration-300 border border-emerald-100 hover:border-emerald-600 cursor-pointer shadow-xs"
                    >
                      <Phone className="w-4 h-4" />
                      <span>اتصال</span>
                    </a>
                    {app.locationUrl && (
                      <a 
                        href={app.locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 h-11 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold transition-all duration-300 border border-slate-200 cursor-pointer shadow-xs"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>الموقع</span>
                      </a>
                    )}
                    {user?.role === "مسؤول" && (
                      <button
                        onClick={(e) => handleDeleteAppointment(e, app.id)}
                        className="w-11 h-11 flex items-center justify-center bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all duration-300 border border-red-100 hover:border-red-600 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const displayTesters = testers.filter(t => t.governorate === 'عمان');

  const pendingExternalCount = appointments.filter(
    (a) => a.status === "جديد" && a.isExternalRequest
  ).length;

  const todaysRevenue = appointments
    .filter((a) => a.status !== "ملغي")
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const handlePrintTester = () => {
    if (!printTesterId) return;

    const testerAppointments = appointments.filter(
      a => a.testerName === printTesterId && a.status === 'قائم'
    );

    if (testerAppointments.length === 0) {
      alert("لا يوجد مواعيد قائمة لهذا الساحب حالياً");
      return;
    }

    const dateStr = new Date().toLocaleDateString('ar-JO');

    const htmlContent = `
      <html dir="rtl" lang="ar">
        <head>
          <title>كشف مواعيد - ${printTesterId}</title>
          <style>
            @page { size: A4 landscape; margin: 1cm; }
            body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; font-size: 14px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .meta { font-size: 14px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: auto; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            th, td { border: 1px solid #000; padding: 10px; text-align: right; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .notes { height: 60px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">كشف المواعيد القائمة (العمليات الميدانية)</div>
            <div class="meta">اسم الساحب: <strong>${printTesterId}</strong> | التاريخ: ${dateStr}</div>
            <div class="meta">إجمالي المواعيد: ${testerAppointments.length}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="20%">اسم المريض</th>
                <th width="15%">الهاتف</th>
                <th width="20%">العنوان</th>
                <th width="20%">الفحوصات المطلوبة</th>
                <th width="10%">المبلغ</th>
                <th width="10%">ملاحظات الساحب</th>
              </tr>
            </thead>
            <tbody>
              ${testerAppointments.map((app, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${app.name}</strong><br><small>${app.age} سنة</small></td>
                  <td dir="ltr" style="text-align: right;">${app.phone}</td>
                  <td>${app.location}</td>
                  <td>${app.testName || 'غير محدد'}</td>
                  <td>${app.price} د.أ</td>
                  <td class="notes"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            تم إصدار هذا الكشف من نظام إدارة المواعيد - ${new Date().toLocaleString('ar-JO')}
          </div>
          
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
    } else {
      alert("الرجاء السماح بالنوافذ المنبثقة (Pop-ups) للطباعة بشكل صحيح.");
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {successBanner && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 text-sm font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner("")} className="text-green-500 hover:text-green-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Controls: Search and Print */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-5 rounded-[22px] shadow-xs border border-slate-100">
        {/* Search & Filters */}
        <div className="flex-1 flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="ابحث عن اسم المريض أو رقم الهاتف أو العنوان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-11 pl-4 py-3.5 border border-slate-200 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 font-semibold text-sm text-slate-800 placeholder:text-slate-400 transition-all shadow-xs"
            />
          </div>
          {selectedView === "completedRequests" && (
            <div className="w-full md:w-auto">
              <input 
                type="date"
                value={completedDateFilter}
                onChange={(e) => setCompletedDateFilter(e.target.value)}
                className="w-full px-4 py-3.5 border border-slate-200 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-mono text-sm text-slate-800 transition-all shadow-xs"
              />
            </div>
          )}
        </div>

        {/* Print Tester Appointments */}
        {(user.role === 'مسؤول' || user.role === 'مبرمج مواعيد') && (
          <div className="flex items-center gap-3">
            <select
              value={printTesterId}
              onChange={(e) => setPrintTesterId(e.target.value)}
              className="border border-slate-200 rounded-[16px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-600 font-bold text-sm text-slate-700 bg-white shadow-xs cursor-pointer min-w-[200px]"
            >
              <option value="">اختر الساحب للطباعة...</option>
              {testers.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
            <Button 
              onClick={handlePrintTester}
              disabled={!printTesterId}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white gap-2 font-bold py-3.5 px-6 h-auto shadow-xs rounded-[16px] border-0 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف</span>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards Raised to the Top */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 pb-2">
        {user?.role !== 'مشاهد' && (
        <Card
          className={`shadow-xs cursor-pointer transition-all duration-300 border rounded-[20px] overflow-hidden relative group ${
            selectedView === "newRequests"
              ? "border-blue-500/50 bg-gradient-to-br from-blue-50/80 to-white shadow-blue-100/50 scale-[1.01]"
              : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
          }`}
          onClick={() => setSelectedView("newRequests")}
        >
          {selectedView === "newRequests" && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600" />}
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
            <CardTitle className="text-sm font-extrabold text-slate-600 uppercase tracking-wide">
              طلبات جديدة
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-4xl font-black text-slate-900 font-mono tracking-tight">
              {isLoading ? "..." : newRequests.length}
            </div>
            <p className="text-xs font-bold flex items-center mt-3 text-blue-700">
              طلبات جديدة
            </p>
          </CardContent>
        </Card>
        )}
        <Card
          className={`shadow-xs cursor-pointer transition-all duration-300 border rounded-[20px] overflow-hidden relative group ${
            selectedView === "pendingRequests"
              ? "border-amber-500/50 bg-gradient-to-br from-amber-50/80 to-white shadow-amber-100/50 scale-[1.01]"
              : "border-slate-200 bg-white hover:border-amber-300 hover:shadow-md"
          }`}
          onClick={() => setSelectedView("pendingRequests")}
        >
          {selectedView === "pendingRequests" && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600" />}
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
            <CardTitle className="text-sm font-extrabold text-slate-600 uppercase tracking-wide">
              مواعيد قائمة
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-4xl font-black text-slate-900 font-mono tracking-tight">
              {isLoading ? "..." : pendingRequests.length}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                style={{ width: pendingRequests.length ? "100%" : "0%" }}
              ></div>
            </div>
            <p className="text-xs font-bold flex items-center mt-3 text-amber-700">
              مواعيد قائمة
            </p>
          </CardContent>
        </Card>
        {user?.role !== 'مشاهد' && (
        <>
        <Card
          className={`shadow-xs cursor-pointer transition-all duration-300 border rounded-[20px] overflow-hidden relative group ${
            selectedView === "completedRequests"
              ? "border-emerald-500/50 bg-gradient-to-br from-emerald-50/80 to-white shadow-emerald-100/50 scale-[1.01]"
              : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md"
          }`}
          onClick={() => setSelectedView("completedRequests")}
        >
          {selectedView === "completedRequests" && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />}
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
            <CardTitle className="text-sm font-extrabold text-slate-600 uppercase tracking-wide">
              مواعيد مكتملة
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-4xl font-black text-slate-900 font-mono tracking-tight">
              {isLoading ? "..." : completedRequests.length}
            </div>
            <p className="text-xs font-bold flex items-center mt-3 text-emerald-700">
              مواعيد مكتملة
            </p>
          </CardContent>
        </Card>

        <Card
          className={`shadow-xs cursor-pointer transition-all duration-300 border rounded-[20px] overflow-hidden relative group ${
            selectedView === "canceledRequests"
              ? "border-red-500/50 bg-gradient-to-br from-red-50/80 to-white shadow-red-100/50 scale-[1.01]"
              : "border-slate-200 bg-white hover:border-red-300 hover:shadow-md"
          }`}
          onClick={() => setSelectedView("canceledRequests")}
        >
          {selectedView === "canceledRequests" && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600" />}
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
            <CardTitle className="text-sm font-extrabold text-slate-600 uppercase tracking-wide">
              المواعيد الملغاة
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700">
              <XCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-4xl font-black text-slate-900 font-mono tracking-tight">
              {isLoading ? "..." : canceledRequests.length}
            </div>
            <p className="text-xs font-bold flex items-center mt-3 text-red-700">
              المواعيد الملغاة
            </p>
          </CardContent>
        </Card>
        </>
        )}
      </div>

      {/* External Requests Banner */}
      {pendingExternalCount > 0 && (user?.role === 'مبرمج مواعيد' || user?.role === 'مسؤول') && (
        <div className="bg-pink-50 text-pink-800 p-4 rounded-xl border border-pink-200 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-bounce block shrink-0" />
            <span>
              يوجد ({pendingExternalCount}) طلب حجز خارجي جديد بانتظار التأكيد والمتابعة.
            </span>
          </div>
          <button 
            onClick={() => setSelectedView("newRequests")}
            className="text-white bg-pink-600 hover:bg-pink-700 px-4 py-1.5 rounded-lg text-xs font-extrabold border border-pink-700 shrink-0 transition-colors"
          >
            عرض الطلبات الجديدة
          </button>
        </div>
      )}


      {/* Beautiful Tabbed Container for Organized Tables */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-100 p-0 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-start gap-1 p-2">
            {user?.role !== 'مشاهد' && (
            <button
              onClick={() => setSelectedView("overview")}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedView === "overview"
                  ? "bg-white text-green-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              📊 النشاط المباشر والملخص
            </button>
            )}
            {user?.role !== 'مشاهد' && (
            <button
              onClick={() => setSelectedView("newRequests")}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedView === "newRequests"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              🆕 الطلبات الجديدة ({newRequests.length})
            </button>
            )}
            <button
              onClick={() => setSelectedView("pendingRequests")}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedView === "pendingRequests"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              ⏳ المواعيد القائمة ({pendingRequests.length})
            </button>
            {user?.role !== 'مشاهد' && (
            <>
            <button
              onClick={() => setSelectedView("completedRequests")}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedView === "completedRequests"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              ✅ المواعيد المكتملة ({completedRequests.length})
            </button>
            <button
              onClick={() => setSelectedView("canceledRequests")}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedView === "canceledRequests"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              ❌ المواعيد الملغاة ({canceledRequests.length})
            </button>
            </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {selectedView === "overview" && (
            <div className="grid gap-6 md:grid-cols-7 p-6">
              {(user?.role === "مسؤول" || user?.role === "منسق مواعيد" || user?.role === "مبرمج مواعيد") && (
                <Card className="md:col-span-7 border border-slate-100 shadow-none bg-slate-50/30">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                        👥 حالة الموظفين (الساحبين الميدانيين)
                      </CardTitle>
                      <span className="text-[11px] text-slate-500 bg-white border border-slate-100 px-2.5 py-1 rounded-full font-semibold">
                        نشطون الآن: {displayTesters.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[350px] overflow-y-auto pr-1"
                      style={{ scrollbarWidth: "thin" }}
                    >
                      {displayTesters.map((tester) => {
                        const testerApps = appointments.filter(
                          (a) =>
                            (a.testerName || "").trim() ===
                            (tester.name || "").trim(),
                        );
                        const upcomingApps = testerApps.filter(
                          (a) => a.status === "قائم",
                        );
                        const activeApps = testerApps.filter(
                          (a) => a.status === "جديد" || a.status === "قائم",
                        );

                        return (
                          <div
                            key={tester.id}
                            className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm hover:border-green-200 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-50 to-transparent rounded-bl-full -z-10"></div>
                            
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-100 to-green-50 border-2 border-white shadow-sm text-green-700 flex items-center justify-center font-bold text-sm shrink-0">
                                    {tester.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .substring(0, 2)}
                                  </div>
                                  <div className="text-right">
                                    <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-green-700 transition-colors">
                                      {tester.name}
                                    </h4>
                                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 inline-block">
                                      {tester.role || "ساحب ميداني"}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${
                                    (tester.dailyLimit && activeApps.length >= tester.dailyLimit)
                                      ? "bg-red-100 text-red-800 border-red-200"
                                      : activeApps.length > 2
                                      ? "bg-amber-100 text-amber-800 border-amber-200"
                                      : activeApps.length === 0
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                        : "bg-green-100 text-green-800 border-green-200"
                                  }`}
                                >
                                  {(tester.dailyLimit && activeApps.length >= tester.dailyLimit)
                                    ? "ممتلئ"
                                    : activeApps.length > 2
                                    ? "مزدحم"
                                    : activeApps.length === 0
                                      ? "متاح"
                                      : "نشط"}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {tester.dailyLimit && (
                                  <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200 flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-slate-400" />
                                    الحد: {tester.dailyLimit}
                                  </span>
                                )}
                                {tester.governorate && (
                                  <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {tester.governorate}
                                  </span>
                                )}
                                {tester.shift && (
                                  <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {tester.shift}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                              <div className="text-xs text-slate-600 font-semibold flex items-center gap-1.5 mb-1">
                                <Activity className="w-3.5 h-3.5 text-green-500" />
                                الجولات القائمة ({upcomingApps.length})
                              </div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {Object.entries(
                                  upcomingApps.reduce((acc, app) => {
                                    const t = app.time || 'غير محدد';
                                    acc[t] = (acc[t] || 0) + 1;
                                    return acc;
                                  }, {} as Record<string, number>)
                                ).sort(([timeA], [timeB]) => timeA.localeCompare(timeB)).map(([time, count]) => (
                                  <div key={time} className="flex items-center justify-between bg-slate-50 rounded-lg p-2 border border-slate-100">
                                    <span className="text-[11px] text-slate-500 font-medium" dir="ltr">{formatTimeRangeTo12Hour(time) || time}</span>
                                    <span className="font-bold text-xs text-green-700 bg-green-100/50 px-2 py-0.5 rounded-md">
                                      {count}
                                    </span>
                                  </div>
                                ))}
                                {upcomingApps.length === 0 && (
                                  <div className="text-center text-xs text-slate-400 py-2 bg-slate-50 rounded-lg border border-slate-100">لا يوجد جولات قائمة</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {selectedView === "newRequests" && renderTableContent(newRequests)}
          {selectedView === "pendingRequests" &&
            renderTableContent(pendingRequests)}
          {selectedView === "completedRequests" && (
            <div className="flex flex-col">
              {renderTableContent(completedRequests.slice(0, completedVisibleCount))}
              {completedRequests.length > completedVisibleCount && (
                <div className="flex justify-center mt-4 mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setCompletedVisibleCount((prev) => prev + 20)}
                    className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    عرض المزيد (See More)
                  </Button>
                </div>
              )}
            </div>
          )}
          {selectedView === "canceledRequests" && (
            <div className="flex flex-col">
              {renderTableContent(canceledRequests.slice(0, canceledVisibleCount))}
              {canceledRequests.length > canceledVisibleCount && (
                <div className="flex justify-center mt-4 mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setCanceledVisibleCount((prev) => prev + 20)}
                    className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    عرض المزيد (See More)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

            {selectedAppointment && (
        <Dialog
          open={!!selectedAppointment}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAppointment(null);
              setIsEditing(false);
            }
          }}
        >
          <DialogContent className="!max-w-none w-full sm:w-[95%] md:w-[85%] lg:w-[70%] xl:w-[60%] h-[100dvh] sm:h-[90vh] p-0 bg-slate-50 border-slate-200 shadow-2xl flex flex-col overflow-hidden sm:rounded-2xl gap-0" dir="rtl">
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
              {isEditing ? (
                <div className="grid gap-5 text-right bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                    <Edit className="w-4 h-4 text-green-500" />
                    تعديل بيانات الموعد
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">اسم المريض</label>
                      <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="text-right h-11 bg-slate-50/50 rounded-xl border-slate-200 focus-visible:ring-green-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">رقم الهاتف</label>
                      <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="text-right font-mono h-11 bg-slate-50/50 rounded-xl border-slate-200 focus-visible:ring-green-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">العمر</label>
                      <Input type="number" value={editForm.age || ""} onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })} className="text-right font-mono h-11 bg-slate-50/50 rounded-xl border-slate-200 focus-visible:ring-green-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">المنطقة / العنوان</label>
                      <Input value={editForm.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="text-right h-11 bg-slate-50/50 rounded-xl border-slate-200 focus-visible:ring-green-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">التاريخ</label>
                      <Input type="date" value={editForm.date || ""} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="text-right font-mono h-11 bg-slate-50/50 rounded-xl border-slate-200 focus-visible:ring-green-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">الوقت</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input 
                            type="time" 
                            value={(editForm.time || "08:00 - 10:00").split(" - ")[0] || "08:00"} 
                            onChange={(e) => {
                              const [, to] = (editForm.time || "08:00 - 10:00").split(" - ");
                              setEditForm({ ...editForm, time: `${e.target.value} - ${to || "10:00"}` });
                            }} 
                            className="text-right font-mono h-11 bg-slate-50/50 rounded-xl border-slate-200 pl-8 focus-visible:ring-green-500" 
                          />
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                        <span className="text-slate-400 font-bold text-sm">إلى</span>
                        <div className="relative flex-1">
                          <Input 
                            type="time" 
                            value={(editForm.time || "08:00 - 10:00").split(" - ")[1] || "10:00"} 
                            onChange={(e) => {
                              const [from] = (editForm.time || "08:00 - 10:00").split(" - ");
                              setEditForm({ ...editForm, time: `${from || "08:00"} - ${e.target.value}` });
                            }} 
                            className="text-right font-mono h-11 bg-slate-50/50 rounded-xl border-slate-200 pl-8 focus-visible:ring-green-500" 
                          />
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">الفحوصات</label>
                    <div className="relative mb-2">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <Input 
                        placeholder="ابحث عن فحص..." 
                        value={examSearchQuery} 
                        onChange={(e) => setExamSearchQuery(e.target.value)}
                        className="pl-3 pr-10 text-right h-10 bg-slate-50 border-slate-200 focus-visible:ring-green-500 rounded-xl w-full"
                      />
                    </div>
                    <div className="border border-slate-200 rounded-xl bg-white max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-inner">
                      {examinations
                        .filter(exam => exam.name.toLowerCase().includes(examSearchQuery.toLowerCase()))
                        .map((exam) => {
                          const isSelected = (editForm.testName || "").split(/[،,]/).map(t => t.trim()).includes(exam.name.trim());
                        return (
                          <div
                            key={exam.id}
                            onClick={() => {
                              const currentTests = (editForm.testName || "").split(/[،,]/).map(t => t.trim()).filter(Boolean);
                              let newTests = [];
                              let newPrice = editForm.price || 0;
                              if (isSelected) {
                                newTests = currentTests.filter(t => t !== exam.name.trim());
                                newPrice -= exam.price;
                              } else {
                                newTests = [...currentTests, exam.name.trim()];
                                newPrice += exam.price;
                              }
                              setEditForm({ ...editForm, testName: newTests.join(" ، "), price: Math.max(0, newPrice) });
                            }}
                            className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs transition-colors ${
                              isSelected ? "bg-green-50/50" : ""
                            }`}
                          >
                            <span>{exam.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                {exam.price} د.أ
                              </span>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by div click
                                className="w-3.5 h-3.5 text-green-600 border-slate-300 rounded focus:ring-green-500 pointer-events-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Render custom tests or attachments that are not in the main list, to allow removal if needed */}
                    {(editForm.testName || "").split(/[،,]/).map(t => t.trim()).filter(t => t && !examinations.some(e => e.name.trim() === t)).map((customTest, idx) => (
                      <div key={`custom-${idx}`} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mt-2 text-xs">
                        <span className={customTest.includes("مرفق طبي") ? "text-green-600 font-medium" : ""}>{customTest}</span>
                        <button 
                          onClick={() => {
                            const currentTests = (editForm.testName || "").split(/[،,]/).map(t => t.trim()).filter(Boolean);
                            const newTests = currentTests.filter(t => t !== customTest);
                            setEditForm({ ...editForm, testName: newTests.join(" ، ") });
                          }}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          إزالة
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">السعر (د.أ)</label>
                      <Input type="number" step="0.5" value={editForm.price || 0} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })} className="text-right font-mono h-11 bg-slate-50/50 rounded-xl border-slate-200 focus-visible:ring-green-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">الساحب المخصص</label>
                      <select value={editForm.testerName || ""} onChange={(e) => setEditForm({ ...editForm, testerName: e.target.value })} className="w-full text-right h-11 bg-slate-50/50 rounded-xl border border-slate-200 px-3 outline-none focus-visible:ring-2 focus-visible:ring-green-500">
                         <option value="">غير محدد</option>
                         {/* Will render options using the original data */}
                         {testers && testers.map((t) => {
                           const activeCount = appointments.filter(a => a.testerName === t.name && (a.status === 'جديد' || a.status === 'قائم')).length;
                           const isFull = t.dailyLimit && activeCount >= t.dailyLimit;
                           return (
                             <option key={t.id} value={t.name} disabled={isFull}>
                               {t.name} ({activeCount} مواعيد نشطة{t.dailyLimit ? ` / ${t.dailyLimit}` : ''}) {isFull ? '🚨 (ممتلئ)' : ''}
                             </option>
                           );
                         })}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">رابط الموقع الجغرافي</label>
                    <Input type="url" value={editForm.locationUrl || ""} onChange={(e) => setEditForm({ ...editForm, locationUrl: e.target.value })} className="text-right font-sans h-11 bg-slate-50/50 rounded-xl border-slate-200 focus-visible:ring-green-500" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-green-100 transition-colors">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                      <Users className="w-5 h-5 text-green-500" />
                      <h3 className="font-bold">معلومات المريض</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-right">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">الاسم</p>
                        <p className="font-semibold text-sm text-slate-900">{selectedAppointment.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">رقم الهاتف</p>
                        <p className="font-semibold font-mono text-sm text-slate-900">{selectedAppointment.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">العمر</p>
                        <p className="font-semibold text-sm text-slate-900">{selectedAppointment.age} سنة</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">الجنس</p>
                        <p className="font-semibold text-sm text-slate-900">-</p>
                      </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <Button variant="outline" className="flex-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 h-10 shadow-sm" onClick={() => window.open(`https://wa.me/+962${selectedAppointment.phone.startsWith('0') ? selectedAppointment.phone.substring(1) : selectedAppointment.phone}`, '_blank')}>
                        <MessageCircle className="w-4 h-4 ml-2" />
                        واتساب
                      </Button>
                      <Button variant="outline" className="flex-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 h-10 shadow-sm" onClick={() => window.open(`tel:${selectedAppointment.phone}`, '_self')}>
                        <Phone className="w-4 h-4 ml-2" />
                        اتصال
                      </Button>
                      <Button variant="outline" size="icon" className="w-10 h-10 shrink-0 text-slate-600 border-slate-200 shadow-sm" onClick={() => navigator.clipboard.writeText(selectedAppointment.phone)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-green-100 transition-colors">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                      <MapPin className="w-5 h-5 text-green-500" />
                      <h3 className="font-bold">الموقع</h3>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 mb-4">
                      <p className="text-sm text-slate-800 leading-relaxed font-medium text-right">{selectedAppointment.location}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedAppointment.locationUrl ? (
                        <Button variant="outline" className="flex-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 h-10 shadow-sm" onClick={() => window.open(selectedAppointment.locationUrl, '_blank', 'noopener,noreferrer')}>
                          <Map className="w-4 h-4 ml-2" />
                          فتح الخريطة
                        </Button>
                      ) : (
                        <Button variant="outline" className="flex-1 bg-slate-50 text-slate-400 border-slate-200 h-10 shadow-sm cursor-not-allowed">
                          لا يوجد رابط موقع
                        </Button>
                      )}
                      <Button variant="outline" className="flex-1 text-slate-700 border-slate-200 h-10 shadow-sm hover:bg-slate-50" onClick={() => navigator.clipboard.writeText(selectedAppointment.location)}>
                        <Copy className="w-4 h-4 ml-2" />
                        نسخ العنوان
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-green-100 transition-colors">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                      <Calendar className="w-5 h-5 text-green-500" />
                      <h3 className="font-bold">معلومات الزيارة</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-right">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">تاريخ الزيارة</p>
                        <p className="font-semibold text-sm text-slate-900 font-mono">{selectedAppointment.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">وقت الزيارة</p>
                        <p className="font-semibold text-sm text-slate-900 font-mono">{formatTimeRangeTo12Hour(selectedAppointment.time)}</p>
                      </div>
                      <div className="col-span-2 bg-green-50/50 rounded-xl p-3 border border-green-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-bold text-green-900">{selectedAppointment.testerName}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-600">الساحب المخصص</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-green-100 transition-colors">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                      <Activity className="w-5 h-5 text-green-500" />
                      <h3 className="font-bold">الفحوصات المطلوبة</h3>
                    </div>
                    
                    <div className="flex flex-wrap justify-end gap-2 mb-4" dir="rtl">
                      {(selectedAppointment.testName || "").split(/[،,]/).filter(t => t.trim() && !t.includes('مرفق طبي')).map((test, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm font-medium shadow-sm border border-slate-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-2"></div>
                          {test.trim()}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 flex-row-reverse">
                      <span className="text-sm font-medium text-slate-500">إجمالي الفحوصات</span>
                      <span className="text-lg font-bold text-slate-900 font-mono">{(selectedAppointment.testName || "").split(/[،,]/).filter(t => t.trim() && !t.includes('مرفق طبي')).length} فحوصات</span>
                    </div>
                  </div>

                  {selectedAppointment.attachmentUrl && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-green-100 transition-colors">
                      <div className="flex items-center gap-2 mb-4 text-slate-800">
                        <ImageIcon className="w-5 h-5 text-green-500" />
                        <h3 className="font-bold">المرفق الطبي (الوصفة)</h3>
                      </div>
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group cursor-pointer" onClick={() => setImagePreview(selectedAppointment.attachmentUrl)}>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="text-white bg-black/50 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm shadow-lg flex items-center gap-2">
                             <Eye className="w-4 h-4" />
                             عرض مكبر
                           </span>
                        </div>
                        <img src={selectedAppointment.attachmentUrl} alt="الوصفة الطبية" className="w-full max-h-[200px] object-contain p-2" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-green-100 transition-colors">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                      <CreditCard className="w-5 h-5 text-green-500" />
                      <h3 className="font-bold">المعلومات المالية</h3>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-sm flex-row-reverse">
                        <span className="text-slate-600">السعر الإجمالي للزيارة</span>
                        <span className="text-lg font-bold text-green-700 font-mono">{selectedAppointment.price} د.أ</span>
                      </div>
                      
                      {selectedAppointment.amountCollected !== undefined && selectedAppointment.amountCollected !== null && (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 border-dashed flex-row-reverse">
                          <span className="text-slate-600">المبلغ المحصل فعلياً</span>
                          <span className="text-lg font-bold text-emerald-600 font-mono">{selectedAppointment.amountCollected} د.أ</span>
                        </div>
                      )}
                      
                      {selectedAppointment.insurance && selectedAppointment.insurance !== 'لا يوجد' && (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 border-dashed flex-row-reverse">
                          <span className="text-slate-600">التأمين</span>
                          <span className="font-semibold text-slate-800 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs">{selectedAppointment.insurance}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedAppointment.requiresFasting ? (
                    <div className="bg-orange-50/50 rounded-2xl p-5 shadow-sm border border-orange-100 hover:border-orange-200 transition-colors text-right mb-4">
                      <div className="flex items-start gap-2 text-orange-900 mb-2 justify-start flex-row-reverse">
                        <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <h3 className="font-bold">تتطلب الفحوصات صيام</h3>
                      </div>
                      <p className="text-sm font-medium text-orange-800 pr-7 whitespace-pre-wrap">هذا المريض بحاجة للصيام قبل إجراء الفحص.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors text-right mb-4 opacity-75">
                      <div className="flex items-start gap-2 text-slate-500 mb-2 justify-start flex-row-reverse">
                        <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        <h3 className="font-bold">لا تتطلب الفحوصات صيام</h3>
                      </div>
                      <p className="text-sm font-medium text-slate-500 pr-7 whitespace-pre-wrap">لا يحتاج هذا المريض للصيام قبل إجراء الفحص.</p>
                    </div>
                  )}

                  {selectedAppointment.notes && selectedAppointment.notes.trim() && (
                    <div className="bg-amber-50/50 rounded-2xl p-5 shadow-sm border border-amber-100 hover:border-amber-200 transition-colors text-right">
                      <div className="flex items-start gap-2 text-amber-900 mb-2 justify-start flex-row-reverse">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <h3 className="font-bold">ملاحظات هامة</h3>
                      </div>
                      <p className="text-sm font-medium text-amber-800 pr-7 whitespace-pre-wrap">{selectedAppointment.notes.trim()}</p>
                    </div>
                  )}

                  {selectedAppointment.priceDiffReason && selectedAppointment.priceDiffReason.trim() && (
                    <div className="bg-red-50/50 rounded-2xl p-5 shadow-sm border border-red-100 hover:border-red-200 transition-colors text-right">
                      <div className="flex items-start gap-2 text-red-900 mb-2 justify-start flex-row-reverse">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <h3 className="font-bold">سبب فرق السعر</h3>
                      </div>
                      <p className="text-sm font-medium text-red-800 pr-7 whitespace-pre-wrap">{selectedAppointment.priceDiffReason.trim()}</p>
                    </div>
                  )}

                </div>
              )}
            </div>

            <div className="bg-white p-4 sm:p-5 border-t border-slate-100 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] relative z-20">
              {isEditing ? (
                <div className="flex gap-3 flex-row-reverse">
                  <Button
                    onClick={async () => {
                      await saveAppointmentChanges(false);
                      setIsEditing(false);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl shadow-sm"
                    disabled={isSaving}
                  >
                    {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 font-bold h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    إلغاء التعديل
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    {selectedAppointment.status === "جديد" && user?.role !== 'مشاهد' && (
                      <Button onClick={() => updateAppointmentStatus(selectedAppointment.id, "قائم")} className="col-span-2 bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl shadow-sm text-base transition-transform active:scale-[0.98]">
                        <CheckCircle className="w-5 h-5 ml-2" />
                        تأكيد وإسناد الموعد
                      </Button>
                    )}
                    {selectedAppointment.status === "قائم" && user?.role !== 'مشاهد' && (
                      <Button onClick={() => { 
                        setStatusNote(""); 
                        setAmountCollected(selectedAppointment.price.toString()); 
                        setCompletionPaymentMethod("نقدي");
                        setPriceDiffReason("");
                        setStatusActionDialog({ id: selectedAppointment.id, type: 'complete' }); 
                      }} className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-sm text-base transition-transform active:scale-[0.98]">
                        <CheckCircle className="w-5 h-5 ml-2" />
                        إكمال الزيارة
                      </Button>
                    )}
                    
                    {!["مكتمل", "نتائج مستلمة", "ملغي"].includes(selectedAppointment.status) && user?.role !== 'مشاهد' && (
                      <Button variant="outline" className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-green-600 transition-colors shadow-sm rounded-xl font-semibold" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 ml-2" />
                        تعديل
                      </Button>
                    )}
                    <Button variant="outline" className={`h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm rounded-xl font-semibold ${user?.role === 'مشاهد' ? 'col-span-2' : ''}`} onClick={() => setSelectedAppointment(null)}>
                      <X className="w-4 h-4 ml-2" />
                      إغلاق
                    </Button>
                  </div>
                  
                  {selectedAppointment.status !== "ملغي" && selectedAppointment.status !== "مكتمل" && selectedAppointment.status !== "نتائج مستلمة" && user?.role !== 'مشاهد' && (
                    <Button variant="ghost" onClick={() => { setStatusNote(""); setStatusActionDialog({ id: selectedAppointment.id, type: 'cancel' }); }} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold h-10 mt-1">
                      <XCircle className="w-4 h-4 ml-2" />
                      إلغاء الموعد
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}{/* Status Action Dialog (Complete or Cancel) */}
      <Dialog
        open={!!statusActionDialog}
        onOpenChange={(open) => !open && setStatusActionDialog(null)}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className={statusActionDialog?.type === 'cancel' ? 'text-red-600' : 'text-emerald-600'}>
              {statusActionDialog?.type === 'cancel' ? 'تأكيد إلغاء الموعد' : 'إكمال الزيارة'}
            </DialogTitle>
            {statusActionDialog?.type === 'cancel' && (
              <DialogDescription className="text-slate-600 pt-2 pb-2">
                يرجى إدخال سبب إلغاء هذا الموعد:
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-2">
            {statusActionDialog?.type === 'cancel' && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-right justify-start text-xs font-semibold border-slate-200 hover:bg-slate-50 hover:text-red-600 text-slate-700 rounded-xl py-2.5 px-3 h-auto whitespace-normal"
                    onClick={() => setStatusNote("The patient did not answer the phone.")}
                  >
                    📞 The patient did not answer the phone.
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-right justify-start text-xs font-semibold border-slate-200 hover:bg-slate-50 hover:text-red-600 text-slate-700 rounded-xl py-2.5 px-3 h-auto whitespace-normal"
                    onClick={() => setStatusNote("The patient requested to reschedule.")}
                  >
                    📅 The patient requested to reschedule.
                  </Button>
                </div>
                <textarea
                  className="w-full h-24 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-right outline-none resize-none"
                  placeholder="أو اكتب سبب الإلغاء هنا..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>
            )}
            {statusActionDialog?.type === 'complete' && (
              <div className="mt-4 space-y-4 text-right">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">طريقة الدفع</label>
                  <select 
                    value={completionPaymentMethod} 
                    onChange={(e) => setCompletionPaymentMethod(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 outline-none text-right bg-white"
                  >
                    <option value="نقدي">نقدي (كاش)</option>
                    <option value="دفع إلكتروني">فيزا (دفع إلكتروني)</option>
                    <option value="كليك">كليك (CliQ)</option>
                  </select>
                </div>
                
                {completionPaymentMethod !== 'كليك' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">المبلغ المحصل (د.أ)</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        step="0.5"
                        min="0"
                        value={amountCollected}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d{0,4}(\.\d{0,1})?$/.test(val)) {
                            setAmountCollected(val);
                          }
                        }}
                        className="pl-10 text-right pr-4 rounded-xl border-slate-200"
                        placeholder="أدخل المبلغ الذي تم تحصيله..."
                      />
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-slate-500">ملاحظة: السعر الإجمالي للزيارة هو {selectedAppointment?.price} د.أ</p>
                    
                    {parseFloat(amountCollected) !== Number(selectedAppointment?.price) && amountCollected !== "" && (
                      <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-bold text-red-600">سبب فرق السعر (مطلوب)</label>
                        <div className="flex gap-2 mb-2">
                          <Button type="button" variant="outline" size="sm" className="text-xs h-8 rounded-lg border-red-200 text-red-700 hover:bg-red-50" onClick={() => setPriceDiffReason(n => n + (n ? '، ' : '') + 'خطأ في التسعير (PE)')}>خطأ في التسعير (PE)</Button>
                          <Button type="button" variant="outline" size="sm" className="text-xs h-8 rounded-lg border-red-200 text-red-700 hover:bg-red-50" onClick={() => setPriceDiffReason(n => n + (n ? '، ' : '') + 'خصم (D)')}>خصم (D)</Button>
                        </div>
                        <Input 
                          value={priceDiffReason}
                          onChange={(e) => setPriceDiffReason(e.target.value)}
                          className="border-red-200 focus-visible:ring-red-500"
                          placeholder="الرجاء توضيح سبب الاختلاف في المبلغ المحصل..."
                          required
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-start gap-2 flex-row-reverse mt-2">
            <Button 
              variant={statusActionDialog?.type === 'cancel' ? 'destructive' : 'default'} 
              className={statusActionDialog?.type === 'complete' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              disabled={
                (statusActionDialog?.type === 'cancel' && !statusNote.trim()) ||
                (statusActionDialog?.type === 'complete' && completionPaymentMethod !== 'كليك' && parseFloat(amountCollected) !== Number(selectedAppointment?.price) && !priceDiffReason.trim())
              }
              onClick={() => {
                if (statusActionDialog) {
                  updateAppointmentStatus(
                    statusActionDialog.id, 
                    statusActionDialog.type === 'cancel' ? 'ملغي' : 'مكتمل',
                    statusNote,
                    statusActionDialog.type === 'complete' ? (completionPaymentMethod === 'كليك' ? Number(selectedAppointment?.price) || 0 : parseFloat(amountCollected) || 0) : undefined,
                    statusActionDialog.type === 'complete' ? completionPaymentMethod : undefined,
                    statusActionDialog.type === 'complete' ? priceDiffReason.trim() : undefined
                  );
                  setStatusActionDialog(null);
                }
              }}
            >
              تأكيد
            </Button>
            <Button variant="outline" onClick={() => setStatusActionDialog(null)}>
              تراجع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              هل أنت متأكد من حذف هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء بعد
              تنفيذه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-start gap-2 flex-row-reverse mt-4">
            <Button variant="destructive" onClick={confirmDeleteAppointment}>
              نعم، احذف الموعد
            </Button>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Image Preview Dialog */}
      <Dialog
        open={!!imagePreview}
        onOpenChange={(open) => {
          if (!open) {
            setImagePreview(null);
            setTimeout(() => setImageScale(1), 300);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="!max-w-[100vw] !w-screen !h-[100dvh] !m-0 !p-0 bg-black/95 border-none shadow-none flex justify-center items-center overflow-hidden" dir="rtl">
          {/* Top Controls Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full w-12 h-12 bg-black/20 backdrop-blur-sm"
              onClick={() => {
                setImagePreview(null);
                setTimeout(() => setImageScale(1), 300);
              }}
            >
              <X className="w-8 h-8" />
            </Button>
            
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full p-1.5 px-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full h-10 w-10"
                onClick={() => setImageScale(s => Math.min(s + 0.5, 5))}
                title="تكبير"
              >
                <ZoomIn className="w-6 h-6" />
              </Button>
              <div className="text-white font-mono text-sm px-2 font-bold select-none min-w-[60px] text-center">
                {Math.round(imageScale * 100)}%
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full h-10 w-10"
                onClick={() => setImageScale(s => Math.max(s - 0.5, 0.5))}
                title="تصغير"
              >
                <ZoomOut className="w-6 h-6" />
              </Button>
              <div className="w-px h-6 bg-white/20 mx-1"></div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full h-10 w-10"
                onClick={() => setImageScale(1)}
                title="إعادة ضبط"
              >
                <RefreshCcw className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="w-12"></div> {/* Spacer to center the controls */}
          </div>

          <div className="w-full h-full overflow-auto flex items-center justify-center p-4 custom-scrollbar">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="معاينة المرفق"
                className="transition-transform duration-200 ease-out origin-center"
                style={{ 
                  transform: `scale(${imageScale})`,
                  maxHeight: imageScale <= 1 ? '100%' : 'none',
                  maxWidth: imageScale <= 1 ? '100%' : 'none',
                }}
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
