# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

I'm new to programming so please explain concepts in more details, especially architecture decisions but also information that will help my broader understanding.

## Project Overview

"A Year's History Of" is a Next.js 15 app that generates personalized history books using Google's Gemini AI. Users enter their name, birth date, and interests, and the app generates 12-15 historical entries connecting events throughout history to their interests, plus an AI-generated book cover.

## Commands

```bash
npm run dev         # Run dev server with Turbopack (http://localhost:3000)
npm run build       # Production build
npm run lint        # Run ESLint

# Database (Drizzle + Neon)
npm run db:push     # Push schema changes to Neon (use during development)
npm run db:generate # Generate migration files
npm run db:migrate  # Run migrations
npm run db:studio   # Open Drizzle Studio GUI
```

## Environment Variables

Required in `.env.local`:
```bash
DATABASE_URL=postgresql://...          # Neon connection string
GEMINI_API_KEY=your_key                # Google AI API key

# Stack Auth (from Neon Console > Auth tab)
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...
```

## Architecture

### Two Generation Modes

1. **Sample books** (guest or logged-in): Synchronous generation via `/api/generate?type=sample`. Generates 12-15 entries immediately.

2. **Full books** (logged-in only): Background job via `/api/generate?type=full`. Creates a job record, then `/api/jobs/process` generates entries month-by-month. Used for 365-entry books.

### Authentication Flow

Stack Auth is optional. The app works without auth credentials:
- `lib/auth-client.ts` - Client-side: exports `useUser`, `authEnabled`
- `lib/stack.ts` - Server-side: exports `stackServerApp`, `authEnabled`

**Important**: Stack Auth users must be synced to the local `users` table before creating books (foreign key constraint). Use `ensureUserInDb()` helper in API routes.

### Key API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate` | POST | Generate book entries + cover image |
| `/api/books` | GET/POST | List public books / Save new book |
| `/api/books/[id]` | GET/PATCH/DELETE | Single book operations |
| `/api/books/[id]/entries` | POST | Add entry to specific date (max 10 additional) |
| `/api/books/[id]/entries/[index]/regenerate` | POST | Regenerate single entry |
| `/api/books/[id]/epub` | GET | Download book as EPUB |
| `/api/jobs/process` | POST | Process background generation jobs |

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page + book preview (client component with app state) |
| `/my-books` | User's book library (requires auth) |
| `/share/[id]` | Public share page with OG meta tags |
| `/handler/[...stack]` | Stack Auth routes |

### Database Schema

Neon PostgreSQL with Drizzle ORM. Key tables:
- `users` - Must be synced from Stack Auth before book creation
- `books` - Entries stored as JSONB, includes `additionalEntryCount` limit
- `generation_jobs` - Background job queue with progress tracking

### AI Integration

Uses `@google/genai` package:
- Text generation: `gemini-2.5-flash` model
- Image generation: `imagen-3.0-generate-002` model
- Structured output via `responseSchema` for JSON entries

Age-based reading levels adjust narrative style (early reader → adult).

### Export Features

- **PDF**: Client-side via html2canvas + jsPDF
- **EPUB**: Server-side via epub-gen (writes to temp file, returns buffer)

## Key Implementation Details

- Path alias `@` resolves to project root
- Next.js 15 App Router - dynamic route params are Promises (must `await params`)
- Book entries sorted by calendar date (Jan→Dec)
- Books shareable via `?book=[id]` URL parameter or `/share/[id]`
- Cover styles: classic, minimalist, whimsical, cinematic, retro

## Planned Features

- Stripe integration for print orders
- Email service for daily delivery subscriptions (Resend already installed)
- Gift claim flow via email
- Comment/like functionality
