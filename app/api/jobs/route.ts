import { NextRequest, NextResponse } from 'next/server';
import { db, generationJobs, books } from '@/lib/db';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { eq, and, desc } from 'drizzle-orm';

// Helper to get current user
async function getCurrentUser() {
  if (!authEnabled || !stackServerApp) return null;
  return stackServerApp.getUser();
}

// GET /api/jobs - List user's jobs or get specific job
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific job by ID
      const [job] = await db
        .select()
        .from(generationJobs)
        .where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, user.id)))
        .limit(1);

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json(job);
    }

    if (bookId) {
      // Get job for specific book
      const [job] = await db
        .select()
        .from(generationJobs)
        .where(and(eq(generationJobs.bookId, bookId), eq(generationJobs.userId, user.id)))
        .limit(1);

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json(job);
    }

    // List all user's jobs with book info
    const jobs = await db
      .select({
        job: generationJobs,
        book: {
          id: books.id,
          name: books.name,
          birthYear: books.birthYear,
          coverImageUrl: books.coverImageUrl,
        },
      })
      .from(generationJobs)
      .leftJoin(books, eq(generationJobs.bookId, books.id))
      .where(eq(generationJobs.userId, user.id))
      .orderBy(desc(generationJobs.createdAt));

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
