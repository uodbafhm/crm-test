import { NextRequest } from "next/server";
import { db } from "@/db";
import { teeth } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return Response.json({ error: "missing_patient" }, { status: 400 });
  const rows = await db
    .select()
    .from(teeth)
    .where(eq(teeth.patientId, Number(patientId)));
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.patientId || !body.tooth) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  const patientId = Number(body.patientId);
  const tooth = Number(body.tooth);
  const status = body.status || "healthy";
  const notes = body.notes ?? null;

  const existing = await db
    .select()
    .from(teeth)
    .where(and(eq(teeth.patientId, patientId), eq(teeth.tooth, tooth)));

  let row;
  if (existing.length) {
    [row] = await db
      .update(teeth)
      .set({ status, notes, updatedAt: new Date() })
      .where(and(eq(teeth.patientId, patientId), eq(teeth.tooth, tooth)))
      .returning();
  } else {
    [row] = await db.insert(teeth).values({ patientId, tooth, status, notes }).returning();
  }
  return Response.json(row);
}
