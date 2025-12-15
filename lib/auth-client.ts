'use client';

import { useUser as useStackUser, UserButton as StackUserButton } from '@stackframe/stack';

// Check if auth is configured
const isAuthConfigured = () => {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return projectId && uuidRegex.test(projectId);
};

export const authEnabled = isAuthConfigured();

export const useUser = useStackUser;
export const UserButton = StackUserButton;
