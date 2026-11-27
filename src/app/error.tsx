'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: 'error',
        service: 'internal-chatbot',
        source: 'app/error.tsx',
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
    );
  }, [error]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          backgroundColor: '#10b981',
          color: '#ffffff',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
