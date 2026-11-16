"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Banknote,
  Check,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/constants";
import type { InvoiceDto } from "@/lib/types";
import { patientName } from "@/lib/types";
import { Avatar, Empty, InvoiceBadge, Skeleton } from "@/components/ui";
import { InvoiceFormModal } from "@/components/forms";
import { Confirm, Modal } from "@/components/modal";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "unpaid", label: "غير مدفوعة" },
  { key: "partial", label: "جزئية" },
  { key: "paid", label: "مدفوعة" },
];

export default function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceDto[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [paying, setPaying] = useState<InvoiceDto | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [savingPay, setSavingPay] = useState(false);
  const [toDelete, setToDelete] = useState<InvoiceDto | null>(null);
  const [receipt, setReceipt] = useState<InvoiceDto | null>(null);

  const load = useCallback(() => {
    const q = filter === "all" ? "" : `?status=${filter}`;
    apiGet<InvoiceDto[]>(`/api/invoices${q}`).then(setRows).catch(() => setRows([]));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      total: all.reduce((s, v) => s + v.amount, 0),
      paid: all.reduce((s, v) => s + v.paidAmount, 0),
      due: all.reduce((s, v) => s + (v.amount - v.paidAmount), 0),
      pending: all.filter((v) => v.status !== "paid").length,
    };
  }, [rows]);

  async function pay(full: boolean) {
    if (!paying) return;
    setSavingPay(true);
    try {
      const add = full ? paying.amount - paying.paidAmount : Number(payAmount) || 0;
      await apiPatch(`/api/invoices/${paying.id}`, { paidAmount: Math.min(paying.paidAmount + add, paying.amount) });
      setPaying(null);
      load();
    } finally {
      setSavingPay(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Banknote className="w-4.5 h-4.5" />, label: "إجمالي المفوتر", val: formatMoney(stats.total), cls: "text-ink bg-paper border-line" },
          { icon: <BadgeCheck className="w-4.5 h-4.5" />, label: "المحصل", val: formatMoney(stats.paid), cls: "text-green-700 bg-green-50 border-green-200" },
          { icon: <Wallet className="w-4.5 h-4.5" />, label: "المتبقي للتحصيل", val: formatMoney(stats.due), cls: "text-accent bg-orange-50 border-orange-200" },
          { icon: <Receipt className="w-4.5 h-4.5" />, label: "فواتير معلقة", val: String(stats.pending), cls: "text-amber-700 bg-amber-50 border-amber-200" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl border flex items-center justify-center ${s.cls}`}>{s.icon}</span>
            <div>
              <p className="text-[11px] font-bold text-ink-soft">{s.label}</p>
              <p className="text-base sm:text-lg font-black text-ink leading-6">{s.val}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h3 className="text-sm font-black">سجل الفواتير — {rows?.length ?? 0}</h3>
          <div className="flex gap-1 p-1 rounded-xl bg-paper border border-line ms-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${filter === f.key ? "bg-white shadow-sm text-primary" : "text-ink-soft"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary !py-2">
            <Plus className="w-4 h-4" strokeWidth={3} /> فاتورة جديدة
          </button>
        </div>

        {!rows ? (
          <Skeleton className="h-72" />
        ) : rows.length === 0 ? (
          <Empty text="لا فواتير بهذه الحالة" icon={<Receipt className="w-10 h-10" />} />
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {rows.map((v, i) => (
                <motion.div
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.25) }}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3.5 hover:border-primary/30 transition-colors group"
                >
                  <span className="w-10 h-10 rounded-xl bg-orange-50 text-accent flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </span>
                  <div className="w-28">
                    <p className="text-xs font-black text-ink" dir="ltr">{v.number}</p>
                    <p className="text-[10px] font-bold text-ink-soft">{formatDate(v.createdAt, { day: "numeric", month: "short" })}</p>
                  </div>
                  <Link href={`/patients/${v.patientId}`} className="flex items-center gap-2 min-w-36 flex-1">
                    <Avatar first={v.patient?.firstName ?? "?"} last={v.patient?.lastName ?? ""} size="sm" />
                    <div>
                      <p className="text-sm font-extrabold text-ink hover:text-primary transition-colors">{patientName(v.patient)}</p>
                      <p className="text-[10px] font-bold text-ink-soft truncate max-w-52">{v.treatment?.type ?? v.notes ?? "—"}</p>
                    </div>
                  </Link>
                  <div className="w-36">
                    <div className="flex justify-between text-[10px] font-extrabold mb-1">
                      <span className="text-ink">{formatMoney(v.amount)}</span>
                      <span className="text-green-700">{formatMoney(v.paidAmount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-paper overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${v.status === "paid" ? "bg-green-500" : "bg-gradient-to-l from-amber-400 to-accent"}`}
                        style={{ width: `${v.amount ? Math.min((v.paidAmount / v.amount) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <InvoiceBadge status={v.status} />
                  <div className="flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    {v.status !== "paid" && (
                      <button
                        onClick={() => { setPaying(v); setPayAmount(String(v.amount - v.paidAmount)); }}
                        className="btn-primary !py-1.5 !px-3 !text-[10px]"
                      >
                        <Wallet className="w-3.5 h-3.5" /> دفعة
                      </button>
                    )}
                    <button onClick={() => setReceipt(v)} className="w-8 h-8 rounded-lg border border-line text-ink-soft hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors" title="عرض / طباعة">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setToDelete(v)} className="w-8 h-8 rounded-lg border border-line text-ink-soft hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-colors" title="حذف">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <InvoiceFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />

      {/* pay modal */}
      <Modal open={!!paying} onClose={() => setPaying(null)} title={`تسجيل دفعة — ${paying?.number ?? ""}`}>
        {paying && (
          <div className="space-y-4">
            <div className="rounded-xl bg-paper border border-line p-3 text-xs font-bold text-ink-soft flex justify-between">
              <span>المريض: <b className="text-ink">{patientName(paying.patient)}</b></span>
              <span>المتبقي: <b className="text-accent">{formatMoney(paying.amount - paying.paidAmount)}</b></span>
            </div>
            <div>
              <label className="label">مبلغ الدفعة (د.م.)</label>
              <input className="input" type="number" min="0" dir="ltr" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
              <button className="btn-ghost" onClick={() => setPaying(null)}>إلغاء</button>
              <button className="btn-ghost !text-green-700 !border-green-200 hover:!bg-green-50" disabled={savingPay} onClick={() => pay(true)}>
                {savingPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} تسديد كامل
              </button>
              <button className="btn-primary" disabled={savingPay || !Number(payAmount)} onClick={() => pay(false)}>تسجيل الدفعة</button>
            </div>
          </div>
        )}
      </Modal>

      {/* printable receipt */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="معاينة الفاتورة" wide>
        {receipt && (
          <div>
            <div id="receipt-print" className="rounded-2xl border border-line p-6 bg-white">
              <div className="flex items-start justify-between pb-5 border-b-2 border-dashed border-line">
                <div>
                  <p className="text-lg font-black text-primary">دينتا برو — عيادة الأسنان</p>
                  <p className="text-[11px] font-bold text-ink-soft mt-1">د. ياسين العلوي · طب الأسنان العام</p>
                  <p className="text-[11px] font-bold text-ink-soft" dir="ltr">+212 6 00 00 00 00</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black" dir="ltr">{receipt.number}</p>
                  <p className="text-[11px] font-bold text-ink-soft">{formatDate(receipt.createdAt)}</p>
                </div>
              </div>
              <div className="py-4 border-b border-line">
                <p className="text-[11px] font-black text-ink-soft mb-1">المريض</p>
                <p className="text-base font-black">{patientName(receipt.patient)}</p>
                {receipt.patient?.phone && <p className="text-[11px] font-bold text-ink-soft" dir="ltr">{receipt.patient.phone}</p>}
              </div>
              <table className="w-full text-sm py-4">
                <thead>
                  <tr className="text-[11px] text-ink-soft border-b border-line">
                    <th className="text-right py-2 font-black">البيان</th>
                    <th className="text-left py-2 font-black">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 font-extrabold">{receipt.treatment?.type ?? receipt.notes ?? "خدمات طب أسنان"}{receipt.treatment?.tooth ? ` — سن ${receipt.treatment.tooth}` : ""}</td>
                    <td className="py-3 text-left font-black">{formatMoney(receipt.amount)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="pt-4 border-t-2 border-dashed border-line space-y-1.5">
                <div className="flex justify-between text-sm font-bold"><span className="text-ink-soft">الإجمالي</span><span>{formatMoney(receipt.amount)}</span></div>
                <div className="flex justify-between text-sm font-bold"><span className="text-green-700">المدفوع</span><span className="text-green-700">{formatMoney(receipt.paidAmount)}</span></div>
                <div className="flex justify-between text-base font-black"><span className="text-accent">المتبقي</span><span className="text-accent">{formatMoney(receipt.amount - receipt.paidAmount)}</span></div>
              </div>
              <p className="text-center text-[10px] font-bold text-ink-soft mt-6">شكراً لثقتكم — نتمنى لكم ابتسامة صحية دائمة</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-ghost" onClick={() => setReceipt(null)}>إغلاق</button>
              <button className="btn-primary" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> طباعة
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await apiDelete(`/api/invoices/${toDelete.id}`); setToDelete(null); load(); } }}
        title="حذف الفاتورة"
        message={`حذف الفاتورة ${toDelete?.number} نهائياً؟`}
      />
    </div>
  );
}
