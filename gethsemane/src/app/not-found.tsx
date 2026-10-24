import { defaultLocale } from "@/i18n/locales";

// Fallback for requests that never reach a locale (normally the proxy redirects them to /en/...).
export default function RootNotFound() {
  return (
    <html lang={defaultLocale}>
      <body>
        <main className="container status-page">
          <p className="code" aria-hidden="true">
            404
          </p>
          <h1>Page not found</h1>
          <p>The page you are looking for does not exist or has moved.</p>
          <div className="status-actions">
            <a href={`/${defaultLocale}`} className="btn btn-primary">
              Back to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
