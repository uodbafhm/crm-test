"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { TOOTH_STATUS } from "@/lib/constants";
import type { ToothDto } from "@/lib/types";
import { SectionTitle } from "@/components/ui";

const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function toothKind(tooth: number) {
  const pos = tooth % 10;
  if (pos <= 2) return "incisor";
  if (pos === 3) return "canine";
  if (pos <= 5) return "premolar";
  return "molar";
}

function Tooth({
  tooth,
  upper,
  info,
  selected,
  onSelect,
  index,
}: {
  tooth: number;
  upper: boolean;
  info?: ToothDto;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const status = info?.status ?? "healthy";
  const s = TOOTH_STATUS[status] ?? TOOTH_STATUS.healthy;
  const kind = toothKind(tooth);
  const size =
    kind === "molar"
      ? "w-10 h-12"
      : kind === "premolar"
        ? "w-9 h-11"
        : kind === "canine"
          ? "w-8 h-12"
          : "w-7 h-10";
  const radius =
    kind === "molar"
      ? "rounded-2xl"
      : kind === "premolar"
        ? "rounded-xl"
        : kind === "canine"
          ? "rounded-t-2xl rounded-b-md"
          : "rounded-t-xl rounded-b-lg";

  // arc offset: teeth near the midline sit closer to the center line
  const center = 7.5;
  const offset = upper ? Math.abs(index - center) * 2.2 : -Math.abs(index - center) * 2.2;

  return (
    <motion.button
      initial={{ opacity: 0, y: upper ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onSelect}
      className="flex flex-col items-center gap-1 group shrink-0"
      title={`سن ${tooth} — ${s.label}`}
    >
      {upper && <span className="text-[9px] font-black text-ink-soft/70">{tooth}</span>}
      <span
        className={`${size} ${radius} relative flex items-center justify-center transition-all border-2 group-hover:scale-110 group-active:scale-95 ${
          selected ? "ring-4 ring-primary/25 scale-110" : ""
        }`}
        style={{
          backgroundColor: s.fill,
          borderColor: selected ? "#0e7569" : s.stroke,
          transform: `translateY(${offset}px)`,
          backgroundImage: status === "missing"
            ? "repeating-linear-gradient(45deg, transparent 0 6px, rgba(168,162,158,.45) 6px 8px)"
            : undefined,
          borderStyle: status === "missing" ? "dashed" : "solid",
        }}
      >
        {status === "caries" && (
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.stroke }} />
        )}
        {status === "implant" && (
          <span className="w-1 h-4/5 rounded-full" style={{ backgroundColor: s.stroke }} />
        )}
        {info?.notes && (
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-gold border border-white" />
        )}
      </span>
      {!upper && <span className="text-[9px] font-black text-ink-soft/70">{tooth}</span>}
    </motion.button>
  );
}

export function DentalChart({ patientId }: { patientId: number }) {
  const [teeth, setTeeth] = useState<ToothDto[] | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [status, setStatus] = useState("healthy");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    apiGet<ToothDto[]>(`/api/teeth?patientId=${patientId}`).then(setTeeth).catch(() => setTeeth([]));
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const map = useMemo(() => {
    const m = new Map<number, ToothDto>();
    (teeth ?? []).forEach((t) => m.set(t.tooth, t));
    return m;
  }, [teeth]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    (teeth ?? []).forEach((t) => {
      if (t.status !== "healthy") counts[t.status] = (counts[t.status] ?? 0) + 1;
    });
    return counts;
  }, [teeth]);

  function select(tooth: number) {
    setSelectedTooth(tooth);
    const info = map.get(tooth);
    setStatus(info?.status ?? "healthy");
    setNotes(info?.notes ?? "");
  }

  async function save() {
    if (!selectedTooth) return;
    setSaving(true);
    try {
      await apiPost("/api/teeth", { patientId, tooth: selectedTooth, status, notes });
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 sm:p-7">
      <SectionTitle
        icon={
          <svg viewBox="0 0 48 48" className="w-4 h-4"><path d="M24 6c-6.5 0-8.2 3.4-12.2 3.4C6.6 9.4 4 13.8 4 18.5c0 9.2 5 22.7 8 22.7 3.4 0 1.6-12.2 6-12.2h12c4.4 0 2.6 12.2 6 12.2 3 0 8-13.5 8-22.7 0-4.7-2.6-9.1-7.8-9.1C32.2 9.4 30.5 6 24 6Z" fill="currentColor"/></svg>
        }
        title="خريطة الأسنان (ترقيم FDI)"
        action={
          <span className="text-[10px] font-bold text-ink-soft">
            انقر على سن لتسجيل حالتها
          </span>
        }
      />

      <div className="overflow-x-auto pb-2" dir="ltr">
        <div className="min-w-[760px] py-6 flex flex-col items-center gap-1">
          {/* upper arch */}
          <div className="flex items-start gap-1.5 flex-row-reverse">
            {UPPER.map((t, i) => (
              <Tooth key={t} tooth={t} upper info={map.get(t)} selected={selectedTooth === t} onSelect={() => select(t)} index={i} />
            ))}
          </div>
          {/* midline */}
          <div className="w-full flex items-center gap-3 my-3">
            <span className="text-[9px] font-black text-ink-soft/50" dir="rtl">يمين المريض</span>
            <span className="flex-1 border-t-2 border-dashed border-line" />
            <span className="text-[9px] font-black text-ink-soft/50" dir="rtl">يسار المريض</span>
          </div>
          {/* lower arch */}
          <div className="flex items-start gap-1.5 flex-row-reverse">
            {LOWER.map((t, i) => (
              <Tooth key={t} tooth={t} upper={false} info={map.get(t)} selected={selectedTooth === t} onSelect={() => select(t)} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* editor panel */}
      <AnimatePresence>
        {selectedTooth !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-primary/25 bg-teal-50/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-ink">
                  السن رقم <span className="text-primary" dir="ltr">{selectedTooth}</span>
                </p>
                <button onClick={() => setSelectedTooth(null)} className="text-[11px] font-bold text-ink-soft hover:text-ink">إغلاق</button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(TOOTH_STATUS).map(([key, s]) => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                      status === key ? "scale-105 shadow-sm" : "opacity-70 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: s.fill,
                      borderColor: status === key ? s.stroke : `${s.stroke}55`,
                      color: "#152423",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="ملاحظة (اختياري)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button onClick={save} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* summary + legend */}
      <div className="mt-5 pt-4 border-t border-line flex flex-wrap items-center gap-x-4 gap-y-2">
        {Object.entries(summary).length === 0 ? (
          <p className="text-[11px] font-bold text-ink-soft">كل الأسنان سليمة — لم تُسجل أي حالة خاصة</p>
        ) : (
          Object.entries(summary).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] font-extrabold text-ink">
              <span className="w-3 h-3 rounded-md border" style={{ backgroundColor: TOOTH_STATUS[k].fill, borderColor: TOOTH_STATUS[k].stroke }} />
              {TOOTH_STATUS[k].label}
              <span className="text-ink-soft">×{c}</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
