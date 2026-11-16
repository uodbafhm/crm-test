"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, UserPlus } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { Field, Modal } from "@/components/modal";
import { TREATMENT_TYPES, TOOTH_ORDER } from "@/lib/constants";
import type { PatientDto, TreatmentDto } from "@/lib/types";

function usePatients(open: boolean) {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  useEffect(() => {
    if (!open) return;
    apiGet<PatientDto[]>("/api/patients").then(setPatients).catch(() => {});
  }, [open]);
  return patients;
}

function SubmitRow({
  saving,
  onClose,
  label,
}: {
  saving: boolean;
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-line">
      <button type="button" className="btn-ghost" onClick={onClose}>
        إلغاء
      </button>
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </div>
  );
}

// ------------------ Patient ------------------
export function PatientFormModal({
  open,
  onClose,
  onSaved,
  patient,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patient?: PatientDto | null;
}) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    birthDate: "",
    gender: "female",
    address: "",
    allergies: "",
    chronicConditions: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setF({
      firstName: patient?.firstName ?? "",
      lastName: patient?.lastName ?? "",
      phone: patient?.phone ?? "",
      email: patient?.email ?? "",
      birthDate: patient?.birthDate ?? "",
      gender: patient?.gender ?? "female",
      address: patient?.address ?? "",
      allergies: patient?.allergies ?? "",
      chronicConditions: patient?.chronicConditions ?? "",
      notes: patient?.notes ?? "",
    });
  }, [open, patient]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (patient) {
        const res = await fetch(`/api/patients/${patient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(f),
        });
        if (!res.ok) throw new Error();
      } else {
        await apiPost("/api/patients", f);
      }
      onSaved();
      onClose();
    } catch {
      alert("تعذر حفظ بيانات المريض");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={patient ? "تعديل بيانات المريض" : "مريض جديد"} wide>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        <Field label="الاسم الشخصي *">
          <input className="input" required value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
        </Field>
        <Field label="الاسم العائلي *">
          <input className="input" required value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
        </Field>
        <Field label="الهاتف *">
          <input className="input" required dir="ltr" placeholder="06XXXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="البريد الإلكتروني">
          <input className="input" type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="تاريخ الازدياد">
          <input className="input" type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} />
        </Field>
        <Field label="الجنس">
          <select className="input" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
            <option value="female">أنثى</option>
            <option value="male">ذكر</option>
          </select>
        </Field>
        <Field label="العنوان" className="col-span-2">
          <input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label="الحساسية">
          <input className="input" placeholder="بنسلين، لاتكس..." value={f.allergies} onChange={(e) => setF({ ...f, allergies: e.target.value })} />
        </Field>
        <Field label="أمراض مزمنة">
          <input className="input" placeholder="سكري، ضغط الدم..." value={f.chronicConditions} onChange={(e) => setF({ ...f, chronicConditions: e.target.value })} />
        </Field>
        <Field label="ملاحظات" className="col-span-2">
          <textarea className="input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
        <div className="col-span-2">
          <SubmitRow saving={saving} onClose={onClose} label={patient ? "حفظ التعديلات" : "إضافة المريض"} />
        </div>
      </form>
    </Modal>
  );
}

// ------------------ Appointment ------------------
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AppointmentFormModal({
  open,
  onClose,
  onSaved,
  presetDate,
  presetPatientId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  presetDate?: Date | null;
  presetPatientId?: number | null;
}) {
  const patients = usePatients(open);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [f, setF] = useState({
    patientId: "",
    date: "",
    duration: "30",
    reason: "",
    notes: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => {
    if (!open) return;
    const base = presetDate ?? new Date(Date.now() + 3600_000);
    base.setMinutes(0, 0, 0);
    setMode("existing");
    setF({
      patientId: presetPatientId ? String(presetPatientId) : "",
      date: toLocalInput(base),
      duration: "30",
      reason: "",
      notes: "",
      firstName: "",
      lastName: "",
      phone: "",
    });
  }, [open, presetDate, presetPatientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let pid = Number(f.patientId);
      if (mode === "new") {
        const p = await apiPost<PatientDto>("/api/patients", {
          firstName: f.firstName,
          lastName: f.lastName,
          phone: f.phone,
        });
        pid = p.id;
      }
      await apiPost("/api/appointments", {
        patientId: pid,
        date: new Date(f.date).toISOString(),
        duration: Number(f.duration),
        reason: f.reason || "فحص عام",
        notes: f.notes,
      });
      onSaved();
      onClose();
    } catch {
      alert("تعذر إنشاء الموعد");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="موعد جديد (Rendez-vous)">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2 p-1 bg-paper rounded-xl border border-line">
          {(["existing", "new"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                mode === m ? "bg-white shadow-sm text-primary" : "text-ink-soft"
              }`}
            >
              {m === "existing" ? "مريض مسجل" : "مريض جديد"}
            </button>
          ))}
        </div>

        {mode === "existing" ? (
          <Field label="المريض *">
            <select
              className="input"
              required
              value={f.patientId}
              onChange={(e) => setF({ ...f, patientId: e.target.value })}
            >
              <option value="">— اختر المريض —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} — {p.phone}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 rounded-xl border border-teal-100 bg-teal-50/60 p-3">
            <div className="col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-primary">
              <UserPlus className="w-3.5 h-3.5" /> سيُنشأ ملف مريض جديد تلقائياً
            </div>
            <Field label="الاسم الشخصي">
              <input className="input" required value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
            </Field>
            <Field label="الاسم العائلي">
              <input className="input" required value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
            </Field>
            <Field label="الهاتف" className="col-span-2">
              <input className="input" required dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </Field>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="التاريخ والوقت *">
            <input className="input" type="datetime-local" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="المدة">
            <select className="input" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })}>
              {["15", "30", "45", "60", "90", "120"].map((d) => (
                <option key={d} value={d}>{d} دقيقة</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="سبب الزيارة">
          <input className="input" list="reasons" placeholder="فحص، حشوة، تنظيف..." value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          <datalist id="reasons">
            {TREATMENT_TYPES.map((t) => <option key={t} value={t} />)}
          </datalist>
        </Field>
        <Field label="ملاحظات">
          <textarea className="input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
        <SubmitRow saving={saving} onClose={onClose} label="تثبيت الموعد" />
      </form>
    </Modal>
  );
}

// ------------------ Treatment ------------------
export function TreatmentFormModal({
  open,
  onClose,
  onSaved,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patientId?: number;
}) {
  const patients = usePatients(open && !patientId);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ patientId: "", type: TREATMENT_TYPES[0], tooth: "", cost: "", status: "planned", description: "", performedAt: "" });

  useEffect(() => {
    if (!open) return;
    setF({ patientId: "", type: TREATMENT_TYPES[0], tooth: "", cost: "", status: "planned", description: "", performedAt: new Date().toISOString().slice(0, 10) });
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/treatments", {
        patientId: patientId ?? Number(f.patientId),
        type: f.type,
        tooth: f.tooth ? Number(f.tooth) : null,
        cost: Number(f.cost) || 0,
        status: f.status,
        description: f.description,
        performedAt: f.performedAt ? new Date(f.performedAt).toISOString() : undefined,
      });
      onSaved();
      onClose();
    } catch {
      alert("تعذر حفظ العلاج");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="علاج جديد">
      <form onSubmit={submit} className="space-y-4">
        {!patientId && (
          <Field label="المريض *">
            <select className="input" required value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })}>
              <option value="">— اختر المريض —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع العلاج *">
            <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              {TREATMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="رقم السن (FDI)">
            <select className="input" value={f.tooth} onChange={(e) => setF({ ...f, tooth: e.target.value })}>
              <option value="">— بدون —</option>
              {TOOTH_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="التكلفة (د.م.)">
            <input className="input" type="number" min="0" dir="ltr" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
          </Field>
          <Field label="الحالة">
            <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="planned">مخطط</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="done">مكتمل</option>
            </select>
          </Field>
          <Field label="تاريخ العلاج" className="col-span-2">
            <input className="input" type="date" value={f.performedAt} onChange={(e) => setF({ ...f, performedAt: e.target.value })} />
          </Field>
        </div>
        <Field label="الوصف">
          <textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <SubmitRow saving={saving} onClose={onClose} label="حفظ العلاج" />
      </form>
    </Modal>
  );
}

