'use client';

import { useUser, UserButton } from '@/lib/auth-client';
import { User } from 'lucide-react';

export function AuthSection() {
  const user = useUser();

  return user ? (
    <UserButton />
  ) : (
    <a
      href="/handler/sign-in"
      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
    >
      <User className="w-4 h-4" />
      Sign In
    </a>
  );
}
