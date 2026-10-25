import type { ReactNode } from "react";

/** Narrow centred layout of the log-in, sign-up and password pages. */
export function AuthCard({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="container page auth-page">
      <div className="auth-card">
        <h1>{title}</h1>
        {intro && <p className="lead">{intro}</p>}
        {children}
      </div>
    </div>
  );
}
