import { StackHandler } from '@stackframe/stack';
import { stackServerApp, authEnabled } from '@/lib/stack';
import { redirect } from 'next/navigation';

export default function Handler(props: { params: Promise<{ stack: string[] }> }) {
  if (!authEnabled) {
    redirect('/');
  }
  return <StackHandler fullPage app={stackServerApp} params={props.params} />;
}
