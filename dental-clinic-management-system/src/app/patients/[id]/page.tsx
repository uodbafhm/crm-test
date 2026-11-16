"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Check,
  Cross,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Scan,
  Stethoscope,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import {
  age,
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
  TREATMENT_STATUS,
} from "@/lib/constants";
import type {
  AppointmentDto,
  InvoiceDto,
  PatientDto,
  TreatmentDto,
  XrayDto,
} from "@/lib/types";
import { patientName } from "@/lib/types";
import {
  AppointmentBadge,
  Avatar,
  Empty,
  InvoiceBadge,
  Skeleton,
  TreatmentBadge,
} from "@/components/ui";
import { DentalChart } from "@/components/dental-chart";
import {
  AppointmentFormModal,
  InvoiceFormModal,
  PatientFormModal,
  TreatmentFormModal,
  XrayFormModal,
} from "@/components/forms";
import { Confirm, Modal } from "@/components/modal";

const TABS = [
  { key: "overview", label: "نظرة عامة", icon: Heart },
  { key: "chart", label: "خريطة الأسنان", icon: Scan },
  { key: "treatments", label: "العلاجات", icon: Stethoscope },
  { key: "xrays", label: "الأشعة", icon: Cross },
  { key: "invoices", label: "الفواتير", icon: Receipt },
  { key: "appointments", label: "المواعيد", icon: CalendarClock },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [patient, setPatient] = useState<PatientDto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [editOpen, setEditOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const loadPatient = useCallback(() => {
    apiGet<PatientDto>(`/api/patients/${id}`)
      .then(setPatient)
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => { loadPatient(); }, [loadPatient]);

  if (notFound) {
    return (
      <div className="card p-10 text-center">
        <p className="font-black text-ink mb-2">المريض غير موجود</p>
        <Link href="/patients" className="text-primary text-sm font-bold hover:underline">العودة إلى قائمة المرضى</Link>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---------- header ---------- */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="bg-pine pine-pattern text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full bg-primary/30 blur-3xl" />
          <Link href="/patients" className="relative inline-flex items-center gap-1 text-[11px] font-bold text-teal-300 hover:text-white mb-5 transition-colors">
            <ArrowRight className="w-3.5 h-3.5" /> كل المرضى
          </Link>
          <div className="relative flex flex-wrap items-center gap-5">
            <Avatar first={patient.firstName} last={patient.lastName} size="xl" />
            <div className="flex-1 min-w-56">
              <h1 className="text-2xl font-black">
                {patient.firstName} {patient.lastName}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-bold text-white/70">
                <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3.5 h-3.5" /> {patient.phone}</span>
                {patient.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3.5 h-3.5" /> {patient.email}</span>}
                {patient.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {patient.address}</span>}
                <span>
                  {patient.gender === "female" ? "أنثى" : patient.gender === "male" ? "ذكر" : ""}
                  {age(patient.birthDate) != null ? ` · ${age(patient.birthDate)} سنة` : ""}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setApptOpen(true)} className="btn-primary !from-teal-400 !to-primary">
                <CalendarPlus className="w-4 h-4" /> موعد
              </button>
              <button onClick={() => setInvoiceOpen(true)} className="btn-primary !from-amber-400 !to-gold">
                <Receipt className="w-4 h-4" /> فاتورة
              </button>
              <button onClick={() => setEditOpen(true)} className="btn-ghost !border-white/25 !text-white hover:!bg-white/10">
                <Pencil className="w-3.5 h-3.5" /> تعديل
              </button>
            </div>
          </div>
        </div>
        {/* medical alerts */}
        {(patient.allergies || patient.chronicConditions || patient.notes) && (
          <div className="p-4 flex flex-wrap gap-3 bg-white">
            {patient.allergies && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-rose-700">حساسية</p>
                  <p className="text-xs font-bold text-rose-900">{patient.allergies}</p>
                </div>
              </div>
            )}
            {patient.chronicConditions && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                <Heart className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-amber-700">أمراض / تنبيهات طبية</p>
                  <p className="text-xs font-bold text-amber-900">{patient.chronicConditions}</p>
                </div>
              </div>
            )}
            {patient.notes && (
              <div className="flex items-start gap-2 rounded-xl bg-paper border border-line px-3 py-2">
                <Pencil className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-ink-soft">ملاحظات</p>
                  <p className="text-xs font-bold text-ink">{patient.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ---------- tabs ---------- */}
      <div className="flex gap-1 overflow-x-auto card !p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-colors ${
              tab === t.key ? "text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            {tab === t.key && (
              <motion.span layoutId="tab-bg" className="absolute inset-0 bg-gradient-to-l from-teal-500 to-primary rounded-xl shadow" />
            )}
            <t.icon className="w-4 h-4 relative" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ---------- tab content ---------- */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab === "chart" && <DentalChart patientId={id} />}
          {tab === "overview" && <TimelineTab patientId={id} />}
          {tab === "treatments" && <TreatmentsTab patientId={id} />}
          {tab === "xrays" && <XraysTab patientId={id} />}
          {tab === "invoices" && <InvoicesTab patientId={id} />}
          {tab === "appointments" && <AppointmentsTab patientId={id} onNew={() => setApptOpen(true)} />}
        </motion.div>
      </AnimatePresence>

      <PatientFormModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={loadPatient} patient={patient} />
      <AppointmentFormModal open={apptOpen} onClose={() => setApptOpen(false)} onSaved={() => {}} presetPatientId={id} />
      <InvoiceFormModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} onSaved={() => {}} patientId={id} />
    </div>
  );
}

/* ================= timeline ================= */
function TimelineTab({ patientId }: { patientId: number }) {
  const [appts, setAppts] = useState<AppointmentDto[] | null>(null);
  const [treats, setTreats] = useState<TreatmentDto[] | null>(null);
  const [invs, setInvs] = useState<InvoiceDto[] | null>(null);

  useEffect(() => {
    apiGet<AppointmentDto[]>(`/api/appointments?patientId=${patientId}`).then(setAppts).catch(() => setAppts([]));
    apiGet<TreatmentDto[]>(`/api/treatments?patientId=${patientId}`).then(setTreats).catch(() => setTreats([]));
    apiGet<InvoiceDto[]>(`/api/invoices?patientId=${patientId}`).then(setInvs).catch(() => setInvs([]));
  }, [patientId]);

  const events = useMemo(() => {
    const e: { date: string; icon: React.ReactNode; color: string; title: string; sub: string }[] = [];
    (treats ?? []).forEach((t) =>
      e.push({
        date: t.performedAt,
        icon: <Stethoscope className="w-3.5 h-3.5" />,
        color: "#0E7569",
        title: t.type + (t.tooth ? ` — سن ${t.tooth}` : ""),
        sub: `${TREATMENT_STATUS[t.status]?.label ?? t.status} · ${formatMoney(t.cost)}`,
      }),
    );
    (appts ?? []).forEach((a) =>
      e.push({
        date: a.date,
        icon: <CalendarClock className="w-3.5 h-3.5" />,
        color: "#B98A2F",
        title: `موعد: ${a.reason ?? "فحص"}`,
        sub: a.status,
      }),
    );
    (invs ?? []).forEach((v) =>
      e.push({
        date: v.createdAt,
        icon: <Receipt className="w-3.5 h-3.5" />,
        color: "#E0703F",
        title: `فاتورة ${v.number}`,
        sub: `${formatMoney(v.amount)} — ${v.status === "paid" ? "مدفوعة" : v.status === "partial" ? "جزئي" : "غير مدفوعة"}`,
      }),
    );
    return e.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appts, treats, invs]);

  if (!appts || !treats || !invs) return <Skeleton className="h-72" />;
  return (
    <div className="card p-6">
      <h3 className="text-sm font-black mb-5">سجل المريض الزمني</h3>
      {events.length === 0 ? (
        <Empty text="لا أحداث بعد" icon={<Heart className="w-10 h-10" />} />
      ) : (
        <div className="relative pr-5">
          <span className="absolute right-1.5 top-2 bottom-2 w-px bg-line" />
          {events.slice(0, 15).map((e, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative flex gap-3 pb-5 last:pb-0">
              <span className="absolute -right-5 mt-0.5 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center" style={{ borderColor: e.color, color: e.color }}>
                {e.icon}
              </span>
              <div className="flex-1 min-w-0 bg-white border border-line rounded-xl px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <p className="text-xs font-extrabold text-ink">{e.title}</p>
                  <p className="text-[10px] font-bold text-ink-soft">{formatDateTime(e.date)}</p>
                </div>
                <p className="text-[11px] font-bold text-ink-soft mt-0.5">{e.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= treatments ================= */
function TreatmentsTab({ patientId }: { patientId: number }) {
  const [rows, setRows] = useState<TreatmentDto[] | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TreatmentDto | null>(null);

  const load = useCallback(() => {
    apiGet<TreatmentDto[]>(`/api/treatments?patientId=${patientId}`).then(setRows).catch(() => setRows([]));
  }, [patientId]);
  useEffect(() => { load(); }, [load]);

  async function advance(t: TreatmentDto) {
    const next = t.status === "planned" ? "in_progress" : t.status === "in_progress" ? "done" : "done";
    await apiPatch(`/api/treatments/${t.id}`, { status: next });
    load();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black">خطط العلاج — {rows?.length ?? 0}</h3>
        <button onClick={() => setOpen(true)} className="btn-primary !py-2"><Plus className="w-4 h-4" strokeWidth={3} /> علاج جديد</button>
      </div>
      {!rows ? <Skeleton className="h-40" /> : rows.length === 0 ? (
        <Empty text="لا علاجات مسجلة لهذا المريض" icon={<Stethoscope className="w-10 h-10" />} />
      ) : (
        <div className="space-y-2.5">
          {rows.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3.5 hover:border-primary/30 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Stethoscope className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1 min-w-40">
                <p className="text-sm font-extrabold text-ink">
                  {t.type}
                  {t.tooth && <span className="ms-2 text-[10px] font-black bg-paper border border-line rounded-lg px-2 py-0.5" dir="ltr">#{t.tooth}</span>}
                </p>
                {t.description && <p className="text-[11px] text-ink-soft font-semibold mt-0.5">{t.description}</p>}
                <p className="text-[10px] text-ink-soft/70 font-bold mt-0.5">{formatDate(t.performedAt)}</p>
              </div>
              <span className="text-sm font-black text-ink">{formatMoney(t.cost)}</span>
              <TreatmentBadge status={t.status} />
              {t.status !== "done" && (
                <button onClick={() => advance(t)} className="btn-ghost !py-1.5 !px-2.5 !text-[10px]">
                  {t.status === "planned" ? "بدء التنفيذ" : "إنهاء العلاج"}
                </button>
              )}
              <button onClick={() => setToDelete(t)} className="w-7 h-7 rounded-lg text-ink-soft hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
      <TreatmentFormModal open={open} onClose={() => setOpen(false)} onSaved={load} patientId={patientId} />
      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await apiDelete(`/api/treatments/${toDelete.id}`); setToDelete(null); load(); } }}
        title="حذف العلاج"
        message={`حذف علاج «${toDelete?.type}»؟`}
      />
    </div>
  );
}

/* ================= xrays ================= */
function XraysTab({ patientId }: { patientId: number }) {
  const [rows, setRows] = useState<XrayDto[] | null>(null);
  const [open, setOpen] = useState(false);
  const [viewer, setViewer] = useState<XrayDto | null>(null);
  const [toDelete, setToDelete] = useState<XrayDto | null>(null);

  const load = useCallback(() => {
    apiGet<XrayDto[]>(`/api/xrays?patientId=${patientId}`).then(setRows).catch(() => setRows([]));
  }, [patientId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black">صور الأشعة — {rows?.length ?? 0}</h3>
        <button onClick={() => setOpen(true)} className="btn-primary !py-2"><Plus className="w-4 h-4" strokeWidth={3} /> إضافة أشعة</button>
      </div>
      {!rows ? <Skeleton className="h-40" /> : rows.length === 0 ? (
        <Empty text="لا صور أشعة محفوظة" icon={<Scan className="w-10 h-10" />} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {rows.map((x, i) => (
            <motion.div key={x.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="group relative rounded-2xl overflow-hidden border border-line bg-ink cursor-pointer" onClick={() => setViewer(x)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.url} alt={x.title} className="w-full aspect-[4/3] object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
                <p className="text-xs font-black text-white">{x.title}</p>
                <p className="text-[10px] font-bold text-white/60">{formatDate(x.createdAt)}{x.tooth ? ` · سن ${x.tooth}` : ""}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setToDelete(x); }}
                className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/50 text-white/80 hover:text-rose-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
      <XrayFormModal open={open} onClose={() => setOpen(false)} onSaved={load} patientId={patientId} />
      <Modal open={!!viewer} onClose={() => setViewer(null)} title={viewer?.title ?? ""} wide>
        {viewer && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewer.url} alt={viewer.title} className="w-full rounded-2xl" />
            {viewer.notes && <p className="mt-3 text-xs font-bold text-ink-soft">{viewer.notes}</p>}
            <p className="mt-1 text-[10px] font-bold text-ink-soft/60">{formatDateTime(viewer.createdAt)}{viewer.tooth ? ` · سن ${viewer.tooth}` : ""}</p>
          </div>
        )}
      </Modal>
      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await apiDelete(`/api/xrays/${toDelete.id}`); setToDelete(null); load(); } }}
        title="حذف صورة الأشعة"
        message={`حذف «${toDelete?.title}»؟`}
      />
    </div>
  );
}

/* ================= invoices ================= */
function InvoicesTab({ patientId }: { patientId: number }) {
  const [rows, setRows] = useState<InvoiceDto[] | null>(null);
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState<InvoiceDto | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [savingPay, setSavingPay] = useState(false);

  const load = useCallback(() => {
    apiGet<InvoiceDto[]>(`/api/invoices?patientId=${patientId}`).then(setRows).catch(() => setRows([]));
  }, [patientId]);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const billed = (rows ?? []).reduce((s, v) => s + v.amount, 0);
    const paid = (rows ?? []).reduce((s, v) => s + v.paidAmount, 0);
    return { billed, paid, due: billed - paid };
  }, [rows]);

  async function pay(full: boolean) {
    if (!paying) return;
    setSavingPay(true);
    try {
      const add = full ? paying.amount - paying.paidAmount : Number(payAmount) || 0;
      await apiPatch(`/api/invoices/${paying.id}`, { paidAmount: paying.paidAmount + add });
      setPaying(null);
      load();
    } finally {
      setSavingPay(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-black">الفواتير</h3>
        <button onClick={() => setOpen(true)} className="btn-primary !py-2"><Plus className="w-4 h-4" strokeWidth={3} /> فاتورة جديدة</button>
      </div>
      <div className="flex flex-wrap gap-4 mb-5 text-xs font-extrabold">
        <span className="text-ink">الإجمالي: {formatMoney(totals.billed)}</span>
        <span className="text-green-700">المحصل: {formatMoney(totals.paid)}</span>
        <span className="text-accent">المتبقي: {formatMoney(totals.due)}</span>
      </div>
      {!rows ? <Skeleton className="h-40" /> : rows.length === 0 ? (
        <Empty text="لا فواتير بعد" icon={<Receipt className="w-10 h-10" />} />
      ) : (
        <div className="space-y-2.5">
          {rows.map((v) => (
            <div key={v.id} className="rounded-xl border border-line bg-white p-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-orange-50 text-accent flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-36">
                  <p className="text-sm font-extrabold text-ink" dir="ltr">{v.number}</p>
                  <p className="text-[11px] text-ink-soft font-semibold">{v.treatment?.type ?? v.notes ?? "فاتورة عامة"} · {formatDate(v.createdAt)}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-ink">{formatMoney(v.amount)}</p>
                  <p className="text-[10px] font-bold text-green-700">مدفوع: {formatMoney(v.paidAmount)}</p>
                </div>
                <InvoiceBadge status={v.status} />
                {v.status !== "paid" && (
                  <button onClick={() => { setPaying(v); setPayAmount(String(v.amount - v.paidAmount)); }} className="btn-primary !py-1.5 !px-3 !text-[11px]">
                    <Wallet className="w-3.5 h-3.5" /> تسجيل دفعة
                  </button>
                )}
              </div>
              {/* progress */}
              <div className="mt-2.5 h-1.5 rounded-full bg-paper overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${v.amount ? Math.min((v.paidAmount / v.amount) * 100, 100) : 0}%` }}
                  className={`h-full rounded-full ${v.status === "paid" ? "bg-green-500" : "bg-gradient-to-l from-amber-400 to-accent"}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <InvoiceFormModal open={open} onClose={() => setOpen(false)} onSaved={load} patientId={patientId} />
      <Modal open={!!paying} onClose={() => setPaying(null)} title={`دفعة — ${paying?.number ?? ""}`}>
        {paying && (
          <div className="space-y-4">
            <div className="rounded-xl bg-paper border border-line p-3 text-xs font-bold text-ink-soft flex justify-between">
              <span>المتبقي: <b className="text-accent">{formatMoney(paying.amount - paying.paidAmount)}</b></span>
              <span>الإجمالي: {formatMoney(paying.amount)}</span>
            </div>
            <label className="label">مبلغ الدفعة (د.م.)</label>
            <input className="input" type="number" min="0" dir="ltr" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setPaying(null)}>إلغاء</button>
              <button className="btn-ghost !text-green-700 !border-green-200 hover:!bg-green-50" disabled={savingPay} onClick={() => pay(true)}>
                {savingPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} تسديد كامل
              </button>
              <button className="btn-primary" disabled={savingPay || !Number(payAmount)} onClick={() => pay(false)}>
                {savingPay && <Loader2 className="w-4 h-4 animate-spin" />} تسجيل
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ================= appointments ================= */
function AppointmentsTab({ patientId, onNew }: { patientId: number; onNew: () => void }) {
  const [rows, setRows] = useState<AppointmentDto[] | null>(null);
  const load = useCallback(() => {
    apiGet<AppointmentDto[]>(`/api/appointments?patientId=${patientId}`).then((r) => setRows([...r].reverse())).catch(() => setRows([]));
  }, [patientId]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: number, status: string) {
    await apiPatch(`/api/appointments/${id}`, { status });
    load();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black">سجل المواعيد</h3>
        <button onClick={onNew} className="btn-primary !py-2"><CalendarPlus className="w-4 h-4" /> حجز موعد</button>
      </div>
      {!rows ? <Skeleton className="h-40" /> : rows.length === 0 ? (
        <Empty text="لا مواعيد" icon={<CalendarClock className="w-10 h-10" />} />
      ) : (
        <div className="space-y-2.5">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3.5">
              <div className="w-12 text-center shrink-0 rounded-xl bg-paper border border-line py-1.5">
                <p className="text-sm font-black text-ink leading-4" dir="ltr">{formatTime(a.date)}</p>
                <p className="text-[9px] font-bold text-ink-soft">{formatDate(a.date, { day: "numeric", month: "short" })}</p>
              </div>
              <div className="flex-1 min-w-36">
                <p className="text-sm font-extrabold text-ink">{a.reason ?? "فحص"}</p>
                {a.notes && <p className="text-[11px] text-ink-soft font-semibold">{a.notes}</p>}
              </div>
              <AppointmentBadge status={a.status} />
              {(a.status === "scheduled" || a.status === "confirmed") && (
                <div className="flex gap-1.5">
                  {a.status === "scheduled" && (
                    <button onClick={() => setStatus(a.id, "confirmed")} className="text-[10px] font-extrabold text-primary bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg">تأكيد</button>
                  )}
                  <button onClick={() => setStatus(a.id, "done")} className="text-[10px] font-extrabold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg">تم</button>
                  <button onClick={() => setStatus(a.id, "cancelled")} className="text-[10px] font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg flex items-center gap-0.5"><X className="w-3 h-3" /> إلغاء</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
