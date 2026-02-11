'use client';

import { GoogleAuthProvider } from '@/lib/google-auth';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return <GoogleAuthProvider>{children}</GoogleAuthProvider>;
}
