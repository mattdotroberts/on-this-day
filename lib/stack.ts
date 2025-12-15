// Check if Stack Auth is properly configured
const isAuthConfigured = () => {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  // Check if it's a valid UUID (not placeholder)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return projectId && uuidRegex.test(projectId);
};

export const authEnabled = isAuthConfigured();

// Type for user object
type StackUser = {
  id: string;
  primaryEmail?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
} | null;

// Stub implementation
const stubServerApp = {
  getUser: async (): Promise<StackUser> => null,
};

// Try to import Stack Auth, fall back to stub if unavailable
let stackServerApp: { getUser: () => Promise<StackUser> } = stubServerApp;

try {
  // Dynamic require to avoid build errors when package is missing
  const { StackServerApp } = require('@stackframe/stack');
  stackServerApp = new StackServerApp({
    tokenStore: 'nextjs-cookie',
  });
} catch {
  // Package not available, use stub
}

export { stackServerApp };
