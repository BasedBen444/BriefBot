# BriefBot Design Guidelines

## Design Approach

**Design System Foundation:** Linear + Notion hybrid approach
- Linear's crisp typography and generous spacing for professional clarity
- Notion's content organization patterns for hierarchical information display
- Focus on readability, scanability, and efficient workflows

**Key Principles:**
1. Content-first clarity - information hierarchy drives all layout decisions
2. Generous breathing room - reduce cognitive load with consistent spacing
3. Professional minimalism - clean, distraction-free interface
4. Accessibility-first - WCAG 2.2 AA compliance throughout

---

## Typography System

**Font Stack:**
- Primary: Inter (via Google Fonts CDN) for interface and body text
- Monospace: JetBrains Mono for action items with "Owner • Task • Due" format

**Hierarchy:**
- Page titles: text-3xl font-semibold (30px)
- Section headings (Goal, Context, Risks): text-xl font-semibold (20px)
- Subheadings: text-lg font-medium (18px)
- Body text: text-base (16px) with leading-relaxed (1.625 line-height)
- Metadata/labels: text-sm font-medium (14px)
- Helper text: text-sm (14px)
- Action items: text-base font-mono

**Weights:** Regular (400), Medium (500), Semibold (600)

---

## Layout & Spacing System

**Core Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6 to p-8
- Section spacing: space-y-6 or space-y-8
- Form field gaps: gap-4
- Card margins: mb-6
- Page padding: px-6 py-8 (mobile), px-12 py-12 (desktop)

**Grid System:**
- Main container: max-w-5xl mx-auto (optimal for reading and forms)
- Two-column layouts where appropriate: grid-cols-1 md:grid-cols-2 gap-6
- Brief display: Single column, max-w-3xl for optimal readability

---

## Component Library

### 1. Document Upload Zone
- Large dropzone: min-h-48, border-2 border-dashed, rounded-lg
- Icon: Document icon from Heroicons (outline), size h-12 w-12
- Center-aligned text with clear upload instructions
- Accepted formats badge below: "PDF, DOCX, PPTX, TXT"
- Uploaded files list: Each file as a card with name, size, remove button

### 2. Meeting Metadata Form
**Layout:** Single column form, full-width inputs
- Text inputs: h-12, rounded-md, border, px-4
- Select dropdowns: Same styling as text inputs
- Labels: text-sm font-medium, mb-2 above each field
- Radio buttons for audience (Exec/IC): Horizontal layout with gap-4
- Fields: Meeting Title, Attendees (textarea), Meeting Type (select), Audience Level (radio)

### 3. Brief Display Card
**Structure:** Large card container with distinct sections
- Card: rounded-xl, border, p-8, max-w-3xl
- Section headers: Uppercase text-xs font-semibold tracking-wide, mb-3
- Content: Bullet lists with leading-relaxed
- Action Checklist: Each item on its own line with monospace font
- Word count indicator: Bottom right, text-sm
- Export buttons: Top right of card

### 4. Navigation/Header
- Clean header bar: h-16, border-b
- Logo/title: text-xl font-semibold
- No complex navigation needed - single-purpose app

### 5. Buttons
**Primary CTA:** "Generate Brief"
- Large: px-6 py-3, text-base font-medium, rounded-lg
- Full width on mobile, auto width on desktop

**Secondary:** Export buttons
- Outlined style: border-2, px-4 py-2, rounded-md
- Icons from Heroicons (document-download, code-bracket)

**Utility:** Remove file, clear form
- Small: px-3 py-1.5, text-sm, rounded

### 6. Status Indicators
- Loading state: Spinner with "Generating brief..." text below
- Success: Checkmark icon with brief fadeIn animation
- Error messages: Alert box with icon, rounded-lg, p-4, border-l-4

---

## Page Layouts

### Main Application View
**Single-page layout with three states:**

1. **Upload & Form State (Initial):**
   - Centered content: max-w-4xl mx-auto
   - Document upload zone at top (prominent)
   - Meeting metadata form below
   - Generate button at bottom, disabled until files uploaded

2. **Generating State:**
   - Loading overlay or centered spinner
   - Brief outline placeholder with skeleton UI

3. **Brief Display State:**
   - Brief card takes center stage
   - Export options in top-right corner
   - "Generate Another Brief" button below
   - Previous form inputs persist (allow quick iteration)

**No hero section needed** - This is a utility application, not a marketing site. Jump straight into the upload interface.

---

## Interaction Patterns

**File Upload:**
- Drag-and-drop visual feedback (border changes on dragover)
- Click-to-browse as alternative
- Immediate file card appears on upload
- Smooth transitions (transition-all duration-200)

**Form Validation:**
- Inline validation on blur
- Clear error states below fields
- Disable submit until required fields complete

**Brief Generation:**
- Smooth scroll to brief card once generated
- Gentle fade-in animation for brief appearance
- Export buttons become active only after brief loads

---

## Accessibility Implementation

- All form inputs: Proper labels with htmlFor
- Upload zone: Hidden file input with associated button
- Keyboard navigation: Full tab order through all interactive elements
- Focus indicators: ring-2 ring-offset-2 on focus states
- ARIA labels: On icon-only buttons and status indicators
- Semantic HTML: Proper heading hierarchy (h1→h2→h3)
- Screen reader announcements: For brief generation completion

---

## Icons
**Library:** Heroicons (outline style) via CDN
- document-arrow-up (upload)
- document-text (files)
- x-mark (remove)
- arrow-down-tray (export)
- check-circle (success)
- exclamation-triangle (error)

---

## Responsive Behavior

**Mobile (base):**
- Single column throughout
- px-4 page padding
- Buttons: Full width
- Font sizes: Slightly reduced (text-sm for body on mobile)

**Tablet (md: 768px):**
- px-8 page padding
- Form can use 2-column grid for shorter fields
- Buttons: Auto width

**Desktop (lg: 1024px):**
- px-12 page padding
- Optimal max-width containers prevent over-stretching
- Brief display: Comfortable reading width maintained