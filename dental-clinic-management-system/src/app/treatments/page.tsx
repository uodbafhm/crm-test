"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleDollarSign, Clock3, Play, Plus, Search, Stethoscope, Trash2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/constants";
import type { TreatmentDto } from "@/lib/types";
import { patientName } from "@/lib/types";
import { Avatar, Empty, Skeleton, TreatmentBadge } from "@/components/ui";
import { TreatmentFormModal } from "@/components/forms";
import { Confirm } from "@/components/modal";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "planned", label: "مخطط" },
  { key: "in_progress", label: "قيد التنفيذ" },
  { key: "done", label: "مكتمل" },
];

export default function TreatmentsPage() {
  const [rows, setRows] = useState<TreatmentDto[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TreatmentDto | null>(null);

  const load = useCallback(() => {
    const statusQ = filter === "all" ? "" : `?status=${filter}`;
    apiGet<TreatmentDto[]>(`/api/treatments${statusQ}`).then(setRows).catch(() => setRows([]));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return rows ?? [];
    return (rows ?? []).filter((r) =>
      `${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""} ${r.type}`.includes(s),
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    return {
      planned: all.filter((r) => r.status === "planned").length,
      active: all.filter((r) => r.status === "in_progress").length,
      done: all.filter((r) => r.status === "done").length,
      revenue: all.filter((r) => r.status === "done").reduce((s, r) => s + r.cost, 0),
    };
  }, [rows]);

  async function advance(t: TreatmentDto) {
    const next = t.status === "planned" ? "in_progress" : "done";
    await apiPatch(`/api/treatments/${t.id}`, { status: next });
    load();
  }

  return (
    <div className="space-y-5">
      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Clock3 className="w-4.5 h-4.5" />, label: "علاجات مخططة", val: stats.planned, cls: "text-amber-600 bg-amber-50 border-amber-200" },
          { icon: <Play className="w-4.5 h-4.5" />, label: "قيد التنفيذ", val: stats.active, cls: "text-blue-700 bg-blue-50 border-blue-200" },
          { icon: <CheckCircle2 className="w-4.5 h-4.5" />, label: "مكتملة", val: stats.done, cls: "text-green-700 bg-green-50 border-green-200" },
          { icon: <CircleDollarSign className="w-4.5 h-4.5" />, label: "قيمة العلاجات المنجزة", val: stats.revenue, money: true, cls: "text-primary bg-teal-50 border-teal-200" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl border flex items-center justify-center ${s.cls}`}>{s.icon}</span>
            <div>
              <p className="text-[11px] font-bold text-ink-soft">{s.label}</p>
              <p className="text-lg font-black text-ink leading-6">{s.money ? formatMoney(s.val) : s.val}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="card p-5">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/60" />
            <input className="input !pr-9" placeholder="ابحث باسم المريض أو نوع العلاج..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-paper border border-line">
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
          <button onClick={() => setModalOpen(true)} className="btn-primary ms-auto !py-2">
            <Plus className="w-4 h-4" strokeWidth={3} /> علاج جديد
          </button>
        </div>

        {!rows ? (
          <Skeleton className="h-72" />
        ) : filtered.length === 0 ? (
          <Empty text="لا علاجات مطابقة" icon={<Stethoscope className="w-10 h-10" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-[11px] text-ink-soft border-b border-line">
                  <th className="text-right font-black py-3 ps-2">المريض</th>
                  <th className="text-right font-black py-3">العلاج</th>
                  <th className="text-right font-black py-3">السن</th>
                  <th className="text-right font-black py-3">التاريخ</th>
                  <th className="text-right font-black py-3">التكلفة</th>
                  <th className="text-right font-black py-3">الحالة</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.2) }}
                      className="border-b border-line/60 last:border-0 hover:bg-white/70 transition-colors group"
                    >
                      <td className="py-3 ps-2">
                        <Link href={`/patients/${t.patientId}`} className="flex items-center gap-2.5 group/l">
                          <Avatar first={t.patient?.firstName ?? "?"} last={t.patient?.lastName ?? ""} size="sm" />
                          <span className="font-extrabold text-ink group-hover/l:text-primary transition-colors">{patientName(t.patient)}</span>
                        </Link>
                      </td>
                      <td className="py-3">
                        <p className="font-extrabold">{t.type}</p>
                        {t.description && <p className="text-[11px] text-ink-soft font-semibold max-w-56 truncate">{t.description}</p>}
                      </td>
                      <td className="py-3">
                        {t.tooth ? <span className="text-[11px] font-black bg-paper border border-line rounded-lg px-2 py-1" dir="ltr">#{t.tooth}</span> : <span className="text-ink-soft/50 text-xs">—</span>}
                      </td>
                      <td className="py-3 text-xs font-bold text-ink-soft">{formatDate(t.performedAt, { day: "numeric", month: "short", year: undefined })}</td>
                      <td className="py-3 font-black">{formatMoney(t.cost)}</td>
                      <td className="py-3"><TreatmentBadge status={t.status} /></td>
                      <td className="py-3 pe-2">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.status !== "done" && (
                            <button onClick={() => advance(t)} className="text-[10px] font-extrabold text-primary bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors">
                              {t.status === "planned" ? "بدء" : "إنهاء"}
                            </button>
                          )}
                          <button onClick={() => setToDelete(t)} className="w-7 h-7 rounded-lg text-ink-soft hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TreatmentFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await apiDelete(`/api/treatments/${toDelete.id}`); setToDelete(null); load(); } }}
        title="حذف العلاج"
        message={`حذف علاج «${toDelete?.type}» للمريض ${patientName(toDelete?.patient)}؟`}
      />
    </div>
  );
}
