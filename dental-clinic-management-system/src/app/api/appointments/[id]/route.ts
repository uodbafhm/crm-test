import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const values: Record<string, unknown> = {};
  if (body.date) {
    const d = new Date(body.date);
    if (!isNaN(d.getTime())) values.date = d;
  }
  if (body.duration != null) values.duration = Number(body.duration);
  if (body.reason !== undefined) values.reason = body.reason;
  if (body.notes !== undefined) values.notes = body.notes;
  if (body.status) values.status = body.status;
  if (body.patientId) values.patientId = Number(body.patientId);

  const [row] = await db
    .update(appointments)
    .set(values)
    .where(eq(appointments.id, Number(id)))
    .returning();
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(row);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(appointments).where(eq(appointments.id, Number(id)));
  return Response.json({ ok: true });
}
