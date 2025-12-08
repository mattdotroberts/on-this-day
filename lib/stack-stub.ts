// Stub module for @stackframe/stack when auth is not configured
// This prevents the real package from loading and making network requests

export const StackServerApp = class {
  constructor(_config: any) {}
};

export const StackProvider = ({ children }: { children: React.ReactNode }) => children;
export const StackTheme = ({ children }: { children: React.ReactNode }) => children;
export const StackHandler = () => null;
export const UserButton = () => null;

export const useUser = () => null;
export const useStackApp = () => null;

// Add any other exports that might be needed
export default {
  StackServerApp,
  StackProvider,
  StackTheme,
  StackHandler,
  UserButton,
  useUser,
  useStackApp,
};
