"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  CheckCircle2,
  ListOrdered,
  LogOut,
  Megaphone,
  MonitorPlay,
  Play,
  Ticket,
  Timer,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { playChime } from "@/lib/sound";
import { QUEUE_STATUS } from "@/lib/constants";
import type { QueueEntryDto, QueueStatusDto } from "@/lib/types";
import { patientName, waitingMinutes } from "@/lib/types";
import { Avatar, Empty, Skeleton } from "@/components/ui";
import { AddWalkinModal } from "@/components/queue-modal";
import { Confirm } from "@/components/modal";

function useNow(stepMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(i);
  }, [stepMs]);
  return now;
}

export default function QueuePage() {
  const [data, setData] = useState<QueueStatusDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [calling, setCalling] = useState(false);
  const [toDelete, setToDelete] = useState<QueueEntryDto | null>(null);
  const now = useNow();

  const load = useCallback(() => {
    apiGet<QueueStatusDto>("/api/queue").then(setData).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 20_000); // keep front-desk & doctor in sync
    return () => clearInterval(i);
  }, [load]);

  async function callNext() {
    setCalling(true);
    try {
      const res = await apiPost<{ called: QueueEntryDto | null }>("/api/queue/next", {});
      if (res.called) playChime();
      load();
    } finally {
      setCalling(false);
    }
  }

  async function setStatus(id: number, status: string, sound = false) {
    await apiPatch(`/api/queue/${id}`, { status });
    if (sound) playChime();
    load();
  }

  async function postpone(id: number) {
    await apiPatch(`/api/queue/${id}`, { action: "postpone" });
    load();
  }

  const current = data?.current ?? null;
  const waiting = data?.waiting ?? [];

  return (
    <div className="space-y-5">
      {/* ---------- top board ---------- */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-pine pine-pattern text-white p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          {/* current patient */}
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] font-black text-teal-300 tracking-wide mb-2">الآن عند الطبيب</p>
              {current ? (
                <div className="flex items-center gap-4">
                  <motion.div
                    key={current.ticketNumber}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-300 to-primary flex flex-col items-center justify-center shadow-2xl border border-white/20"
                  >
                    <span className="text-[10px] font-black text-teal-950/70">تذكرة</span>
                    <span className="text-4xl font-black text-white leading-8" dir="ltr">#{current.ticketNumber}</span>
                  </motion.div>
                  <div>
                    <p className="text-xl font-black">{patientName(current.patient)}</p>
                    <p className="text-xs font-bold text-white/60 mt-1">{current.reason}</p>
                    <span className={`inline-flex items-center gap-1 mt-2 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${current.status === "serving" ? "bg-teal-400/20 text-teal-200" : "bg-blue-400/20 text-blue-200"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {QUEUE_STATUS[current.status]?.label}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-black text-white/70">لا أحد حالياً — الكرسي فارغ</p>
              )}
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-col gap-3 items-stretch">
            <button
              onClick={callNext}
              disabled={calling || (!current && waiting.length === 0)}
              className="relative inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-accent to-amber-500 text-white font-black text-base px-8 py-4 shadow-xl shadow-accent/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Megaphone className="w-5 h-5" />
              {current
                ? waiting.length > 0
                  ? "إنهاء و نداء التالي"
                  : "إنهاء الموعد الحالي"
                : "نداء التالي"}
              {waiting.length > 0 && (
                <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white text-accent text-xs font-black flex items-center justify-center shadow" dir="ltr">
                  {waiting.length}
                </span>
              )}
            </button>
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-extrabold px-3 py-2.5 hover:bg-white/15 transition-colors">
                <Ticket className="w-4 h-4 text-amber-300" /> Walk-in جديد
              </button>
              <Link href="/queue/display" target="_blank" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-extrabold px-3 py-2.5 hover:bg-white/15 transition-colors">
                <MonitorPlay className="w-4 h-4 text-teal-300" /> شاشة العرض
              </Link>
            </div>
          </div>
        </div>

        {/* quick actions for current */}
        {current && (
          <div className="relative flex gap-2 mt-6 flex-wrap">
            {current.status === "called" && (
              <button onClick={() => setStatus(current.id, "serving")} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-400/20 border border-teal-300/30 text-teal-100 text-xs font-extrabold px-4 py-2 hover:bg-teal-400/30 transition-colors">
                <Play className="w-3.5 h-3.5" /> بدء الفحص
              </button>
            )}
            <button onClick={() => setStatus(current.id, "done")} className="inline-flex items-center gap-1.5 rounded-xl bg-green-400/20 border border-green-300/30 text-green-100 text-xs font-extrabold px-4 py-2 hover:bg-green-400/30 transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" /> إنهاء الموعد
            </button>
            {current.status === "called" && (
              <button onClick={() => setStatus(current.id, "waiting")} className="inline-flex items-center gap-1.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-xs font-extrabold px-4 py-2 hover:bg-white/15 transition-colors">
                إرجاع للطابور
              </button>
            )}
            <Link href={`/patients/${current.patientId}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-xs font-extrabold px-4 py-2 hover:bg-white/15 transition-colors">
              فتح الملف الطبي
            </Link>
          </div>
        )}

        {/* strip stats */}
        {data && (
          <div className="relative flex gap-6 mt-6 pt-5 border-t border-white/10 text-xs font-bold text-white/70 flex-wrap">
            <span className="flex items-center gap-1.5"><Timer className="w-4 h-4 text-amber-300" /> في الانتظار: <b className="text-white">{data.waitingCount}</b></span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-300" /> تم استقبالهم اليوم: <b className="text-white">{data.doneToday.length}</b></span>
            <span className="flex items-center gap-1.5"><ListOrdered className="w-4 h-4 text-white/50" /> آخر تذكرة اليوم: <b className="text-white" dir="ltr">#{data.entries.length}</b></span>
          </div>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* ---------- waiting list ---------- */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-black">
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center"><Timer className="w-4 h-4" /></span>
              قائمة الانتظار — حسب ترتيب الوصول
            </h2>
            <button onClick={() => setModalOpen(true)} className="btn-primary !py-2 !text-xs">
              <Ticket className="w-4 h-4" /> تسجيل مريض
            </button>
          </div>

          {!data ? (
            <Skeleton className="h-60" />
          ) : waiting.length === 0 ? (
            <Empty text="الطابور فارغ — لا أحد في الانتظار" icon={<CheckCircle2 className="w-12 h-12" />} />
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {waiting.map((e, i) => (
                  <motion.div
                    layout
                    key={e.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3.5 bg-white transition-colors ${i === 0 ? "border-accent/50 shadow-sm" : "border-line"}`}
                  >
                    <div className="relative">
                      <span className={`w-14 h-12 rounded-xl flex flex-col items-center justify-center font-black ${i === 0 ? "bg-gradient-to-br from-accent to-amber-500 text-white shadow-md" : "bg-paper border border-line text-ink"}`}>
                        <span className="text-[8px] font-black opacity-70 leading-none">{i === 0 ? "التالي" : `رقم`}</span>
                        <span className="text-lg leading-5" dir="ltr">#{e.ticketNumber}</span>
                      </span>
                      {i === 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent pulse-ring" />}
                    </div>
                    <Avatar first={e.patient?.firstName ?? "?"} last={e.patient?.lastName ?? ""} size="sm" />
                    <div className="flex-1 min-w-36">
                      <Link href={`/patients/${e.patientId}`} className="text-sm font-extrabold text-ink hover:text-primary transition-colors">
                        {patientName(e.patient)}
                      </Link>
                      <p className="text-[10px] font-bold text-ink-soft">{e.reason}</p>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1" key={now}>
                      <Timer className="w-3 h-3" /> ينتظر منذ {waitingMinutes(e)} د
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setStatus(e.id, "called", true)}
                        title="نداء هذا المريض"
                        className="h-8 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-extrabold flex items-center gap-1 transition-colors"
                      >
                        <Megaphone className="w-3.5 h-3.5" /> نداء
                      </button>
                      <button
                        onClick={() => postpone(e.id)}
                        title="تأجيل إلى آخر الطابور"
                        className="w-8 h-8 rounded-lg bg-paper border border-line text-ink-soft hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setStatus(e.id, "skipped")}
                        title="غادر بدون انتظار"
                        className="w-8 h-8 rounded-lg bg-paper border border-line text-ink-soft hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setToDelete(e)}
                        title="حذف من الطابور"
                        className="w-8 h-8 rounded-lg bg-paper border border-line text-ink-soft hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* ---------- side: done + skipped ---------- */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="space-y-4">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-black mb-4">
              <span className="w-7 h-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></span>
              تم استقبالهم اليوم
            </h2>
            {!data ? <Skeleton className="h-32" /> : data.doneToday.length === 0 ? (
              <p className="text-xs font-bold text-ink-soft text-center py-6">لم يُستقبل أحد بعد</p>
            ) : (
              <div className="space-y-2">
                {data.doneToday.map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5 rounded-xl bg-green-50/60 border border-green-100 px-3 py-2">
                    <span className="text-[11px] font-black text-green-800 w-10" dir="ltr">#{e.ticketNumber}</span>
                    <span className="text-xs font-extrabold text-ink flex-1 truncate">{patientName(e.patient)}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {data && data.entries.filter((e) => e.status === "skipped").length > 0 && (
            <div className="card p-5">
              <h2 className="flex items-center gap-2 text-sm font-black mb-3">
                <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center"><LogOut className="w-4 h-4" /></span>
                غادروا بدون خدمة
              </h2>
              <div className="space-y-2">
                {data.entries.filter((e) => e.status === "skipped").map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5 rounded-xl bg-rose-50/60 border border-rose-100 px-3 py-2">
                    <span className="text-[11px] font-black text-rose-700 w-10" dir="ltr">#{e.ticketNumber}</span>
                    <span className="text-xs font-extrabold text-ink flex-1 truncate">{patientName(e.patient)}</span>
                    <button
                      onClick={() => postpone(e.id)}
                      className="text-[10px] font-extrabold text-primary hover:underline"
                    >
                      إرجاع للطابور
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5 bg-gradient-to-br from-teal-50 to-white border-teal-100">
            <p className="text-xs font-black text-primary mb-1.5">كيف يعمل الطابور؟</p>
            <ul className="text-[11px] font-bold text-ink-soft space-y-1.5 leading-5">
              <li>· المريض القادم بلا موعد يأخذ رقماً حسب ترتيب الوصول</li>
              <li>· «نداء التالي» تُنهي الجاري وتنادي على الأول في الطابور</li>
              <li>· شاشة العرض تعرض الرقم الحالي في قاعة الانتظار</li>
              <li className="pt-2 mt-1 border-t border-teal-100 text-violet-700">
                · هذا الطابور خاص بالحاضرين في العيادة فقط — حجوزات الموقع
                (<span dir="ltr">/book</span>) تصل كطلبات مستقلة في لوحة التحكم والتقويم
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      <AddWalkinModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await apiDelete(`/api/queue/${toDelete.id}`);
            setToDelete(null);
            load();
          }
        }}
        title="حذف من الطابور"
        message={`حذف التذكرة #${toDelete?.ticketNumber} الخاصة بـ ${patientName(toDelete?.patient)} من طابور اليوم؟`}
      />
    </div>
  );
}
