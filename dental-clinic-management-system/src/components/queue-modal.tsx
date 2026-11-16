"use client";

import { Loader2, Ticket, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Field, Modal } from "@/components/modal";
import type { PatientDto, QueueEntryDto } from "@/lib/types";

export function AddWalkinModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (entry?: QueueEntryDto) => void;
}) {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<number | null>(null);
  const [f, setF] = useState({ patientId: "", reason: "", firstName: "", lastName: "", phone: "" });

  useEffect(() => {
    if (!open) return;
    setTicket(null);
    setF({ patientId: "", reason: "", firstName: "", lastName: "", phone: "" });
    apiGet<PatientDto[]>("/api/patients").then(setPatients).catch(() => {});
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload =
        mode === "new"
          ? { firstName: f.firstName, lastName: f.lastName, phone: f.phone, reason: f.reason }
          : { patientId: Number(f.patientId), reason: f.reason };
      const entry = await apiPost<QueueEntryDto>("/api/queue", payload);
      setTicket(entry.ticketNumber);
      onSaved(entry);
    } catch {
      alert("تعذر تسجيل المريض في الطابور");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تسجيل في طابور الانتظار (Walk-in)">
      {ticket !== null ? (
        <div className="text-center py-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-accent to-amber-500 text-white flex flex-col items-center justify-center shadow-xl">
            <span className="text-[10px] font-black opacity-90">رقم الطابور</span>
            <span className="text-4xl font-black" dir="ltr">#{ticket}</span>
          </div>
          <p className="mt-4 text-sm font-bold text-ink">تم التسجيل بنجاح!</p>
          <p className="text-xs font-semibold text-ink-soft mt-1">
            سلم الرقم للمريض — سيُنادى عليه حسب الترتيب
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <button className="btn-ghost" onClick={onClose}>إغلاق</button>
            <button className="btn-primary" onClick={() => { setTicket(null); setF({ patientId: "", reason: "", firstName: "", lastName: "", phone: "" }); }}>
              <Ticket className="w-4 h-4" /> تسجيل مريض آخر
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2 p-1 bg-paper rounded-xl border border-line">
            {(["existing", "new"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${mode === m ? "bg-white shadow-sm text-primary" : "text-ink-soft"}`}
              >
                {m === "existing" ? "مريض مسجل" : "مريض جديد"}
              </button>
            ))}
          </div>

          {mode === "existing" ? (
            <Field label="المريض *">
              <select className="input" required value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })}>
                <option value="">— اختر المريض —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.phone}</option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
              <div className="col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-accent">
                <UserPlus className="w-3.5 h-3.5" /> سيُنشأ ملف مريض جديد تلقائياً
              </div>
              <Field label="الاسم الشخصي">
                <input className="input" required value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
              </Field>
              <Field label="الاسم العائلي">
                <input className="input" required value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
              </Field>
              <Field label="الهاتف" className="col-span-2">
                <input className="input" required dir="ltr" placeholder="06XXXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              </Field>
            </div>
          )}

          <Field label="سبب الحضور">
            <input className="input" placeholder="ألم حاد، كشف سريع، استعجال..." value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <button type="button" className="btn-ghost" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn-primary !from-accent !to-amber-600" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              إعطاء رقم الطابور
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
