import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { purchases, books, generationJobs } from '@/lib/db/schema';
import { stackServerApp } from '@/lib/stack';

// GET /api/purchases - Get user's purchases
export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all purchases for the user with their associated books and jobs
    const userPurchases = await db.query.purchases.findMany({
      where: eq(purchases.userId, user.id),
      orderBy: desc(purchases.createdAt),
    });

    // Enrich with book and job data
    const enrichedPurchases = await Promise.all(
      userPurchases.map(async (purchase) => {
        let book = null;
        let job = null;

        if (purchase.bookId) {
          book = await db.query.books.findFirst({
            where: eq(books.id, purchase.bookId),
          });

          job = await db.query.generationJobs.findFirst({
            where: eq(generationJobs.bookId, purchase.bookId),
          });
        }

        return {
          ...purchase,
          book: book ? {
            id: book.id,
            name: book.name,
            birthYear: book.birthYear,
            coverImageUrl: book.coverImageUrl,
            generationStatus: book.generationStatus,
          } : null,
          job: job ? {
            id: job.id,
            status: job.status,
            progress: job.progress,
            currentMonth: job.currentMonth,
          } : null,
        };
      })
    );

    return NextResponse.json(enrichedPurchases);
  } catch (error) {
    console.error('Failed to fetch purchases:', error);
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}
