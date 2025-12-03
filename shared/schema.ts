import { z } from "zod";
import { pgTable, serial, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Meeting Metadata Schema
export const meetingMetadataSchema = z.object({
  title: z.string().min(1, "Meeting title is required"),
  attendees: z.string().min(1, "Attendees are required"),
  meetingType: z.enum(["decision", "discussion", "planning", "review", "other"]),
  audienceLevel: z.enum(["exec", "ic"]),
});

export type MeetingMetadata = z.infer<typeof meetingMetadataSchema>;

// Action Item Schema
export const actionItemSchema = z.object({
  owner: z.string(),
  task: z.string(),
  dueDate: z.string(),
  source: z.string().optional(), // Source document reference
});

export type ActionItem = z.infer<typeof actionItemSchema>;

// Source Citation Schema
export const sourceSchema = z.object({
  label: z.string(),
  filename: z.string(),
  section: z.string().nullable(),
});

export type Source = z.infer<typeof sourceSchema>;

// Brief Schema
export const briefSchema = z.object({
  goal: z.string(),
  context: z.array(z.string()),
  options: z.array(z.object({
    option: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
  })),
  risksTradeoffs: z.array(z.string()),
  decisions: z.array(z.string()),
  actionChecklist: z.array(actionItemSchema),
  sources: z.array(sourceSchema).optional(), // Document sources used
  wordCount: z.number(),
  generatedAt: z.string(),
});

export type Brief = z.infer<typeof briefSchema>;

// Brief Generation Request Schema
export const generateBriefRequestSchema = z.object({
  metadata: meetingMetadataSchema,
  documentContents: z.array(z.object({
    filename: z.string(),
    content: z.string(),
  })),
});

export type GenerateBriefRequest = z.infer<typeof generateBriefRequestSchema>;

// Brief Generation Response Schema
export const generateBriefResponseSchema = z.object({
  brief: briefSchema,
  success: z.boolean(),
  error: z.string().optional(),
});

export type GenerateBriefResponse = z.infer<typeof generateBriefResponseSchema>;

// Uploaded File Schema (for frontend state)
export const uploadedFileSchema = z.object({
  id: z.string(),
  file: z.instanceof(File),
  name: z.string(),
  size: z.number(),
  type: z.string(),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;

// Database Tables
// Referenced from blueprint:javascript_database

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

// Meetings table
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: varchar("title", { length: 500 }).notNull(),
  attendees: text("attendees").notNull(),
  meetingType: varchar("meeting_type", { length: 50 }).notNull(),
  audienceLevel: varchar("audience_level", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true });

// Briefs table
export const briefs = pgTable("briefs", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  userId: integer("user_id").references(() => users.id),
  goal: text("goal").notNull(),
  context: jsonb("context").notNull().$type<string[]>(),
  options: jsonb("options").notNull().$type<Array<{ option: string; pros: string[]; cons: string[] }>>(),
  risksTradeoffs: jsonb("risks_tradeoffs").notNull().$type<string[]>(),
  decisions: jsonb("decisions").notNull().$type<string[]>(),
  actionChecklist: jsonb("action_checklist").notNull().$type<Array<{ owner: string; task: string; dueDate: string; source?: string }>>(),
  sources: jsonb("sources").$type<Array<{ label: string; filename: string; section: string | null }>>(),
  wordCount: integer("word_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DbBrief = typeof briefs.$inferSelect;
export type InsertBrief = typeof briefs.$inferInsert;
export const insertBriefSchema = createInsertSchema(briefs).omit({ id: true, createdAt: true });

// Documents table (for tracking uploaded files)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  filename: varchar("filename", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  contentHash: varchar("content_hash", { length: 64 }), // For version detection
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });

// Brief generation jobs table (for async processing)
export const briefJobs = pgTable("brief_jobs", {
  id: serial("id").primaryKey(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  metadata: jsonb("metadata").notNull().$type<MeetingMetadata>(),
  documentContents: jsonb("document_contents").notNull().$type<Array<{ filename: string; content: string }>>(),
  documentFiles: jsonb("document_files").$type<Array<{ filename: string; fileType: string; fileSize: number }>>(),
  resultBriefId: integer("result_brief_id").references(() => briefs.id),
  error: text("error"),
  progress: integer("progress").default(0), // 0-100 progress percentage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BriefJob = typeof briefJobs.$inferSelect;
export type InsertBriefJob = typeof briefJobs.$inferInsert;
export const insertBriefJobSchema = createInsertSchema(briefJobs).omit({ id: true, createdAt: true, updatedAt: true });

// Analytics table (for decision tracking)
export const decisionAnalytics = pgTable("decision_analytics", {
  id: serial("id").primaryKey(),
  briefId: integer("brief_id").notNull().references(() => briefs.id),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  timeToDecision: integer("time_to_decision"), // in hours
  reopenCount: integer("reopen_count").notNull().default(0),
  meetingEfficiencyScore: integer("meeting_efficiency_score"), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DecisionAnalytic = typeof decisionAnalytics.$inferSelect;
export type InsertDecisionAnalytic = typeof decisionAnalytics.$inferInsert;
export const insertDecisionAnalyticSchema = createInsertSchema(decisionAnalytics).omit({ id: true, createdAt: true, updatedAt: true });

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  meetings: many(meetings),
  briefs: many(briefs),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  user: one(users, {
    fields: [meetings.userId],
    references: [users.id],
  }),
  briefs: many(briefs),
  documents: many(documents),
  analytics: many(decisionAnalytics),
}));

export const briefsRelations = relations(briefs, ({ one, many }) => ({
  meeting: one(meetings, {
    fields: [briefs.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [briefs.userId],
    references: [users.id],
  }),
  analytics: many(decisionAnalytics),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  meeting: one(meetings, {
    fields: [documents.meetingId],
    references: [meetings.id],
  }),
}));

export const decisionAnalyticsRelations = relations(decisionAnalytics, ({ one }) => ({
  brief: one(briefs, {
    fields: [decisionAnalytics.briefId],
    references: [briefs.id],
  }),
  meeting: one(meetings, {
    fields: [decisionAnalytics.meetingId],
    references: [meetings.id],
  }),
}));

export const briefJobsRelations = relations(briefJobs, ({ one }) => ({
  resultBrief: one(briefs, {
    fields: [briefJobs.resultBriefId],
    references: [briefs.id],
  }),
}));
