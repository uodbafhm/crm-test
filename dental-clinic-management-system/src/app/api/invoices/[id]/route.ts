import { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function statusFor(amount: number, paid: number): string {
  if (paid >= amount && amount > 0) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const current = await db.query.invoices.findFirst({
    where: eq(invoices.id, Number(id)),
  });
  if (!current) return Response.json({ error: "not_found" }, { status: 404 });

  const amount = body.amount !== undefined ? Number(body.amount) || 0 : current.amount;
  const paid =
    body.paidAmount !== undefined ? Number(body.paidAmount) || 0 : current.paidAmount;
  const status = statusFor(amount, paid);

  const [row] = await db
    .update(invoices)
    .set({
      amount,
      paidAmount: paid,
      status,
      paidAt: paid > 0 ? current.paidAt ?? new Date() : null,
      notes: body.notes !== undefined ? body.notes || null : current.notes,
    })
    .where(eq(invoices.id, Number(id)))
    .returning();
  return Response.json(row);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(invoices).where(eq(invoices.id, Number(id)));
  return Response.json({ ok: true });
}
