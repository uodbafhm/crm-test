import { NextRequest } from "next/server";
import { db } from "@/db";
import { patients, queueEntries } from "@/db/schema";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function dayBounds(iso?: string | null) {
  const d = iso ? new Date(iso + "T12:00:00") : new Date();
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const { start, end } = dayBounds(req.nextUrl.searchParams.get("date"));

  const entries = await db.query.queueEntries.findMany({
    where: and(
      gte(queueEntries.arrivedAt, start),
      lte(queueEntries.arrivedAt, end),
    ),
    orderBy: asc(queueEntries.arrivedAt),
    with: { patient: true },
  });

  const active = entries
    .filter((e) => e.status === "called" || e.status === "serving")
    .sort(
      (a, b) =>
        new Date(b.calledAt ?? b.arrivedAt).getTime() -
        new Date(a.calledAt ?? a.arrivedAt).getTime(),
    );

  return Response.json({
    entries,
    current: active[0] ?? null,
    waiting: entries.filter((e) => e.status === "waiting"),
    doneToday: entries.filter((e) => e.status === "done"),
    waitingCount: entries.filter((e) => e.status === "waiting").length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  let patientId = Number(body.patientId) || 0;
  if (!patientId) {
    if (!body.firstName?.trim() || !body.lastName?.trim() || !body.phone?.trim()) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }
    const [p] = await db
      .insert(patients)
      .values({
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        phone: body.phone.trim(),
        gender: body.gender || null,
      })
      .returning();
    patientId = p.id;
  }

  const { start, end } = dayBounds();
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${queueEntries.ticketNumber}), 0) + 1` })
    .from(queueEntries)
    .where(and(gte(queueEntries.arrivedAt, start), lte(queueEntries.arrivedAt, end)));

  const [row] = await db
    .insert(queueEntries)
    .values({
      patientId,
      ticketNumber: Number(next),
      reason: body.reason?.trim() || "فحص مباشر (Walk-in)",
      status: "waiting",
    })
    .returning();
  return Response.json(row, { status: 201 });
}
