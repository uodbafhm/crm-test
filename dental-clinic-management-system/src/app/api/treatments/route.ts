import { NextRequest } from "next/server";
import { db } from "@/db";
import { treatments } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const conds = [];
  const patientId = p.get("patientId");
  const status = p.get("status");
  if (patientId) conds.push(eq(treatments.patientId, Number(patientId)));
  if (status) conds.push(eq(treatments.status, status));

  const rows = await db.query.treatments.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: desc(treatments.performedAt),
    with: { patient: true },
  });
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.patientId || !body.type?.trim()) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  const performedAt = body.performedAt ? new Date(body.performedAt) : new Date();
  const [row] = await db
    .insert(treatments)
    .values({
      patientId: Number(body.patientId),
      appointmentId: body.appointmentId ? Number(body.appointmentId) : null,
      tooth: body.tooth ? Number(body.tooth) : null,
      type: body.type.trim(),
      description: body.description?.trim() || null,
      cost: Number(body.cost) || 0,
      status: body.status || "planned",
      performedAt: isNaN(performedAt.getTime()) ? new Date() : performedAt,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
