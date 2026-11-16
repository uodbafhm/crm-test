// serialized DTOs returned by the API (dates are ISO strings)
export interface PatientDto {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  gender: string | null;
  address: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  notes: string | null;
  createdAt: string;
  balanceDue?: number;
  totalBilled?: number;
}

export interface AppointmentDto {
  id: number;
  patientId: number;
  date: string;
  duration: number;
  reason: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  patient?: PatientDto;
}

export interface TreatmentDto {
  id: number;
  patientId: number;
  appointmentId: number | null;
  tooth: number | null;
  type: string;
  description: string | null;
  cost: number;
  status: string;
  performedAt: string;
  createdAt: string;
  patient?: PatientDto;
}

export interface InvoiceDto {
  id: number;
  patientId: number;
  treatmentId: number | null;
  number: string;
  amount: number;
  paidAmount: number;
  status: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  patient?: PatientDto;
  treatment?: TreatmentDto | null;
}

export interface XrayDto {
  id: number;
  patientId: number;
  tooth: number | null;
  title: string;
  url: string;
  notes: string | null;
  createdAt: string;
}

export interface ToothDto {
  id: number;
  patientId: number;
  tooth: number;
  status: string;
  notes: string | null;
  updatedAt: string;
}

export interface QueueEntryDto {
  id: number;
  patientId: number;
  ticketNumber: number;
  reason: string | null;
  status: string;
  arrivedAt: string;
  calledAt: string | null;
  doneAt: string | null;
  createdAt: string;
  patient?: PatientDto;
}

export interface QueueStatusDto {
  entries: QueueEntryDto[];
  current: QueueEntryDto | null;
  waiting: QueueEntryDto[];
  doneToday: QueueEntryDto[];
  waitingCount: number;
}

export function waitingMinutes(e: QueueEntryDto): number {
  return Math.max(0, Math.round((Date.now() - new Date(e.arrivedAt).getTime()) / 60000));
}

export interface NotificationDto {
  id: number;
  appointmentId: number | null;
  kind: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface StatsDto {
  today: {
    appointments: AppointmentDto[];
    total: number;
    done: number;
    next: AppointmentDto | null;
  };
  patients: { total: number; newThisMonth: number };
  revenue: { month: number; last6: { label: string; value: number }[] };
  invoices: { unpaidCount: number; unpaidTotal: number };
  treatmentsByType: { type: string; count: number }[];
  activeTreatments: number;
  upcoming: AppointmentDto[];
  weekLoad: { label: string; count: number; isToday: boolean }[];
}

export function patientName(p?: PatientDto | null): string {
  return p ? `${p.firstName} ${p.lastName}` : "مريض";
}
