"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useTransition } from "react";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

export function ResetPasswordClientForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password !== confirm) {
      pushToast({
        title: "Passwords do not match",
        description: "Please confirm the same password in both fields.",
        variant: "error",
      });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to reset password" }));
        pushToast({
          title: "Password not updated",
          description: typeof data.error === "string" ? data.error : "Unable to reset password",
          variant: "error",
        });
        return;
      }

      pushToast({
        title: "Password updated",
        description: "Redirecting you to sign in…",
        variant: "success",
      });
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
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Updating password…" : "Update password"}
      </Button>
    </form>
  );
}
