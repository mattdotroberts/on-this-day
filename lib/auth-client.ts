'use client';

// Type for user object
type StackUser = {
  id: string;
  primaryEmail?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
} | null;

// Check if auth is configured
const isAuthConfigured = () => {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return projectId && uuidRegex.test(projectId);
};

export const authEnabled = isAuthConfigured();

// Stub implementations for when auth is disabled or package unavailable
const stubUseUser = (): StackUser => null;
const StubUserButton = () => null;

// Try to import Stack Auth, fall back to stubs if unavailable
let useStackUser: () => StackUser = stubUseUser;
let StackUserButton: React.ComponentType<Record<string, unknown>> = StubUserButton;

try {
  // Dynamic require to avoid build errors when package is missing
  const stack = require('@stackframe/stack');
  useStackUser = stack.useUser;
  StackUserButton = stack.UserButton;
} catch {
  // Package not available, use stubs
}

export const useUser = useStackUser;
export const UserButton = StackUserButton;
