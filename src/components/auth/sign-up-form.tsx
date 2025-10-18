"use client";

import { FormEvent, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

export function SignUpForm() {
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const name = String(form.get("name") ?? "").trim() || undefined;

    if (password !== confirm) {
      pushToast({
        title: "Passwords do not match",
        description: "Please enter matching passwords.",
        variant: "error",
      });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create account" }));
        pushToast({
          title: "Account not created",
          description: typeof data.error === "string" ? data.error : "Unable to create account",
          variant: "error",
        });
        return;
      }

      pushToast({
        title: "Account created",
        description: "Signing you in…",
        variant: "success",
      });
      await signIn("credentials", { email, password, redirect: true, callbackUrl: "/" });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Create a new account">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Optional"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="sign-up-email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="sign-up-email"
          name="email"
          type="email"
          required
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="sign-up-password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="sign-up-password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="sign-up-confirm" className="block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <input
          id="sign-up-confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
