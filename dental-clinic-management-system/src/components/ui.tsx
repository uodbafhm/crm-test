"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  APPOINTMENT_STATUS,
  INVOICE_STATUS,
  TREATMENT_STATUS,
} from "@/lib/constants";

export function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

export function AppointmentBadge({ status }: { status: string }) {
  const s = APPOINTMENT_STATUS[status] ?? APPOINTMENT_STATUS.scheduled;
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}
export function TreatmentBadge({ status }: { status: string }) {
  const s = TREATMENT_STATUS[status] ?? TREATMENT_STATUS.planned;
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}
export function InvoiceBadge({ status }: { status: string }) {
  const s = INVOICE_STATUS[status] ?? INVOICE_STATUS.unpaid;
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}

export function Counter({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <span dir="ltr">{display.toLocaleString("fr-FR")}</span>;
}

export function SectionTitle({
  icon,
  title,
  action,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2 text-sm font-black text-ink">
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </span>
        )}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {icon && <div className="text-line mb-2">{icon}</div>}
      <p className="text-xs font-bold text-ink-soft">{text}</p>
    </div>
  );
}

export function Avatar({ first, last, size = "md" }: { first: string; last: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-16 h-16 text-lg",
  };
  const hues = ["from-teal-400 to-primary", "from-amber-400 to-accent", "from-violet-400 to-indigo-600", "from-sky-400 to-blue-600", "from-rose-400 to-pink-600"];
  const idx = (first.charCodeAt(0) + last.charCodeAt(0)) % hues.length;
  return (
    <span
      className={`${sizes[size]} rounded-full bg-gradient-to-br ${hues[idx]} text-white font-black flex items-center justify-center shrink-0`}
    >
      {first[0]}
      {last[0]}
    </span>
  );
}

export function Skeleton({ className = "h-5 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
};
