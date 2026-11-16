// ---------- shared domain constants & formatters (client safe) ----------

export const APPOINTMENT_STATUS: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  pending: {
    label: "بانتظار التأكيد · من الموقع",
    color: "#6D28D9",
    bg: "#EDE9FE",
    dot: "#8B5CF6",
  },
  scheduled: {
    label: "مجدول",
    color: "#B45309",
    bg: "#FEF3C7",
    dot: "#F59E0B",
  },
  confirmed: {
    label: "مؤكد",
    color: "#0F766E",
    bg: "#CCFBF1",
    dot: "#14B8A6",
  },
  done: {
    label: "مكتمل",
    color: "#15803D",
    bg: "#DCFCE7",
    dot: "#22C55E",
  },
  cancelled: {
    label: "ملغي",
    color: "#BE123C",
    bg: "#FFE4E6",
    dot: "#F43F5E",
  },
  noshow: {
    label: "لم يحضر",
    color: "#57534E",
    bg: "#E7E5E4",
    dot: "#A8A29E",
  },
};

export const TREATMENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: "مخطط", color: "#B45309", bg: "#FEF3C7" },
  in_progress: { label: "قيد التنفيذ", color: "#1D4ED8", bg: "#DBEAFE" },
  done: { label: "مكتمل", color: "#15803D", bg: "#DCFCE7" },
};

export const INVOICE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  unpaid: { label: "غير مدفوعة", color: "#BE123C", bg: "#FFE4E6" },
  partial: { label: "مدفوعة جزئياً", color: "#B45309", bg: "#FEF3C7" },
  paid: { label: "مدفوعة", color: "#15803D", bg: "#DCFCE7" },
};

export const TREATMENT_TYPES = [
  "فحص عام",
  "تنظيف الأسنان",
  "حشوة تجميلية",
  "قلع سن",
  "علاج عصب",
  "تركيب تاج",
  "تبييض الأسنان",
  "تقويم الأسنان",
  "زراعة أسنان",
  "علاج اللثة",
  "أشعة بانورامية",
];

export const TOOTH_STATUS: Record<
  string,
  { label: string; fill: string; stroke: string }
> = {
  healthy: { label: "سليمة", fill: "#FFFFFF", stroke: "#C9C4BA" },
  watch: { label: "تحت المراقبة", fill: "#FDE68A", stroke: "#D97706" },
  caries: { label: "تسوس", fill: "#FDA4AF", stroke: "#E11D48" },
  filling: { label: "حشوة", fill: "#99F6E4", stroke: "#0D9488" },
  crown: { label: "تاج", fill: "#FDE68A", stroke: "#B45309" },
  root: { label: "علاج عصب", fill: "#DDD6FE", stroke: "#7C3AED" },
  missing: { label: "مفقودة", fill: "#E7E5E4", stroke: "#A8A29E" },
  implant: { label: "زراعة", fill: "#BAE6FD", stroke: "#0284C7" },
};

export const TOOTH_ORDER = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export const GENDER_LABEL: Record<string, string> = {
  female: "أنثى",
  male: "ذكر",
};

export const QUEUE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  waiting: { label: "في الانتظار", color: "#B45309", bg: "#FEF3C7" },
  called: { label: "تمت المناداة", color: "#1D4ED8", bg: "#DBEAFE" },
  serving: { label: "لدى الطبيب", color: "#0F766E", bg: "#CCFBF1" },
  done: { label: "انتهى", color: "#15803D", bg: "#DCFCE7" },
  skipped: { label: "غادر", color: "#BE123C", bg: "#FFE4E6" },
};

// ---------- formatters ----------
const moneyFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatMoney(v: number): string {
  return `${moneyFmt.format(v)} د.م.`;
}

export function formatDate(d: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...opts,
  }).format(date);
}

export function formatTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(d: string | Date): string {
  return `${formatDate(d)} · ${formatTime(d)}`;
}

export function weekdayName(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-MA", { weekday: "long" }).format(date);
}

export function monthName(d: Date): string {
  return new Intl.DateTimeFormat("ar-MA", { month: "long", year: "numeric" }).format(d);
}

export function shortMonth(d: Date): string {
  return new Intl.DateTimeFormat("ar-MA", { month: "short" }).format(d);
}

export function initials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`;
}

export function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function minutesUntil(d: string | Date): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.round((date.getTime() - Date.now()) / 60000);
}

export function whenLabel(d: string | Date): string {
  const mins = minutesUntil(d);
  if (mins < -60 * 24) return formatDate(d);
  if (mins < 0) return "قبل قليل";
  if (mins < 60) return `بعد ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `بعد ${hours} ساعة`;
  return new Intl.DateTimeFormat("ar-MA", { weekday: "long" }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}

export function age(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}
