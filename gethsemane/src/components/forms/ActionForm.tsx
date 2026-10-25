"use client";

import { useActionState, type ReactNode } from "react";

export type FormState = { status: "idle" | "error" | "success"; message?: string };
export const idle: FormState = { status: "idle" };

/**
 * A form posting to a server action. Works without JavaScript (a normal POST); with it, the action's message is
 * shown in place (errors as an alert, success as a status). `successOnly` replaces the form with the message on
 * success (e.g. "check your inbox").
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  successOnly = false,
  testId,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  submitLabel: string;
  children: ReactNode;
  className?: string;
  successOnly?: boolean;
  testId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idle);
  if (successOnly && state.status === "success") {
    return (
      <p className="form-message form-success" role="status" data-testid={testId ? `${testId}-success` : undefined}>
        {state.message}
      </p>
    );
  }
  return (
    <form action={formAction} className={`stack-form ${className ?? ""}`.trim()} data-testid={testId} aria-busy={pending || undefined}>
      {children}
      {state.message && (
        <p className={`form-message ${state.status === "error" ? "form-error" : "form-success"}`} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
