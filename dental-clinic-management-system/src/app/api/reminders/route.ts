import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, notifications } from "@/db/schema";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET — the automatic reminder engine.
 * Scans appointments starting within the next 24 hours and creates
 * reminder notifications for the doctor if none exists yet ("auto" kind).
 * Returns latest notifications + unread count.
 */
export async function GET() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000);

  const upcoming = await db.query.appointments.findMany({
    where: and(
      gte(appointments.date, new Date(now.getTime() - 30 * 60000)),
      lte(appointments.date, in24h),
      or(eq(appointments.status, "scheduled"), eq(appointments.status, "confirmed")),
    ),
    with: { patient: true },
  });

  let created = 0;
  for (const a of upcoming) {
    const exists = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.appointmentId, a.id))
      .limit(1);
    if (exists.length) continue;

    const mins = Math.round((a.date.getTime() - now.getTime()) / 60000);
    const time = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(a.date);
    const isToday = a.date.toDateString() === now.toDateString();
    const when = isToday
      ? mins <= 60
        ? mins <= 0
          ? "الآن"
          : `بعد ${mins} دقيقة`
        : `اليوم على الساعة ${time}`
      : `غداً على الساعة ${time}`;
    const patientName = a.patient
      ? `${a.patient.firstName} ${a.patient.lastName}`
      : "مريض";
    await db.insert(notifications).values({
      appointmentId: a.id,
      kind: "auto",
      message: `تذكير تلقائي: موعد ${a.reason ?? ""} — ${patientName} ${when}`,
    });
    created++;
  }

  const list = await db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(15);

  const [{ total: unread }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(notifications)
    .where(eq(notifications.read, false));

  return Response.json({ created, unread: Number(unread), notifications: list });
}

/** PATCH — mark notifications as read */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.all) {
    await db.update(notifications).set({ read: true });
  } else if (Array.isArray(body.ids) && body.ids.length) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(inArray(notifications.id, body.ids.map(Number)));
  }
  return Response.json({ ok: true });
}

export async function DELETE() {
  await db.delete(notifications).where(eq(notifications.read, true));
  return Response.json({ ok: true });
}
