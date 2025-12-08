// Re-export database types
export type { BookEntry, Book, User, Order, Subscription } from './db/schema';

// Client-side types (for forms and UI)
export type BlendLevel = 'focused' | 'diverse';
export type CoverStyle = 'classic' | 'minimalist' | 'whimsical' | 'cinematic' | 'retro';

export interface UserPreferences {
  name: string;
  birthYear: string;
  birthDay: string;
  birthMonth: string;
  interests: string[];
  blendLevel: BlendLevel;
  coverStyle: CoverStyle;
  birthdayMessage?: string;
}

export interface Source {
  title: string;
  url: string;
}

// Client-side book entry (for display)
export interface ClientBookEntry {
  day: string;
  year: string;
  headline: string;
  historyEvent: string;
  nameLink?: string;
  whyIncluded: string;
  sources?: Source[];
}

// Client-side book (for display)
export interface ClientBook {
  id: string;
  prefs: UserPreferences;
  entries: ClientBookEntry[];
  createdAt: number;
  author?: string;
  coverImage?: string;
  isPublic?: boolean;
  userId?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  bookType?: 'sample' | 'full';
  generationStatus?: 'pending' | 'generating' | 'complete' | 'failed';
  entryCount?: number;
  birthdayMessage?: string;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

// API response types
export interface GenerateBookResponse {
  entries: ClientBookEntry[];
  coverImage?: string;
}

export interface SaveBookResponse {
  id: string;
  shareToken?: string;
}
