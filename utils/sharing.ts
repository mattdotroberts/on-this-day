
import { Book, BookEntry, UserPreferences } from '../types';

interface ShareableBookPayload {
  p: UserPreferences;
  e: BookEntry[];
  a?: string;
  d: number; // createdAt
}

// Compress and encode book data to a URL-safe Base64 string
export const encodeBookForUrl = (book: Book): string => {
  // Create a minified payload (exclude coverImage to save space)
  const payload: ShareableBookPayload = {
    p: book.prefs,
    e: book.entries,
    a: book.author,
    d: book.createdAt
  };

  try {
    const jsonString = JSON.stringify(payload);
    // Handle Unicode characters properly
    const bytes = new TextEncoder().encode(jsonString);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binString);
  } catch (error) {
    console.error("Failed to encode book:", error);
    return "";
  }
};

// Decode book data from a URL parameter
export const decodeBookFromUrl = (encodedString: string): Book | null => {
  try {
    const binString = atob(encodedString);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    const jsonString = new TextDecoder().decode(bytes);
    const payload: ShareableBookPayload = JSON.parse(jsonString);

    // Reconstruct full Book object
    return {
      id: 'shared-' + Date.now(),
      prefs: payload.p,
      entries: payload.e,
      createdAt: payload.d,
      author: payload.a || 'Shared Link',
      // Cover image is not shared via URL due to size limits
      coverImage: undefined 
    };
  } catch (error) {
    console.error("Failed to decode book:", error);
    return null;
  }
};
