"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  Rows3,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import {
  APPOINTMENT_STATUS,
  formatDate,
  formatTime,
  monthName,
  pad2,
  weekdayName,
} from "@/lib/constants";
import type { AppointmentDto } from "@/lib/types";
import { patientName } from "@/lib/types";
import { AppointmentBadge, Avatar, Empty, Skeleton } from "@/components/ui";
import { AppointmentFormModal } from "@/components/forms";
import { Confirm } from "@/components/modal";

const DAY_START = 8;
const DAY_END = 20;
const HOUR_PX = 64;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function weekStart(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Chip({ a, onClick }: { a: AppointmentDto; onClick: () => void }) {
  const s = APPOINTMENT_STATUS[a.status] ?? APPOINTMENT_STATUS.scheduled;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full text-right rounded-md px-1.5 py-0.5 text-[9.5px] font-bold flex items-center gap-1 hover:brightness-95 transition-all"
      style={{ backgroundColor: s.bg, color: s.color }}
      title={`${patientName(a.patient)} — ${a.reason ?? ""}`}
    >
      <span className="truncate">{formatTime(a.date)} {patientName(a.patient)}</span>
    </button>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [appointments, setAppointments] = useState<AppointmentDto[] | null>(null);
  const [selected, setSelected] = useState<Date>(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [toDelete, setToDelete] = useState<AppointmentDto | null>(null);

  const range = useMemo(() => {
    if (view === "month") {
      const start = addDays(startOfMonth(cursor), -10);
      const end = addDays(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), 10);
      return { from: start, to: end };
    }
    const start = weekStart(cursor);
    return { from: start, to: addDays(start, 7) };
  }, [cursor, view]);

  const load = useCallback(() => {
    apiGet<AppointmentDto[]>(
      `/api/appointments?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`,
    )
      .then(setAppointments)
      .catch(() => setAppointments([]));
  }, [range]);

  useEffect(() => {
    setAppointments(null);
    load();
  }, [load]);

  const dayAppts = useMemo(
    () =>
      (appointments ?? []).filter((a) => sameDay(new Date(a.date), selected)),
    [appointments, selected],
  );

  function shift(dir: 1 | -1) {
    setCursor((c) =>
      view === "month"
        ? new Date(c.getFullYear(), c.getMonth() + dir, 1)
        : addDays(c, dir * 7),
    );
  }

  async function setStatus(id: number, status: string) {
    await apiPatch(`/api/appointments/${id}`, { status });
    load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await apiDelete(`/api/appointments/${toDelete.id}`);
    setToDelete(null);
    load();
  }

  // month cells
  const monthCells = useMemo(() => {
    const first = startOfMonth(cursor);
    const start = weekStart(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = weekStart(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const weekHeader = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("ar-MA", { weekday: "short" });
    const start = weekStart(new Date());
    return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(start, i)));
  }, []);

  const title =
    view === "month"
      ? monthName(cursor)
      : `${formatDate(weekStart(cursor), { day: "numeric", month: "short" })} — ${formatDate(addDays(weekStart(cursor), 6), { day: "numeric", month: "short" })}`;

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      {/* -------- calendar -------- */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-4 sm:p-5 flex-1 min-w-0">
        {/* header */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-black text-ink flex-1 capitalize">{title}</h2>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-paper border border-line">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${view === "month" ? "bg-white shadow-sm text-primary" : "text-ink-soft"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> شهر
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${view === "week" ? "bg-white shadow-sm text-primary" : "text-ink-soft"}`}
            >
              <Rows3 className="w-3.5 h-3.5" /> أسبوع
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => shift(-1)} className="btn-ghost !p-2" aria-label="السابق">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setCursor(new Date()); setSelected(new Date()); }}
              className="btn-ghost"
            >
              اليوم
            </button>
            <button onClick={() => shift(1)} className="btn-ghost !p-2" aria-label="التالي">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { setModalDate(null); setModalOpen(true); }}
            className="btn-primary !py-2"
          >
            <CalendarPlus className="w-4 h-4" /> موعد
          </button>
        </div>

        {!appointments ? (
          <Skeleton className="h-[480px] w-full" />
        ) : view === "month" ? (
          /* -------- month grid -------- */
          <div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekHeader.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-black text-ink-soft/70 py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((d, i) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const today = sameDay(d, new Date());
                const sel = sameDay(d, selected);
                const list = appointments.filter((a) => sameDay(new Date(a.date), d));
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(d)}
                    onDoubleClick={() => {
                      setModalDate(d);
                      setModalOpen(true);
                    }}
                    className={`relative min-h-24 rounded-xl border p-1.5 text-right transition-all align-top ${
                      sel
                        ? "border-primary bg-teal-50/70 ring-2 ring-primary/20"
                        : today
                          ? "border-gold/50 bg-amber-50/50"
                          : "border-line/70 bg-white hover:border-primary/40"
                    } ${!inMonth ? "opacity-40" : ""}`}
                  >
                    <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-[11px] font-black ${today ? "bg-primary text-white" : "text-ink"}`}>
                      {d.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {list.slice(0, 3).map((a) => (
                        <Chip key={a.id} a={a} onClick={() => setSelected(d)} />
                      ))}
                      {list.length > 3 && (
                        <p className="text-[9px] font-bold text-ink-soft px-1">+{list.length - 3} أخرى</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* -------- week grid -------- */
          <div className="overflow-x-auto">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line">
                <div />
                {weekDays.map((d, i) => {
                  const today = sameDay(d, new Date());
                  return (
                    <button key={i} onClick={() => setSelected(d)} className="py-2 text-center border-s border-line/60">
                      <p className={`text-[10px] font-bold ${today ? "text-primary" : "text-ink-soft"}`}>{weekdayName(d)}</p>
                      <p className={`text-lg font-black inline-flex w-8 h-8 items-center justify-center rounded-full ${today ? "bg-primary text-white" : "text-ink"}`}>
                        {d.getDate()}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
                {/* hours */}
                <div>
                  {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
                    <div key={i} className="h-16 text-[9px] font-bold text-ink-soft/60 text-center pt-0.5" dir="ltr">
                      {pad2(DAY_START + i)}:00
                    </div>
                  ))}
                </div>
                {weekDays.map((d, di) => {
                  const list = appointments.filter((a) => sameDay(new Date(a.date), d) && a.status !== "cancelled");
                  return (
                    <div
                      key={di}
                      className={`relative border-s border-line/60 ${sameDay(d, new Date()) ? "bg-teal-50/40" : ""}`}
                      onDoubleClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const hour = DAY_START + Math.floor((e.clientY - rect.top) / HOUR_PX);
                        const date = new Date(d);
                        date.setHours(Math.min(Math.max(hour, DAY_START), DAY_END - 1), 0, 0, 0);
                        setModalDate(date);
                        setModalOpen(true);
                      }}
                    >
                      {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
                        <div key={i} className="h-16 border-b border-line/50" />
                      ))}
                      {list.map((a) => {
                        const dt = new Date(a.date);
                        const top = ((dt.getHours() - DAY_START) * 60 + dt.getMinutes()) / 60 * HOUR_PX;
                        const h = Math.max((a.duration / 60) * HOUR_PX, 26);
                        const s = APPOINTMENT_STATUS[a.status] ?? APPOINTMENT_STATUS.scheduled;
                        return (
                          <motion.button
                            key={a.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => setSelected(d)}
                            className="absolute inset-x-1 rounded-lg p-1.5 text-right overflow-hidden border shadow-sm hover:shadow-md transition-shadow z-10"
                            style={{
                              top,
                              height: h,
                              backgroundColor: s.bg,
                              borderColor: s.dot,
                              color: s.color,
                            }}
                          >
                            <p className="text-[10px] font-black truncate">{patientName(a.patient)}</p>
                            {h > 40 && (
                              <p className="text-[9px] font-bold opacity-80 truncate" dir="ltr">
                                {formatTime(a.date)} — {a.reason ?? ""}
                              </p>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })}
                {/* now line */}
                {weekDays.some((d) => sameDay(d, new Date())) && (
                  <NowLine days={weekDays} />
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* -------- day panel -------- */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="card p-5 xl:w-80 shrink-0"
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] font-bold text-ink-soft capitalize">{weekdayName(selected)}</p>
            <h3 className="text-base font-black text-ink">{formatDate(selected, { day: "numeric", month: "long" })}</h3>
          </div>
          <button
            onClick={() => { setModalDate(selected); setModalOpen(true); }}
            className="btn-primary !p-2"
            title="موعد جديد في هذا اليوم"
          >
            <CalendarPlus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] font-bold text-ink-soft mb-4">
          {dayAppts.length ? `${dayAppts.length} موعد` : "لا مواعيد"}
        </p>

        <AnimatePresence mode="popLayout">
          {dayAppts.length === 0 ? (
            <Empty text="يوم فارغ — أضف موعداً بالزر أعلاه" icon={<Clock className="w-10 h-10" />} />
          ) : (
            dayAppts.map((a) => (
              <motion.div
                layout
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border border-line bg-white p-3 mb-2.5"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <Avatar first={a.patient?.firstName ?? "?"} last={a.patient?.lastName ?? ""} size="sm" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/patients/${a.patientId}`} className="text-xs font-extrabold text-ink hover:text-primary truncate block">
                      {patientName(a.patient)}
                    </Link>
                    <p className="text-[10px] text-ink-soft font-bold" dir="ltr">
                      {formatTime(a.date)} · {a.duration} min
                    </p>
                  </div>
                  <AppointmentBadge status={a.status} />
                </div>
                {a.reason && <p className="text-[11px] font-bold text-ink-soft mb-2">{a.reason}</p>}
                <div className="flex gap-1.5 flex-wrap">
                  {a.status === "pending" && (
                    <>
                      <button onClick={() => setStatus(a.id, "confirmed")} className="text-[10px] font-extrabold text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg transition-colors">
                        قبول (من الموقع)
                      </button>
                      <button onClick={() => setStatus(a.id, "cancelled")} className="text-[10px] font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors">
                        رفض
                      </button>
                    </>
                  )}
                  {a.status === "scheduled" && (
                    <button onClick={() => setStatus(a.id, "confirmed")} className="text-[10px] font-extrabold text-primary bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors">
                      تأكيد
                    </button>
                  )}
                  {(a.status === "scheduled" || a.status === "confirmed") && (
                    <>
                      <button onClick={() => setStatus(a.id, "done")} className="text-[10px] font-extrabold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-colors">
                        تم
                      </button>
                      <button onClick={() => setStatus(a.id, "noshow")} className="text-[10px] font-extrabold text-stone-600 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors">
                        لم يحضر
                      </button>
                      <button onClick={() => setStatus(a.id, "cancelled")} className="text-[10px] font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors">
                        إلغاء
                      </button>
                    </>
                  )}
                  <button onClick={() => setToDelete(a)} className="text-[10px] font-extrabold text-ink-soft hover:text-rose-600 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors ms-auto">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.aside>

      <AppointmentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        presetDate={modalDate}
      />
      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="حذف الموعد"
        message={`سيتم حذف موعد ${patientName(toDelete?.patient)} بتاريخ ${toDelete ? formatTime(toDelete.date) : ""} نهائياً. هل أنت متأكد؟`}
      />
    </div>
  );
}

function NowLine({ days }: { days: Date[] }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);
  const idx = days.findIndex((d) => sameDay(d, now));
  if (idx === -1) return null;
  const top = ((now.getHours() - DAY_START) * 60 + now.getMinutes()) / 60 * HOUR_PX;
  if (top < 0 || top > (DAY_END - DAY_START) * HOUR_PX) return null;
  // column width: (100% - 56px)/7 ; in RTL, column 0 starts after the 56px hour gutter
  return (
    <div
      className="absolute pointer-events-none z-20 flex items-center"
      style={{
        top,
        insetInlineStart: `calc(56px + (100% - 56px) / 7 * ${idx})`,
        width: `calc((100% - 56px) / 7)`,
      }}
    >
      <span className="w-2 h-2 rounded-full bg-accent -ms-1" />
      <span className="flex-1 h-0.5 bg-accent/70" />
    </div>
  );
}
