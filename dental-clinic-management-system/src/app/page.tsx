"use client";

import { motion } from "framer-motion";
import {
  AlarmClockCheck,
  AreaChart as AreaIcon,
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  Check,
  CircleDollarSign,
  Phone,
  Receipt,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGet, apiPatch } from "@/lib/api";
import {
  APPOINTMENT_STATUS,
  formatMoney,
  formatTime,
  whenLabel,
  weekdayName,
  formatDate,
} from "@/lib/constants";
import type { AppointmentDto, StatsDto } from "@/lib/types";
import { patientName } from "@/lib/types";
import {
  AppointmentBadge,
  Avatar,
  Counter,
  Empty,
  SectionTitle,
  Stagger,
  Skeleton,
  item,
} from "@/components/ui";
import { QueueCard } from "@/components/queue-card";
import { BookingRequests } from "@/components/booking-requests";

const DONUT_COLORS = ["#0E7569", "#E0703F", "#B98A2F", "#6366F1", "#0EA5E9", "#E11D48"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 18) return "مساء النور";
  return "مساء الخير";
}

function useNow(stepMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), stepMs);
    return () => clearInterval(i);
  }, [stepMs]);
  return now;
}

/* ---------- next appointment countdown chip ---------- */
function NextAppointment({ appt }: { appt: AppointmentDto }) {
  const now = useNow(15_000);
  const mins = Math.max(0, Math.round((new Date(appt.date).getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur px-5 py-3"
    >
      <span className="w-10 h-10 rounded-xl bg-accent/25 flex items-center justify-center pulse-ring">
        <AlarmClockCheck className="w-5 h-5 text-amber-300" />
      </span>
      <div>
        <p className="text-[10px] font-bold text-teal-200">التذكير التلقائي — الموعد القادم</p>
        <p className="text-sm font-extrabold text-white">
          {patientName(appt.patient)} · {formatTime(appt.date)}
        </p>
      </div>
      <div className="text-center border-s border-white/15 ps-4">
        <p className="text-xl font-black text-white leading-5" dir="ltr">
          {h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m}′`}
        </p>
        <p className="text-[9px] text-teal-200 font-bold">{h > 0 ? "ساعة" : "دقيقة"}</p>
      </div>
    </motion.div>
  );
}

/* ---------- stat card ---------- */
function StatCard({
  icon,
  label,
  value,
  suffix,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  sub?: string;
  tone: string;
}) {
  return (
    <motion.div variants={item} className="card p-5 relative overflow-hidden group">
      <div className={`absolute -top-10 -left-10 w-28 h-28 rounded-full blur-2xl opacity-25 transition-opacity group-hover:opacity-45 ${tone}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-ink-soft">{label}</p>
          <p className="mt-2 text-2xl font-black text-ink tracking-tight">
            <Counter value={value} />
            {suffix && <span className="text-sm font-extrabold text-ink-soft ms-1">{suffix}</span>}
          </p>
          {sub && <p className="mt-1 text-[11px] font-semibold text-ink-soft/70">{sub}</p>}
        </div>
        <span className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-lg ${tone}`}>
          {icon}
        </span>
      </div>
    </motion.div>
  );
}

/* ---------- today's timeline row ---------- */
function TodayRow({ appt, onAction }: { appt: AppointmentDto; onAction: (id: number, status: string) => void }) {
  const s = APPOINTMENT_STATUS[appt.status] ?? APPOINTMENT_STATUS.scheduled;
  return (
    <motion.div variants={item} className="flex items-center gap-3 py-3 border-b border-line/70 last:border-0 group">
      <div className="w-14 shrink-0 text-center">
        <p className="text-sm font-black text-ink" dir="ltr">{formatTime(appt.date)}</p>
        <p className="text-[9px] font-bold text-ink-soft">{appt.duration} د</p>
      </div>
      <span className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
      <Avatar first={appt.patient?.firstName ?? "?"} last={appt.patient?.lastName ?? ""} size="sm" />
      <div className="flex-1 min-w-0">
        <Link href={`/patients/${appt.patientId}`} className="text-sm font-extrabold text-ink hover:text-primary transition-colors truncate block">
          {patientName(appt.patient)}
        </Link>
        <p className="text-[11px] text-ink-soft font-semibold truncate">{appt.reason ?? "فحص"}</p>
      </div>
      <AppointmentBadge status={appt.status} />
      {(appt.status === "scheduled" || appt.status === "confirmed" || appt.status === "pending") && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(appt.status === "scheduled" || appt.status === "pending") && (
            <button
              title={appt.status === "pending" ? "قبول طلب الموقع" : "تأكيد الحضور"}
              onClick={() => onAction(appt.id, "confirmed")}
              className="w-7 h-7 rounded-lg bg-teal-50 text-primary hover:bg-teal-100 flex items-center justify-center transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            title="إنهاء الموعد"
            onClick={() => onAction(appt.id, "done")}
            className="w-7 h-7 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 flex items-center justify-center transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            title="إلغاء"
            onClick={() => onAction(appt.id, "cancelled")}
            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ---------- page ---------- */
export default function DashboardPage() {
  const [stats, setStats] = useState<StatsDto | null>(null);

  const load = useCallback(() => {
    apiGet<StatsDto>("/api/stats").then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: number, status: string) {
    await apiPatch(`/api/appointments/${id}`, { status });
    load();
  }

  const last6 = stats?.revenue.last6 ?? [];
  const prev = last6[last6.length - 2]?.value ?? 0;
  const cur = last6[last6.length - 1]?.value ?? 0;
  const trend = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

  if (!stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------- hero ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-pine pine-pattern text-white p-6 sm:p-8"
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5 justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-teal-300 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {weekdayName(new Date())} — {formatDate(new Date())}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight">
              {greeting()}، د. ياسين
            </h1>
            <p className="mt-2 text-sm text-white/60 font-semibold">
              لديك {stats.today.total - stats.today.done} موعداً متبقياً اليوم. يوم موفق في العيادة!
            </p>
          </div>
          {stats.today.next ? (
            <NextAppointment appt={stats.today.next} />
          ) : (
            <div className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-sm font-bold text-teal-100">
              لا مواعيد قادمة اليوم
            </div>
          )}
        </div>
      </motion.div>

      {/* ---------- online booking requests (from /book) ---------- */}
      <BookingRequests />

      {/* ---------- stats ---------- */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CalendarCheck className="w-5 h-5" />}
          label="مواعيد اليوم"
          value={stats.today.total}
          sub={`${stats.today.done} مكتمل · ${stats.today.total - stats.today.done} متبقٍ`}
          tone="bg-gradient-to-br from-teal-400 to-primary"
        />
        <StatCard
          icon={<CircleDollarSign className="w-5 h-5" />}
          label="مداخيل الشهر"
          value={stats.revenue.month}
          suffix="د.م."
          sub={trend !== null ? `${trend >= 0 ? "+" : ""}${trend}% مقارنة بالشهر الماضي` : "أول شهر مسجل"}
          tone="bg-gradient-to-br from-amber-400 to-gold"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="إجمالي المرضى"
          value={stats.patients.total}
          sub={`+${stats.patients.newThisMonth} هذا الشهر`}
          tone="bg-gradient-to-br from-indigo-400 to-indigo-600"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="مستحقات غير محصلة"
          value={stats.invoices.unpaidTotal}
          suffix="د.م."
          sub={`${stats.invoices.unpaidCount} فاتورة معلقة`}
          tone="bg-gradient-to-br from-orange-400 to-accent"
        />
      </Stagger>

      {/* ---------- row: schedule + reminders ---------- */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div {...{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 } }} className="card p-5 lg:col-span-2">
          <SectionTitle
            icon={<CalendarClock className="w-4 h-4" />}
            title="برنامج اليوم"
            action={
              <Link href="/calendar" className="text-[11px] font-extrabold text-primary flex items-center gap-1 hover:underline">
                كل المواعيد <ArrowLeft className="w-3 h-3" />
              </Link>
            }
          />
          {stats.today.appointments.length === 0 ? (
            <Empty text="لا توجد مواعيد اليوم — هنيئاً لك يوماً هادئاً" icon={<CalendarClock className="w-10 h-10" />} />
          ) : (
            <Stagger>
              {stats.today.appointments.map((a) => (
                <TodayRow key={a.id} appt={a} onAction={setStatus} />
              ))}
            </Stagger>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="space-y-4">
          {/* walk-in queue */}
          <QueueCard />

          {/* auto reminders */}
          <div className="card p-5">
            <SectionTitle icon={<AlarmClockCheck className="w-4 h-4" />} title="التذكيرات التلقائية" />
            {stats.upcoming.length === 0 ? (
              <Empty text="لا مواعيد خلال 48 ساعة القادمة" icon={<AlarmClockCheck className="w-10 h-10" />} />
            ) : (
              <div className="space-y-3">
                {stats.upcoming.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0 pulse-ring" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-ink truncate">{patientName(a.patient)}</p>
                      <p className="text-[10px] text-ink-soft font-semibold truncate">{a.reason ?? "فحص"}</p>
                    </div>
                    <span className="text-[10px] font-black text-accent bg-orange-50 px-2 py-1 rounded-lg whitespace-nowrap">
                      {whenLabel(a.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* week load */}
          <div className="card p-5">
            <SectionTitle icon={<Stethoscope className="w-4 h-4" />} title="ضغط الأسبوع" />
            <div className="flex items-end justify-between gap-2 h-28">
              {stats.weekLoad.map((d, i) => {
                const max = Math.max(...stats.weekLoad.map((x) => x.count), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.count / max) * 88}px` }}
                      transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 200, damping: 24 }}
                      className={`w-full max-w-8 rounded-lg ${d.isToday ? "bg-gradient-to-t from-primary to-teal-400" : "bg-line"}`}
                      title={`${d.count} موعد`}
                    />
                    <span className={`text-[9px] font-bold ${d.isToday ? "text-primary" : "text-ink-soft/70"}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ---------- row: revenue + donut ---------- */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5 lg:col-span-2">
          <SectionTitle
            icon={<AreaIcon className="w-4 h-4" />}
            title="المداخيل — آخر 6 أشهر"
            action={<span className="text-xs font-black text-primary">{formatMoney(stats.revenue.month)} هذا الشهر</span>}
          />
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last6} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E7569" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0E7569" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: "#4b5b58" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#a8a294" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                <Tooltip
                  formatter={(v) => [formatMoney(Number(v)), "المداخيل"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E4DFD3", fontSize: 12, fontWeight: 700, direction: "rtl" }}
                />
                <Area type="monotone" dataKey="value" stroke="#0E7569" strokeWidth={3} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="card p-5">
          <SectionTitle
            icon={<Receipt className="w-4 h-4" />}
            title="أنواع العلاجات"
            action={<span className="text-[11px] font-bold text-ink-soft">{stats.activeTreatments} قيد التنفيذ</span>}
          />
          <div className="h-44" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.treatmentsByType} dataKey="count" nameKey="type" innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                  {stats.treatmentsByType.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [`${v}`, name]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E4DFD3", fontSize: 12, fontWeight: 700, direction: "rtl" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
            {stats.treatmentsByType.map((t, i) => (
              <div key={t.type} className="flex items-center gap-1.5 text-[10px] font-bold text-ink-soft">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="truncate">{t.type}</span>
                <span className="ms-auto text-ink">{t.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-line flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-ink-soft" />
            <p className="text-[10px] font-bold text-ink-soft">
              تُرسَل التذكيرات تلقائياً للطبيب قبل كل موعد بـ 24 ساعة
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
