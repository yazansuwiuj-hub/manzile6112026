export interface Appointment {
  id: string;
  testId: string;
  name: string;
  phone: string;
  age: number;
  location: string;
  testName: string;
  date: string;
  time: string;
  testerName: string;
  price: number;
  status: string;
  amountCollected?: number;
  locationUrl?: string;
  completionTime?: string;
  arrivalTime?: string;
  notes?: string;
  priceDiffReason?: string;
  paymentMethod?: string;
  requiresFasting?: boolean;
  attachmentUrl?: string;
  isExternalRequest?: boolean;
  isPendingAcceptance?: boolean;
  insurance?: string;
  paymentStatus?: string;
  priority?: string;
  lastVisit?: string;
  coords?: { lat: number; lng: number; };
}

export type Role = 'مسؤول' | 'مبرمج مواعيد' | 'ساحب منزلي' | 'منسق مواعيد' | 'مشاهد' | 'مدير';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'نشط' | 'غير نشط';
  phone: string;
  password?: string;
  governorate?: string; // 'عمان' | 'إربد' | 'الزرقاء' | 'كل المحافظات'
  shift?: string; // 'صباحي' | 'مسائي' | 'كلاهما'
  ammanSector?: 'شرقية' | 'غربية' | 'كلاهما'; // For Amman governorate
  dailyLimit?: number;
  notificationStart?: string;
  notificationEnd?: string;
  canCloseCliq?: boolean;
}

export interface RegionConfig {
  id?: string;
  governorate: 'عمان' | 'إربد' | 'الزرقاء';
  shift: 'صباحي' | 'مسائي';
  regionName: string;
  timeFrom: string;
  timeTo: string;
  fridayTimeFrom?: string;
  fridayTimeTo?: string;
  ammanSector?: 'شرقية' | 'غربية'; // Sector for Amman
}

export interface CliqBranch {
  id: number;
  name: string;
  cliqBranchName: string;
  responsibleEmployeeName: string;
  status: 'نشط' | 'غير نشط';
  createdAt?: string;
  updatedAt?: string;
}

export interface CliqTransaction {
  id: number;
  transactionId?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  accountNumber?: string | null;
  amount?: number | null;
  currency?: string;
  bankSender?: string;
  smsBody: string;
  receivedAt?: string | null;
  serverReceivedAt?: string;
  deviceId?: string;
  status: 'NEW' | 'INFO_PROVIDED' | 'CLOSED';
  closedByName?: string | null;
  patientFileNumber?: string | null;
  closedAt?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  employeeName?: string | null;
  actualClosedBy?: string | null;
  visitNumber?: string | null;
  infoProvidedAt?: string | null;
  infoProvidedBy?: string | null;
  matchedAppointmentId?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
