# BriefBot

## Overview
BriefBot is an AI-powered web application that generates decision-ready meeting briefs from uploaded documents. It transforms scattered meeting materials into focused, one-page summaries with clear decisions, options, risks, and action items.

## Purpose
Help teams arrive at meetings already aligned on goals, context, decisions, and next steps by automatically creating structured briefs from documents like PDFs, Word files, PowerPoint presentations, and text files.

## Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js with TypeScript
- **AI**: OpenAI GPT-4o for brief generation
- **File Processing**: Multer (uploads), Mammoth (DOCX), pdf-parse (PDF), csv-parse (CSV), xlsx (XLS/XLSX)
- **Storage**: PostgreSQL database with Drizzle ORM (persistent with full history)

## Recent Changes (December 4, 2025)
- **Google Calendar Integration**: Generate briefs directly from upcoming calendar events
  - Uses Replit's native Google Calendar connector for OAuth
  - `/calendar` page lists upcoming events with meeting type/audience selectors
  - One-click brief generation from any calendar event
  - Prevents duplicate briefs: checks for existing brief before generating
  - Database tracks event-to-brief mappings in `calendarEvents` table
  - Robust polling with max 60 attempts, exponential backoff, and error handling
- **Calendar File Upload Support**: Attach supporting documents to calendar events
  - Click on any event to expand and see upload options
  - Drag-and-drop or browse to upload PDF, DOCX, PPTX, TXT, CSV, XLS, XLSX, MD files
  - Files are parsed and included alongside event description in brief generation
  - Progress bar shows real-time generation status
  - Proper file cleanup after processing on all code paths

## Changes (December 3, 2025)
- **Async Brief Generation**: Refactored brief generation to use a job-based async system to prevent timeouts with large/multiple files
  - POST /api/generate-brief now returns a jobId immediately
  - Frontend polls GET /api/jobs/:id for status and progress (every 1.5s)
  - Progress bar shows real-time status (0-100%)
  - Jobs table tracks status: pending → processing → completed/failed
- **Robust OpenAI Integration**: Enhanced reliability with retry logic
  - Uses gpt-4o model with 3 retry attempts
  - Exponential backoff (1s, 2s, 4s delays) on transient errors
  - Response validation ensures brief has all required fields
  - Detailed logging for debugging OpenAI responses
- **Per-Section Source Citations**: All brief sections now include inline citations
  - Every item in Goal, Context, Options, Risks, and Decisions ends with [Source: filename.ext]
  - Sources array explicitly lists ALL uploaded files (including CSV, XLS, etc.)
  - Post-processing ensures no uploaded file is missing from sources
- **Persistent Job State**: Brief generation continues across navigation
  - Job ID and metadata stored in localStorage during generation
  - Automatically resumes polling when returning to homepage
  - State cleared only on completion, failure, or explicit reset
- **Grounded AI System Prompt**: Revised system prompt with strict grounding rules ("use ONLY provided documents"), TBD policy for unknown owners/dates, audience-specific context limits (exec ≤3, ic ≤5), and "insufficient evidence" handling
- **Source Citations**: Added mandatory sources array with label, filename, and section for all brief content; displayed in Sources section with badges
- **Expanded File Support**: Added CSV, XLS/XLSX, and Markdown file parsing with csv-parse and xlsx libraries
- **Server-side MIME Fallback**: Parser detects file types by extension when browser sends application/octet-stream
- **Improved Data Fidelity**: CSV/Excel parsers preserve falsy values (0, false, empty strings) and handle headerless files

## Previous Changes (November 17, 2025)
- Initial implementation of complete MVP
- Configured design system with Inter and JetBrains Mono fonts
- Built all frontend components (DocumentUpload, MeetingForm, BriefDisplay, LoadingState)
- Implemented backend API for file upload and brief generation
- Integrated OpenAI GPT-5 for AI-powered brief creation
- Added document parsing for PDF, DOCX, PPTX, and TXT files
- Implemented export functionality (text and JSON formats)
- **Database Persistence**: Migrated from ephemeral to PostgreSQL storage with Drizzle ORM
- **Brief History**: Added /history page showing all generated briefs with meeting metadata
- **Brief Detail Pages**: Individual brief viewing at /brief/:id with full meeting context
- **Navigation**: Added global header with New Brief and History navigation
- **Foreign Key Constraints**: Proper relational integrity across all database tables

