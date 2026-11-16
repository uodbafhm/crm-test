import { NextRequest } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await db.query.patients.findFirst({
    where: eq(patients.id, Number(id)),
  });
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(row);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const values: Partial<typeof patients.$inferInsert> = {};
  const required = ["firstName", "lastName", "phone"] as const;
  const nullable = [
    "email",
    "birthDate",
    "gender",
    "address",
    "allergies",
    "chronicConditions",
    "notes",
  ] as const;
  for (const k of required) {
    if (k in body && typeof body[k] === "string" && body[k].trim()) {
      values[k] = body[k].trim();
    }
  }
  for (const k of nullable) {
    if (k in body) values[k] = body[k] === "" || body[k] == null ? null : body[k];
  }
  const [row] = await db
    .update(patients)
    .set(values)
    .where(eq(patients.id, Number(id)))
    .returning();
  return Response.json(row);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(patients).where(eq(patients.id, Number(id)));
  return Response.json({ ok: true });
}
