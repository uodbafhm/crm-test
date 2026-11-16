"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  Globe,
  LayoutDashboard,
  ListOrdered,
  Plus,
  Receipt,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/constants";
import type { NotificationDto } from "@/lib/types";
import { AppointmentFormModal } from "@/components/forms";

/* -------------------- logo -------------------- */
function ToothMark({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <path
        d="M24 6c-6.5 0-8.2 3.4-12.2 3.4C6.6 9.4 4 13.8 4 18.5c0 9.2 5 22.7 8 22.7 3.4 0 1.6-12.2 6-12.2h12c4.4 0 2.6 12.2 6 12.2 3 0 8-13.5 8-22.7 0-4.7-2.6-9.1-7.8-9.1C32.2 9.4 30.5 6 24 6Z"
        fill="url(#tg)"
      />
      <path
        d="M14 16.5c1.5-2.2 3.6-3.3 6.5-3.3s3.9 1.6 3.5 1.6 0-1.6 3.5-1.6 5 1.1 6.5 3.3"
        stroke="#fff"
        strokeOpacity=".8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="tg" x1="4" y1="6" x2="44" y2="42">
          <stop stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#0E7569" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const NAV = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, hint: "نظرة عامة" },
  { href: "/calendar", label: "المواعيد", icon: CalendarDays, hint: "Rendez-vous" },
  { href: "/queue", label: "طابور الانتظار", icon: ListOrdered, hint: "Walk-in" },
  { href: "/patients", label: "المرضى", icon: Users, hint: "الملفات الطبية" },
  { href: "/treatments", label: "العلاجات", icon: Stethoscope, hint: "خطط العلاج" },
  { href: "/invoices", label: "الفواتير", icon: Receipt, hint: "المداخيل" },
];

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/patients/")) return "الملف الطبي للمريض";
  return NAV.find((n) => n.href === pathname)?.label ?? "لوحة التحكم";
}

/* -------------------- toasts + watcher -------------------- */
interface ToastItem {
  id: number;
  message: string;
}