## Project Architecture

### Frontend Structure
- `/client/src/pages/home.tsx` - Main application page with upload, form, and brief display
- `/client/src/pages/history.tsx` - Brief history page showing all generated briefs
- `/client/src/pages/brief-detail.tsx` - Individual brief detail view with full metadata
- `/client/src/pages/calendar.tsx` - Calendar events page for generating briefs from meetings
- `/client/src/App.tsx` - Main app with header navigation and routing
- `/client/src/components/document-upload.tsx` - Drag-and-drop file upload component
- `/client/src/components/meeting-form.tsx` - Meeting metadata form (title, attendees, type, audience)
- `/client/src/components/brief-display.tsx` - Displays generated brief with export options
- `/client/src/components/loading-state.tsx` - Loading skeleton during brief generation

### Backend Structure
- `/server/routes.ts` - API endpoints for health check, brief generation, history, and calendar
- `/server/storage.ts` - Database storage layer with joined queries for briefs + meetings + calendar events
- `/server/db.ts` - Drizzle database connection configuration
- `/server/openai-client.ts` - OpenAI integration for GPT-4o brief generation
- `/server/document-parser.ts` - Document parsing utilities for various file types
- `/server/google-calendar.ts` - Google Calendar API client using Replit OAuth connector

### Shared Schema
- `/shared/schema.ts` - Drizzle database schema with tables for users, meetings, briefs, documents, decision_analytics, briefJobs, and calendarEvents; includes TypeScript types, Zod schemas, and relational mappings

## Key Features

### Document Upload
- Drag-and-drop interface
- Supports PDF, DOCX, PPTX, TXT, CSV, XLS, XLSX, and MD (Markdown) files
- File size limit: 10MB per file
- Multiple file upload support
- Automatic file cleanup after processing
- Server-side MIME type fallback by file extension

### Meeting Metadata Form
- Meeting title and attendees
- Meeting type selection (Decision, Discussion, Planning, Review, Other)
- Audience level: Executive or Individual Contributor (IC)
- Form validation with Zod

### AI Brief Generation
- GPT-5 powered analysis of uploaded documents
- **Strict grounding**: AI uses ONLY information from uploaded documents (no fabrication)
- **TBD policy**: Unknown owners/dates are marked as "TBD (role)" or "TBD (date)"
- **Source citations**: Every claim includes source with label, filename, and section
- Audience-aware output:
  - **Executive briefs**: Emphasize options and risks, minimal context (≤3 bullets)
  - **IC briefs**: Include implementation details, fuller context (≤5 bullets)
- Structured sections:
  - Goal
  - Context (key background points)
  - Options (with pros/cons)
  - Risks & Trade-offs
  - Decision(s) to Make
  - Action Checklist (Owner • Task • Due Date format)
  - Sources (document citations for all content)
- Word count limit: ≤350 words
- Monospace font for action items (JetBrains Mono)

### Brief Display & Export
- Clean, readable card layout
- Export as formatted text file
- Export as JSON
- Copy to clipboard
- Word count indicator
- Meeting type and audience level badges

## API Endpoints

### GET /api/briefs
Returns all generated briefs with their associated meeting metadata.

**Response:**
```json
{
  "success": true,
  "briefs": [
    {
      "id": 1,
      "meetingId": 1,
      "goal": "...",
      "context": ["..."],
      "options": [...],
      "risksTradeoffs": ["..."],
      "decisions": ["..."],
      "actionChecklist": [...],
      "wordCount": 350,
      "createdAt": "2025-11-17T...",
      "meeting": {
        "id": 1,
        "title": "Meeting Title",
        "attendees": "Name (Role), Name (Role)",
        "meetingType": "decision",
        "audienceLevel": "exec",
        "createdAt": "2025-11-17T..."
      }
    }
  ]
}
```

