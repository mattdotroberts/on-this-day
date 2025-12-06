
export interface Source {
  title: string;
  url: string;
}

export interface BookEntry {
  day: string;
  year: string;
  headline: string;
  historyEvent: string;
  nameLink?: string;
  whyIncluded: string;
  sources?: Source[];
}

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
}

export interface Book {
  id: string;
  prefs: UserPreferences;
  entries: BookEntry[];
  createdAt: number;
  author?: string;
  coverImage?: string;
}

export enum AppState {
  LANDING,
  FORM,
  GENERATING,
  PREVIEW
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
