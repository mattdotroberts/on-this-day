import { db, errorLogs } from './db';

/**
 * Log an error to the database for monitoring and debugging.
 * This is useful for catching issues that users encounter before they report them.
 *
 * @param type - Category of error (e.g., 'narration', 'epub', 'generation', 'api')
 * @param error - The error object
 * @param metadata - Additional context (e.g., bookId, userId, request details)
 */
export async function logError(
  type: string,
  error: unknown,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    await db.insert(errorLogs).values({
      errorType: type,
      errorMessage: errorObj.message,
      errorStack: errorObj.stack,
      metadata: metadata || {},
      userId: metadata?.userId as string | undefined,
    });

    // Also log to console for immediate visibility during development
    console.error(`[${type.toUpperCase()}] Error logged:`, {
      message: errorObj.message,
      metadata,
    });
  } catch (loggingError) {
    // Don't let logging errors break the app - just console.error
    console.error('Failed to log error to database:', loggingError);
    console.error('Original error:', error);
  }
}

/**
 * Extract a safe error message from an unknown error type.
 * Useful for returning user-friendly error messages in API responses.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
