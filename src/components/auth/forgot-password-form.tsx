"use client";

import { FormEvent, useState, useTransition } from "react";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

export function ForgotPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setToken(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to process request" }));
        pushToast({
          title: "Reset link not sent",
          description: typeof data.error === "string" ? data.error : "Unable to process request",
          variant: "error",
        });
        return;
      }

      const result = (await response.json()) as { ok: boolean; token?: string };
      pushToast({
        title: "Reset link requested",
        description: "If that email is registered we\u2019ll send instructions shortly.",
        variant: "success",
      });
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
