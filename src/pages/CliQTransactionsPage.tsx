import React, { useState, useEffect, useMemo } from 'react';
import { mutate } from 'swr';
import { 
  CreditCard, Smartphone, CheckCircle2, Clock, 
  Search, RefreshCw, Filter, ArrowUpDown, X, Check,
  Calendar, AlertCircle, FileText, Send, UserCheck, ShieldCheck,
  Edit3, Trash2, ChevronDown, Building2, Printer, Info, Lock, Unlock, FileDown, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User } from '../types';
import { useCliqStats, useCliqTransactions, useCliqBranches } from '../lib/api-hooks';
import { io } from 'socket.io-client';

interface Props {
  user: User;
  onNavigate?: (page: string) => void;
}

// Helper to get today's date formatted as YYYY-MM-DD
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function CliQTransactionsPage({ user }: Props) {
  // Check if current user is Admin (مسؤول)
  const isAdmin = user?.role === 'مسؤول' || user?.role?.toLowerCase() === 'admin';

  // Check if user has permission to close CliQ transfer
  const canUserCloseCliq = useMemo(() => {
    if (!user) return true;
    const role = (user.role || '').trim();
    // Admin and Manager are usually authorized by default, but we can also respect the toggle if it was set explicitly
    if (role === 'مسؤول' || role.toLowerCase() === 'admin' || role === 'مدير') return true;
    
    // For all other roles, enforce the manual authorization toggle
    return Boolean(user.canCloseCliq);
  }, [user]);

  // Branches hook (fetch active branches for closing modal and filters)
  const { branches: rawBranches } = useCliqBranches(true);
  const branches = useMemo(() => Array.isArray(rawBranches) ? rawBranches : [], [rawBranches]);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'NEW' | 'INFO_PROVIDED' | 'CLOSED'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string[]>([]);
  const [isEmployeeMenuOpen, setIsEmployeeMenuOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => getTodayDateString());
  const [endDate, setEndDate] = useState(() => getTodayDateString());
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 200; // Fetch generous batch to support seamless 20-item expansion

  // Limit displayed transfers to 20 by default; clicking "مشاهدة المزيد" expands by 20
  const [visibleCount, setVisibleCount] = useState(20);

  // Reset visibleCount back to 20 whenever filters or search change
  useEffect(() => {
    setVisibleCount(20);
  }, [searchTerm, statusFilter, branchFilter, employeeFilter, startDate, endDate, sortBy]);

  // Closing Modal State (Available to all users)
  const [closingTransfer, setClosingTransfer] = useState<any | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedBranchName, setSelectedBranchName] = useState<string>('');
  const [closedByName, setClosedByName] = useState(user?.name || '');
  const [patientFileNumber, setPatientFileNumber] = useState('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [modalError, setModalError] = useState('');

  // Provide Info Modal State ("تزويد معلومات" - رقم الزيارة)
  const [infoModalTransfer, setInfoModalTransfer] = useState<any | null>(null);
  const [visitNumberInput, setVisitNumberInput] = useState('');
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [infoModalError, setInfoModalError] = useState('');

  // PDF Report Modal State ("كشف حوالات CliQ")
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  // Edit Closure Modal State (Admin Only - مسؤول فقط)
  const [editingTransfer, setEditingTransfer] = useState<any | null>(null);
  const [editClosedByName, setEditClosedByName] = useState('');
  const [editPatientFileNumber, setEditPatientFileNumber] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  // Delete Confirmation Modal State (Admin Only - مسؤول فقط)
  const [deletingTransfer, setDeletingTransfer] = useState<any | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Live Toast Banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Scroll locking for Modals
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      closingTransfer || 
      editingTransfer || 
      deletingTransfer || 
      infoModalTransfer || 
      isReportModalOpen
    );

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [closingTransfer, editingTransfer, deletingTransfer, infoModalTransfer, isReportModalOpen]);

  // Check if currently searching
  const isSearching = Boolean(searchTerm.trim());

  // Dynamic Query String for Stats
  const statsQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (branchFilter && branchFilter !== 'all') params.set('branchName', branchFilter);
    if (employeeFilter.length > 0) params.set('employeeName', employeeFilter.join(','));
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return params.toString();
  }, [searchTerm, branchFilter, employeeFilter, startDate, endDate]);

  const { stats, mutateStats } = useCliqStats(statsQueryString);

  // Prepare Query String for Transactions
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
      // When searching, search all records without restricting to today's date
    } else {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (branchFilter && branchFilter !== 'all') params.set('branchName', branchFilter);
    if (employeeFilter.length > 0) params.set('employeeName', employeeFilter.join(','));
    params.set('sortBy', sortBy);
    params.set('page', '1');
    params.set('limit', String(pageSize));
    return params.toString();
  }, [searchTerm, statusFilter, branchFilter, employeeFilter, startDate, endDate, sortBy, pageSize]);

  const { transactions, total, totalPages, isLoading, mutateTransactions } = useCliqTransactions(queryString);

  // Extract unique employee names for filtering (Strictly from Branch Settings as requested)
  const availableEmployees = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(branches)) {
      branches.forEach((b: any) => {
        // If a specific branch is selected, only show its employees. Otherwise, show all.
        if (branchFilter === 'all' || b.name === branchFilter) {
          if (b?.employeeName && typeof b.employeeName === 'string' && b.employeeName.trim()) {
            // Split multiple names for filtering
            const names = b.employeeName.split(/[،,]/).map((n: string) => n.trim()).filter(Boolean);
            names.forEach((n: string) => set.add(n));
          }
        }
      });
    }
    return Array.from(set).sort();
  }, [branches, branchFilter]);

  // Reset employee filter if the selected employees are no longer in the filtered list (e.g. after changing branch)
  useEffect(() => {
    if (employeeFilter.length > 0) {
      const validSelected = employeeFilter.filter(emp => availableEmployees.includes(emp));
      if (validSelected.length !== employeeFilter.length) {
        setEmployeeFilter(validSelected);
      }
    }
  }, [availableEmployees, employeeFilter]);

  // Slice transactions according to visibleCount (default 20, load more expands by 20)
  const displayedTransactions = useMemo(() => {
    return transactions.slice(0, visibleCount);
  }, [transactions, visibleCount]);

  // Socket.IO Real-time Listener (Instant live update as soon as transfer arrives)
  useEffect(() => {
    const socket = io();

    const refreshCliqData = () => {
      mutate((key) => typeof key === 'string' && key.startsWith('/api/cliq'), undefined, { revalidate: true });
    };

    socket.on('new-cliq-transaction', (newTx) => {
      refreshCliqData();
      setToastMessage({
        text: `وصول حوالة CliQ جديدة بقيمة ${newTx?.amount ? `${Number(newTx.amount).toFixed(3)} JOD` : ''} من: ${newTx?.senderName || 'غير معروف'}`,
        type: 'info'
      });
      // Audio notification
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    });

    socket.on('cliq-transaction-closed', refreshCliqData);
    socket.on('cliq-transaction-updated', refreshCliqData);
    socket.on('cliq-transaction-deleted', refreshCliqData);
    socket.on('cliq-stats-updated', refreshCliqData);

    return () => {
      socket.off('new-cliq-transaction');
      socket.off('cliq-transaction-closed');
      socket.off('cliq-transaction-updated');
      socket.off('cliq-transaction-deleted');
      socket.off('cliq-stats-updated');
      socket.disconnect();
    };
  }, []);

  // Helpers to safely resolve real transfer data
  const resolveSenderName = (tx: any): string => {
    if (tx?.senderName && tx.senderName.trim() && tx.senderName.trim() !== 'غير متوفر' && tx.senderName.trim() !== '-') {
      return tx.senderName.trim();
    }
    if (tx?.smsBody) {
      const patterns = [
        /(?:من\s*(?:المرسل|حساب)?|From)[:\s]+([^.,\n\r\t]+?)(?:\s*(?:على|إلى|حساب|بتاريخ|الموافق|Ref|رقم|الحساب|$))/i,
        /(?:وردت\s*من|مرسلة\s*من|بواسطة)[:\s]+([^.,\n\r\t]+?)(?:\s*(?:على|إلى|حساب|بتاريخ|Ref|$))/i,
        /(?:من|From)\s+([A-Za-z\u0600-\u06FF\s]{3,40})(?:\s+Ref|\s+to|\.|$)/i
      ];
      for (const rx of patterns) {
        const match = tx.smsBody.match(rx);
        if (match && match[1]) {
          const candidate = match[1].trim();
          if (candidate.length >= 3 && !/^(bank|arabi|islamic|cliq|jod|حساب)/i.test(candidate)) {
            return candidate;
          }
        }
      }
    }
    return 'غير محدد في الرسالة';
  };

  const resolveAccountNumber = (tx: any): string => {
    if (tx?.accountNumber && tx.accountNumber.trim()) {
      return tx.accountNumber.trim();
    }
    if (tx?.smsBody) {
      const patterns = [
        /(?:إلى\s*حساب(?:ك)?|حساب(?:ك)?|Account|Acc|A\/C)[:\s#]*([0-9*X\-]{4,20})/i,
        /([0-9]{3,6}\*[0-9]{3,6})/i,
        /(?:الحساب|حساب)\s*[:#]?\s*([0-9*X\-]+)/i
      ];
      for (const rx of patterns) {
        const match = tx.smsBody.match(rx);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    return '7500*1130';
  };

  const isAmountValid = (amount: any): boolean => {
    return amount !== null && amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0;
  };

  // Branch selection handler in closing modal
  const handleBranchChange = (branchIdStr: string) => {
    setSelectedBranchId(branchIdStr);
    const branch = branches.find((b: any) => String(b.id) === branchIdStr || b.name === branchIdStr);
    if (branch) {
      setSelectedBranchName(branch.name);
      
      // Support multiple employees: split by comma or Arabic comma
      const employeeNames = (branch.employeeName || '').split(/[،,]/).map((n: string) => n.trim()).filter(Boolean);
      
      // Auto-populate with the first employee name or the current user's name
      setClosedByName(employeeNames[0] || user?.name || '');
    } else {
      setSelectedBranchName('');
    }
  };

  // Open Closing Modal
  const handleOpenCloseModal = (tx: any) => {
    if (!canUserCloseCliq) {
      setToastMessage({
        text: 'غير مصرح لك بتسكير حوالات كليك (حسابك مشاهد بدون إذن تسكير)',
        type: 'info'
      });
      return;
    }

    setClosingTransfer(tx);
    // Resolve initial branch
    let initialBranch = branches.find((b: any) => b.name === tx.branchName || (tx.branchId && Number(b.id) === Number(tx.branchId)));
    if (!initialBranch && branches.length > 0) {
      initialBranch = branches[0];
    }

    if (initialBranch) {
      setSelectedBranchId(String(initialBranch.id));
      setSelectedBranchName(initialBranch.name);
      
      const employeeNames = (initialBranch.employeeName || '').split(/[،,]/).map((n: string) => n.trim()).filter(Boolean);
      setClosedByName(employeeNames[0] || user?.name || '');
    } else {
      setSelectedBranchId('');
      setSelectedBranchName('');
      const currentName = (user?.name || '').trim();
      const isPlaceholder = !currentName || /^(admin|administrator|مسؤول|مسؤول النظام|مدير)$/i.test(currentName);
      setClosedByName(isPlaceholder ? '' : currentName);
    }

    setPatientFileNumber(tx.patientFileNumber || '');
    setModalError('');
  };

  // Submit Close Action ("تأكيد التسكير")
  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingTransfer) return;

    if (!canUserCloseCliq) {
      setModalError('غير مصرح لك بتسكير حوالات كليك. يرجى مراجعة المسؤول لتفعيل الصلاحية.');
      return;
    }

    // Rule 2: Cannot close if amount is missing
    if (!isAmountValid(closingTransfer.amount)) {
      setModalError('لا يمكن تأكيد تسكير الحوالة لأن بيانات الحوالة غير مكتملة (المبلغ غير محدد في رسالة البنك).');
      return;
    }

    if (!selectedBranchName.trim()) {
      setModalError('يرجى تحديد الفرع لتسكير الحوالة');
      return;
    }

    if (!closedByName.trim()) {
      setModalError('يرجى التأكد من اسم الموظف المسؤول عن التسكير');
      return;
    }

    if (!patientFileNumber.trim()) {
      setModalError('يرجى إدخال رقم ملف المريض في النظام الآخر');
      return;
    }

    setIsSubmittingClose(true);
    setModalError('');

    try {
      const res = await fetch(`/api/cliq/transactions/${closingTransfer.id}/close`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': encodeURIComponent(user?.id || ''),
          'x-user-role': encodeURIComponent(user?.role || ''),
          'x-user-name': encodeURIComponent(user?.name || ''),
          'x-user-can-close-cliq': String(Boolean(user?.canCloseCliq))
        },
        body: JSON.stringify({
          branchId: selectedBranchId ? Number(selectedBranchId) : null,
          branchName: selectedBranchName.trim(),
          employeeName: closedByName.trim(),
          closedByName: closedByName.trim(),
          patientFileNumber: patientFileNumber.trim() // Preserves leading zeros as string
        })
      });

      const data = await res.json();
      if (res.ok) {
        mutateTransactions();
        mutateStats();
        setClosingTransfer(null);
        setToastMessage({
          text: `تم تسكير الحوالة #${closingTransfer.id} بنجاح لفرع (${selectedBranchName.trim()}) وملف المريض رقم ${patientFileNumber.trim()}`,
          type: 'success'
        });
      } else {
        setModalError(data.error || 'فشل تسكير الحوالة');
      }
    } catch (err: any) {
      setModalError(`خطأ في الاتصال: ${err.message}`);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // Provide Info Handlers ("تزويد معلومات" - رقم الزيارة)
  const handleOpenInfoModal = (tx: any) => {
    setInfoModalTransfer(tx);
    setVisitNumberInput(tx.visitNumber || '');
    setInfoModalError('');
  };

  const handleConfirmProvideInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoModalTransfer) return;

    if (!visitNumberInput.trim()) {
      setInfoModalError('يرجى إدخال رقم الزيارة لتزويد المعلومات');
      return;
    }

    setIsSubmittingInfo(true);
    setInfoModalError('');

    try {
      const res = await fetch(`/api/cliq/transactions/${infoModalTransfer.id}/provide-info`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': encodeURIComponent(user?.id || ''),
          'x-user-role': encodeURIComponent(user?.role || ''),
          'x-user-name': encodeURIComponent(user?.name || '')
        },
        body: JSON.stringify({
          visitNumber: visitNumberInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        mutateTransactions();
        mutateStats();
        setInfoModalTransfer(null);
        setToastMessage({
          text: `تم تزويد الحوالة #${infoModalTransfer.id} برقم الزيارة (${visitNumberInput.trim()}) بنجاح`,
          type: 'success'
        });
      } else {
        setInfoModalError(data.error || 'فشل تزويد معلومات الحوالة');
      }
    } catch (err: any) {
      setInfoModalError(`خطأ في الاتصال: ${err.message}`);
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  // PDF Report Handlers
  const handleGenerateReport = async () => {
    setIsLoadingReport(true);
    setReportError('');
    setIsReportModalOpen(true);

    try {
      const params = new URLSearchParams();
      if (branchFilter && branchFilter !== 'all') params.set('branchName', branchFilter);
      if (employeeFilter.length > 0) params.set('employeeName', employeeFilter.join(','));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/cliq/report/pdf-data?${params.toString()}`, {
        headers: {
          'x-user-id': encodeURIComponent(user?.id || ''),
          'x-user-role': encodeURIComponent(user?.role || ''),
          'x-user-name': encodeURIComponent(user?.name || '')
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        const data = await res.json();
        setReportError(data.error || 'فشل جلب بيانات كشف الحوالات');
      }
    } catch (err: any) {
      setReportError(`تعذر جلب بيانات الكشف: ${err.message}`);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Open Edit Closure Modal (Admin Only)
  const handleOpenEditModal = (tx: any) => {
    if (!isAdmin) return;
    setEditingTransfer(tx);
    setEditClosedByName(tx.closedByName || '');
    setEditPatientFileNumber(tx.patientFileNumber || '');
    setEditModalError('');
  };

  // Submit Edit Closure (Admin Only)
  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransfer || !isAdmin) return;

    if (!editClosedByName.trim()) {
      setEditModalError('يرجى إدخال اسم الموظف الذي سكّر الحوالة');
      return;
    }

    if (!editPatientFileNumber.trim()) {
      setEditModalError('يرجى إدخال رقم ملف المريض في النظام الآخر');
      return;
    }

    setIsSubmittingEdit(true);
    setEditModalError('');

    try {
      const res = await fetch(`/api/cliq/transactions/${editingTransfer.id}/edit-closure`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': encodeURIComponent(user?.id || ''),
          'x-user-role': encodeURIComponent(user?.role || ''),
          'x-user-name': encodeURIComponent(user?.name || '')
        },
        body: JSON.stringify({
          closedByName: editClosedByName.trim(),
          patientFileNumber: editPatientFileNumber.trim(), // Preserves leading zeros as string
          userRole: user?.role,
          editorName: user?.name
        })
      });

      const data = await res.json();
      if (res.ok) {
        mutateTransactions();
        mutateStats();
        setEditingTransfer(null);
        setToastMessage({
          text: `تم تحديث بيانات تسكير الحوالة #${editingTransfer.id} بنجاح`,
          type: 'success'
        });
      } else {
        setEditModalError(data.error || 'فشل تحديث بيانات التسكير');
      }
    } catch (err: any) {
      setEditModalError(`خطأ في الاتصال: ${err.message}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Delete Transfer (Admin Only)
  const handleConfirmDelete = async () => {
    if (!deletingTransfer || !isAdmin) return;

    setIsSubmittingDelete(true);
    try {
      const res = await fetch(`/api/cliq/transactions/${deletingTransfer.id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': encodeURIComponent(user?.id || ''),
          'x-user-role': encodeURIComponent(user?.role || ''),
          'x-user-name': encodeURIComponent(user?.name || '')
        },
        body: JSON.stringify({
          userRole: user?.role,
          adminName: user?.name
        })
      });

      const data = await res.json();
      if (res.ok) {
        mutateTransactions();
        mutateStats();
        const deletedId = deletingTransfer.id;
        setDeletingTransfer(null);
        setToastMessage({
          text: `تم حذف الحوالة #${deletedId} بنجاح بواسطة المسؤول`,
          type: 'success'
        });
      } else {
        alert(data.error || 'فشل حذف الحوالة');
      }
    } catch (err: any) {
      alert(`خطأ في الاتصال: ${err.message}`);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Format Date and Time Helpers
  const formatTransferDate = (dateVal: string | null) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  const formatTransferTime = (dateVal: string | null) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch {
      return '-';
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text).then(() => {
      setToastMessage({
        text: `تم نسخ ${label}: ${text}`,
        type: 'success'
      });
      // Auto-hide after 2 seconds
      setTimeout(() => setToastMessage(null), 2000);
    }).catch(() => {
      alert('فشل النسخ إلى الحافظة');
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-20" dir="rtl">
      {/* Live Notification Banner */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all animate-fade-in ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-blue-50 text-blue-900 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              toastMessage.type === 'success' ? 'bg-emerald-200/60 text-emerald-800' : 'bg-blue-200/60 text-blue-800'
            }`}>
              {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
            <p className="font-bold text-sm">{toastMessage.text}</p>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Statistics Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-4 ${isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-3.5`}>
        {/* Total Transfers */}
        <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي الحوالات</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalTransfers || 0}</span>
              <span className="text-[10px] text-slate-400 font-semibold">حوالة</span>
            </div>
          </CardContent>
        </Card>

        {/* Unclosed Transfers (NEW) */}
        <Card className="rounded-2xl border border-amber-200/80 shadow-sm bg-amber-50/40 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold text-amber-800 block mb-1">لم يتم التسكير</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-700 font-mono">{stats.unclosedCount || 0}</span>
              <span className="text-[10px] text-amber-600 font-bold bg-amber-100/70 px-2 py-0.5 rounded-full">
                انتظار
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Info Provided Transfers (INFO_PROVIDED) */}
        <Card className="rounded-2xl border border-rose-200/80 shadow-sm bg-rose-50/40 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold text-rose-800 block mb-1">مزود بالمعلومات</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-rose-700 font-mono">{stats.infoProvidedCount || 0}</span>
              <span className="text-[10px] text-rose-600 font-bold bg-rose-100/70 px-2 py-0.5 rounded-full">
                برقم الزيارة
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Closed Transfers (CLOSED) */}
        <Card className="rounded-2xl border border-emerald-200/80 shadow-sm bg-emerald-50/40 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold text-emerald-800 block mb-1">تم التسكير</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-700 font-mono">{stats.closedCount || 0}</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                مغلقة ✓
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Admin Only: Total Amount */}
        {isAdmin && (
          <Card className="rounded-2xl border border-blue-200/60 shadow-sm bg-gradient-to-br from-white to-blue-50/40 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <span className="text-[11px] font-bold text-blue-700 block mb-1">إجمالي المبالغ</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black text-slate-900 font-mono">
                  {Number(stats.totalAmount || 0).toFixed(3)}
                </span>
                <span className="text-[11px] font-black text-blue-600">JOD</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Only: Closed Amount */}
        {isAdmin && (
          <Card className="rounded-2xl border border-[#009B68]/30 shadow-sm bg-gradient-to-br from-white to-[#F0FAF5] hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <span className="text-[11px] font-bold text-[#009B68] block mb-1">المبالغ المسكرة</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black text-[#00875A] font-mono">
                  {Number(stats.closedAmount || 0).toFixed(3)}
                </span>
                <span className="text-[11px] font-black text-[#009B68]">JOD</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. Search and Filters Section */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white p-4">
        <div className="flex flex-col gap-4">
          {/* Universal Search Bar & PDF Print Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="بحث شامل: اسم المحوّل، المبلغ، الحساب، رقم الزيارة، اسم الفرع، الموظف، رقم ملف المريض..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pr-10 rounded-xl border-slate-200 h-11 text-xs text-right bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Print PDF Report Action */}
            <Button
              type="button"
              onClick={handleGenerateReport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-11 px-5 rounded-xl flex items-center gap-2 shadow-sm shrink-0 w-full sm:w-auto"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف PDF</span>
            </Button>
          </div>

          {/* Search Across All Records Indicator */}
          {isSearching && (
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl">
              <span>البحث الشامل نشط: يتم البحث في كامل سجل الحوالات (بما في ذلك الحوالات الأقدم والمخفية)</span>
              <span className="font-mono text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 font-bold">
                {transactions.length} نتيجة مطابقة
              </span>
            </div>
          )}

          {/* Filter Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Dropdown Filters & Date Range */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter Dropdown */}
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-xl border transition-all ${
                statusFilter !== 'all' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <Filter className={`w-3.5 h-3.5 ${statusFilter !== 'all' ? 'text-amber-600' : 'text-slate-400'}`} />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer min-w-[110px]"
                >
                  <option value="all">إجمالي الحوالات ({stats.totalTransfers || 0})</option>
                  <option value="NEW">لم يتم التسكير ({stats.unclosedCount || 0})</option>
                  <option value="INFO_PROVIDED">مزود بالمعلومات ({stats.infoProvidedCount || 0})</option>
                  <option value="CLOSED">تم التسكير ({stats.closedCount || 0})</option>
                </select>
              </div>
              {/* Branch Filter Dropdown */}
              <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <select
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">جميع الفروع</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Employee Filter Dropdown (Multi-select) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsEmployeeMenuOpen(!isEmployeeMenuOpen)}
                  className={`flex items-center gap-2 text-xs px-3 h-9 rounded-xl border transition-all ${
                    employeeFilter.length > 0 
                      ? 'bg-blue-50 border-blue-200 text-blue-800 font-black' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 font-bold'
                  }`}
                >
                  <UserCheck className={`w-3.5 h-3.5 ${employeeFilter.length > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>
                    {employeeFilter.length === 0 ? 'جميع الموظفين' : 
                     employeeFilter.length === 1 ? employeeFilter[0] : 
                     `${employeeFilter.length} موظفين مختارين`}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isEmployeeMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isEmployeeMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsEmployeeMenuOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-1.5 w-64 max-h-72 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl z-20 p-2 animate-scale-up origin-top-right">
                      <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">تصفية حسب الموظف</span>
                        {employeeFilter.length > 0 && (
                          <button 
                            onClick={() => {
                              setEmployeeFilter([]);
                              setCurrentPage(1);
                            }}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                          >
                            مسح الكل
                          </button>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <button
                          onClick={() => {
                            setEmployeeFilter([]);
                            setCurrentPage(1);
                            setIsEmployeeMenuOpen(false);
                          }}
                          className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                            employeeFilter.length === 0 ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span>جميع الموظفين</span>
                          {employeeFilter.length === 0 && <Check className="w-3.5 h-3.5" />}
                        </button>

                        {availableEmployees.map((emp) => {
                          const isSelected = employeeFilter.includes(emp);
                          return (
                            <button
                              key={emp}
                              onClick={() => {
                                let newFilter: string[];
                                if (isSelected) {
                                  newFilter = employeeFilter.filter(e => e !== emp);
                                } else {
                                  newFilter = [...employeeFilter, emp];
                                }
                                setEmployeeFilter(newFilter);
                                setCurrentPage(1);
                              }}
                              className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <span className="truncate ml-2">{emp}</span>
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {availableEmployees.length === 0 && (
                        <div className="p-4 text-center">
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                            لا يوجد موظفين مسجلين لهذا الفرع في الإعدادات.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Today Shortcut Button */}
              <button
                type="button"
                onClick={() => {
                  const today = getTodayDateString();
                  setStartDate(today);
                  setEndDate(today);
                  setCurrentPage(1);
                }}
                className={`h-9 px-3 rounded-xl border text-[11px] font-black transition-all shrink-0 ${
                  startDate === getTodayDateString() && endDate === getTodayDateString()
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-xs scale-105'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                اليوم
              </button>

              {/* Date From */}
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="font-bold text-slate-400">من:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
                />
              </div>

              {/* Date To */}
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="font-bold text-slate-400">إلى:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
                />
              </div>

              {/* Quick Reset to Today Button */}
              {(startDate !== getTodayDateString() || endDate !== getTodayDateString()) && (
                <button
                  type="button"
                  onClick={() => {
                    const today = getTodayDateString();
                    setStartDate(today);
                    setEndDate(today);
                    setCurrentPage(1);
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 transition-colors"
                >
                  اليوم
                </button>
              )}

              {/* View All Dates */}
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 px-1 hover:underline transition-colors"
                >
                  الكل
                </button>
              )}

              {/* Sorting Toggle */}
              <div className="border-r border-slate-200 pr-2 mr-1">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'newest' | 'oldest');
                    setCurrentPage(1);
                  }}
                  className="h-9 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="newest">الأحدث أولاً</option>
                  <option value="oldest">الأقدم أولاً</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Transfer Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#009B68]" />
          <p className="font-bold text-sm">جاري تحميل حوالات CliQ...</p>
        </div>
      ) : transactions.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
          <Smartphone className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-slate-700 text-base">لا توجد حوالات مطابقة</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            لم يتم العثور على أي حوالة تطابق معايير البحث أو الفلتر المحددة حالياً.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedTransactions.map((tx: any) => {
            const isClosed = tx.status === 'CLOSED';
            const isInfoProvided = tx.status === 'INFO_PROVIDED';
            const isNew = !isClosed && !isInfoProvided;

            return (
              <div
                key={tx.id}
                className={`rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                  isClosed
                    ? 'bg-gradient-to-b from-[#EFFAF6] to-[#E3F6EE] border-2 border-[#A8E2CD] shadow-sm hover:shadow-md'
                    : isInfoProvided
                    ? 'bg-gradient-to-b from-[#FFF5F5] to-[#FEE2E2]/40 border-2 border-rose-300 shadow-sm hover:shadow-md'
                    : 'bg-white border-2 border-amber-200/80 shadow-sm hover:shadow-md hover:border-amber-300'
                }`}
              >
                {/* Decorative Top Accent Bar */}
                <div className={`absolute top-0 right-0 left-0 h-1.5 ${
                  isClosed ? 'bg-[#009B68]' : isInfoProvided ? 'bg-rose-600' : 'bg-amber-500'
                }`} />

                <div className="space-y-4">
                  {/* Card Header: Type & Status Badge */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                        حوالة CliQ #{tx.id}
                      </span>
                      {tx.transactionId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyToClipboard(tx.transactionId, 'الرقم المرجعي');
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[9px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                          title={`نسخ الرقم المرجعي: ${tx.transactionId}`}
                        >
                          <span className="font-mono">{tx.transactionId}</span>
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    {isClosed ? (
                      <Badge className="bg-[#009B68] text-white hover:bg-[#009B68] font-bold text-xs py-1 px-3 rounded-full flex items-center gap-1 shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                        تم التسكير ✓
                      </Badge>
                    ) : isInfoProvided ? (
                      <Badge className="bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs py-1 px-3 rounded-full flex items-center gap-1 shadow-sm">
                        <Info className="w-3.5 h-3.5" />
                        مزود بالمعلومات
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs py-1 px-3 rounded-full">
                        لم يتم التسكير
                      </Badge>
                    )}
                  </div>

                  {/* Prominent Amount Display */}
                  <div className="py-1">
                    {isAmountValid(tx.amount) ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black font-mono tracking-tight ${
                          isClosed ? 'text-[#00875A]' : isInfoProvided ? 'text-rose-700' : 'text-slate-900'
                        }`}>
                          {Number(tx.amount).toFixed(3)}
                        </span>
                        <span className={`text-base font-black ${
                          isClosed ? 'text-[#009B68]' : isInfoProvided ? 'text-rose-600' : 'text-slate-500'
                        }`}>
                          JOD
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>المبلغ غير محدد في الرسالة</span>
                      </div>
                    )}
                  </div>

                  {/* Data Details List */}
                  <div className={`space-y-2.5 text-xs pt-2 border-t ${
                    isClosed ? 'border-[#BBE8D7]' : isInfoProvided ? 'border-rose-200' : 'border-slate-100'
                  }`}>
                    {/* Sender Name */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 shrink-0 font-medium">اسم المحوّل:</span>
                      <strong className="text-slate-900 text-left font-bold text-[12px] break-words">
                        {resolveSenderName(tx)}
                      </strong>
                    </div>

                    {/* Account Number (Strictly LTR to prevent reversing) */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">الحساب:</span>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                        <span 
                          dir="ltr" 
                          className="font-mono font-bold text-slate-800 text-[12px] inline-block text-left [direction:ltr]"
                        >
                          {resolveAccountNumber(tx)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyToClipboard(resolveAccountNumber(tx), 'رقم الحساب');
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          title="نسخ رقم الحساب"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">التاريخ والوقت:</span>
                      <span className="font-mono font-semibold text-slate-700 text-[12px]" dir="ltr">
                        {formatTransferDate(tx.receivedAt)} {formatTransferTime(tx.receivedAt)}
                      </span>
                    </div>

                    {/* If Info Provided: Show Visit Number Box */}
                    {isInfoProvided && !isClosed && (
                      <div className="pt-2 mt-2 border-t border-rose-200 bg-white/80 p-3 rounded-2xl space-y-1.5 border">
                        <div className="flex items-center justify-between">
                          <span className="text-rose-800 font-bold">رقم الزيارة:</span>
                          <div className="flex items-center gap-1.5 bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-300">
                            <span className="font-mono font-black text-rose-700 text-sm">
                              {tx.visitNumber || '-'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyToClipboard(tx.visitNumber, 'رقم الزيارة');
                              }}
                              className="p-1 rounded-md hover:bg-rose-200/60 text-rose-600 transition-colors"
                              title="نسخ رقم الزيارة"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {tx.infoProvidedBy && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>زُوِّدت بواسطة:</span>
                            <span className="font-semibold text-slate-700">{tx.infoProvidedBy}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional Closed Info (Shown only when Closed) */}
                    {isClosed && (
                      <div className="pt-3 mt-3 border-t border-[#A8E2CD] space-y-2 bg-white/80 p-3 rounded-2xl">
                        {/* Branch */}
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-800 font-semibold flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                            الفرع:
                          </span>
                          <strong className="text-slate-900 font-bold">{tx.branchName || 'غير محدد'}</strong>
                        </div>

                        {/* Responsible Employee */}
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-800 font-semibold">الموظف المسؤول:</span>
                          <strong className="text-slate-900 font-bold">{tx.employeeName || tx.closedByName || '-'}</strong>
                        </div>

                        {/* Patient File Number */}
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-800 font-semibold">رقم ملف المريض:</span>
                          <div className="flex items-center gap-1.5 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-300">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {tx.patientFileNumber || '-'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyToClipboard(tx.patientFileNumber, 'رقم ملف المريض');
                              }}
                              className="p-1 rounded-md hover:bg-emerald-200/60 text-emerald-700 transition-colors"
                              title="نسخ رقم الملف"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Visit Number (if provided) */}
                        {tx.visitNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-800 font-semibold">رقم الزيارة:</span>
                            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              <span className="font-mono font-bold text-slate-800 text-xs">
                                {tx.visitNumber}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyToClipboard(tx.visitNumber, 'رقم الزيارة');
                                }}
                                className="p-1 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
                                title="نسخ رقم الزيارة"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Actual user who performed the closure */}
                        {tx.actualClosedBy && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-100">
                            <span>المنفذ الفعلي:</span>
                            <span className="font-semibold text-slate-700">{tx.actualClosedBy}</span>
                          </div>
                        )}

                        {/* Closed At Time */}
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-800 font-semibold">وقت التسكير:</span>
                          <span className="font-mono text-slate-700 font-semibold">
                            {tx.closedAt ? (
                              `${formatTransferTime(tx.closedAt)} (${formatTransferDate(tx.closedAt)})`
                            ) : '-'}
                          </span>
                        </div>

                        {/* Admin Only: Edit and Delete Buttons for Closed Transfers */}
                        {isAdmin && (
                          <div className="pt-3 mt-2 border-t border-emerald-200/80 flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleOpenEditModal(tx)}
                              className="flex-1 rounded-xl h-9 text-xs font-bold border-emerald-600/30 text-emerald-800 bg-white hover:bg-emerald-50 gap-1.5 shadow-none"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                              تعديل التسكير
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setDeletingTransfer(tx)}
                              className="rounded-xl h-9 px-3 text-xs font-bold border-rose-200 text-rose-700 bg-white hover:bg-rose-50 gap-1 shadow-none"
                              title="حذف الحوالة (صلاحية مسؤول)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons (Only shown if NOT closed) */}
                {!isClosed && (
                  <div className="pt-4 mt-3 flex items-center gap-2">
                    {/* "تزويد معلومات" Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenInfoModal(tx)}
                      className={`rounded-2xl h-11 text-xs font-extrabold px-3.5 border transition-all ${
                        isInfoProvided 
                          ? 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100' 
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title={isInfoProvided ? 'تعديل رقم الزيارة' : 'إدخال رقم الزيارة'}
                    >
                      <Info className="w-4 h-4" />
                      <span>{isInfoProvided ? 'تعديل الزيارة' : 'تزويد معلومات'}</span>
                    </Button>

                    {/* "تم التسكير" Button / أو مؤشر القفل لحساب المشاهد غير المصرح له */}
                    {canUserCloseCliq ? (
                      <Button
                        onClick={() => handleOpenCloseModal(tx)}
                        className="flex-1 bg-[#009B68] hover:bg-[#00875A] text-white font-extrabold h-11 rounded-2xl shadow-sm transition-all active:scale-[0.99] text-xs gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        تم التسكير
                      </Button>
                    ) : (
                      <div 
                        className="flex-1 h-11 rounded-2xl border border-slate-200 bg-slate-100/90 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
                        title="غير مصرح لك بتسكير حوالات كليك (حساب مشاهد)"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        غير مصرح بالتسكير
                      </div>
                    )}

                    {isAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDeletingTransfer(tx)}
                        className="h-11 px-3 rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-all shadow-none"
                        title="حذف الحوالة (صلاحية مسؤول)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button (مشاهدة المزيد) when there are more than 20 transfers */}
      {!isLoading && transactions.length > visibleCount && (
        <div className="flex flex-col items-center justify-center pt-6 pb-2 gap-2">
          <Button
            type="button"
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs h-12 px-8 rounded-2xl border-2 border-slate-200 shadow-sm transition-all hover:border-[#009B68] hover:text-[#009B68] flex items-center gap-2.5 group cursor-pointer active:scale-[0.99]"
          >
            <span>
              {isSearching ? 'مشاهدة المزيد من نتائج البحث' : 'مشاهدة المزيد من الحوالات الأقدم'}
            </span>
            <span className="bg-emerald-50 text-[#009B68] border border-emerald-200/60 font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
              متبقي {transactions.length - visibleCount}
            </span>
            <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5 text-slate-400 group-hover:text-[#009B68]" />
          </Button>
          <span className="text-[11px] text-slate-400 font-medium">
            يتم عرض {displayedTransactions.length} من أصل {transactions.length} حوالة
          </span>
        </div>
      )}

      {/* 5. Closing Confirmation Modal ("تأكيد تسكير الحوالة") */}
      {closingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl border border-slate-200 max-w-lg w-full max-h-[95vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#009B68]/10 text-[#009B68]">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-lg">تأكيد تسكير الحوالة</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500">توثيق اسم الموظف ورقم ملف المريض لإغلاق الحوالة</p>
                </div>
              </div>
              <button
                onClick={() => setClosingTransfer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmClose} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-right text-xs custom-scrollbar">
              {/* Transfer Summary Card (to prevent employee mistakes) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  ملخص الحوالة الجاري تسكيرها:
                </span>

                <div className="flex items-center justify-between">
                  {/* Real Amount from record */}
                  {isAmountValid(closingTransfer.amount) ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {Number(closingTransfer.amount).toFixed(3)}
                      </span>
                      <span className="text-sm font-bold text-[#009B68] font-mono">JOD</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>بيانات الحوالة غير مكتملة (المبلغ غير محدد)</span>
                    </div>
                  )}

                  {/* Account Number in strict LTR */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium text-xs">الحساب:</span>
                    <span 
                      dir="ltr" 
                      className="font-mono font-bold text-slate-800 text-xs bg-white px-2 py-0.5 rounded-lg border border-slate-200 inline-block text-left [direction:ltr]"
                    >
                      {resolveAccountNumber(closingTransfer)}
                    </span>
                  </div>
                </div>

                {/* Sender Name from record */}
                <div className="text-slate-800 font-bold text-xs flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 font-medium">اسم المحوّل:</span>
                  <span className="text-slate-900 font-bold text-left">{resolveSenderName(closingTransfer)}</span>
                </div>

                {/* Date & Time from record */}
                <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                  <span className="text-slate-400 font-sans font-medium">تاريخ ووقت الحوالة:</span>
                  <span dir="ltr" className="text-slate-700 font-bold [direction:ltr]">
                    {formatTransferDate(closingTransfer.receivedAt)} {formatTransferTime(closingTransfer.receivedAt)}
                  </span>
                </div>

                {/* Explicit warning banner if amount is missing */}
                {!isAmountValid(closingTransfer.amount) && (
                  <div className="p-2.5 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-800 text-[11px] font-bold">
                    تنبيه: لا يمكن تأكيد تسكير هذه الحوالة لعدم توفر المبلغ المستخرج من الرسالة.
                  </div>
                )}
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Field 1: Branch Selection (حدد الفرع) */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-800 block text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    حدد الفرع <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (الفروع المفعلة في النظام)
                  </span>
                </label>
                <select
                  required
                  value={selectedBranchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs text-right font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#009B68]"
                >
                  <option value="" disabled>-- اضغط لاختيار الفرع --</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.cliqName || b.name})
                    </option>
                  ))}
                </select>
                {branches.length === 0 && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    تنبيه: لا توجد فروع مضافة حالياً. يمكنك إضافة الفروع من شاشة الإعدادات.
                  </p>
                )}
              </div>

              {/* Field 2: Responsible Employee (اسم الموظف المسؤول عن التسكير) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800 block text-xs">
                    اسم الموظف المسؤول عن التسكير <span className="text-rose-500">*</span>
                  </label>
                  {!isAdmin ? (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                      <Lock className="w-3 h-3 text-slate-400" />
                      مقفل (مرتبط بالفرع تلقائياً)
                    </span>
                  ) : (
                    <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                      <Unlock className="w-3 h-3 text-indigo-600" />
                      صلاحية تعديل (مسؤول)
                    </span>
                  )}
                </div>
                
                {(() => {
                  const selectedBranch = branches.find(b => String(b.id) === selectedBranchId);
                  const employeeNames = (selectedBranch?.employeeName || '').split(/[،,]/).map((n: string) => n.trim()).filter(Boolean);
                  
                  if (employeeNames.length > 1 && !isAdmin) {
                    return (
                      <select
                        required
                        value={closedByName}
                        onChange={(e) => setClosedByName(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs text-right font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#009B68]"
                      >
                        <option value="" disabled>-- حدد الموظف المسؤول --</option>
                        {employeeNames.map((name: string) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    );
                  }

                  return (
                    <Input
                      required
                      readOnly={!isAdmin}
                      placeholder="اسم الموظف المسؤول..."
                      value={closedByName}
                      onChange={(e) => setClosedByName(e.target.value)}
                      className={`h-11 rounded-xl border-slate-200 text-xs text-right font-semibold ${
                        !isAdmin ? 'bg-slate-100/80 text-slate-700 cursor-not-allowed select-none' : 'bg-white'
                      }`}
                    />
                  );
                })()}
                
                {isAdmin && branches.find(b => String(b.id) === selectedBranchId)?.employeeName?.includes(',') && (
                  <p className="text-[10px] text-indigo-600 font-medium">
                    ملاحظة: هذا الفرع لديه أكثر من موظف. يمكنك الاختيار من القائمة (للموظفين) أو الكتابة يدوياً (للمسؤول).
                  </p>
                )}
              </div>

              {/* Field 3: Patient File Number (رقم ملف المريض في النظام الآخر) */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-800 block text-xs">
                  رقم ملف المريض في النظام الآخر <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="text"
                  placeholder="مثال: 10258 أو 00412..."
                  value={patientFileNumber}
                  onChange={(e) => setPatientFileNumber(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs text-right font-mono font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400">
                  يقبل الأرقام والنصوص كما هي، ويحافظ على الأصفار الأولى كمعلومة مرجعية دون أي ربط آلي.
                </p>
              </div>

              {/* Actual user performing the action */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">الموظف المنفذ للتسكير:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {user?.name || 'المستخدم الحالي'}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-white/80 sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 backdrop-blur-sm">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClosingTransfer(null)}
                  className="rounded-xl h-10 text-xs font-bold border-slate-200 text-slate-700"
                >
                  إلغاء
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isSubmittingClose || 
                    !selectedBranchName.trim() ||
                    !closedByName.trim() || 
                    !patientFileNumber.trim() || 
                    !isAmountValid(closingTransfer.amount)
                  }
                  className="rounded-xl h-10 bg-[#009B68] hover:bg-[#00875A] text-white font-extrabold text-xs px-6 shadow-sm gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  {isSubmittingClose ? 'جاري التسكير...' : 'تأكيد التسكير'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5b. Edit Closure Modal (Admin Only - تعديل بيانات تسكير الحوالة) */}
      {editingTransfer && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl border border-slate-200 max-w-lg w-full max-h-[95vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-lg">تعديل بيانات تسكير الحوالة</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500">صلاحية خاصة بالمسؤول لتعديل اسم الموظف ورقم ملف المريض</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTransfer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmEdit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-right text-xs custom-scrollbar">
              {/* Transfer Summary Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  الحوالة المراد تعديل بياناتها: #{editingTransfer.id}
                </span>

                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {isAmountValid(editingTransfer.amount) ? Number(editingTransfer.amount).toFixed(3) : '-'}
                    </span>
                    <span className="text-sm font-bold text-[#009B68] font-mono">JOD</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium text-xs">الحساب:</span>
                    <span 
                      dir="ltr" 
                      className="font-mono font-bold text-slate-800 text-xs bg-white px-2 py-0.5 rounded-lg border border-slate-200 inline-block text-left [direction:ltr]"
                    >
                      {resolveAccountNumber(editingTransfer)}
                    </span>
                  </div>
                </div>

                <div className="text-slate-800 font-bold text-xs flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 font-medium">اسم المحوّل:</span>
                  <span className="text-slate-900 font-bold text-left">{resolveSenderName(editingTransfer)}</span>
                </div>
              </div>

              {editModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editModalError}</span>
                </div>
              )}

              {/* Field 1: Closed By Name */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-800 block text-xs">
                  اسم الموظف الذي سكّر الحوالة <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="اكتب اسم الموظف..."
                  value={editClosedByName}
                  onChange={(e) => setEditClosedByName(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs text-right font-semibold"
                />
              </div>

              {/* Field 2: Patient File Number */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-800 block text-xs">
                  رقم ملف المريض في النظام الآخر <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="text"
                  placeholder="مثال: 00123 أو 45892..."
                  value={editPatientFileNumber}
                  onChange={(e) => setEditPatientFileNumber(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs text-right font-mono font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400">
                  يحافظ على الأصفار الأولى، ولا يتم ربطه بأي جدول مواعيد أو نظام مالي آخر.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-white/80 sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 backdrop-blur-sm">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTransfer(null)}
                  className="rounded-xl h-10 text-xs font-bold border-slate-200 text-slate-700"
                >
                  إلغاء
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmittingEdit || !editClosedByName.trim() || !editPatientFileNumber.trim()}
                  className="rounded-xl h-10 bg-[#009B68] hover:bg-[#00875A] text-white font-extrabold text-xs px-6 shadow-sm gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  {isSubmittingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5c. Delete Confirmation Modal (Admin Only - حذف الحوالة) */}
      {deletingTransfer && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl border border-slate-200 max-w-md w-full max-h-[95vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-rose-100 text-rose-700 border border-rose-200">
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-black text-rose-950 text-sm sm:text-base">تأكيد حذف الحوالة البنكية</h3>
                  <p className="text-[10px] sm:text-xs text-rose-700">صلاحية المسؤول (الأدمن) فقط</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingTransfer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 text-right text-xs custom-scrollbar">
              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 font-bold leading-relaxed">
                هل أنت متأكد من حذف الحوالة رقم #{deletingTransfer.id} نهائياً؟ 
                سيتم مسح سجل الحوالة وبيانات التسكير بالكامل من النظام ولا يمكن التراجع عن هذا الإجراء.
              </div>

              {/* Transfer Details preview */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-400">اسم المحوّل:</span>
                  <span className="font-bold text-slate-900">{resolveSenderName(deletingTransfer)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-400">المبلغ:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {isAmountValid(deletingTransfer.amount) ? `${Number(deletingTransfer.amount).toFixed(3)} JOD` : 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="text-slate-400">الحساب:</span>
                  <span dir="ltr" className="font-mono font-bold text-slate-900 [direction:ltr]">{resolveAccountNumber(deletingTransfer)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-white/50 sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeletingTransfer(null)}
                  className="rounded-xl h-10 text-xs font-bold border-slate-200 text-slate-700"
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmittingDelete}
                  className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-5 shadow-sm gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isSubmittingDelete ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5d. Provide Information Modal ("تزويد معلومات" - رقم الزيارة) */}
      {infoModalTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl border border-slate-200 max-w-md w-full max-h-[95vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-rose-600 text-white shadow-sm">
                  <Info className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-lg">تزويد معلومات الحوالة</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500">توثيق رقم الزيارة المرتبط بالحوالة</p>
                </div>
              </div>
              <button
                onClick={() => setInfoModalTransfer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmProvideInfo} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-right text-xs custom-scrollbar">
              {/* Transfer Summary Preview */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">قيمة الحوالة:</span>
                  <span className="text-lg font-black font-mono text-slate-900">
                    {Number(infoModalTransfer.amount || 0).toFixed(3)} JOD
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">اسم المحوّل:</span>
                  <span className="font-bold text-slate-800">{resolveSenderName(infoModalTransfer)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">الحساب:</span>
                  <span dir="ltr" className="font-mono font-bold text-slate-700">{resolveAccountNumber(infoModalTransfer)}</span>
                </div>
              </div>

              {infoModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{infoModalError}</span>
                </div>
              )}

              {/* Visit Number Input */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-800 block text-xs">
                  رقم الزيارة في النظام <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  autoFocus
                  placeholder="مثال: 10582 أو V-9821..."
                  value={visitNumberInput}
                  onChange={(e) => setVisitNumberInput(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-xs text-right font-mono font-bold text-slate-900"
                />
              </div>

              {/* Explanatory Note */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                💡 <strong>ملاحظة هامة:</strong> تزويد رقم الزيارة لا يغلق الحوالة ويحول حالتها إلى 
                <span className="text-rose-700 font-black mx-1">"مزود بالمعلومات" (باللون الأحمر)</span>
                حيث تظل معلقة حتى يتم تسكيرها لاحقاً بواسطة الموظف المسؤول.
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-white/80 sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 backdrop-blur-sm">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInfoModalTransfer(null)}
                  className="rounded-xl h-10 text-xs font-bold border-slate-200 text-slate-700"
                >
                  إلغاء
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmittingInfo || !visitNumberInput.trim()}
                  className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-6 shadow-sm gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSubmittingInfo ? 'جاري الحفظ...' : 'حفظ معلومات الزيارة'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5e. Official PDF Report Modal ("طباعة كشف PDF") */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">كشف حوالات CliQ المسكرة</h3>
                  <p className="text-xs text-slate-500">معاينة وطباعة الكشف المالي الرسمي المعتمد</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-4 rounded-xl gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن</span>
                </Button>

                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-6 printable-report bg-white" id="cliq-print-area">
              {isLoadingReport ? (
                <div className="py-20 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
                  <p className="font-bold text-sm">جاري إنشاء وتحضير الكشف...</p>
                </div>
              ) : reportError ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold text-center">
                  {reportError}
                </div>
              ) : reportData ? (
                <>
                  {/* Print Style Injector */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      /* 1. Global Print Reset */
                      html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                        width: 100% !important;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                      }

                      /* 2. Hide everything except the report path */
                      body > * { display: none !important; }
                      #root, #root > div, main, .fixed.inset-0.z-50, .bg-white.rounded-3xl, .flex-1.overflow-auto, #cliq-print-area, #cliq-print-area * {
                        display: block !important;
                        visibility: visible !important;
                      }

                      /* 3. Strip Modal & Container Restrictions */
                      .fixed.inset-0.z-50, .bg-white.rounded-3xl, .flex-1.overflow-auto {
                        position: static !important;
                        overflow: visible !important;
                        width: 100% !important;
                        height: auto !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        transform: none !important;
                        background: white !important;
                        max-height: none !important;
                        max-width: none !important;
                      }

                      /* 4. UI Elements Hiding */
                      .print\\:hidden, button, .sticky, header, nav, .sidebar-container {
                        display: none !important;
                      }

                      /* 5. Report Container Spacing */
                      #cliq-print-area {
                        padding: 10mm !important;
                        margin: 0 !important;
                      }

                      /* 6. Typography & Table Optimization */
                      .report-text-xs { font-size: 8pt !important; }
                      .report-text-sm { font-size: 9pt !important; }
                      .report-text-base { font-size: 11pt !important; }
                      
                      table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 5mm !important;
                        border: 1px solid #000 !important;
                      }
                      
                      th, td {
                        border: 1px solid #ddd !important;
                        padding: 4px 6px !important;
                        word-break: break-word !important;
                        line-height: 1.2 !important;
                      }

                      th {
                        background-color: #f8fafc !important;
                        -webkit-print-color-adjust: exact;
                        font-weight: bold !important;
                        font-size: 8.5pt !important;
                      }

                      tr:nth-child(even) {
                        background-color: #f9fafb !important;
                        -webkit-print-color-adjust: exact;
                      }

                      /* Force table to stay within bounds */
                      .printable-table-wrapper {
                        overflow: visible !important;
                        width: 100% !important;
                      }

                      @page {
                        size: A4 portrait;
                        margin: 10mm;
                      }
                    }
                  `}} />

                  {/* Compact Official Header */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
                    <div className="space-y-0.5">
                      <h1 className="text-xl font-black text-slate-900 leading-tight">مختبر العربي الطبي</h1>
                      <h2 className="text-[10pt] font-bold text-slate-600">Alarabi Medical Laboratory</h2>
                      <p className="text-[8pt] text-slate-500">نظام إدارة حوالات CliQ والمدفوعات الإلكترونية</p>
                    </div>

                    <div className="text-left text-[8pt] space-y-0.5">
                      <div className="font-mono font-bold text-slate-800">
                        التاريخ: {new Date().toLocaleDateString('ar-JO')} {new Date().toLocaleTimeString('ar-JO')}
                      </div>
                      <div className="text-slate-500">
                        المستخدم: <span className="font-bold text-slate-800">{reportData.summary.generatedBy}</span>
                      </div>
                      <div className="text-slate-400 font-mono">ID: {Date.now().toString().slice(-6)}</div>
                    </div>
                  </div>

                  {/* Title and Summary Bar */}
                  <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 border border-slate-200 rounded-lg">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        كشف حوالات CliQ ({reportData.summary.statusText})
                      </h2>
                      <div className="flex items-center gap-4 mt-1 text-[8pt] text-slate-600 font-bold">
                        <span>الفرع: {reportData.summary.branchName}</span>
                        <span>الفترة: {reportData.summary.startDate || 'البداية'} - {reportData.summary.endDate || 'الآن'}</span>
                        <span>العدد: {reportData.summary.totalClosed} حوالة</span>
                      </div>
                    </div>
                    
                    <div className="text-left bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-sm">
                      <span className="block text-[7pt] font-bold opacity-90 uppercase">إجمالي مبالغ الكشف</span>
                      <span className="text-lg font-black font-mono">
                        {Number(reportData.summary.totalAmount || 0).toFixed(3)} JOD
                      </span>
                    </div>
                  </div>

                  {/* Main Data Table */}
                  <div className="printable-table-wrapper">
                    <table className="w-full text-right text-[8pt] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-300">
                          <th className="py-2 px-1 text-center w-[25px]">#</th>
                          <th className="py-2 px-2 w-[120px]">الوقت والتاريخ</th>
                          <th className="py-2 px-2 w-[110px]">الرقم المرجعي</th>
                          <th className="py-2 px-2">اسم المحوّل (Sender)</th>
                          <th className="py-2 px-2 text-left w-[85px]">المبلغ</th>
                          <th className="py-2 px-2 w-[90px]">الفرع</th>
                          <th className="py-2 px-2 w-[80px]">الموظف</th>
                          <th className="py-2 px-2 w-[70px]">ملف/زيارة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {reportData.items.map((item: any, idx: number) => (
                          <tr key={item.id} className="break-inside-avoid border-b border-slate-100">
                            <td className="py-1.5 px-1 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-1.5 px-2 font-mono text-[7.5pt]" dir="ltr">
                              {formatTransferDate(item.receivedAt)} {formatTransferTime(item.receivedAt)}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[7.5pt] text-slate-600 break-all">{item.transactionId}</td>
                            <td className="py-1.5 px-2 font-bold text-slate-900 leading-tight">{item.senderName}</td>
                            <td className="py-1.5 px-2 font-mono font-black text-emerald-800 text-left" dir="ltr">
                              {Number(item.amount || 0).toFixed(3)}
                            </td>
                            <td className="py-1.5 px-2 text-slate-700">{item.branchName}</td>
                            <td className="py-1.5 px-2 text-slate-700">{item.employeeName}</td>
                            <td className="py-1.5 px-2 font-mono font-bold text-slate-900">
                              {item.patientFileNumber}
                              {item.visitNumber && <div className="text-[7pt] text-slate-500 font-normal mt-0.5">V: {item.visitNumber}</div>}
                            </td>
                          </tr>
                        ))}
                        {reportData.items.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-400 font-bold text-sm">
                              لا توجد بيانات مطابقة للفلاتر المختارة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-400">
                          <td colSpan={4} className="py-2.5 px-3 text-right text-sm">إجمالي الكشف:</td>
                          <td className="py-2.5 px-3 font-mono text-base text-emerald-900 text-left" dir="ltr">
                            {Number(reportData.summary.totalAmount || 0).toFixed(3)}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Very Compact Signatures */}
                  <div className="mt-8 grid grid-cols-3 gap-8 text-[8pt] pt-6 border-t border-slate-200">
                    <div className="text-center space-y-6">
                      <span className="font-bold block text-slate-700">إعداد وتدقيق</span>
                      <div className="border-b border-dashed border-slate-400 w-32 mx-auto pb-1 font-mono">{reportData.summary.generatedBy}</div>
                    </div>
                    <div className="text-center space-y-6">
                      <span className="font-bold block text-slate-700">المحاسبة المالية</span>
                      <div className="border-b border-dashed border-slate-400 w-32 mx-auto pb-1 text-slate-300">..............</div>
                    </div>
                    <div className="text-center space-y-6">
                      <span className="font-bold block text-slate-700">اعتماد الإدارة</span>
                      <div className="border-b border-dashed border-slate-400 w-32 mx-auto pb-1 text-slate-300">..............</div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
