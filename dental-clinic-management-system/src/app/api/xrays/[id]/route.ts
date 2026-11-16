import { NextRequest } from "next/server";
import { db } from "@/db";
import { xrays } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(xrays).where(eq(xrays.id, Number(id)));
  return Response.json({ ok: true });
}
