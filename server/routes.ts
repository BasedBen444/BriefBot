import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parseDocument, cleanupFile } from "./document-parser";
import { generateBriefWithAI } from "./openai-client";
import { meetingMetadataSchema } from "@shared/schema";

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

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, PPTX, and TXT files are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Generate brief endpoint
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

      // Parse all documents
      const documentContents: Array<{ filename: string; content: string }> = [];
      
      for (const file of files) {
        try {
          const content = await parseDocument(file.path, file.mimetype);
          documentContents.push({
            filename: file.originalname,
            content: content.trim(),
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

      // Combine all document contents
      const combinedContent = documentContents
        .map(doc => `--- ${doc.filename} ---\n${doc.content}`)
        .join("\n\n");

      // Generate brief with AI
      const brief = await generateBriefWithAI({
        meetingTitle: validatedMetadata.title,
        attendees: validatedMetadata.attendees,
        meetingType: validatedMetadata.meetingType,
        audienceLevel: validatedMetadata.audienceLevel,
        documentContents: combinedContent,
      });

      // Return the generated brief
      res.json({
        success: true,
        brief,
      });
    } catch (error) {
      console.error("Error generating brief:", error);
      
      // Clean up uploaded files on error
      for (const file of uploadedFiles) {
        cleanupFile(file.path);
      }
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate brief",
      });
    } finally {
      // Ensure all files are cleaned up
      for (const file of uploadedFiles) {
        cleanupFile(file.path);
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
