import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const blendLevelEnum = pgEnum('blend_level', ['focused', 'diverse']);
export const coverStyleEnum = pgEnum('cover_style', ['classic', 'minimalist', 'whimsical', 'cinematic', 'retro']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'printing', 'shipped', 'delivered', 'cancelled']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'paused', 'cancelled']);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed']);
export const bookTypeEnum = pgEnum('book_type', ['sample', 'full']);
export const generationStatusEnum = pgEnum('generation_status', ['pending', 'generating', 'complete', 'failed']);

// Users table - synced from Neon Auth / Stack Auth
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Books table
export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

  // Book content
  name: text('name').notNull(),
  birthYear: integer('birth_year').notNull(),
  birthMonth: text('birth_month').notNull(),
  birthDay: integer('birth_day').notNull(),
  interests: text('interests').array().notNull(),
  blendLevel: blendLevelEnum('blend_level').notNull().default('focused'),
  coverStyle: coverStyleEnum('cover_style').notNull().default('classic'),

  // Generated content
  entries: jsonb('entries').$type<BookEntry[]>(),
  coverImageUrl: text('cover_image_url'),
  birthdayMessage: text('birthday_message'),

  // Generation tracking
  bookType: bookTypeEnum('book_type').notNull().default('sample'),
  generationStatus: generationStatusEnum('generation_status').notNull().default('complete'),
  entryCount: integer('entry_count').notNull().default(0),
  additionalEntryCount: integer('additional_entry_count').notNull().default(0),

  // Visibility
  isPublic: boolean('is_public').notNull().default(true),
  shareToken: text('share_token').unique(),

  // Metadata
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Book comments
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Book likes
export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Gift books - when a user creates a book for someone else
export const giftBooks = pgTable('gift_books', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recipientEmail: text('recipient_email').notNull(),
  recipientName: text('recipient_name').notNull(),
  personalMessage: text('personal_message'),
  claimedByUserId: uuid('claimed_by_user_id').references(() => users.id),
  claimedAt: timestamp('claimed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Print orders
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'set null' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Order details
  status: orderStatusEnum('status').notNull().default('pending'),
  quantity: integer('quantity').notNull().default(1),

  // Pricing (in cents)
  subtotalCents: integer('subtotal_cents').notNull(),
  shippingCents: integer('shipping_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),

  // Shipping address
  shippingName: text('shipping_name').notNull(),
  shippingAddress1: text('shipping_address_1').notNull(),
  shippingAddress2: text('shipping_address_2'),
  shippingCity: text('shipping_city').notNull(),
  shippingState: text('shipping_state'),
  shippingPostalCode: text('shipping_postal_code').notNull(),
  shippingCountry: text('shipping_country').notNull(),

  // Payment
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeSessionId: text('stripe_session_id'),
  paidAt: timestamp('paid_at'),

  // Tracking
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Daily delivery subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  status: subscriptionStatusEnum('status').notNull().default('active'),

  // Delivery preferences
  deliveryEmail: text('delivery_email').notNull(),
  deliveryTime: text('delivery_time').notNull().default('08:00'), // HH:mm format
  timezone: text('timezone').notNull().default('UTC'),

  // Progress tracking
  currentEntryIndex: integer('current_entry_index').notNull().default(0),
  lastDeliveredAt: timestamp('last_delivered_at'),

  // Dates
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Generation jobs - for background processing of full books
export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Job status
  status: jobStatusEnum('status').notNull().default('pending'),

  // Progress tracking (0-100, based on months completed)
  progress: integer('progress').notNull().default(0),
  currentMonth: integer('current_month').notNull().default(0), // 0-11

  // Partial results stored as job progresses
  generatedEntries: jsonb('generated_entries').$type<BookEntry[]>().default([]),

  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  lastRetryAt: timestamp('last_retry_at'),

  // Worker locking (prevent duplicate processing)
  lockedAt: timestamp('locked_at'),
  lockedBy: text('locked_by'), // Worker instance ID

  // Timestamps
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types for JSON columns
export interface BookEntry {
  day: string;
  year: string;
  headline: string;
  historyEvent: string;
  nameLink?: string;
  whyIncluded: string;
  sources?: { title: string; url: string }[];
}

// Type exports for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type GiftBook = typeof giftBooks.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type GenerationJob = typeof generationJobs.$inferSelect;
export type NewGenerationJob = typeof generationJobs.$inferInsert;
