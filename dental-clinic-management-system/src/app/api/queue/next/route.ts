import { db } from "@/db";
import { queueEntries, type QueueEntry } from "@/db/schema";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * POST — advance the queue by one step:
 * 1. the current patient (serving or called, most recently activated) → done
 * 2. the earliest waiting patient → called
 * If nobody is active, simply calls the first waiting patient.
 */
export async function POST() {
  const { start, end } = todayBounds();
  const todays = await db.query.queueEntries.findMany({
    where: and(
      gte(queueEntries.arrivedAt, start),
      lte(queueEntries.arrivedAt, end),
      inArray(queueEntries.status, ["waiting", "called", "serving"]),
    ),
    orderBy: asc(queueEntries.arrivedAt),
  });

  // current = the serving patient, or the most recently called one
  const active = todays
    .filter((e) => e.status === "serving" || e.status === "called")
    .sort(
      (a, b) =>
        new Date(b.calledAt ?? b.arrivedAt).getTime() -
        new Date(a.calledAt ?? a.arrivedAt).getTime(),
    );
  const current: QueueEntry | null = active[0] ?? null;

  let finished: QueueEntry | null = null;
  if (current) {
    const [row] = await db
      .update(queueEntries)
      .set({ status: "done", doneAt: new Date() })
      .where(eq(queueEntries.id, current.id))
      .returning();
    finished = row;
  }

  // call the first still-waiting patient
  const waiting = todays.filter((e) => e.status === "waiting");
  let called: QueueEntry | null = null;
  if (waiting.length) {
    const [row] = await db
      .update(queueEntries)
      .set({ status: "called", calledAt: new Date() })
      .where(eq(queueEntries.id, waiting[0].id))
      .returning();
    called = row;
  }

  return Response.json({ called, finishedServing: finished });
}
