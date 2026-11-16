"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/constants";
import type { AppointmentDto } from "@/lib/types";
import { patientName } from "@/lib/types";
import { Avatar } from "@/components/ui";

/** Pending online booking requests from the public /book page — kept separate from the walk-in queue */
export function BookingRequests() {
  const [rows, setRows] = useState<AppointmentDto[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    apiGet<AppointmentDto[]>("/api/appointments?status=pending")
      .then((r) => setRows(r.filter((a) => new Date(a.date).getTime() >= Date.now() - 24 * 3600_000)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, [load]);

  async function decide(id: number, status: "confirmed" | "cancelled") {
    setBusy(id);
    try {
      await apiPatch(`/api/appointments/${id}`, { status });
      setRows((x) => x.filter((a) => a.id !== id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence>
      {rows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -14, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-3xl border-2 border-violet-200 bg-gradient-to-l from-violet-50 to-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md pulse-ring">
                <Globe className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-black text-violet-950">
                  {rows.length} طلب{rows.length > 1 ? "ات" : ""} حجز جديد من الموقع
                </p>
                <p className="text-[10px] font-bold text-violet-600">
                  منفصلة تماماً عن طابور الانتظار — قد تتطلب تأكيداً هاتفياً
                </p>
              </div>
              <Link href="/calendar" className="text-[11px] font-extrabold text-violet-700 hover:underline">
                عرض في التقويم
              </Link>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {rows.map((a) => (
                  <motion.div
                    key={a.id}
                    layout
                    exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-white border border-violet-100 px-4 py-3"
                  >
                    <Avatar first={a.patient?.firstName ?? "?"} last={a.patient?.lastName ?? ""} size="sm" />
                    <div className="flex-1 min-w-36">
                      <Link href={`/patients/${a.patientId}`} className="text-sm font-extrabold text-ink hover:text-violet-700 transition-colors">
                        {patientName(a.patient)}
                      </Link>
                      <p className="text-[11px] font-bold text-ink-soft">
                        {a.reason} · <span dir="ltr">{a.patient?.phone}</span>
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-violet-900">{formatDate(a.date, { weekday: "long" })}</p>
                      <p className="text-[11px] font-bold text-violet-600" dir="ltr">{formatTime(a.date)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => decide(a.id, "confirmed")}
                        disabled={busy === a.id}
                        className="inline-flex items-center gap-1 rounded-xl bg-violet-600 text-white text-[11px] font-extrabold px-3.5 py-2 hover:bg-violet-700 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} /> قبول الموعد
                      </button>
                      <button
                        onClick={() => decide(a.id, "cancelled")}
                        disabled={busy === a.id}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 text-[11px] font-extrabold px-3 py-2 hover:bg-rose-50 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> رفض
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
