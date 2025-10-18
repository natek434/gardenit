"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

type RuleType = "time" | "weather" | "soil" | "phenology" | "garden";

type NotificationRuleSummary = {
  id: string;
  name: string;
  type: RuleType;
  schedule: string | null;
  params: Record<string, unknown>;
  throttleSecs: number;
  isEnabled: boolean;
};

type ConditionalRuleManagerProps = {
  initialRules: NotificationRuleSummary[];
};

type RuleTemplate = {
  key: string;
  label: string;
  name: string;
  description: string;
  type: RuleType;
  schedule?: string;
  params: Record<string, unknown>;
  throttleSecs?: number;
};

const RULE_TEMPLATES: RuleTemplate[] = [
  {
    key: "morningDigest",
    label: "Morning digest",
    name: "morning_digest",
    description:
      "Daily overview of upcoming tasks, with focus items surfaced first alongside the day’s weather outlook.",
    type: "time",
    schedule: "FREQ=DAILY;BYHOUR=7;BYMINUTE=10",
    params: { includeFocusFirst: true, includeWeather: true },
  },
  {
    key: "weeklyCheck",
    label: "Weekly health check",
    name: "weekly_check_roundup",
    description:
      "Sunday afternoon summary nudging you to weed, deadhead, inspect for pests, and prep succession sowings.",
    type: "time",
    schedule: "FREQ=WEEKLY;BYDAY=SU;BYHOUR=16",
    params: { checklist: ["weeding", "deadheading", "pest scouting", "succession sowing"] },
  },
  {
    key: "rainSkip",
    label: "Rain incoming",
    name: "rain_skip_watering",
    description:
      "Alerts when precipitation probability exceeds 60% so you can skip watering tasks due within 18 hours.",
    type: "weather",
    schedule: "FREQ=HOURLY",
    params: {
      precipProbNext24hGte: 0.6,
      actions: [
        { do: "suppress_tasks", where: { type: "watering", dueWithinHours: 18 } },
        { do: "notify", title: "Rain coming — skip watering", severity: "info", channel: "inapp" },
      ],
    },
    throttleSecs: 43200,
  },
  {
    key: "frostRisk",
    label: "Frost risk",
    name: "frost_risk_alert",
    description:
      "Warns when frost probability crosses 30% or lows dip below freezing, highlighting focus plantings to cover.",
    type: "weather",
    schedule: "FREQ=HOURLY",
    params: {
      frostProbGte: 0.3,
      minTempLte: 0,
      actions: [
        {
          do: "notify",
          title: "Frost risk tonight",
          severity: "critical",
          channel: "push",
          meta: { includeFocus: true, guidance: "Cover vulnerable crops before sunset." },
        },
      ],
    },
    throttleSecs: 21600,
  },
  {
    key: "heatSpike",
    label: "Heat spike",
    name: "heat_spike_protection",
    description:
      "Calls for early watering and shade cloth whenever tomorrow’s highs exceed 28°C.",
    type: "weather",
    schedule: "FREQ=HOURLY",
    params: {
      maxTempTomorrowGte: 28,
      actions: [
        {
          do: "notify",
          title: "Heat spike incoming",
          severity: "warning",
          channel: "email",
          meta: { suggestion: "Water at dawn and deploy shade cloth for leafy greens." },
        },
      ],
    },
  },
  {
    key: "soilTemp",
    label: "Soil temperature threshold",
    name: "soil_temp_threshold",
    description:
      "Signals when 10cm soil temperatures stay above 12°C so it’s safe to sow heat-loving crops.",
    type: "soil",
    schedule: "FREQ=DAILY;BYHOUR=6",
    params: {
      soilTemp10cmGte: 12,
      species: ["beans", "maize", "cucumber"],
      actions: [
        {
          do: "notify",
          title: "Soil warmth alert",
          severity: "info",
          channel: "inapp",
          meta: { message: "Warm enough to sow beans and other warm-season crops." },
        },
      ],
    },
  },
  {
    key: "gddHarvest",
    label: "GDD harvest alert",
    name: "gdd_harvest_alert",
    description:
      "Highlights crops nearing 80% of their growing degree day target so you can plan harvests.",
    type: "phenology",
    schedule: "FREQ=DAILY;BYHOUR=7",
    params: {
      maturityGDDPctGte: 0.8,
      actions: [
        {
          do: "notify",
          title: "Harvest window approaching",
          severity: "info",
          channel: "inapp",
          meta: { emphasis: "Carrots and similar crops are nearing harvest." },
        },
      ],
    },
  },
  {
    key: "windAdvisory",
    label: "Wind advisory",
    name: "wind_advisory_support",
    description:
      "Warns of gusts above 60 km/h so you can stake tomatoes and secure hoops.",
    type: "weather",
    schedule: "FREQ=HOURLY",
    params: {
      gustsNext24hGte: 60,
      actions: [
        {
          do: "notify",
          title: "High winds expected",
          severity: "warning",
          channel: "push",
          meta: { guidance: "Stake tall crops and secure tunnels." },
        },
      ],
    },
  },
  {
    key: "focusEscalation",
    label: "Focus escalation",
    name: "focus_escalation_overdue",
    description:
      "Escalates overdue tasks tied to focus items once they slip 48 hours past due.",
    type: "garden",
    schedule: "FREQ=HOURLY",
    params: {
      focusOnly: true,
      overdueTaskHoursGte: 48,
      actions: [
        {
          do: "escalate",
          severity: "warning",
          channel: "inapp",
          meta: { emphasis: "Focus items need attention" },
        },
      ],
    },
  },
];

