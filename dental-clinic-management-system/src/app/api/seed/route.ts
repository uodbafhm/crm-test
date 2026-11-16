import { NextRequest } from "next/server";
import { seed } from "@/db/seed";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("force") === "1";
    const result = await seed({ force });
    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "seed_failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handler(req);
}
export async function POST(req: NextRequest) {
  return handler(req);
}
