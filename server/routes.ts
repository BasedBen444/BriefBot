import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { parseDocument, cleanupFile } from "./document-parser";
import { generateBriefWithAI } from "./openai-client";
import { meetingMetadataSchema, type MeetingMetadata } from "@shared/schema";
import { storage as dbStorage } from "./storage";
import * as googleCalendar from "./google-calendar";

// Configure multer for file uploads (using memory/disk storage)
const uploadDir = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const allowedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const allowedExtensions = [".pdf", ".docx", ".pptx", ".txt", ".csv", ".xls", ".xlsx", ".md"];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedType = allowedTypes.includes(file.mimetype);
    const isAllowedExt = allowedExtensions.includes(ext);
    
    if (isAllowedType || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, PPTX, TXT, CSV, XLS, XLSX, and MD files are allowed."));
    }
  },
});

// Background job processor
async function processJob(jobId: number) {
  try {
    // Get job details
    const job = await dbStorage.getJob(jobId);
    if (!job || job.status !== "pending") {
      return;
    }

    // Update status to processing
    await dbStorage.updateJob(jobId, { 
      status: "processing",
      progress: 10,
    });

    const metadata = job.metadata as MeetingMetadata;
    const documentContents = job.documentContents as Array<{ filename: string; content: string }>;
    const documentFiles = job.documentFiles as Array<{ filename: string; fileType: string; fileSize: number }> | null;

    // Combine all document contents
    const combinedContent = documentContents
      .map(doc => `--- ${doc.filename} ---\n${doc.content}`)
      .join("\n\n");
    
    // Extract list of uploaded filenames
    const uploadedFilenames = documentContents.map(doc => doc.filename);

    // Update progress
    await dbStorage.updateJob(jobId, { progress: 30 });

    // Generate brief with AI
    const brief = await generateBriefWithAI({
      meetingTitle: metadata.title,
      attendees: metadata.attendees,
      meetingType: metadata.meetingType,
      audienceLevel: metadata.audienceLevel,
      documentContents: combinedContent,
      uploadedFilenames: uploadedFilenames,
    });

    // Update progress
    await dbStorage.updateJob(jobId, { progress: 70 });

    // Save to database
    // 1. Create meeting record
    const meeting = await dbStorage.createMeeting({
      userId: null, // No auth yet
      title: metadata.title,
      attendees: metadata.attendees,
      meetingType: metadata.meetingType,
      audienceLevel: metadata.audienceLevel,
    });

    // 2. Save brief
    const savedBrief = await dbStorage.createBrief({
      meetingId: meeting.id,
      userId: null, // No auth yet
      goal: brief.goal,
      context: brief.context,
      options: brief.options,
      risksTradeoffs: brief.risksTradeoffs,
      decisions: brief.decisions,
      actionChecklist: brief.actionChecklist,
      sources: brief.sources || null,
      wordCount: brief.wordCount,
    });

    // Update progress
    await dbStorage.updateJob(jobId, { progress: 85 });

    // 3. Save document metadata if available
    if (documentFiles) {
      for (const file of documentFiles) {
        await dbStorage.createDocument({
          meetingId: meeting.id,
          filename: file.filename,
          fileType: file.fileType,
          fileSize: file.fileSize,
          contentHash: null,
        });
      }
    }

    // 4. Create initial analytics entry
    await dbStorage.createAnalytic({
      briefId: savedBrief.id,
      meetingId: meeting.id,
      timeToDecision: null,
      reopenCount: 0,
      meetingEfficiencyScore: null,
    });

    // Update job as completed
    await dbStorage.updateJob(jobId, {
      status: "completed",
      progress: 100,
      resultBriefId: savedBrief.id,
    });

    console.log(`Job ${jobId} completed successfully, brief ID: ${savedBrief.id}`);
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    await dbStorage.updateJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get all briefs (history)
  app.get("/api/briefs", async (req, res) => {
    try {
      const briefs = await dbStorage.getAllBriefs();
      res.json({ success: true, briefs });
    } catch (error) {
      console.error("Error fetching briefs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch briefs",
      });
    }
  });

  // Get specific brief
  app.get("/api/briefs/:id", async (req, res) => {
    try {
      const briefId = parseInt(req.params.id);
      const brief = await dbStorage.getBrief(briefId);
      
      if (!brief) {
        return res.status(404).json({
          success: false,
          error: "Brief not found",
        });
      }

      res.json({ success: true, brief });
    } catch (error) {
      console.error("Error fetching brief:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch brief",
      });
    }
  });

  // Get job status
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await dbStorage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: "Job not found",
        });
      }

      // If job is completed, include the brief formatted for frontend
      let brief = null;
      if (job.status === "completed" && job.resultBriefId) {
        const dbBrief = await dbStorage.getBrief(job.resultBriefId);
        if (dbBrief) {
          // Format the brief for the frontend (Brief type expects generatedAt, not createdAt)
          brief = {
            id: dbBrief.id,
            goal: dbBrief.goal,
            context: dbBrief.context,
            options: dbBrief.options,
            risksTradeoffs: dbBrief.risksTradeoffs,
            decisions: dbBrief.decisions,
            actionChecklist: dbBrief.actionChecklist,
            sources: dbBrief.sources || [],
            wordCount: dbBrief.wordCount,
            generatedAt: dbBrief.createdAt?.toISOString() || new Date().toISOString(),
          };
        }
      }

      res.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress || 0,
          error: job.error,
          resultBriefId: job.resultBriefId,
          createdAt: job.createdAt,
        },
        brief: brief,
      });
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch job status",
      });
    }
  });

  // Generate brief endpoint - now creates a job and returns immediately
  app.post("/api/generate-brief", upload.array("files", 10), async (req, res) => {
    const uploadedFiles: Express.Multer.File[] = [];
    
    try {
      // Get uploaded files
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded",
        });
      }

      uploadedFiles.push(...files);

      // Parse and validate metadata
      const metadataStr = req.body.metadata;
      if (!metadataStr) {
        return res.status(400).json({
          success: false,
          error: "Meeting metadata is required",
        });
      }

      let metadata;
      try {
        metadata = JSON.parse(metadataStr);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: "Invalid metadata format",
        });
      }

      // Validate metadata with Zod
      const validationResult = meetingMetadataSchema.safeParse(metadata);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid meeting metadata",
          details: validationResult.error.errors,
        });
      }

      const validatedMetadata = validationResult.data;

      // Parse all documents immediately (this is fast)
      const documentContents: Array<{ filename: string; content: string }> = [];
      const documentFiles: Array<{ filename: string; fileType: string; fileSize: number }> = [];
      
      for (const file of files) {
        try {
          const content = await parseDocument(file.path, file.mimetype);
          documentContents.push({
            filename: file.originalname,
            content: content.trim(),
          });
          documentFiles.push({
            filename: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
          });
        } catch (error) {
          console.error(`Error parsing ${file.originalname}:`, error);
          // Continue with other files even if one fails
        }
      }

      if (documentContents.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Failed to parse any documents",
        });
      }

      // Create job record
      const job = await dbStorage.createJob({
        status: "pending",
        metadata: validatedMetadata,
        documentContents: documentContents,
        documentFiles: documentFiles,
        progress: 0,
      });

      // Return job ID immediately
      res.json({
        success: true,
        jobId: job.id,
        message: "Brief generation started. Poll /api/jobs/:id for status.",
      });

      // Start processing the job asynchronously (don't await)
      processJob(job.id).catch(err => {
        console.error(`Background job ${job.id} failed:`, err);
      });

    } catch (error) {
      console.error("Error starting brief generation:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to start brief generation",
      });
    } finally {
      // Clean up uploaded files after parsing
      for (const file of uploadedFiles) {
        cleanupFile(file.path);
      }
    }
  });

  // ==================== Calendar Integration Routes ====================
  
  // Check if calendar is connected
  app.get("/api/calendar/status", async (req, res) => {
    try {
      const connected = await googleCalendar.isCalendarConnected();
      res.json({ success: true, connected });
    } catch (error) {
      console.error("Error checking calendar status:", error);
      res.json({ success: true, connected: false });
    }
  });

  // List available calendars
  app.get("/api/calendar/list", async (req, res) => {
    try {
      const calendars = await googleCalendar.listCalendars();
      res.json({ success: true, calendars });
    } catch (error) {
      console.error("Error listing calendars:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to list calendars",
      });
    }
  });

  // Get upcoming events from a calendar
  app.get("/api/calendar/events/:calendarId", async (req, res) => {
    try {
      const calendarId = req.params.calendarId || "primary";
      const maxResults = parseInt(req.query.maxResults as string) || 10;
      
      const events = await googleCalendar.getUpcomingEvents(calendarId, maxResults);
      res.json({ success: true, events });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch events",
      });
    }
  });

  // Generate brief from a calendar event (with optional file uploads)
  app.post("/api/calendar/generate-brief", upload.array("files", 10), async (req, res) => {
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    
    try {
      const { calendarId, eventId, meetingType, audienceLevel, force } = req.body;
      const actualCalendarId = calendarId || "primary";

      if (!eventId) {
        // Clean up uploaded files on error
        for (const file of uploadedFiles) {
          cleanupFile(file.path);
        }
        return res.status(400).json({
          success: false,
          error: "Event ID is required",
        });
      }

      // Check if we already have a brief for this event (unless force regenerate)
      const existingEventRecord = await dbStorage.getCalendarEvent(actualCalendarId, eventId);
      if (existingEventRecord?.briefId && !force) {
        // Clean up uploaded files since we're not processing
        for (const file of uploadedFiles) {
          cleanupFile(file.path);
        }
        return res.json({
          success: true,
          existingBriefId: existingEventRecord.briefId,
          message: "Brief already exists for this event",
        });
      }

      // Fetch the event details
      const event = await googleCalendar.getEventById(actualCalendarId, eventId);
      
      if (!event) {
        // Clean up uploaded files on error
        for (const file of uploadedFiles) {
          cleanupFile(file.path);
        }
        return res.status(404).json({
          success: false,
          error: "Event not found",
        });
      }

      // Build document content from uploaded files and event description
      const documentContents: Array<{ filename: string; content: string }> = [];
      const documentFiles: Array<{ filename: string; fileType: string; fileSize: number }> = [];
      
      // Parse uploaded files
      for (const file of uploadedFiles) {
        try {
          const content = await parseDocument(file.path, file.mimetype);
          documentContents.push({
            filename: file.originalname,
            content: content,
          });
          documentFiles.push({
            filename: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
          });
        } catch (parseError) {
          console.error(`Error parsing file ${file.originalname}:`, parseError);
        }
      }
      
      // Add event description as a source
      if (event.description) {
        documentContents.push({
          filename: "event_description.txt",
          content: event.description,
        });
        documentFiles.push({
          filename: "event_description.txt",
          fileType: "text/plain",
          fileSize: event.description.length,
        });
      }

      // If no content available, create a minimal context
      if (documentContents.length === 0) {
        const eventInfo = `Meeting: ${event.summary}\nAttendees: ${event.attendees.join(", ")}\nTime: ${event.start} - ${event.end}`;
        documentContents.push({
          filename: "event_info.txt",
          content: eventInfo,
        });
        documentFiles.push({
          filename: "event_info.txt",
          fileType: "text/plain",
          fileSize: eventInfo.length,
        });
      }

      // Build metadata from event
      const metadata: MeetingMetadata = {
        title: event.summary,
        attendees: event.attendees.join(", ") || "TBD",
        meetingType: meetingType || "decision",
        audienceLevel: audienceLevel || "exec",
      };

      // Create job record
      const job = await dbStorage.createJob({
        status: "pending",
        metadata: metadata,
        documentContents: documentContents,
        documentFiles: documentFiles,
        progress: 0,
      });

      // Create or update calendar event record (without briefId yet)
      if (existingEventRecord) {
        await dbStorage.updateCalendarEvent(existingEventRecord.id, {
          summary: event.summary,
          startTime: new Date(event.start),
          endTime: new Date(event.end),
          attendees: event.attendees,
          description: event.description || null,
          htmlLink: event.htmlLink,
          briefId: null, // Will be updated when job completes
        });
      } else {
        await dbStorage.createCalendarEvent({
          calendarId: actualCalendarId,
          eventId: event.id,
          summary: event.summary,
          startTime: new Date(event.start),
          endTime: new Date(event.end),
          attendees: event.attendees,
          description: event.description || null,
          htmlLink: event.htmlLink,
          briefId: null, // Will be updated when job completes
        });
      }

      // Clean up uploaded files after parsing
      for (const file of uploadedFiles) {
        cleanupFile(file.path);
      }

      // Return job ID immediately
      res.json({
        success: true,
        jobId: job.id,
        event: {
          id: event.id,
          summary: event.summary,
          start: event.start,
          attendees: event.attendees,
        },
        message: "Brief generation started. Poll /api/jobs/:id for status.",
      });

      // Start processing the job asynchronously, then update calendar event
      processJob(job.id).then(async () => {
        const completedJob = await dbStorage.getJob(job.id);
        if (completedJob?.status === "completed" && completedJob.resultBriefId) {
          const calEvent = await dbStorage.getCalendarEvent(actualCalendarId, eventId);
          if (calEvent) {
            await dbStorage.updateCalendarEvent(calEvent.id, {
              briefId: completedJob.resultBriefId,
            });
          }
        }
      }).catch(err => {
        console.error(`Background job ${job.id} failed:`, err);
      });

    } catch (error) {
      // Clean up uploaded files on error
      for (const file of uploadedFiles) {
        cleanupFile(file.path);
      }
      console.error("Error generating brief from calendar event:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate brief from event",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