function serializeRule(rule: NotificationRuleSummary) {
  return {
    ...rule,
    params: rule.params ?? {},
  };
}

export function ConditionalRuleManager({ initialRules }: ConditionalRuleManagerProps) {
  const [rules, setRules] = useState(initialRules.map(serializeRule));
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [toggleRuleId, setToggleRuleId] = useState<string | null>(null);
  const [removeRuleId, setRemoveRuleId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<RuleType>("time");
  const [customSchedule, setCustomSchedule] = useState("");
  const [customThrottle, setCustomThrottle] = useState("21600");
  const [customParams, setCustomParams] = useState("{\n  \"actions\": []\n}");
  const [isCreating, setIsCreating] = useState(false);
  const { pushToast } = useToast();

  const templateStatus = useMemo(() => {
    return RULE_TEMPLATES.reduce<Record<string, { rule?: NotificationRuleSummary }>>((acc, template) => {
      acc[template.key] = {
        rule: rules.find((rule) => rule.name === template.name),
      };
      return acc;
    }, {});
  }, [rules]);

  const handleToggleTemplate = async (template: RuleTemplate) => {
    const status = templateStatus[template.key];
    const existing = status?.rule;
    setPendingTemplate(template.key);
    try {
      if (existing) {
        const nextEnabled = !existing.isEnabled;
        const response = await fetch(`/api/notification-rules/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: nextEnabled }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Unable to update rule" }));
          pushToast({
            title: "Rule not updated",
            description: typeof data.error === "string" ? data.error : "Unable to update rule",
            variant: "error",
          });
          return;
        }
        const json = (await response.json()) as { rule: NotificationRuleSummary };
        setRules((current) => current.map((rule) => (rule.id === existing.id ? serializeRule(json.rule) : rule)));
        pushToast({
          title: nextEnabled ? "Rule enabled" : "Rule paused",
          description: nextEnabled
            ? `${template.label} will now run automatically.`
            : `${template.label} will remain inactive until you enable it again.`,
          variant: "success",
        });
        return;
      }

      const response = await fetch("/api/notification-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          type: template.type,
          schedule: template.schedule,
          params: template.params,
          throttleSecs: template.throttleSecs,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to create rule" }));
        pushToast({
          title: "Rule not created",
          description: typeof data.error === "string" ? data.error : "Unable to create rule",
          variant: "error",
        });
        return;
      }
      const json = (await response.json()) as { rule: NotificationRuleSummary };
      setRules((current) => [...current, serializeRule(json.rule)]);
      pushToast({
        title: "Rule enabled",
        description: `${template.label} is now active and will trigger automatically.`,
        variant: "success",
      });
    } finally {
      setPendingTemplate(null);
    }
  };

  const handleToggleRule = async (rule: NotificationRuleSummary) => {
    setToggleRuleId(rule.id);
    try {
      const response = await fetch(`/api/notification-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !rule.isEnabled }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to update rule" }));
        pushToast({
          title: "Rule not updated",
          description: typeof data.error === "string" ? data.error : "Unable to update rule",
          variant: "error",
        });
        return;
      }
      const json = (await response.json()) as { rule: NotificationRuleSummary };
      setRules((current) => current.map((currentRule) => (currentRule.id === rule.id ? serializeRule(json.rule) : currentRule)));
      pushToast({
        title: json.rule.isEnabled ? "Rule enabled" : "Rule paused",
        description: json.rule.isEnabled
          ? `${rule.name} will resume sending notifications.`
          : `${rule.name} is paused until you enable it again.`,
        variant: "success",
      });
    } finally {
      setToggleRuleId(null);
    }
  };

  const handleRemoveRule = async (rule: NotificationRuleSummary) => {
    setRemoveRuleId(rule.id);
    try {
      const response = await fetch(`/api/notification-rules/${rule.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to remove rule" }));
        pushToast({
          title: "Rule not removed",
          description: typeof data.error === "string" ? data.error : "Unable to remove rule",
          variant: "error",
        });
        return;
      }
      setRules((current) => current.filter((currentRule) => currentRule.id !== rule.id));
      pushToast({
        title: "Rule removed",
        description: `${rule.name} will no longer trigger notifications.`,
        variant: "info",
      });
    } finally {
      setRemoveRuleId(null);
    }
  };

  const handleCreateCustomRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = customName.trim();
    if (!trimmedName) {
      pushToast({
        title: "Name required",
        description: "Give your rule a descriptive name.",
        variant: "error",
      });
      return;
    }

    let parsedParams: Record<string, unknown> = {};
    const paramsSource = customParams.trim();
    if (paramsSource) {
      try {
        parsedParams = JSON.parse(paramsSource);
      } catch (error) {
        pushToast({
          title: "Invalid params",
          description: "Enter valid JSON for params.",
          variant: "error",
        });
        return;
      }
    }

    const throttleValue = Number(customThrottle.trim());
    const throttleSecs = Number.isFinite(throttleValue) && throttleValue > 0 ? throttleValue : undefined;

    setIsCreating(true);
    try {
      const response = await fetch("/api/notification-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          type: customType,
          schedule: customSchedule.trim() || undefined,
          params: parsedParams,
          throttleSecs,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to create rule" }));
        pushToast({
          title: "Rule not created",
          description: typeof data.error === "string" ? data.error : "Unable to create rule",
          variant: "error",
        });
        return;
      }
      const json = (await response.json()) as { rule: NotificationRuleSummary };
      setRules((current) => [...current, serializeRule(json.rule)]);
      pushToast({
        title: "Rule created",
        description: `${trimmedName} is now active.`,
        variant: "success",
      });
      setCustomName("");
      setCustomSchedule("");
      setCustomThrottle("21600");
      setCustomParams("{\n  \"actions\": []\n}");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Conditional triggers</h2>
          <p className="text-sm text-slate-600">
            Turn on smart rules that react to weather, soil data, and focus priorities. Enable a preset or build
            your own automation below.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {RULE_TEMPLATES.map((template) => {
            const status = templateStatus[template.key];
            const existing = status?.rule;
            const isActive = existing?.isEnabled ?? false;
            const isPending = pendingTemplate === template.key;
            return (
              <div
                key={template.key}
                className="flex h-full flex-col justify-between rounded border border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{template.label}</h3>
                      <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {template.type}
                    </span>
                  </div>
                  {template.schedule ? (
                    <p className="text-[11px] text-slate-500">Schedule: {template.schedule}</p>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {existing ? (isActive ? "Enabled" : "Paused") : "Disabled"}
                  </span>
                  <Button
                    type="button"
                    onClick={() => handleToggleTemplate(template)}
                    disabled={isPending}
                  >
                    {existing ? (isActive ? "Pause rule" : "Enable rule") : "Enable rule"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Custom conditional rule</h2>
          <p className="text-sm text-slate-600">
            Define bespoke rules with your own schedule and parameters. Params accept JSON so you can express
            thresholds and actions.
          </p>
        </div>
        <form onSubmit={handleCreateCustomRule} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Rule name
            <input
              type="text"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Rule type
            <select
              value={customType}
              onChange={(event) => setCustomType(event.target.value as RuleType)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="time">Time</option>
              <option value="weather">Weather</option>
              <option value="soil">Soil</option>
              <option value="phenology">Phenology</option>
              <option value="garden">Garden</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Schedule (RRULE)
            <input
              type="text"
              value={customSchedule}
              onChange={(event) => setCustomSchedule(event.target.value)}
              placeholder="e.g. FREQ=DAILY;BYHOUR=7"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Throttle seconds
            <input
              type="number"
              min={300}
              value={customThrottle}
              onChange={(event) => setCustomThrottle(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-700">
            Params (JSON)
            <textarea
              value={customParams}
              onChange={(event) => setCustomParams(event.target.value)}
              rows={6}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Saving rule…" : "Create rule"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Your conditional rules</h2>
          <p className="text-sm text-slate-600">
            Manage all of your rules, toggle them on or off, or remove ones you no longer need.
          </p>
        </div>
        <div className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-sm text-slate-500">No conditional rules yet. Enable a preset or create a custom one.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="space-y-3 rounded border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{rule.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{rule.type}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      rule.isEnabled
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {rule.isEnabled ? "Enabled" : "Paused"}
                  </span>
                </div>
                {rule.schedule ? (
                  <p className="text-xs text-slate-500">Schedule: {rule.schedule}</p>
                ) : null}
                <pre className="max-h-48 overflow-auto rounded bg-slate-900/90 p-3 text-[11px] leading-tight text-slate-100">
                  {JSON.stringify(rule.params ?? {}, null, 2)}
                </pre>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleToggleRule(rule)}
                    disabled={toggleRuleId === rule.id}
                  >
                    {rule.isEnabled ? "Pause" : "Enable"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleRemoveRule(rule)}
                    disabled={removeRuleId === rule.id}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
