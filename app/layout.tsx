import type { Metadata } from 'next';
import { stackServerApp, authEnabled } from '@/lib/stack';
import './globals.css';

// Try to get Stack providers, use pass-through stubs if unavailable
let StackProvider: React.ComponentType<{ app: unknown; children: React.ReactNode }>;
let StackTheme: React.ComponentType<{ children: React.ReactNode }>;

try {
  const stack = require('@stackframe/stack');
  StackProvider = stack.StackProvider;
  StackTheme = stack.StackTheme;
} catch {
  // Pass-through stubs
  StackProvider = ({ children }) => <>{children}</>;
  StackTheme = ({ children }) => <>{children}</>;
}

export const metadata: Metadata = {
  title: "A Year's History Of - Personalized History Books",
  description: 'Generate personalized history books connecting historical events to your interests',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only wrap with Stack providers if auth is enabled
  const content = authEnabled ? (
    <StackProvider app={stackServerApp}>
      <StackTheme>{children}</StackTheme>
    </StackProvider>
  ) : (
    children
  );

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{content}</body>
    </html>
  );
}