### GET /api/briefs/:id
Returns a specific brief with its meeting metadata.

**Response:**
```json
{
  "success": true,
  "brief": {
    "id": 1,
    "meetingId": 1,
    "goal": "...",
    "context": ["..."],
    "options": [...],
    "risksTradeoffs": ["..."],
    "decisions": ["..."],
    "actionChecklist": [...],
    "wordCount": 350,
    "createdAt": "2025-11-17T...",
    "meeting": {
      "id": 1,
      "title": "Meeting Title",
      "attendees": "Name (Role), Name (Role)",
      "meetingType": "decision",
      "audienceLevel": "exec",
      "createdAt": "2025-11-17T..."
    }
  }
}
```

### POST /api/generate-brief
Creates an async job to generate a meeting brief from uploaded files and metadata. Returns a jobId immediately for polling.

**Request:**
- Content-Type: multipart/form-data
- Body:
  - `files`: Array of file uploads (PDF, DOCX, PPTX, TXT, CSV, XLS, XLSX, MD)
  - `metadata`: JSON string with meeting details
    ```json
    {
      "title": "Meeting Title",
      "attendees": "Name (Role), Name (Role)",
      "meetingType": "decision" | "discussion" | "planning" | "review" | "other",
      "audienceLevel": "exec" | "ic"
    }
    ```

**Response:**
```json
{
  "success": true,
  "jobId": 1,
  "message": "Brief generation started. Poll /api/jobs/:id for status."
}
```

### GET /api/jobs/:id
Returns the status and progress of a brief generation job. When completed, includes the generated brief.

**Response (in progress):**
```json
{
  "success": true,
  "job": {
    "id": 1,
    "status": "processing",
    "progress": 45,
    "error": null,
    "resultBriefId": null,
    "createdAt": "2025-12-03T..."
  },
  "brief": null
}
```

**Response (completed):**
```json
{
  "success": true,
  "job": {
    "id": 1,
    "status": "completed",
    "progress": 100,
    "error": null,
    "resultBriefId": 1,
    "createdAt": "2025-12-03T..."
  },
  "brief": {
    "id": 1,
    "goal": "...",
    "context": ["..."],
    "options": [{"option": "...", "pros": ["..."], "cons": ["..."]}],
    "risksTradeoffs": ["..."],
    "decisions": ["..."],
    "actionChecklist": [{"owner": "...", "task": "...", "dueDate": "..."}],
    "sources": [{"label": "...", "filename": "...", "section": "..."}],
    "wordCount": 350,
    "createdAt": "2025-12-03T..."
  }
}
```

## Design Guidelines
- Professional minimalism with generous spacing
- Linear + Notion hybrid design approach
- WCAG 2.2 AA accessibility compliance
- Consistent spacing: p-6 to p-8 for components
- Typography hierarchy with Inter font
- Monospace font (JetBrains Mono) for action items
- Responsive design (mobile-first)
- Hover and active state interactions with elevation utilities

## Environment Variables
- `OPENAI_API_KEY` - Required for AI brief generation
- `SESSION_SECRET` - For session management

## User Preferences
- Professional, clean interface
- Focus on decision-making
- Clear visual hierarchy
- Minimal cognitive load
- Accessibility-first design

## Development Notes
- **Database**: PostgreSQL with Drizzle ORM for persistence
- **Migrations**: Use `npm run db:push` to sync schema changes (never write manual SQL migrations)
- **Foreign Keys**: All tables have proper relational integrity with `.references()` constraints
- Files are automatically cleaned up after brief generation
- OpenAI GPT-5 model is used (latest as of August 2025)
- All uploads stored temporarily in `/uploads` directory
- Frontend uses TanStack Query for data fetching
- Backend uses Express with TypeScript and TSX for runtime
- **Storage Layer**: DatabaseStorage implementation with joined queries for briefs + meetings
- **History**: All briefs persist to database and are viewable in /history
