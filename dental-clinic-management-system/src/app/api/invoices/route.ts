import { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const conds = [];
  const patientId = p.get("patientId");
  const status = p.get("status");
  if (patientId) conds.push(eq(invoices.patientId, Number(patientId)));
  if (status) conds.push(eq(invoices.status, status));

  const rows = await db.query.invoices.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: desc(invoices.createdAt),
    with: { patient: true, treatment: true },
  });
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.patientId || body.amount == null) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  const year = new Date().getFullYear();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices);
  const number = `FAC-${year}-${String(Number(count) + 1).padStart(4, "0")}`;
  const [row] = await db
    .insert(invoices)
    .values({
      patientId: Number(body.patientId),
      treatmentId: body.treatmentId ? Number(body.treatmentId) : null,
      number,
      amount: Number(body.amount) || 0,
      paidAmount: Number(body.paidAmount) || 0,
      status: Number(body.paidAmount) >= Number(body.amount) && Number(body.amount) > 0 ? "paid" : Number(body.paidAmount) > 0 ? "partial" : "unpaid",
      paidAt: Number(body.paidAmount) > 0 ? new Date() : null,
      notes: body.notes?.trim() || null,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
