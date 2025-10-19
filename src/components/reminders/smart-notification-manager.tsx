"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

type SmartReminder = {
  id: string;
  title: string;
  details: string | null;
  dueAt: string;
  cadence: string | null;
  type: string;
  sentAt: string | null;
};

type SmartNotificationManagerProps = {
  initialReminders: SmartReminder[];
};

const CATEGORY_PRESETS: Record<
  "soil-temp" | "ph-check" | "disease-scout",
  { label: string; defaultTitle: string; defaultDetail: string; cadence: string }
> = {
  "soil-temp": {
    label: "Soil temperature",
    defaultTitle: "Check soil temperature",
    defaultDetail: "Measure soil temperature at root depth and note trends to plan transplanting.",
    cadence: "weekly",
  },
  "ph-check": {
    label: "pH level",
    defaultTitle: "Test soil pH",
    defaultDetail: "Collect soil samples and record pH adjustments for upcoming feedings.",
    cadence: "monthly",
  },
  "disease-scout": {
    label: "Disease scouting",
    defaultTitle: "Scout for disease symptoms",
    defaultDetail: "Inspect foliage for spots, mildew, or pests and act before issues spread.",
    cadence: "biweekly",
  },
};

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function SmartNotificationManager({ initialReminders }: SmartNotificationManagerProps) {
  const [reminders, setReminders] = useState(initialReminders);
  const [category, setCategory] = useState<keyof typeof CATEGORY_PRESETS>("soil-temp");
  const preset = CATEGORY_PRESETS[category];
  const [title, setTitle] = useState(preset.defaultTitle);
  const [detail, setDetail] = useState(preset.defaultDetail);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  });
  const [cadence, setCadence] = useState(preset.cadence);
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  useEffect(() => {
    setTitle(CATEGORY_PRESETS[category].defaultTitle);
    setDetail(CATEGORY_PRESETS[category].defaultDetail);
    setCadence(CATEGORY_PRESETS[category].cadence);
  }, [category]);

  const sortedReminders = useMemo(
    () =>
      reminders
        .slice()
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [reminders],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dueDate) {
      pushToast({
        title: "Due date required",
        description: "Choose when you want this notification to trigger.",
        variant: "error",
      });
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      pushToast({
        title: "Title required",
        description: "Describe the task so we can send the right reminder.",
        variant: "error",
      });
      return;
    }

    startTransition(async () => {
      const normalizedCadence = cadence.trim() ? cadence.trim() : undefined;
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          dueAt: new Date(`${dueDate}T09:00:00`).toISOString(),
          cadence: normalizedCadence,
          type: `smart-${category}`,
          details: detail,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to create reminder" }));
        pushToast({
          title: "Reminder not created",
          description: typeof data.error === "string" ? data.error : "Unable to create reminder",
          variant: "error",
        });
        return;
      }

      const json = (await response.json()) as { reminder: SmartReminder };
      setReminders((current) => [...current, json.reminder]);
      pushToast({
        title: "Smart reminder saved",
        description: `${trimmedTitle} scheduled for ${DATE_FORMATTER.format(new Date(json.reminder.dueAt))}.`,
        variant: "success",
      });
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Create a smart notification</h2>
          <p className="text-sm text-slate-600">
            Choose a focus area and schedule regular nudges to stay ahead of soil and plant health tasks.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Focus
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as keyof typeof CATEGORY_PRESETS)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {Object.entries(CATEGORY_PRESETS).map(([key, presetValue]) => (
                <option key={key} value={key}>
                  {presetValue.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Task title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Details
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              First reminder date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Cadence
              <input
                type="text"
                value={cadence}
                onChange={(event) => setCadence(event.target.value)}
                placeholder="e.g. weekly"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving reminder…" : "Save smart reminder"}
          </Button>
        </form>
      </section>
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Upcoming smart reminders</h2>
          <p className="text-sm text-slate-600">
            These reminders combine weather checks and your custom tasks.
          </p>
        </div>
        <div className="space-y-3">
          {sortedReminders.length === 0 ? (
            <p className="text-sm text-slate-500">No smart reminders yet. Create one to get started.</p>
          ) : (
            sortedReminders.map((reminder) => {
              const due = new Date(reminder.dueAt);
              return (
                <div key={reminder.id} className="rounded border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{reminder.title}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{reminder.type}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-600">{DATE_FORMATTER.format(due)}</span>
                  </div>
                  {reminder.details ? (
                    <p className="mt-2 text-sm text-slate-600">{reminder.details}</p>
                  ) : null}
                  {reminder.cadence ? (
                    <p className="mt-2 text-xs text-slate-500">Cadence: {reminder.cadence}</p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
