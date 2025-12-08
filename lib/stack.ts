import { StackServerApp } from '@stackframe/stack';

// Check if Stack Auth is properly configured
const isAuthConfigured = () => {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  // Check if it's a valid UUID (not placeholder)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return projectId && uuidRegex.test(projectId);
};

export const authEnabled = isAuthConfigured();

// When auth is disabled, this import goes to our stub which does nothing
// When auth is enabled, this creates a real StackServerApp
export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
});
