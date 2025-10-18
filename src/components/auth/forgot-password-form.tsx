"use client";

import { FormEvent, useState, useTransition } from "react";
import { Button } from "../ui/button";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setStatus(null);
    setToken(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to process request" }));
        setError(typeof data.error === "string" ? data.error : "Unable to process request");
        return;
      }

      const result = (await response.json()) as { ok: boolean; token?: string };
      setStatus("If an account exists for that email, a reset link has been generated.");
      if (result.token) {
        setToken(result.token);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Reset password">
      <div className="space-y-2">
        <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          required
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
      {token ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <p className="font-semibold">Developer shortcut</p>
          <p className="mt-1 break-all">Reset token: {token}</p>
          <p className="mt-1">
            Visit <code>/auth/reset/{"<token>"}</code> to choose a new password.
          </p>
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Preparing reset…" : "Send reset link"}
      </Button>
    </form>
  );
}
