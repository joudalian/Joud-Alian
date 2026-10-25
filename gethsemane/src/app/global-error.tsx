"use client";

import "./globals.css";

// Last-resort boundary for errors thrown by the root layout itself. Translated error pages
// for everything else live in app/[locale]/error.tsx.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="container status-page" role="alert">
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please try again.</p>
          <div className="status-actions">
            <button type="button" className="btn btn-primary" onClick={reset}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