// ------------------ Invoice ------------------
export function InvoiceFormModal({
  open,
  onClose,
  onSaved,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patientId?: number;
}) {
  const patients = usePatients(open && !patientId);
  const [treatments, setTreatments] = useState<TreatmentDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ patientId: "", treatmentId: "", amount: "", paidAmount: "", notes: "" });

  const effectivePatient = patientId ?? Number(f.patientId);
  useEffect(() => {
    if (!open || !effectivePatient) return;
    apiGet<TreatmentDto[]>(`/api/treatments?patientId=${effectivePatient}`).then(setTreatments).catch(() => {});
  }, [open, effectivePatient]);

  useEffect(() => {
    if (!open) return;
    setF({ patientId: "", treatmentId: "", amount: "", paidAmount: "", notes: "" });
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/invoices", {
        patientId: effectivePatient,
        treatmentId: f.treatmentId ? Number(f.treatmentId) : null,
        amount: Number(f.amount),
        paidAmount: Number(f.paidAmount) || 0,
        notes: f.notes,
      });
      onSaved();
      onClose();
    } catch {
      alert("تعذر إنشاء الفاتورة");
    } finally {
      setSaving(false);
    }
  }

  function pickTreatment(id: string) {
    const t = treatments.find((x) => x.id === Number(id));
    setF({ ...f, treatmentId: id, amount: t ? String(t.cost) : f.amount });
  }

  return (
    <Modal open={open} onClose={onClose} title="فاتورة جديدة">
      <form onSubmit={submit} className="space-y-4">
        {!patientId && (
          <Field label="المريض *">
            <select className="input" required value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value, treatmentId: "" })}>
              <option value="">— اختر المريض —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="مرتبطة بعلاج (اختياري)">
          <select className="input" value={f.treatmentId} onChange={(e) => pickTreatment(e.target.value)}>
            <option value="">— بدون —</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.type}{t.tooth ? ` · سن ${t.tooth}` : ""} — {t.cost} د.م.
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="المبلغ الإجمالي (د.م.) *">
            <input className="input" type="number" required min="0" dir="ltr" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </Field>
          <Field label="المبلغ المدفوع الآن">
            <input className="input" type="number" min="0" dir="ltr" value={f.paidAmount} onChange={(e) => setF({ ...f, paidAmount: e.target.value })} />
          </Field>
        </div>
        <Field label="ملاحظات">
          <input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
        <SubmitRow saving={saving} onClose={onClose} label="إنشاء الفاتورة" />
      </form>
    </Modal>
  );
}

// ------------------ X-ray ------------------
export function XrayFormModal({
  open,
  onClose,
  onSaved,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patientId: number;
}) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ title: "", url: "", tooth: "", notes: "" });
  useEffect(() => {
    if (open) setF({ title: "", url: "", tooth: "", notes: "" });
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/xrays", {
        patientId,
        title: f.title,
        url: f.url,
        tooth: f.tooth ? Number(f.tooth) : null,
        notes: f.notes,
      });
      onSaved();
      onClose();
    } catch {
      alert("تعذر إضافة الأشعة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="إضافة صورة أشعة">
      <form onSubmit={submit} className="space-y-4">
        <Field label="العنوان *">
          <input className="input" required placeholder="أشعة بانورامية، ضرس 46..." value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="رابط الصورة (URL) *">
          <input className="input" required dir="ltr" placeholder="https://..." value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        </Field>
        <Field label="رقم السن (اختياري)">
          <select className="input" value={f.tooth} onChange={(e) => setF({ ...f, tooth: e.target.value })}>
            <option value="">— بدون —</option>
            {TOOTH_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="ملاحظات">
          <textarea className="input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
        <SubmitRow saving={saving} onClose={onClose} label="إضافة الأشعة" />
      </form>
    </Modal>
  );
}
