import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'w-7 h-7' }) {
  return <Loader2 className={`animate-spin text-neutral-400 ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex justify-center py-32">
      <Spinner />
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <p className="text-destructive font-medium mb-2">Something went wrong</p>
      <p className="text-sm text-muted-foreground mb-4">
        {error?.message || 'Failed to load. Please try again.'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-gold-700 underline">
          Retry
        </button>
      )}
    </div>
  );
}

export default PageLoader;
