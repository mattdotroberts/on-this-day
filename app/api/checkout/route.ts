import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { stripe, STRIPE_PRICES, PRODUCT_DETAILS, type ProductType } from '@/lib/stripe';
import { db } from '@/lib/db';
import { purchases, users } from '@/lib/db/schema';
import { stackServerApp } from '@/lib/stack';
import type { BookPreferences } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { productType, bookPrefs, existingBookId } = body as {
      productType: ProductType;
      bookPrefs: BookPreferences;
      existingBookId?: string; // If upgrading an existing sample book
    };

    // Validate product type
    if (!productType || !STRIPE_PRICES[productType]) {
      return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
    }

    // Validate book preferences
    if (!bookPrefs || !bookPrefs.name || !bookPrefs.birthYear || !bookPrefs.interests?.length) {
      return NextResponse.json({ error: 'Invalid book preferences' }, { status: 400 });
    }

    // Ensure user exists in our database
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });

    if (!existingUser) {
      await db.insert(users).values({
        id: user.id,
        email: user.primaryEmail || '',
        displayName: user.displayName || null,
        avatarUrl: user.profileImageUrl || null,
      });
    }

    const priceId = STRIPE_PRICES[productType];
    const productDetails = PRODUCT_DETAILS[productType];

    // Create a purchase record (pending payment)
    const [purchase] = await db.insert(purchases).values({
      userId: user.id,
      productType,
      priceId,
      amountCents: productDetails.price,
      bookPrefs,
      paymentStatus: 'pending',
    }).returning();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my-books?success=true&purchase=${purchase.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?cancelled=true`,
      customer_email: user.primaryEmail || undefined,
      metadata: {
        purchaseId: purchase.id,
        userId: user.id,
        productType,
        bookName: bookPrefs.name,
        ...(existingBookId && { existingBookId }), // Include if upgrading existing book
      },
      // If it's a printed book, collect shipping address
      ...(productDetails.includesPrint && {
        shipping_address_collection: {
          allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'IE', 'NZ'],
        },
      }),
    });

    // Update purchase with session ID
    await db.update(purchases)
      .set({ stripeSessionId: session.id })
      .where(eq(purchases.id, purchase.id));

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Get prices for display
export async function GET() {
  return NextResponse.json({
    prices: {
      digital: {
        id: STRIPE_PRICES.digital,
        ...PRODUCT_DETAILS.digital,
        priceFormatted: `$${(PRODUCT_DETAILS.digital.price / 100).toFixed(2)}`,
      },
      printedDigital: {
        id: STRIPE_PRICES.printedDigital,
        ...PRODUCT_DETAILS.printedDigital,
        priceFormatted: `$${(PRODUCT_DETAILS.printedDigital.price / 100).toFixed(2)}`,
      },
    },
  });
}
