import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  appointments,
  invoices,
  notifications,
  patients,
  queueEntries,
  teeth,
  treatments,
  xrays,
} from "./schema";

function ago(mins: number): Date {
  return new Date(Date.now() - mins * 60_000);
}

function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function monthsAgo(months: number, day = 10): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(Math.min(day, 28));
  d.setHours(12, 0, 0, 0);
  return d;
}

export async function wipeAll() {
  await db.execute(sql`TRUNCATE TABLE notifications, queue_entries, teeth, xrays, invoices, treatments, appointments, patients RESTART IDENTITY CASCADE`);
}

export async function seed({ force = false } = {}) {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(patients);
  if (Number(existing[0]?.count ?? 0) > 0 && !force) {
    return { seeded: false, message: "Database already contains data" };
  }
  if (force) await wipeAll();

  const pts = await db
    .insert(patients)
    .values([
      { firstName: "أمين", lastName: "بنعمر", phone: "0661234567", email: "amine.benomar@gmail.com", birthDate: "1988-03-14", gender: "male", address: "شارع محمد الخامس، الدار البيضاء", notes: "يفضل المواعيد الصباحية" },
      { firstName: "سارة", lastName: "الإدريسي", phone: "0662345678", email: "sara.idrissi@hotmail.com", birthDate: "1994-07-02", gender: "female", address: "حي المعاريف، الدار البيضاء", allergies: "حساسية من البنسلين" },
      { firstName: "يوسف", lastName: "التازي", phone: "0663456789", birthDate: "1979-11-25", gender: "male", address: "شارع الحسن الثاني، الرباط", chronicConditions: "داء السكري (النوع 2)" },
      { firstName: "خديجة", lastName: "العلوي", phone: "0664567890", email: "khadija.alaoui@yahoo.fr", birthDate: "2001-01-30", gender: "female", address: "عين السبع، الدار البيضاء" },
      { firstName: "مهدي", lastName: "الرامي", phone: "0665678901", birthDate: "2015-05-18", gender: "male", address: "حي الرياض، الدار البيضاء", notes: "مريض قاصر — يحضر مع والدته" },
      { firstName: "نادية", lastName: "الفاسي", phone: "0666789012", email: "n.fassi@gmail.com", birthDate: "1969-09-09", gender: "female", address: "البرنوصي، الدار البيضاء", chronicConditions: "ضغط الدم المرتفع", allergies: "لاتكس" },
      { firstName: "عمر", lastName: "بنجلون", phone: "0667890123", birthDate: "1985-12-01", gender: "male", address: "حي الأنفا، الدار البيضاء" },
      { firstName: "سلمى", lastName: "الحسني", phone: "0668901234", email: "salma.hassani@outlook.com", birthDate: "1998-04-22", gender: "female", address: "بوسكورة، الدار البيضاء" },
      { firstName: "كريم", lastName: "الزروالي", phone: "0669012345", birthDate: "1972-08-15", gender: "male", address: "سيدي معروف، الدار البيضاء", chronicConditions: "مضادات تخثر الدم — حذر عند القلع" },
      { firstName: "ليلى", lastName: "السباعي", phone: "0670123456", email: "laila.sabai@gmail.com", birthDate: "1990-02-11", gender: "female", address: "التشارك، الدار البيضاء" },
      { firstName: "حمزة", lastName: "الناصري", phone: "0671234567", birthDate: "2007-06-27", gender: "male", address: "الحي المحمدي، الدار البيضاء", notes: "تقويم أسنان — متابعة شهرية" },
      { firstName: "إيمان", lastName: "الشكري", phone: "0672345678", email: "imane.chakri@gmail.com", birthDate: "1996-10-05", gender: "female", address: "عين عودة، الدار البيضاء" },
    ])
    .returning();

  const P = (i: number) => pts[i].id;
  const year = new Date().getFullYear();
  let inv = 1;
  const num = () => `FAC-${year}-${String(inv++).padStart(4, "0")}`;

  // ---------- appointments ----------
  const apptValues = [
    // today
    { patientId: P(0), date: at(0, 9, 0), duration: 30, reason: "تنظيف الأسنان", status: "done" },
    { patientId: P(3), date: at(0, 10, 0), duration: 45, reason: "حشوة تجميلية", status: "done" },
    { patientId: P(1), date: at(0, 11, 30), duration: 30, reason: "فحص عام", status: "confirmed" },
    { patientId: P(4), date: at(0, 15, 0), duration: 30, reason: "ألم في الأسنان", status: "confirmed" },
    { patientId: P(2), date: at(0, 16, 30), duration: 60, reason: "علاج عصب — جلسة 2", status: "scheduled" },
    { patientId: P(7), date: at(0, 18, 0), duration: 30, reason: "تبييض الأسنان", status: "scheduled" },
    // tomorrow & next days
    { patientId: P(5), date: at(1, 9, 30), duration: 45, reason: "تركيب تاج", status: "confirmed" },
    { patientId: P(8), date: at(1, 11, 0), duration: 30, reason: "قلع ضرس العقل", status: "confirmed" },
    { patientId: P(10), date: at(1, 14, 30), duration: 30, reason: "متابعة تقويم", status: "scheduled" },
    { patientId: P(9), date: at(2, 10, 0), duration: 30, reason: "فحص عام", status: "scheduled" },
    { patientId: P(6), date: at(2, 12, 0), duration: 45, reason: "علاج اللثة", status: "scheduled" },
    { patientId: P(11), date: at(3, 9, 0), duration: 30, reason: "استشارة زراعة", status: "scheduled" },
    { patientId: P(0), date: at(4, 11, 30), duration: 30, reason: "متابعة", status: "scheduled" },
    { patientId: P(3), date: at(5, 15, 30), duration: 30, reason: "أشعة", status: "scheduled" },
    { patientId: P(7), date: at(6, 10, 30), duration: 30, reason: "تبييض — جلسة 2", status: "scheduled" },
    // past
    { patientId: P(0), date: at(-7, 10, 0), duration: 30, reason: "فحص عام", status: "done" },
    { patientId: P(1), date: at(-6, 12, 0), duration: 30, reason: "حشوة", status: "done" },
    { patientId: P(2), date: at(-5, 9, 0), duration: 60, reason: "علاج عصب — جلسة 1", status: "done" },
    { patientId: P(5), date: at(-4, 15, 0), duration: 45, reason: "تحضير التاج", status: "done" },
    { patientId: P(9), date: at(-3, 11, 0), duration: 30, reason: "تنظيف", status: "done" },
    { patientId: P(6), date: at(-2, 16, 0), duration: 30, reason: "فحص اللثة", status: "done" },
    { patientId: P(10), date: at(-1, 10, 0), duration: 30, reason: "متابعة تقويم", status: "noshow" },
    { patientId: P(11), date: at(-1, 14, 0), duration: 30, reason: "فحص عام", status: "cancelled" },
    { patientId: P(4), date: at(-10, 9, 30), duration: 30, reason: "ألم أسنان", status: "done" },
    { patientId: P(8), date: at(-14, 13, 0), duration: 30, reason: "فحص عام", status: "done" },
  ];
  const appts = await db.insert(appointments).values(apptValues).returning();

  // ---------- treatments ----------
  const trt = await db
    .insert(treatments)
    .values([
      { patientId: P(0), tooth: 16, type: "حشوة تجميلية", description: "حشوة كومبوزيت للضرس العلوي الأيمن", cost: 600, status: "done", performedAt: monthsAgo(5), appointmentId: appts[15].id },
      { patientId: P(0), tooth: 26, type: "تنظيف الأسنان", description: "تنظيف شامل وإزالة الجير", cost: 400, status: "done", performedAt: at(0, 9, 20), appointmentId: appts[0].id },
      { patientId: P(1), tooth: 36, type: "حشوة تجميلية", description: "تسوس عميق — حشوة مؤقتة", cost: 550, status: "in_progress", performedAt: at(-6, 12, 15), appointmentId: appts[16].id },
      { patientId: P(1), tooth: 36, type: "علاج عصب", description: "مخطط بعد زوال الالتهاب", cost: 1500, status: "planned", performedAt: at(12, 10, 0) },
      { patientId: P(2), tooth: 46, type: "علاج عصب", description: "علاج قنوات الجذور — 3 جلسات", cost: 2400, status: "in_progress", performedAt: at(-5, 9, 30), appointmentId: appts[17].id },
      { patientId: P(3), tooth: 21, type: "حشوة تجميلية", description: "حشوة القاطع العلوي", cost: 500, status: "done", performedAt: at(0, 10, 30), appointmentId: appts[1].id },
      { patientId: P(4), tooth: 75, type: "قلع سن", description: "قلع سن لبني متحرك", cost: 250, status: "done", performedAt: at(-10, 9, 45), appointmentId: appts[23].id },
      { patientId: P(5), tooth: 14, type: "تركيب تاج", description: "تاج خزفي — قياسات أُخذت", cost: 3200, status: "in_progress", performedAt: at(-4, 15, 30), appointmentId: appts[18].id },
      { patientId: P(6), type: "علاج اللثة", description: "تنظيف تحت اللثة — ربع علوي", cost: 900, status: "done", performedAt: at(-2, 16, 20), appointmentId: appts[20].id },
      { patientId: P(7), type: "تبييض الأسنان", description: "تبييض بالليزر — جلسة أولى", cost: 2000, status: "in_progress", performedAt: at(-8, 10, 0) },
      { patientId: P(9), tooth: 37, type: "حشوة تجميلية", description: "حشوة ضرس سفلي", cost: 600, status: "done", performedAt: at(-3, 11, 25), appointmentId: appts[19].id },
      { patientId: P(10), type: "تقويم الأسنان", description: "تركيب وضبط الأقواس", cost: 8000, status: "in_progress", performedAt: monthsAgo(2) },
      { patientId: P(11), tooth: 36, type: "زراعة أسنان", description: "خطة زراعة — بانتظار الأشعة", cost: 9500, status: "planned", performedAt: at(3, 9, 30) },
      { patientId: P(8), tooth: 48, type: "قلع سن", description: "قلع ضرس العقل السفلي", cost: 1200, status: "planned", performedAt: at(1, 11, 0), appointmentId: appts[7].id },
    ])
    .returning();

  // ---------- invoices ----------
  const now = new Date();
  const invValues = [
    { patientId: P(0), treatmentId: trt[0].id, amount: 600, paidAmount: 600, status: "paid", createdAt: monthsAgo(5), paidAt: monthsAgo(5) },
    { patientId: P(0), treatmentId: trt[1].id, amount: 400, paidAmount: 400, status: "paid", createdAt: now, paidAt: now },
    { patientId: P(1), treatmentId: trt[2].id, amount: 550, paidAmount: 300, status: "partial", createdAt: at(-6, 13, 0) },
    { patientId: P(2), treatmentId: trt[4].id, amount: 2400, paidAmount: 1200, status: "partial", createdAt: at(-5, 10, 0), paidAt: at(-2, 10, 0) },
    { patientId: P(3), treatmentId: trt[5].id, amount: 500, paidAmount: 500, status: "paid", createdAt: now, paidAt: now },
    { patientId: P(5), treatmentId: trt[7].id, amount: 3200, paidAmount: 0, status: "unpaid", createdAt: at(-4, 16, 0), notes: "تُدفع عند تركيب التاج" },
    { patientId: P(6), treatmentId: trt[8].id, amount: 900, paidAmount: 900, status: "paid", createdAt: at(-2, 17, 0), paidAt: at(-2, 17, 0) },
    { patientId: P(7), treatmentId: trt[9].id, amount: 2000, paidAmount: 1000, status: "partial", createdAt: at(-8, 11, 0), paidAt: at(-8, 11, 0) },
    { patientId: P(9), treatmentId: trt[10].id, amount: 600, paidAmount: 600, status: "paid", createdAt: at(-3, 12, 0), paidAt: at(-3, 12, 0) },
    { patientId: P(10), treatmentId: trt[11].id, amount: 8000, paidAmount: 4000, status: "partial", createdAt: monthsAgo(2), paidAt: monthsAgo(1) },
    { patientId: P(4), treatmentId: trt[6].id, amount: 250, paidAmount: 250, status: "paid", createdAt: at(-10, 10, 0), paidAt: at(-10, 10, 0) },
    { patientId: P(7), amount: 1500, paidAmount: 0, status: "unpaid", createdAt: monthsAgo(3, 12), notes: "تبييض — باقي المبلغ" },
    { patientId: P(8), amount: 800, paidAmount: 800, status: "paid", createdAt: monthsAgo(4, 8), paidAt: monthsAgo(4, 8) },
    { patientId: P(11), amount: 1200, paidAmount: 1200, status: "paid", createdAt: monthsAgo(4, 20), paidAt: monthsAgo(4, 20) },
    { patientId: P(2), amount: 300, paidAmount: 300, status: "paid", createdAt: monthsAgo(3, 5), paidAt: monthsAgo(3, 5) },
    { patientId: P(1), amount: 700, paidAmount: 700, status: "paid", createdAt: monthsAgo(1, 15), paidAt: monthsAgo(1, 15) },
  ].map((v) => ({ ...v, number: num() }));
  await db.insert(invoices).values(invValues);

  // ---------- dental chart ----------
  await db.insert(teeth).values([
    { patientId: P(0), tooth: 16, status: "filling", notes: "حشوة كومبوزيت" },
    { patientId: P(0), tooth: 36, status: "watch" },
    { patientId: P(1), tooth: 36, status: "caries", notes: "تسوس عميق" },
    { patientId: P(1), tooth: 46, status: "filling" },
    { patientId: P(1), tooth: 18, status: "missing" },
    { patientId: P(2), tooth: 46, status: "root", notes: "علاج عصب جارٍ" },
    { patientId: P(2), tooth: 47, status: "caries" },
    { patientId: P(5), tooth: 14, status: "crown", notes: "تاج خزفي — قيد التحضير" },
    { patientId: P(5), tooth: 15, status: "filling" },
    { patientId: P(5), tooth: 28, status: "missing" },
    { patientId: P(8), tooth: 48, status: "caries", notes: "ضرس عقل — للقلع" },
    { patientId: P(9), tooth: 37, status: "filling" },
    { patientId: P(11), tooth: 36, status: "missing", notes: "مخطط لزراعة" },
  ]);

  // ---------- x-rays ----------
  await db.insert(xrays).values([
    { patientId: P(11), title: "أشعة بانورامية", url: "/images/xray-pano.jpg", notes: "تقييم موقع الزراعة 36", createdAt: monthsAgo(0, Math.max(1, now.getDate() - 2)) },
    { patientId: P(2), title: "أشعة ضرس 46", url: "/images/xray-periapical.jpg", tooth: 46, notes: "قبل علاج العصب", createdAt: at(-5, 8, 45) },
    { patientId: P(1), title: "أشعة ضرس 36", url: "/images/xray-periapical.jpg", tooth: 36, createdAt: at(-6, 11, 50) },
  ]);

  await db.delete(notifications);

  // ---------- walk-in queue (today) ----------
  await db.insert(queueEntries).values([
    { patientId: P(3), ticketNumber: 1, reason: "ألم حاد في السن", status: "done", arrivedAt: ago(95), calledAt: ago(90), doneAt: ago(70) },
    { patientId: P(8), ticketNumber: 2, reason: "فحص سريع", status: "serving", arrivedAt: ago(55), calledAt: ago(20) },
    { patientId: P(5), ticketNumber: 3, reason: "استشارة", status: "waiting", arrivedAt: ago(25) },
    { patientId: P(10), ticketNumber: 4, reason: "متابعة التقويم", status: "waiting", arrivedAt: ago(12) },
    { patientId: P(6), ticketNumber: 5, reason: "ألم لثة", status: "waiting", arrivedAt: ago(4) },
  ]);

  return { seeded: true, patients: pts.length, appointments: appts.length };
}
