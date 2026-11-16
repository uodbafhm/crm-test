"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  Loader2,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TREATMENT_TYPES, formatDate, weekdayName } from "@/lib/constants";

type Slot = { time: string; available: boolean };

function dayOptions() {
  const days: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ firstName: "", lastName: "", phone: "", reason: TREATMENT_TYPES[0], notes: "" });
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(dayOptions, []);

  useEffect(() => {
    if (!day) return;
    setSlots(null);
    setSlot(null);
    fetch(`/api/book?date=${day}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots))
      .catch(() => setSlots([]));
  }, [day]);

  const step1Valid = f.firstName.trim().length > 1 && f.lastName.trim().length > 1 && f.phone.trim().length >= 8;

  async function submit() {
    if (!day || !slot) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, date: day, time: slot }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "slot_taken") setError("هذا الوقت حُجز للتو — اختر وقتاً آخر");
        else if (data.error === "too_soon") setError("المرجو الحجز قبل ساعتين على الأقل");
        else setError("حدث خطأ — حاول مرة أخرى");
        return;
      }
      setRef(data.ref);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
    } finally {
      setSending(false);
    }
  }

  /* ---------- success ---------- */
  if (ref) {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-teal-300 to-primary flex items-center justify-center shadow-2xl shadow-teal-500/30"
          >
            <BadgeCheck className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="mt-6 text-2xl font-black text-white">تم استلام طلب الحجز!</h1>
          <p className="mt-2 text-sm font-bold text-teal-200/80 leading-7">
            طلبك الآن قيد المراجعة — سيتصل بك فريق العيادة لتأكيد الموعد نهائياً.
          </p>
          <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-white/10 border border-white/15 px-8 py-5">
            <span className="text-[10px] font-black text-teal-300">رقم مرجع الحجز</span>
            <span className="text-2xl font-black text-white tracking-wider" dir="ltr">{ref}</span>
            <span className="mt-2 text-xs font-bold text-white/70">
              {weekdayName(day!)} {formatDate(day!)} — <span dir="ltr">{slot}</span>
            </span>
          </div>
          <button
            onClick={() => { setRef(null); setStep(0); setDay(null); setSlot(null); setF({ firstName: "", lastName: "", phone: "", reason: TREATMENT_TYPES[0], notes: "" }); }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-5 py-2.5 text-xs font-extrabold text-white/80 hover:bg-white/15 transition-colors"
          >
            حجز موعد آخر
          </button>
        </motion.div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* progress */}
      <div className="flex items-center gap-2 mb-7">
        {["معلوماتك", "اليوم", "الساعة", "التأكيد"].map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1.5">
            <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-l from-teal-300 to-primary"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className={`text-[10px] font-extrabold ${i <= step ? "text-teal-300" : "text-white/35"}`}>{s}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ---------- step 1: identity ---------- */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <h1 className="text-xl font-black text-white mb-1">معلوماتك الشخصية</h1>
            <p className="text-xs font-bold text-white/50 mb-6">إذا كنت مريضاً سابقاً، اكتب نفس رقم الهاتف</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="book-label">الاسم الشخصي</label>
                  <input className="book-input" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} placeholder="مثال: أمين" />
                </div>
                <div>
                  <label className="book-label">الاسم العائلي</label>
                  <input className="book-input" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} placeholder="مثال: بنعمر" />
                </div>
              </div>
              <div>
                <label className="book-label">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input className="book-input !pr-10" dir="ltr" inputMode="tel" placeholder="06 XX XX XX XX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="book-label">سبب الزيارة</label>
                <div className="flex flex-wrap gap-2">
                  {TREATMENT_TYPES.slice(0, 8).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setF({ ...f, reason: t })}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all ${f.reason === t ? "bg-teal-400/20 border-teal-300/60 text-teal-200" : "bg-white/6 border-white/10 text-white/60 hover:bg-white/10"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <WizardNav onNext={() => step1Valid && setStep(1)} nextDisabled={!step1Valid} />
          </motion.div>
        )}

        {/* ---------- step 2: day ---------- */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <h1 className="text-xl font-black text-white mb-1">اختر اليوم</h1>
            <p className="text-xs font-bold text-white/50 mb-6">متاح الحجز خلال الأسبوعين القادمين</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {days.map((d, i) => {
                const key = iso(d);
                const active = day === key;
                return (
                  <motion.button
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setDay(key)}
                    className={`rounded-2xl border py-3 flex flex-col items-center gap-0.5 transition-all ${active ? "bg-gradient-to-b from-teal-400 to-primary border-teal-300 text-white shadow-lg shadow-teal-500/25 scale-105" : "bg-white/6 border-white/10 text-white/70 hover:bg-white/12 hover:border-white/20"}`}
                  >
                    <span className={`text-[9px] font-black ${active ? "text-teal-100" : "text-white/40"}`}>{weekdayName(d)}</span>
                    <span className="text-xl font-black leading-6">{d.getDate()}</span>
                    <span className={`text-[9px] font-bold ${active ? "text-teal-100" : "text-white/40"}`}>
                      {new Intl.DateTimeFormat("ar-MA", { month: "short" }).format(d)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <WizardNav onBack={() => setStep(0)} onNext={() => day && setStep(2)} nextDisabled={!day} />
          </motion.div>
        )}

        {/* ---------- step 3: slot ---------- */}
        {step === 2 && day && (
          <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <h1 className="text-xl font-black text-white mb-1">اختر الساعة</h1>
            <p className="text-xs font-bold text-white/50 mb-6">
              {weekdayName(day)} {formatDate(day)} — الأوقات المتاحة
            </p>
            {!slots ? (
              <div className="flex items-center justify-center py-14 text-white/40 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-bold">جاري تحميل الأوقات...</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2" dir="ltr">
                {slots.map((s, i) => (
                  <motion.button
                    key={s.time}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.015 }}
                    disabled={!s.available}
                    onClick={() => setSlot(s.time)}
                    className={`rounded-xl py-2.5 text-sm font-black transition-all border ${
                      slot === s.time
                        ? "bg-gradient-to-b from-teal-300 to-primary text-white border-teal-200 shadow-lg shadow-teal-500/25"
                        : s.available
                          ? "bg-white/6 border-white/10 text-white/80 hover:bg-white/12"
                          : "bg-transparent border-white/5 text-white/20 line-through cursor-not-allowed"
                    }`}
                  >
                    {s.time}
                  </motion.button>
                ))}
              </div>
            )}
            <WizardNav onBack={() => setStep(1)} onNext={() => slot && setStep(3)} nextDisabled={!slot} />
          </motion.div>
        )}

        {/* ---------- step 4: confirm ---------- */}
        {step === 3 && day && slot && (
          <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <h1 className="text-xl font-black text-white mb-1">مراجعة وتأكيد</h1>
            <p className="text-xs font-bold text-white/50 mb-6">تحقق من معلوماتك قبل الإرسال</p>

            <div className="rounded-2xl bg-white/8 border border-white/12 divide-y divide-white/8 overflow-hidden">
              {[
                { icon: <User className="w-4 h-4" />, label: "المريض", value: `${f.firstName} ${f.lastName}` },
                { icon: <Phone className="w-4 h-4" />, label: "الهاتف", value: f.phone, ltr: true },
                { icon: <Sparkles className="w-4 h-4" />, label: "الخدمة", value: f.reason },
                { icon: <CalendarDays className="w-4 h-4" />, label: "اليوم", value: `${weekdayName(day)} ${formatDate(day)}` },
                { icon: <Clock className="w-4 h-4" />, label: "الساعة", value: slot, ltr: true },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="w-8 h-8 rounded-lg bg-teal-400/15 text-teal-300 flex items-center justify-center">{r.icon}</span>
                  <span className="text-xs font-bold text-white/45 w-16">{r.label}</span>
                  <span className="text-sm font-extrabold text-white flex-1" dir={r.ltr ? "ltr" : undefined}>{r.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="book-label">ملاحظة للطبيب (اختياري)</label>
              <textarea className="book-input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="مثال: ألم شديد منذ يومين..." />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs font-extrabold px-4 py-3">
                {error}
              </motion.p>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setStep(2)} className="book-back">
                <ArrowRight className="w-4 h-4" /> رجوع
              </button>
              <button onClick={submit} disabled={sending} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-teal-400 to-primary text-white font-black text-sm py-3.5 shadow-xl shadow-teal-500/30 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" strokeWidth={3} />}
                تأكيد طلب الحجز
              </button>
            </div>
            <p className="flex items-center justify-center gap-1.5 mt-4 text-[10px] font-bold text-white/35">
              <ShieldCheck className="w-3.5 h-3.5" /> معلوماتك محمية وتُستعمل فقط لتأكيد الموعد
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

function WizardNav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mt-8">
      {onBack && (
        <button onClick={onBack} className="book-back">
          <ArrowRight className="w-4 h-4" /> رجوع
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-teal-400 to-primary text-white font-black text-sm py-3.5 shadow-xl shadow-teal-500/30 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        متابعة <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-pine pine-pattern text-white relative overflow-hidden">
      <div className="fixed -top-40 right-0 w-[36rem] h-[36rem] rounded-full bg-primary/25 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-48 left-0 w-[32rem] h-[32rem] rounded-full bg-gold/15 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-5 py-8 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center min-h-screen">
        {/* branding */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
                <path d="M24 6c-6.5 0-8.2 3.4-12.2 3.4C6.6 9.4 4 13.8 4 18.5c0 9.2 5 22.7 8 22.7 3.4 0 1.6-12.2 6-12.2h12c4.4 0 2.6 12.2 6 12.2 3 0 8-13.5 8-22.7 0-4.7-2.6-9.1-7.8-9.1C32.2 9.4 30.5 6 24 6Z" fill="#2DD4BF" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-black">دينتا برو</p>
              <p className="text-xs font-bold text-teal-300">عيادة الأسنان — د. ياسين العلوي</p>
            </div>
          </div>
          <h1 className="text-4xl font-black leading-[1.4]">
            احجز موعدك
            <br />
            <span className="bg-gradient-to-l from-teal-300 to-teal-100 bg-clip-text text-transparent">في أقل من دقيقة</span>
          </h1>
          <p className="mt-5 text-sm font-semibold text-white/55 leading-7 max-w-sm">
            اختر اليوم والساعة المناسبين، وسيتواصل معك فريق العيادة لتأكيد موعدك. الحجز من الموقع منفصل تماماً عن طابور الانتظار للحاضرين مباشرة.
          </p>
          <div className="mt-8 space-y-3">
            {["تأكيد هاتفي قبل الموعد", "تذكير تلقائي للطبيب", "بدون إنشاء حساب"].map((t) => (
              <p key={t} className="flex items-center gap-2.5 text-xs font-extrabold text-white/70">
                <span className="w-6 h-6 rounded-full bg-teal-400/15 text-teal-300 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                {t}
              </p>
            ))}
          </div>
        </div>

        {/* wizard card */}
        <div className="rounded-3xl bg-white/6 border border-white/12 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <path d="M24 6c-6.5 0-8.2 3.4-12.2 3.4C6.6 9.4 4 13.8 4 18.5c0 9.2 5 22.7 8 22.7 3.4 0 1.6-12.2 6-12.2h12c4.4 0 2.6 12.2 6 12.2 3 0 8-13.5 8-22.7 0-4.7-2.6-9.1-7.8-9.1C32.2 9.4 30.5 6 24 6Z" fill="#2DD4BF" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-black">دينتا برو</p>
              <p className="text-[10px] font-bold text-teal-300">احجز موعدك أونلاين</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
