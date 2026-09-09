import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-7xl font-light text-neutral-300">404</h1>
        <div className="h-0.5 w-16 bg-neutral-200 mx-auto my-4" />
        <h2 className="text-2xl font-medium text-neutral-800 mb-2">Page not found</h2>
        <p className="text-neutral-500 mb-6">That page doesn&apos;t exist in Swarna Prabha.</p>
        <Link to="/" className="inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50">
          Go home
        </Link>
      </div>
    </div>
  );
}
