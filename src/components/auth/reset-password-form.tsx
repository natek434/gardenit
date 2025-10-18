"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "../ui/button";

export function ResetPasswordClientForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to reset password" }));
        setError(typeof data.error === "string" ? data.error : "Unable to reset password");
        return;
      }

      setMessage("Password updated. Redirecting to sign in…");
      setTimeout(() => {
        router.push("/auth/signin");
      }, 1500);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          minLength={8}
          required
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <input
          id="confirm-password"
          name="confirm"
          type="password"
          minLength={8}
          required
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Updating password…" : "Update password"}
      </Button>
    </form>
  );
}
