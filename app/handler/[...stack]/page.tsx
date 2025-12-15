import { stackServerApp, authEnabled } from '@/lib/stack';
import { redirect } from 'next/navigation';

// Try to get StackHandler, use stub if unavailable
let StackHandler: React.ComponentType<{ fullPage: boolean; app: unknown; params: unknown }>;

try {
  StackHandler = require('@stackframe/stack').StackHandler;
} catch {
  // Stub that redirects home
  StackHandler = () => null;
}

export default function Handler(props: { params: Promise<{ stack: string[] }> }) {
  // When auth is disabled or package unavailable, redirect home
  if (!authEnabled) {
    redirect('/');
  }
  return <StackHandler fullPage app={stackServerApp} params={props.params} />;
}
