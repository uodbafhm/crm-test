"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  FolderHeart,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet } from "@/lib/api";
import { age, formatMoney } from "@/lib/constants";
import type { PatientDto } from "@/lib/types";
import { Avatar, Empty, Skeleton } from "@/components/ui";
import { PatientFormModal } from "@/components/forms";
import { Confirm } from "@/components/modal";

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientDto[] | null>(null);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PatientDto | null>(null);

  const load = useCallback((query?: string) => {
    apiGet<PatientDto[]>(`/api/patients${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setPatients)
      .catch(() => setPatients([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  async function confirmDelete() {
    if (!toDelete) return;
    await apiDelete(`/api/patients/${toDelete.id}`);
    setToDelete(null);
    load(q);
  }

  return (
    <div>
      {/* toolbar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft/60" />
          <input
            className="input !pr-10 !py-2.5 !rounded-xl !bg-white"
            placeholder="ابحث بالاسم أو الهاتف..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="text-xs font-bold text-ink-soft">
          {patients ? `${patients.length} ملف` : "..."}
        </p>
        <button onClick={() => setModalOpen(true)} className="btn-primary ms-auto">
          <Plus className="w-4 h-4" strokeWidth={3} /> مريض جديد
        </button>
      </motion.div>

      {!patients ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="card">
          <Empty text="لا يوجد مرضى مطابقون — أضف ملفاً جديداً" icon={<UserRound className="w-12 h-12" />} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {patients.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="card p-5 relative group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                <Link href={`/patients/${p.id}`} className="block">
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar first={p.firstName} last={p.lastName} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-ink truncate">
                        {p.firstName} {p.lastName}
                      </h3>
                      <p className="text-[11px] text-ink-soft font-bold" dir="ltr">{p.phone}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {p.gender && (
                          <span className="text-[9px] font-bold bg-paper border border-line rounded-full px-2 py-0.5 text-ink-soft">
                            {p.gender === "female" ? "أنثى" : "ذكر"}
                            {age(p.birthDate) != null ? ` · ${age(p.birthDate)} سنة` : ""}
                          </span>
                        )}
                        {p.allergies && (
                          <span className="text-[9px] font-bold bg-rose-50 text-rose-600 rounded-full px-2 py-0.5 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> حساسية
                          </span>
                        )}
                        {p.chronicConditions && (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                            مرض مزمن
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-line/70">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-ink-soft">
                      <FolderHeart className="w-3.5 h-3.5 text-primary" /> الملف الطبي
                    </span>
                    <span className={`text-[11px] font-black ${p.balanceDue ? "text-accent" : "text-green-700"}`}>
                      {p.balanceDue ? `${formatMoney(p.balanceDue)} مستحقة` : "لا مستحقات"}
                    </span>
                  </div>
                </Link>
                <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`tel:${p.phone}`}
                    className="w-7 h-7 rounded-lg bg-white border border-line flex items-center justify-center text-ink-soft hover:text-primary hover:border-primary/40"
                    title="اتصال"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setToDelete(p)}
                    className="w-7 h-7 rounded-lg bg-white border border-line flex items-center justify-center text-ink-soft hover:text-rose-600 hover:border-rose-200"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <PatientFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => load(q)} />
      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="حذف المريض"
        message={`سيتم حذف ملف ${toDelete?.firstName ?? ""} ${toDelete?.lastName ?? ""} مع كل مواعيده وعلاجاته وفواتيره. لا يمكن التراجع.`}
      />
    </div>
  );
}
