# BriefBot

## Overview
BriefBot is an AI-powered web application that generates decision-ready meeting briefs from uploaded documents. It transforms scattered meeting materials into focused, one-page summaries with clear decisions, options, risks, and action items.

## Purpose
Help teams arrive at meetings already aligned on goals, context, decisions, and next steps by automatically creating structured briefs from documents like PDFs, Word files, PowerPoint presentations, and text files.

## Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js with TypeScript
- **AI**: OpenAI GPT-5 for brief generation
- **File Processing**: Multer (uploads), Mammoth (DOCX), pdf-parse (PDF)
- **Storage**: PostgreSQL database with Drizzle ORM (persistent with full history)

## Recent Changes (November 17, 2025)
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
- `/client/src/App.tsx` - Main app with header navigation and routing
- `/client/src/components/document-upload.tsx` - Drag-and-drop file upload component
- `/client/src/components/meeting-form.tsx` - Meeting metadata form (title, attendees, type, audience)
- `/client/src/components/brief-display.tsx` - Displays generated brief with export options
- `/client/src/components/loading-state.tsx` - Loading skeleton during brief generation

### Backend Structure
- `/server/routes.ts` - API endpoints for health check, brief generation, and history
- `/server/storage.ts` - Database storage layer with joined queries for briefs + meetings
- `/server/db.ts` - Drizzle database connection configuration
- `/server/openai-client.ts` - OpenAI integration for GPT-5 brief generation
- `/server/document-parser.ts` - Document parsing utilities for various file types

### Shared Schema
- `/shared/schema.ts` - Drizzle database schema with tables for users, meetings, briefs, documents, and decision_analytics; includes TypeScript types, Zod schemas, and relational mappings

## Key Features

### Document Upload
- Drag-and-drop interface
- Supports PDF, DOCX, PPTX, TXT files
- File size limit: 10MB per file
- Multiple file upload support
- Automatic file cleanup after processing

### Meeting Metadata Form
- Meeting title and attendees
- Meeting type selection (Decision, Discussion, Planning, Review, Other)
- Audience level: Executive or Individual Contributor (IC)
- Form validation with Zod

### AI Brief Generation
- GPT-5 powered analysis of uploaded documents
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
Generates a meeting brief from uploaded files and metadata. Automatically saves to database.

**Request:**
- Content-Type: multipart/form-data
- Body:
  - `files`: Array of file uploads (PDF, DOCX, PPTX, TXT)
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
  "brief": {
    "id": 1,
    "goal": "...",
    "context": ["..."],
    "options": [{"option": "...", "pros": ["..."], "cons": ["..."]}],
    "risksTradeoffs": ["..."],
    "decisions": ["..."],
    "actionChecklist": [{"owner": "...", "task": "...", "dueDate": "..."}],
    "wordCount": 350,
    "generatedAt": "2025-11-17T..."
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
