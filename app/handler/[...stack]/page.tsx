import { StackHandler } from '@stackframe/stack';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { redirect } from 'next/navigation';

export default function Handler(props: { params: Promise<{ stack: string[] }> }) {
  // When auth is disabled, StackHandler is a stub that returns null,
  // but we should redirect anyway
  if (!authEnabled) {
    redirect('/');
  }
  return <StackHandler fullPage app={stackServerApp} params={props.params} />;
}
