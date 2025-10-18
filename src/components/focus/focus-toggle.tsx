"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/src/components/ui/toast";

type FocusToggleProps = {
  kind: "plant" | "bed" | "planting" | "task";
  targetId: string;
  initialFocusId?: string;
  label?: string;
  className?: string;
};

export function FocusToggle({ kind, targetId, initialFocusId, label, className }: FocusToggleProps) {
  const [focusId, setFocusId] = useState(initialFocusId ?? null);
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  const handleToggle = () => {
    startTransition(async () => {
      if (focusId) {
        const response = await fetch(`/api/focus/${focusId}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Unable to update focus" }));
          pushToast({
            title: "Focus not removed",
            description: typeof data.error === "string" ? data.error : "Unable to update focus",
            variant: "error",
          });
          return;
        }
        setFocusId(null);
        pushToast({
          title: "Removed from focus",
          description: "We will no longer highlight this item.",
          variant: "info",
        });
        return;
      }
      const response = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, targetId, label, mode: "create" }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to update focus" }));
        pushToast({
          title: "Focus not added",
          description: typeof data.error === "string" ? data.error : "Unable to update focus",
          variant: "error",
        });
        return;
      }
      const json = (await response.json()) as { focus: { id: string } };
      setFocusId(json.focus.id);
      pushToast({
        title: "Added to focus",
        description: "This item will appear at the top of your digests.",
        variant: "success",
      });
    });
  };

  const isFocused = Boolean(focusId);

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={isFocused}
      className={`rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
        isFocused
          ? "border-primary bg-primary text-white hover:bg-primary/90"
          : "border-primary text-primary hover:bg-primary/10"
      } ${isPending ? "cursor-not-allowed opacity-60" : ""} ${className ?? ""}`}
    >
      {isFocused ? "Unfocus" : "Focus"}
    </button>
  );
}
