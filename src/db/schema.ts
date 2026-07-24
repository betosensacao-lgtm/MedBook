import {
  text,
  timestamp,
  boolean,
  integer,
  real,
  uuid,
  jsonb,
  date,
  time,
  pgSchema,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const medbookSchema = pgSchema("medbook");
export const pgTable = medbookSchema.table;

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = medbookSchema.enum("user_role", [
  "patient",
  "clinic_admin",
  "professional",
]);

export const appointmentStatusEnum = medbookSchema.enum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const clinicSpecialtyEnum = medbookSchema.enum("clinic_specialty", [
  "general_practice",
  "dentistry",
  "aesthetics",
  "cardiology",
  "dermatology",
  "neurology",
  "orthopedics",
  "ophthalmology",
  "gynecology",
  "pediatrics",
  "psychiatry",
  "other",
]);

export const genderEnum = medbookSchema.enum("gender", [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
]);

export const triageUrgencyEnum = medbookSchema.enum("urgency_classification", ["RED", "YELLOW", "GREEN"]);

export const triageStatusEnum = medbookSchema.enum("triage_status", ["PENDING", "REVIEWED", "ARCHIVED"]);

export const whatsappSessionStatusEnum = medbookSchema.enum("whatsapp_session_status", [
  "active",
  "completed",
  "abandoned",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("patient"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  supabaseId: text("supabase_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  specialty: clinicSpecialtyEnum("specialty").notNull(),
  description: text("description"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  street: text("street"),
  addressNumber: text("address_number"),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("BR"),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  // WhatsApp Business API (ready for integration)
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappAccessToken: text("whatsapp_access_token"),
  whatsappWabaId: text("whatsapp_waba_id"),
  whatsappVerified: boolean("whatsapp_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const professionals = pgTable("professionals", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  registrationNumber: text("registration_number"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  availableDays: jsonb("available_days").$type<number[]>().default([1, 2, 3, 4, 5]),
  workingHoursStart: time("working_hours_start").default("08:00"),
  workingHoursEnd: time("working_hours_end").default("18:00"),
  slotDuration: integer("slot_duration").notNull().default(30),
  breakStart: time("break_start"),
  breakEnd: time("break_end"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const triageSessions = pgTable("triage_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientName: text("patient_name").notNull(),
  patientEmail: text("patient_email").notNull(),
  mainSymptom: text("main_symptom"),
  evolutionTime: text("evolution_time"),
  painIntensity: integer("pain_intensity"),
  relevantHistory: text("relevant_history"),
  urgency: triageUrgencyEnum("urgency_classification"),
  suggestedSpecialty: clinicSpecialtyEnum("suggested_specialty"),
  classificationJustification: text("classification_justification"),
  aiSummary: text("ai_summary"),
  messageCount: integer("message_count").default(0),
  modelUsed: text("model_used"),
  status: triageStatusEnum("status").notNull().default("PENDING"),
  source: text("source").default("web"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const triageMessages = pgTable("triage_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => triageSessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => users.id),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
  professionalId: uuid("professional_id").notNull().references(() => professionals.id),
  triageSessionId: uuid("triage_session_id").references(() => triageSessions.id),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const preAnamnesis = pgTable("pre_anamnesis", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => users.id),
  fullName: text("full_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: genderEnum("gender"),
  phone: text("phone"),
  emergencyContact: text("emergency_contact"),
  chiefComplaint: text("chief_complaint").notNull(),
  symptomsDescription: text("symptoms_description"),
  symptomsDuration: text("symptoms_duration"),
  painScale: integer("pain_scale"),
  currentMedications: jsonb("current_medications").$type<string[]>().default([]),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  chronicConditions: jsonb("chronic_conditions").$type<string[]>().default([]),
  previousSurgeries: text("previous_surgeries"),
  familyHistory: text("family_history"),
  bloodType: text("blood_type"),
  height: real("height"),
  weight: real("weight"),
  hasInsurance: boolean("has_insurance").notNull().default(false),
  insuranceProvider: text("insurance_provider"),
  insurancePlanNumber: text("insurance_plan_number"),
  consentGiven: boolean("consent_given").notNull().default(false),
  consentDate: timestamp("consent_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
  phoneNumber: text("phone_number").notNull(),
  patientName: text("patient_name"),
  patientEmail: text("patient_email"),
  triageSessionId: uuid("triage_session_id").references(() => triageSessions.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  status: whatsappSessionStatusEnum("status").notNull().default("active"),
  currentStep: text("current_step").default("welcome"),
  contextData: jsonb("context_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clinicContext = pgTable("clinic_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "super_admin"] }).notNull().default("admin"),
  clinicId: uuid("clinic_id").references(() => clinics.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  content: text("content").notNull(),
  chunkCount: integer("chunk_count").notNull().default(0),
  status: text("status", { enum: ["processing", "ready", "error"] }).notNull().default("processing"),
  uploadedBy: uuid("uploaded_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull().unique(),
  clinicId: text("clinic_id"),
  userIdentifier: text("user_identifier"),
  patientName: text("patient_name"),
  patientPhone: text("patient_phone"),
  patientEmail: text("patient_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  owner: one(users, { fields: [clinics.ownerId], references: [users.id] }),
  professionals: many(professionals),
  appointments: many(appointments),
}));

export const professionalsRelations = relations(professionals, ({ one, many }) => ({
  clinic: one(clinics, { fields: [professionals.clinicId], references: [clinics.id] }),
  user: one(users, { fields: [professionals.userId], references: [users.id] }),
  appointments: many(appointments),
}));

export const triageSessionsRelations = relations(triageSessions, ({ many }) => ({
  messages: many(triageMessages),
  appointments: many(appointments),
}));

export const triageMessagesRelations = relations(triageMessages, ({ one }) => ({
  session: one(triageSessions, { fields: [triageMessages.sessionId], references: [triageSessions.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(users, { fields: [appointments.patientId], references: [users.id] }),
  clinic: one(clinics, { fields: [appointments.clinicId], references: [clinics.id] }),
  professional: one(professionals, { fields: [appointments.professionalId], references: [professionals.id] }),
  preAnamnesis: one(preAnamnesis, { fields: [appointments.id], references: [preAnamnesis.appointmentId] }),
  triageSession: one(triageSessions, { fields: [appointments.triageSessionId], references: [triageSessions.id] }),
}));

export const preAnamnesisRelations = relations(preAnamnesis, ({ one }) => ({
  appointment: one(appointments, { fields: [preAnamnesis.appointmentId], references: [appointments.id] }),
  patient: one(users, { fields: [preAnamnesis.patientId], references: [users.id] }),
}));

export const whatsappSessionsRelations = relations(whatsappSessions, ({ one }) => ({
  clinic: one(clinics, { fields: [whatsappSessions.clinicId], references: [clinics.id] }),
  triageSession: one(triageSessions, { fields: [whatsappSessions.triageSessionId], references: [triageSessions.id] }),
  appointment: one(appointments, { fields: [whatsappSessions.appointmentId], references: [appointments.id] }),
}));

export const adminUsersRelations = relations(adminUsers, ({ one }) => ({
  clinic: one(clinics, { fields: [adminUsers.clinicId], references: [clinics.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(adminUsers, { fields: [passwordResetTokens.userId], references: [adminUsers.id] }),
}));
