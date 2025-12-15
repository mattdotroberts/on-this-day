import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { purchases, books, generationJobs } from '@/lib/db/schema';
import type { BookPreferences } from '@/lib/db/schema';
import type Stripe from 'stripe';

// Disable body parsing so we can access raw body for Stripe signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  // If no webhook secret is configured, skip signature verification (dev mode)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Dev mode: parse the event without verification
      event = JSON.parse(body) as Stripe.Event;
      console.warn('Webhook signature verification skipped (no webhook secret configured)');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    console.error('No purchaseId in session metadata');
    return;
  }

  // Get the purchase
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
  });

  if (!purchase) {
    console.error('Purchase not found:', purchaseId);
    return;
  }

  // Update purchase status
  await db.update(purchases)
    .set({
      paymentStatus: 'succeeded',
      stripePaymentIntentId: session.payment_intent as string,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(purchases.id, purchaseId));

  // Check if this is an upgrade of an existing book
  const existingBookId = session.metadata?.existingBookId;
  const bookPrefs = purchase.bookPrefs as BookPreferences;

  // Skip generation in test mode (check for test mode flag or Stripe test keys)
  const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ||
                     process.env.SKIP_GENERATION === 'true';

  if (existingBookId) {
    // Upgrade existing sample book to full book
    const existingBook = await db.query.books.findFirst({
      where: eq(books.id, existingBookId),
    });

    if (existingBook) {
      // Update the existing book to full book type
      // In test mode, mark as complete immediately; otherwise pending generation
      await db.update(books)
        .set({
          bookType: 'full',
          generationStatus: isTestMode ? 'complete' : 'pending',
          updatedAt: new Date(),
        })
        .where(eq(books.id, existingBookId));

      // Link book to purchase
      await db.update(purchases)
        .set({ bookId: existingBookId })
        .where(eq(purchases.id, purchaseId));

      // Only create generation job if NOT in test mode
      if (!isTestMode) {
        await db.insert(generationJobs).values({
          bookId: existingBookId,
          userId: purchase.userId,
          status: 'pending',
          progress: 0,
          currentMonth: 0,
        });
        console.log('Existing book upgraded to full, generation job created:', existingBookId);
      } else {
        console.log('TEST MODE: Existing book upgraded to full (no generation):', existingBookId);
      }
    }
  } else if (bookPrefs) {
    // Create a new book
    // In test mode, mark as complete immediately; otherwise pending generation
    const [book] = await db.insert(books).values({
      userId: purchase.userId,
      name: bookPrefs.name,
      birthYear: parseInt(bookPrefs.birthYear),
      birthMonth: bookPrefs.birthMonth,
      birthDay: parseInt(bookPrefs.birthDay),
      interests: bookPrefs.interests,
      blendLevel: bookPrefs.blendLevel,
      coverStyle: bookPrefs.coverStyle,
      birthdayMessage: bookPrefs.birthdayMessage,
      bookType: 'full',
      generationStatus: isTestMode ? 'complete' : 'pending',
      isPublic: false, // Purchased books default to private
    }).returning();

    // Link book to purchase
    await db.update(purchases)
      .set({ bookId: book.id })
      .where(eq(purchases.id, purchaseId));

    // Only create generation job if NOT in test mode
    if (!isTestMode) {
      await db.insert(generationJobs).values({
        bookId: book.id,
        userId: purchase.userId,
        status: 'pending',
        progress: 0,
        currentMonth: 0,
      });
      console.log('Book created and generation job queued:', book.id);
    } else {
      console.log('TEST MODE: Book created (no generation):', book.id);
    }
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Find purchase by payment intent ID
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.stripePaymentIntentId, paymentIntent.id),
  });

  if (purchase) {
    await db.update(purchases)
      .set({
        paymentStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(purchases.id, purchase.id));
  }
}
