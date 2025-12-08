import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { db, generationJobs, books, users } from '@/lib/db';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { generateMonthEntries, generateBookCover, sortEntriesByDate, type BookPrefs } from '@/lib/generation/batch-generator';
import { sendBookCompleteEmail, sendBookFailedEmail } from '@/lib/email';
import type { BookEntry } from '@/lib/db/schema';

const WORKER_ID = nanoid();
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

// Helper to get current user
async function getCurrentUser() {
  if (!authEnabled || !stackServerApp) return null;
  return stackServerApp.getUser();
}

// POST /api/jobs/process - Process the next month for a job
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    // Get the job and verify ownership
    const [job] = await db
      .select()
      .from(generationJobs)
      .where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, user.id)))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if job is already complete or failed
    if (job.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        progress: 100,
        message: 'Job already completed',
      });
    }

    if (job.status === 'failed' && job.retryCount >= MAX_RETRIES) {
      return NextResponse.json({
        status: 'failed',
        progress: job.progress,
        error: job.errorMessage,
        message: 'Job failed after max retries',
      });
    }

    // Check if job is locked by another worker
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MS);
    if (job.lockedAt && job.lockedAt > staleThreshold && job.lockedBy !== WORKER_ID) {
      return NextResponse.json({
        status: 'processing',
        progress: job.progress,
        currentMonth: job.currentMonth,
        message: 'Job is being processed by another worker',
      });
    }

    // Lock the job
    await db
      .update(generationJobs)
      .set({
        lockedAt: now,
        lockedBy: WORKER_ID,
        status: 'processing',
        startedAt: job.startedAt || now,
        updatedAt: now,
      })
      .where(eq(generationJobs.id, jobId));

    // Get book preferences
    const [book] = await db.select().from(books).where(eq(books.id, job.bookId)).limit(1);
    if (!book) {
      throw new Error('Book not found');
    }

    const prefs: BookPrefs = {
      name: book.name,
      birthYear: book.birthYear,
      birthMonth: book.birthMonth,
      birthDay: book.birthDay,
      interests: book.interests,
      blendLevel: book.blendLevel,
      coverStyle: book.coverStyle,
    };

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
      // Generate entries for the current month
      const monthIndex = job.currentMonth;
      const previousEntries = (job.generatedEntries || []) as BookEntry[];

      console.log(`[Job ${jobId}] Processing month ${monthIndex + 1}/12`);

      const monthEntries = await generateMonthEntries(ai, prefs, monthIndex, previousEntries);
      const allEntries = [...previousEntries, ...monthEntries];

      const nextMonth = monthIndex + 1;
      const progress = Math.round((nextMonth / 12) * 100);

      if (nextMonth >= 12) {
        // All months complete - finalize the book
        console.log(`[Job ${jobId}] All months complete, finalizing...`);

        // Sort entries and generate cover
        const sortedEntries = sortEntriesByDate(allEntries);
        const coverImage = await generateBookCover(ai, prefs);

        // Update book with final content
        await db
          .update(books)
          .set({
            entries: sortedEntries,
            coverImageUrl: coverImage,
            generationStatus: 'complete',
            entryCount: sortedEntries.length,
            updatedAt: now,
          })
          .where(eq(books.id, job.bookId));

        // Mark job complete
        await db
          .update(generationJobs)
          .set({
            status: 'completed',
            progress: 100,
            generatedEntries: sortedEntries,
            completedAt: now,
            lockedAt: null,
            lockedBy: null,
            updatedAt: now,
          })
          .where(eq(generationJobs.id, jobId));

        // Send completion email
        const [jobUser] = await db.select().from(users).where(eq(users.id, job.userId)).limit(1);
        if (jobUser?.email) {
          await sendBookCompleteEmail(jobUser.email, book.id, book.name);
        }

        return NextResponse.json({
          status: 'completed',
          progress: 100,
          entryCount: sortedEntries.length,
          message: 'Book generation complete!',
        });
      }

      // More months to go - save progress and unlock
      await db
        .update(generationJobs)
        .set({
          currentMonth: nextMonth,
          progress,
          generatedEntries: allEntries,
          lockedAt: null,
          lockedBy: null,
          updatedAt: now,
        })
        .where(eq(generationJobs.id, jobId));

      // Update book entry count
      await db
        .update(books)
        .set({
          entryCount: allEntries.length,
          updatedAt: now,
        })
        .where(eq(books.id, job.bookId));

      return NextResponse.json({
        status: 'processing',
        progress,
        currentMonth: nextMonth,
        entryCount: allEntries.length,
        message: `Month ${nextMonth}/12 complete`,
      });
    } catch (genError: any) {
      console.error(`[Job ${jobId}] Generation error:`, genError);

      const newRetryCount = job.retryCount + 1;
      const isFinalFailure = newRetryCount >= MAX_RETRIES;

      // Update job with error
      await db
        .update(generationJobs)
        .set({
          status: isFinalFailure ? 'failed' : 'pending',
          errorMessage: genError.message,
          retryCount: newRetryCount,
          lastRetryAt: now,
          lockedAt: null,
          lockedBy: null,
          updatedAt: now,
        })
        .where(eq(generationJobs.id, jobId));

      if (isFinalFailure) {
        // Update book status
        await db
          .update(books)
          .set({
            generationStatus: 'failed',
            updatedAt: now,
          })
          .where(eq(books.id, job.bookId));

        // Send failure email
        const [jobUser] = await db.select().from(users).where(eq(users.id, job.userId)).limit(1);
        if (jobUser?.email) {
          await sendBookFailedEmail(jobUser.email, book.name);
        }

        return NextResponse.json({
          status: 'failed',
          progress: job.progress,
          error: genError.message,
          message: 'Job failed after max retries',
        });
      }

      return NextResponse.json({
        status: 'error',
        progress: job.progress,
        error: genError.message,
        retryCount: newRetryCount,
        message: `Error occurred, will retry (${newRetryCount}/${MAX_RETRIES})`,
      });
    }
  } catch (error: any) {
    console.error('Job process error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process job' }, { status: 500 });
  }
}
