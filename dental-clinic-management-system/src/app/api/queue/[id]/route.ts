import { NextRequest } from "next/server";
import { db } from "@/db";
import { queueEntries } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const VALID = ["waiting", "called", "serving", "done", "skipped"];

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const values: Partial<typeof queueEntries.$inferInsert> = {};

  if (body.status && VALID.includes(body.status)) {
    values.status = body.status;
    if (body.status === "called") values.calledAt = new Date();
    if (body.status === "done") values.doneAt = new Date();
  }
  if (body.action === "postpone") {
    // move to the end of the queue
    values.arrivedAt = new Date();
    values.status = "waiting";
  }
  if (body.reason !== undefined) values.reason = body.reason || null;

  const [row] = await db
    .update(queueEntries)
    .set(values)
    .where(eq(queueEntries.id, Number(id)))
    .returning();
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(row);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(queueEntries).where(eq(queueEntries.id, Number(id)));
  return Response.json({ ok: true });
}