export function ReminderWatcher() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seen = useRef<Set<number>>(new Set());
  const firstRun = useRef(true);

  const poll = useCallback(async () => {
    try {
      const data = await apiGet<{ unread: number; notifications: NotificationDto[] }>(
        "/api/reminders",
      );
      const fresh = data.notifications.filter(
        (n) => !n.read && !seen.current.has(n.id),
      );
      if (!firstRun.current && fresh.length) {
        const next = fresh.map((n) => ({ id: n.id, message: n.message }));
        setToasts((t) => [...t, ...next].slice(-4));
        setTimeout(() => {
          setToasts((t) => t.filter((x) => !next.some((n) => n.id === x.id)));
        }, 9000);
      }
      fresh.forEach((n) => seen.current.add(n.id));
      firstRun.current = false;
      // share unread count with the bell
      window.dispatchEvent(
        new CustomEvent("clinic:reminders", { detail: data.unread }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    poll();
    const i = setInterval(poll, 30_000);
    return () => clearInterval(i);
  }, [poll]);

  return (
    <div className="fixed bottom-5 left-5 z-[90] space-y-2 w-80 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, x: -40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            className="pointer-events-auto w-full text-right rounded-2xl bg-pine text-white p-4 shadow-2xl flex items-start gap-3"
          >
            <span className="mt-0.5 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 pulse-ring">
              <Bell className="w-4 h-4 text-accent" />
            </span>
            <span>
              <span className="block text-[11px] font-bold text-teal-300 mb-0.5">
                تذكير تلقائي بالموعد
              </span>
              <span className="block text-xs font-semibold leading-5 text-white/90">
                {t.message}
              </span>
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* -------------------- bell -------------------- */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ unread: number; notifications: NotificationDto[] }>(
        "/api/reminders",
      );
      setUnread(data.unread);
      setItems(data.notifications);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const on = (e: Event) => {
      const u = (e as CustomEvent<number>).detail;
      if (typeof u === "number") setUnread(u);
      if (open) load();
    };
    window.addEventListener("clinic:reminders", on);
    return () => window.removeEventListener("clinic:reminders", on);
  }, [load, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markAll() {
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setItems((x) => x.map((i) => ({ ...i, read: true })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-xl bg-white border border-line flex items-center justify-center text-ink-soft hover:text-primary hover:border-primary/40 transition-all"
        aria-label="التنبيهات"
      >
        <Bell className="w-4.5 h-4.5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[10px] font-black flex items-center justify-center pulse-ring">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 mt-2 w-96 card !bg-white p-0 overflow-hidden z-[70]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="text-sm font-black">تذكيرات المواعيد</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline">
                  <CheckCheck className="w-3.5 h-3.5" /> قراءة الكل
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 && (
                <p className="text-xs text-ink-soft text-center py-8">
                  لا توجد تذكيرات حالياً
                </p>
              )}
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-line/60 flex gap-3 ${n.read ? "opacity-55" : ""}`}
                >
                  <span
                    className={`mt-1 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      n.read ? "bg-paper text-ink-soft" : "bg-accent/10 text-accent"
                    }`}
                  >
                    {n.read ? <Check className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-5 text-ink">{n.message}</p>
                    <p className="text-[10px] text-ink-soft mt-1" dir="ltr">
                      {formatDate(n.createdAt)} · {formatTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------- shell -------------------- */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [apptOpen, setApptOpen] = useState(false);

  // waiting-room display & public booking render fullscreen without app chrome
  if (pathname === "/queue/display" || pathname === "/book") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      {/* sidebar */}
      <aside className="fixed inset-y-0 start-0 w-64 z-40 hidden lg:flex flex-col bg-pine pine-pattern text-white">
        <div className="px-6 pt-7 pb-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
            <ToothMark className="w-7 h-7" />
          </div>
          <div>
            <p className="font-black text-lg leading-5">دينتا برو</p>
            <p className="text-[10px] text-teal-300/80 font-bold tracking-wide mt-0.5">
              DENTAL CLINIC SUITE
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-2">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  active
                    ? "bg-white text-pine shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/8"
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 ${active ? "text-primary" : ""}`} strokeWidth={2.2} />
                <span className="flex-1">
                  <span className="block text-sm font-extrabold leading-4">{item.label}</span>
                  <span className={`block text-[10px] mt-0.5 ${active ? "text-primary/70" : "text-white/35"}`}>
                    {item.hint}
                  </span>
                </span>
                {active && (
                  <motion.span layoutId="nav-dot" className="w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-3">
          <Link
            href="/book"
            target="_blank"
            className="flex items-center gap-2.5 rounded-xl bg-white/6 border border-white/10 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Globe className="w-4 h-4 text-teal-300 shrink-0" />
            <span className="text-[11px] font-extrabold leading-4">
              صفحة الحجز أونلاين
              <span className="block text-[9px] font-bold text-white/40 mt-0.5">شاركها مع مرضاك — /book</span>
            </span>
          </Link>
          <div className="rounded-2xl bg-white/6 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-300 to-primary flex items-center justify-center font-black text-white text-sm">
                د.ي
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold truncate">د. ياسين العلوي</p>
                <p className="text-[10px] text-teal-300/70">طبيب أسنان عام</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* main column */}
      <div className="lg:ms-64 flex flex-col min-h-screen">
        {/* topbar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-paper/80 border-b border-line/70">
          <div className="px-4 sm:px-8 py-3.5 flex items-center gap-3">
            <div className="lg:hidden w-9 h-9 rounded-xl bg-pine flex items-center justify-center">
              <ToothMark className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-ink leading-6 truncate">
                {pageTitle(pathname)}
              </h1>
              <p className="text-[11px] text-ink-soft font-semibold">
                {formatDate(new Date(), { weekday: "long" })}
              </p>
            </div>

            <button
              onClick={() => setApptOpen(true)}
              className="btn-primary !py-2.5 !px-3 sm:!px-4 text-xs sm:text-sm"
              aria-label="موعد جديد"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              موعد جديد
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* mobile nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line flex justify-around py-2">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? "text-primary" : "text-ink-soft/60"}`}>
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 px-4 sm:px-8 py-6 pb-24 lg:pb-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      <ReminderWatcher />
      <AppointmentFormModal open={apptOpen} onClose={() => setApptOpen(false)} onSaved={() => {}} />
    </div>
  );
}
