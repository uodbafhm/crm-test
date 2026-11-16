import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { and, asc, eq, gte, lt, lte } from "drizzle-orm";

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

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const conds = [];
  const from = p.get("from");
  const to = p.get("to");
  const date = p.get("date");
  const status = p.get("status");
  const patientId = p.get("patientId");

  if (date) {
    const d = new Date(date + "T12:00:00");
    conds.push(gte(appointments.date, startOfDay(d)));
    conds.push(lte(appointments.date, endOfDay(d)));
  } else {
    if (from) conds.push(gte(appointments.date, new Date(from)));
    if (to) conds.push(lt(appointments.date, new Date(to)));
  }
  if (status) conds.push(eq(appointments.status, status));
  if (patientId) conds.push(eq(appointments.patientId, Number(patientId)));

  const rows = await db.query.appointments.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: asc(appointments.date),
    with: { patient: true },
  });
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.patientId || !body.date) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  const date = new Date(body.date);
  if (isNaN(date.getTime())) {
    return Response.json({ error: "invalid_date" }, { status: 400 });
  }
  const [row] = await db
    .insert(appointments)
    .values({
      patientId: Number(body.patientId),
      date,
      duration: Number(body.duration) || 30,
      reason: body.reason?.trim() || null,
      status: body.status || "scheduled",
      notes: body.notes?.trim() || null,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
