import { z } from "zod";

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
});

export type ActionItem = z.infer<typeof actionItemSchema>;

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
