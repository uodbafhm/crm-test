import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 80 }).notNull(),
  lastName: varchar("last_name", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 160 }),
  birthDate: varchar("birth_date", { length: 10 }),
  gender: varchar("gender", { length: 12 }), // female | male
  address: text("address"),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  duration: integer("duration").default(30).notNull(), // minutes
  reason: varchar("reason", { length: 200 }),
  status: varchar("status", { length: 20 }).default("scheduled").notNull(),
  // pending | scheduled | confirmed | done | cancelled | noshow
  source: varchar("source", { length: 20 }).default("office").notNull(),
  // office | online — online bookings come from the public website (/book)
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const treatments = pgTable("treatments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  tooth: integer("tooth"), // FDI numbering 11..48
  type: varchar("type", { length: 120 }).notNull(),
  description: text("description"),
  cost: integer("cost").default(0).notNull(), // MAD
  status: varchar("status", { length: 20 }).default("planned").notNull(),
  // planned | in_progress | done
  performedAt: timestamp("performed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  treatmentId: integer("treatment_id").references(() => treatments.id, {
    onDelete: "set null",
  }),
  number: varchar("number", { length: 40 }).notNull(),
  amount: integer("amount").default(0).notNull(),
  paidAmount: integer("paid_amount").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("unpaid").notNull(),
  // unpaid | partial | paid
  paidAt: timestamp("paid_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const xrays = pgTable("xrays", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  tooth: integer("tooth"),
  title: varchar("title", { length: 160 }).notNull(),
  url: text("url").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teeth = pgTable(
  "teeth",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    tooth: integer("tooth").notNull(),
    status: varchar("status", { length: 20 }).default("healthy").notNull(),
    // healthy | caries | filling | crown | root | missing | implant | watch
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("teeth_patient_tooth_unique").on(t.patientId, t.tooth)],
);

export const queueEntries = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  ticketNumber: integer("ticket_number").notNull(),
  reason: varchar("reason", { length: 200 }),
  status: varchar("status", { length: 20 }).default("waiting").notNull(),
  // waiting | called | serving | done | skipped
  arrivedAt: timestamp("arrived_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  calledAt: timestamp("called_at", { withTimezone: true }),
  doneAt: timestamp("done_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id, {
    onDelete: "cascade",
  }),
  kind: varchar("kind", { length: 20 }).default("reminder").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- relations ----------
export const patientsRelations = relations(patients, ({ many }) => ({
  appointments: many(appointments),
  treatments: many(treatments),
  invoices: many(invoices),
  xrays: many(xrays),
  teeth: many(teeth),
  queueEntries: many(queueEntries),
}));

export const queueEntriesRelations = relations(queueEntries, ({ one }) => ({
  patient: one(patients, {
    fields: [queueEntries.patientId],
    references: [patients.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
}));

export const treatmentsRelations = relations(treatments, ({ one }) => ({
  patient: one(patients, {
    fields: [treatments.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [treatments.appointmentId],
    references: [appointments.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  treatment: one(treatments, {
    fields: [invoices.treatmentId],
    references: [treatments.id],
  }),
}));

export const xraysRelations = relations(xrays, ({ one }) => ({
  patient: one(patients, {
    fields: [xrays.patientId],
    references: [patients.id],
  }),
}));

export const teethRelations = relations(teeth, ({ one }) => ({
  patient: one(patients, {
    fields: [teeth.patientId],
    references: [patients.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  appointment: one(appointments, {
    fields: [notifications.appointmentId],
    references: [appointments.id],
  }),
}));

// ---------- types ----------
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Treatment = typeof treatments.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Xray = typeof xrays.$inferSelect;
export type ToothRecord = typeof teeth.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type QueueEntry = typeof queueEntries.$inferSelect;

export const QUEUE_STATUS_FLOW = ["waiting", "called", "serving", "done", "skipped"] as const;
