import { NextRequest } from "next/server";
import { db } from "@/db";
import { xrays } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  const rows = patientId
    ? await db
        .select()
        .from(xrays)
        .where(eq(xrays.patientId, Number(patientId)))
        .orderBy(desc(xrays.createdAt))
    : await db.select().from(xrays).orderBy(desc(xrays.createdAt));
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.patientId || !body.title?.trim() || !body.url?.trim()) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  const [row] = await db
    .insert(xrays)
    .values({
      patientId: Number(body.patientId),
      tooth: body.tooth ? Number(body.tooth) : null,
      title: body.title.trim(),
      url: body.url.trim(),
      notes: body.notes?.trim() || null,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
