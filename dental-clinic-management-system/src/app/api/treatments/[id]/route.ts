import { NextRequest } from "next/server";
import { db } from "@/db";
import { treatments } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const values: Partial<typeof treatments.$inferInsert> = {};
  if (body.type !== undefined) values.type = body.type;
  if (body.description !== undefined) values.description = body.description || null;
  if (body.cost !== undefined) values.cost = Number(body.cost) || 0;
  if (body.status !== undefined) values.status = body.status;
  if (body.tooth !== undefined) values.tooth = body.tooth ? Number(body.tooth) : null;
  if (body.performedAt !== undefined) {
    const d = new Date(body.performedAt);
    if (!isNaN(d.getTime())) values.performedAt = d;
  }
  const [row] = await db
    .update(treatments)
    .set(values)
    .where(eq(treatments.id, Number(id)))
    .returning();
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(row);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(treatments).where(eq(treatments.id, Number(id)));
  return Response.json({ ok: true });
}
