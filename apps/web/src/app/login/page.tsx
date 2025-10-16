import React, { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center p-4">Loading…</div>}
    >
      {/* LoginClient contains client-only hooks like useSearchParams() */}
      <LoginClient />
    </Suspense>
  );
}
