import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Price IDs from your Stripe dashboard
export const STRIPE_PRICES = {
  digital: 'price_1Sc0quIVJOGjDVmHgDyU2C5I',      // $4.99
  printedDigital: 'price_1Sc0rCIVJOGjDVmHkJX9OTat', // $69.99
} as const;

export type ProductType = keyof typeof STRIPE_PRICES;

export const PRODUCT_DETAILS = {
  digital: {
    name: 'Digital Only',
    description: '365 personalized history entries delivered digitally',
    price: 499, // cents
    includesPrint: false,
  },
  printedDigital: {
    name: 'Printed + Digital',
    description: 'Beautiful hardcover book + digital access',
    price: 6999, // cents
    includesPrint: true,
  },
} as const;
