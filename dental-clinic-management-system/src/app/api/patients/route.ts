import { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices, patients } from "@/db/schema";
import { desc, eq, like, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  let rows;
  if (q) {
    const likeq = `%${q}%`;
    rows = await db
      .select()
      .from(patients)
      .where(
        or(
          like(patients.firstName, likeq),
          like(patients.lastName, likeq),
          like(patients.phone, likeq),
        ),
      )
      .orderBy(desc(patients.createdAt));
  } else {
    rows = await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  const balances = await db
    .select({
      patientId: invoices.patientId,
      due: sql<number>`coalesce(sum(${invoices.amount} - ${invoices.paidAmount}), 0)`,
      total: sql<number>`coalesce(sum(${invoices.amount}), 0)`,
    })
    .from(invoices)
    .groupBy(invoices.patientId);

  const dueMap = new Map(balances.map((b) => [b.patientId, Number(b.due)]));
  const totalMap = new Map(balances.map((b) => [b.patientId, Number(b.total)]));

  const data = rows.map((p) => ({
    ...p,
    balanceDue: dueMap.get(p.id) ?? 0,
    totalBilled: totalMap.get(p.id) ?? 0,
  }));
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.firstName?.trim() || !body.lastName?.trim() || !body.phone?.trim()) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  const [row] = await db
    .insert(patients)
    .values({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      birthDate: body.birthDate || null,
      gender: body.gender || null,
      address: body.address?.trim() || null,
      allergies: body.allergies?.trim() || null,
      chronicConditions: body.chronicConditions?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
