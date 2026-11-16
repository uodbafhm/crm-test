"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { playChime } from "@/lib/sound";
import type { QueueStatusDto } from "@/lib/types";
import { patientName } from "@/lib/types";

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="text-left" dir="ltr">
      <p className="text-4xl font-black text-white tabular-nums leading-9">
        {t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-sm font-bold text-teal-300/80">
        {new Intl.DateTimeFormat("ar-MA", { weekday: "long", day: "numeric", month: "long" }).format(t)}
      </p>
    </div>
  );
}

export default function QueueDisplayPage() {
  const [data, setData] = useState<QueueStatusDto | null>(null);
  const prevCurrent = useRef<number | null>(null);
  const firstLoad = useRef(true);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const d = await apiGet<QueueStatusDto>("/api/queue");
        if (!mounted) return;
        const curId = d.current?.id ?? null;
        if (!firstLoad.current && curId !== null && curId !== prevCurrent.current) {
          playChime();
          setFlash((f) => f + 1);
        }
        firstLoad.current = false;
        prevCurrent.current = curId;
        setData(d);
      } catch {
        /* keep screen alive */
      }
    }
    poll();
    const i = setInterval(poll, 5_000);
    return () => {
      mounted = false;
      clearInterval(i);
    };
  }, []);

  const current = data?.current ?? null;
  const nextThree = (data?.waiting ?? []).slice(0, 3);

  return (
    <div className="min-h-screen bg-pine pine-pattern text-white flex flex-col overflow-hidden">
      {/* ambient glows */}
      <div className="fixed -top-40 right-1/4 w-[34rem] h-[34rem] rounded-full bg-primary/25 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full bg-gold/15 blur-3xl pointer-events-none" />

      {/* header */}
      <header className="relative flex items-center justify-between px-8 sm:px-12 py-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
            <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
              <path d="M24 6c-6.5 0-8.2 3.4-12.2 3.4C6.6 9.4 4 13.8 4 18.5c0 9.2 5 22.7 8 22.7 3.4 0 1.6-12.2 6-12.2h12c4.4 0 2.6 12.2 6 12.2 3 0 8-13.5 8-22.7 0-4.7-2.6-9.1-7.8-9.1C32.2 9.4 30.5 6 24 6Z" fill="#2DD4BF" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-black">دينتا برو</p>
            <p className="text-xs font-bold text-teal-300/80">عيادة الأسنان — قاعة الانتظار</p>
          </div>
        </div>
        <Clock />
      </header>

      {/* body */}
      <main className="relative flex-1 grid lg:grid-cols-[1.4fr_1fr] gap-8 px-8 sm:px-12 py-10 items-center">
        {/* current */}
        <div className="text-center lg:text-right">
          <p className="inline-flex items-center gap-2 text-sm font-black text-teal-300 tracking-wide mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            نرحب بكم — الرجاء انتظار دوركم
          </p>

          <AnimatePresence mode="popLayout">
            {current ? (
              <motion.div
                key={`${current.id}-${flash}`}
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <p className="text-2xl font-black text-white/60 mb-2">الرقم الحالي</p>
                <motion.p
                  key={flash}
                  animate={flash ? { scale: [1, 1.12, 1] } : {}}
                  transition={{ duration: 0.8 }}
                  className="font-black text-[9rem] sm:text-[12rem] leading-none bg-gradient-to-b from-teal-200 to-primary bg-clip-text text-transparent"
                  dir="ltr"
                >
                  #{String(current.ticketNumber).padStart(2, "0")}
                </motion.p>
                <p className="mt-4 text-3xl sm:text-4xl font-black text-white">
                  السيد(ة) {patientName(current.patient)}
                </p>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-6 py-2.5 text-lg font-black text-amber-300">
                  <Bell className="w-5 h-5" />
                  {current.status === "serving" ? "لدى الطبيب الآن" : "المرجو التوجه إلى العيادة"}
                </p>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20">
                <p className="text-5xl font-black text-white/40">العيادة متاحة</p>
                <p className="mt-4 text-xl font-bold text-white/50">لا يوجد طابور حالياً — مرحباً بكم</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* next numbers */}
        <div className="space-y-4">
          <p className="text-sm font-black text-white/50 tracking-wide text-center lg:text-right">الأرقام التالية</p>
          <AnimatePresence mode="popLayout">
            {nextThree.length === 0 ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center lg:text-right text-lg font-bold text-white/30 py-8">
                لا أحد في الانتظار
              </motion.p>
            ) : (
              nextThree.map((e, i) => (
                <motion.div
                  layout
                  key={e.id}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 240, damping: 24 }}
                  className={`rounded-3xl border p-6 flex items-center gap-5 ${
                    i === 0 ? "bg-white/12 border-amber-400/40 shadow-2xl shadow-accent/10" : "bg-white/6 border-white/10"
                  }`}
                >
                  <span className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${i === 0 ? "bg-gradient-to-br from-accent to-amber-500 text-white" : "bg-white/10 text-teal-200"}`} dir="ltr">
                    #{String(e.ticketNumber).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-black truncate">{patientName(e.patient)}</p>
                    <p className="text-xs font-bold text-white/50 truncate">{e.reason}</p>
                  </div>
                  {i === 0 && <span className="text-[11px] font-black text-amber-300 bg-amber-400/15 px-3 py-1.5 rounded-full">استعد</span>}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* footer ticker */}
      <footer className="relative border-t border-white/10 px-12 py-4 flex items-center gap-4 text-white/40 text-xs font-bold">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        دينتا برو — نظام إدارة طابور الانتظار · شكراً لصبركم
        <span className="ms-auto font-black text-white/25" dir="ltr">DENTAL PRO QUEUE</span>
      </footer>
    </div>
  );
}
