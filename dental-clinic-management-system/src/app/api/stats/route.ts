import { db } from "@/db";
import { appointments, invoices, patients, treatments } from "@/db/schema";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // ----- today -----
  const todayAppts = await db.query.appointments.findMany({
    where: and(
      gte(appointments.date, startOfDay(now)),
      lte(appointments.date, endOfDay(now)),
    ),
    orderBy: asc(appointments.date),
    with: { patient: true },
  });

  const next =
    todayAppts.find(
      (a) =>
        a.date.getTime() > now.getTime() &&
        (a.status === "scheduled" || a.status === "confirmed"),
    ) ?? null;

  // ----- patients -----
  const [{ total: patientsTotal }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(patients);
  const [{ total: newPatients }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(patients)
    .where(gte(patients.createdAt, monthStart));

  // ----- revenue -----
  const [{ revenue: monthRevenue }] = await db
    .select({ revenue: sql<number>`coalesce(sum(${invoices.paidAmount}), 0)` })
    .from(invoices)
    .where(gte(invoices.createdAt, monthStart));

  const [{ due: unpaidTotal, cnt: unpaidCount }] = await db
    .select({
      due: sql<number>`coalesce(sum(${invoices.amount} - ${invoices.paidAmount}), 0)`,
      cnt: sql<number>`count(*)`,
    })
    .from(invoices)
    .where(sql`${invoices.status} != 'paid'`);

  // revenue per month (last 6 months) — based on payment date or creation
  const revenueRows = await db
    .select({ paidAmount: invoices.paidAmount, createdAt: invoices.createdAt, paidAt: invoices.paidAt })
    .from(invoices)
    .where(gte(invoices.createdAt, sixMonthsAgo));

  const months: { key: string; month: number; year: number; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.getMonth(),
      year: d.getFullYear(),
      value: 0,
    });
  }
  for (const r of revenueRows) {
    const ref = r.paidAt ?? r.createdAt;
    const key = `${ref.getFullYear()}-${ref.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) m.value += r.paidAmount;
  }
  const revenue6 = months.map((m) => ({
    label: new Intl.DateTimeFormat("ar-MA", { month: "short" }).format(
      new Date(m.year, m.month, 1),
    ),
    value: m.value,
  }));

  // ----- treatment distribution -----
  const byType = await db
    .select({ type: treatments.type, count: sql<number>`count(*)` })
    .from(treatments)
    .groupBy(treatments.type)
    .orderBy(sql`count(*) desc`)
    .limit(6);

  // ----- upcoming (next 48h) -----
  const in48h = new Date(now.getTime() + 48 * 3600 * 1000);
  const upcoming = await db.query.appointments.findMany({
    where: and(
      gte(appointments.date, now),
      lte(appointments.date, in48h),
      sql`${appointments.status} in ('scheduled','confirmed')`,
    ),
    orderBy: asc(appointments.date),
    with: { patient: true },
    limit: 6,
  });

  // ----- week workload -----
  const weekStart = startOfDay(new Date(now));
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekRows = await db
    .select({ date: appointments.date, status: appointments.status })
    .from(appointments)
    .where(
      and(gte(appointments.date, weekStart), lte(appointments.date, weekEnd)),
    );
  const weekLoad = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const count = weekRows.filter(
      (r) => r.date.getDate() === d.getDate() && r.date.getMonth() === d.getMonth() && r.status !== "cancelled",
    ).length;
    return {
      label: new Intl.DateTimeFormat("ar-MA", { weekday: "short" }).format(d),
      count,
      isToday: d.toDateString() === now.toDateString(),
    };
  });

  const activeTreatments = await db
    .select({ count: sql<number>`count(*)` })
    .from(treatments)
    .where(eq(treatments.status, "in_progress"));

  return Response.json({
    today: {
      appointments: todayAppts,
      total: todayAppts.length,
      done: todayAppts.filter((a) => a.status === "done").length,
      next,
    },
    patients: { total: Number(patientsTotal), newThisMonth: Number(newPatients) },
    revenue: { month: Number(monthRevenue), last6: revenue6 },
    invoices: { unpaidCount: Number(unpaidCount), unpaidTotal: Number(unpaidTotal) },
    treatmentsByType: byType.map((t) => ({ type: t.type, count: Number(t.count) })),
    activeTreatments: Number(activeTreatments[0]?.count ?? 0),
    upcoming,
    weekLoad,
  });
}
