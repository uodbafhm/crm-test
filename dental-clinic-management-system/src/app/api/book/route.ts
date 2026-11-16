import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, notifications, patients } from "@/db/schema";
import { and, asc, eq, gte, lte, notInArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// clinic working hours for online booking
const OPEN_HOUR = 9;
const CLOSE_HOUR = 19; // last slot = 18:30
const SLOT_MIN = 30;
const LEAD_HOURS = 2; // book at least 2 hours in advance

function bounds(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const start = new Date(iso + "T00:00:00");
  const end = new Date(iso + "T23:59:59");
  if (isNaN(d.getTime())) return null;
  return { start, end };
}

async function takenSlots(iso: string) {
  const b = bounds(iso);
  if (!b) return null;
  const rows = await db
    .select({ date: appointments.date, duration: appointments.duration })
    .from(appointments)
    .where(
      and(
        gte(appointments.date, b.start),
        lte(appointments.date, b.end),
        notInArray(appointments.status, ["cancelled", "noshow"]),
      ),
    )
    .orderBy(asc(appointments.date));
  return rows;
}

/** GET /api/book?date=YYYY-MM-DD → available slots for that day */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return Response.json({ error: "missing_date" }, { status: 400 });
  const b = bounds(date);
  if (!b) return Response.json({ error: "invalid_date" }, { status: 400 });

  const rows = await takenSlots(date);
  const now = Date.now();
  const minStart = now + LEAD_HOURS * 3600_000;

  const slots: { time: string; available: boolean }[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (const m of [0, SLOT_MIN]) {
      const start = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      const startMs = start.getTime();
      const taken = (rows ?? []).some((r) => {
        const s = r.date.getTime();
        const e = s + (r.duration || SLOT_MIN) * 60_000;
        return startMs >= s && startMs < e;
      });
      slots.push({
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        available: !taken && startMs >= minStart,
      });
    }
  }
  return Response.json({ date, slots });
}

/** POST /api/book — public: create an online booking request (pending) */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phone = String(body.phone ?? "").replace(/\s/g, "");
  const reason = String(body.reason ?? "").trim() || "حجز من الموقع";
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");

  if (!firstName || !lastName || phone.length < 8 || !date || !time) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const b = bounds(date);
  if (!b) return Response.json({ error: "invalid_date" }, { status: 400 });

  const start = new Date(`${date}T${time}:00`);
  if (isNaN(start.getTime())) return Response.json({ error: "invalid_time" }, { status: 400 });
  if (start.getTime() < Date.now() + LEAD_HOURS * 3600_000) {
    return Response.json({ error: "too_soon" }, { status: 409 });
  }

  // re-check availability race
  const rows = await takenSlots(date);
  const clash = (rows ?? []).some((r) => {
    const s = r.date.getTime();
    const e = s + (r.duration || SLOT_MIN) * 60_000;
    return start.getTime() >= s && start.getTime() < e;
  });
  if (clash) return Response.json({ error: "slot_taken" }, { status: 409 });

  // match patient by phone, otherwise create a new record
  let [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.phone, phone))
    .limit(1);
  if (!patient) {
    [patient] = await db
      .insert(patients)
      .values({ firstName, lastName, phone })
      .returning();
  }

  const [appt] = await db
    .insert(appointments)
    .values({
      patientId: patient.id,
      date: start,
      duration: SLOT_MIN,
      reason,
      status: "pending",
      source: "online",
      notes: String(body.notes ?? "").trim() || null,
    })
    .returning();

  // notify the doctor in the app bell
  const dateAr = new Intl.DateTimeFormat("ar-MA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(start);
  await db.insert(notifications).values({
    appointmentId: appt.id,
    kind: "booking",
    message: `طلب حجز جديد من الموقع: ${patient.firstName} ${patient.lastName} — ${dateAr} على ${time}`,
  });

  return Response.json(
    { ok: true, ref: `RDV-${String(appt.id).padStart(5, "0")}`, patientId: patient.id },
    { status: 201 },
  );
}
