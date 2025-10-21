"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

type RuleType = "time" | "weather" | "soil" | "phenology" | "garden";

type ParamsMode = "guided" | "json";

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

type GuidedTimeState = {
  includeFocusFirst: boolean;
  includeWeather: boolean;
  checklist: string;
};

type GuidedWeatherState = {
  precipProbNext24hGte: string;
  frostProbGte: string;
  minTempLte: string;
  maxTempTomorrowGte: string;
  gustsNext24hGte: string;
  includeFocus: boolean;
  notifyTitle: string;
  notifySeverity: "info" | "warning" | "critical";
  notifyChannel: "inapp" | "email" | "push";
  notifyMessage: string;
  addSuppression: boolean;
  suppressionTaskType: string;
  suppressionDueWithinHours: string;
};

type GuidedSoilState = {
  soilTemp10cmGte: string;
  species: string;
  notifyTitle: string;
  notifyChannel: "inapp" | "email" | "push";
  notifySeverity: "info" | "warning" | "critical";
  notifyMessage: string;
};

type GuidedPhenologyState = {
  maturityGDDPctGte: string;
  notifyTitle: string;
  notifyChannel: "inapp" | "email" | "push";
  notifySeverity: "info" | "warning" | "critical";
  notifyMessage: string;
};

type GuidedGardenState = {
  focusOnly: boolean;
  overdueTaskHoursGte: string;
  escalateSeverity: "info" | "warning" | "critical";
  escalateChannel: "inapp" | "email" | "push";
  escalateMessage: string;
};

type GuidedState = {
  time: GuidedTimeState;
  weather: GuidedWeatherState;
  soil: GuidedSoilState;
  phenology: GuidedPhenologyState;
  garden: GuidedGardenState;
};

const DEFAULT_GUIDED_STATE: GuidedState = {
  time: {
    includeFocusFirst: true,
    includeWeather: true,
    checklist: "weeding, deadheading, pest scouting",
  },
  weather: {
    precipProbNext24hGte: "",
    frostProbGte: "",
    minTempLte: "",
    maxTempTomorrowGte: "",
    gustsNext24hGte: "",
    includeFocus: true,
    notifyTitle: "Weather update",
    notifySeverity: "info",
    notifyChannel: "inapp",
    notifyMessage: "Keep an eye on the forecast.",
    addSuppression: false,
    suppressionTaskType: "watering",
    suppressionDueWithinHours: "18",
  },
  soil: {
    soilTemp10cmGte: "",
    species: "beans, maize, cucumber",
    notifyTitle: "Soil update",
    notifyChannel: "inapp",
    notifySeverity: "info",
    notifyMessage: "",
  },
  phenology: {
    maturityGDDPctGte: "80",
    notifyTitle: "Phenology update",
    notifyChannel: "inapp",
    notifySeverity: "info",
    notifyMessage: "",
  },
  garden: {
    focusOnly: true,
    overdueTaskHoursGte: "48",
    escalateSeverity: "warning",
    escalateChannel: "inapp",
    escalateMessage: "Focus tasks are overdue.",
  },
};

function createDefaultGuidedState(): GuidedState {
  return {
    time: { ...DEFAULT_GUIDED_STATE.time },
    weather: { ...DEFAULT_GUIDED_STATE.weather },
    soil: { ...DEFAULT_GUIDED_STATE.soil },
    phenology: { ...DEFAULT_GUIDED_STATE.phenology },
    garden: { ...DEFAULT_GUIDED_STATE.garden },
  };
}

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPercentageString(value?: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }
  const display = value > 1 ? value : value * 100;
  return Number.isInteger(display) ? String(display) : display.toFixed(1);
}

function toStringOrEmpty(value?: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }
  return String(value);
}

function hydrateGuidedState(type: RuleType, params: Record<string, unknown>, state: GuidedState): GuidedState {
  switch (type) {
    case "time": {
      const checklistArray = Array.isArray(params.checklist)
        ? params.checklist.map((entry) => String(entry)).filter(Boolean)
        : [];
      return {
        ...state,
        time: {
          includeFocusFirst: Boolean(params.includeFocusFirst ?? state.time.includeFocusFirst),
          includeWeather: Boolean(params.includeWeather ?? state.time.includeWeather),
          checklist: checklistArray.length > 0 ? checklistArray.join(", ") : state.time.checklist,
        },
      };
    }
    case "weather": {
      const actions = Array.isArray(params.actions) ? (params.actions as Record<string, unknown>[]) : [];
      const notify = actions.find((action) => action?.do === "notify") as Record<string, unknown> | undefined;
      const suppression = actions.find((action) => action?.do === "suppress_tasks") as Record<string, unknown> | undefined;
      const suppressionWhere = (suppression?.where ?? {}) as Record<string, unknown>;
      const meta = (notify?.meta ?? {}) as Record<string, unknown>;
      return {
        ...state,
        weather: {
          precipProbNext24hGte: toPercentageString(params.precipProbNext24hGte),
          frostProbGte: toPercentageString(params.frostProbGte),
          minTempLte: toStringOrEmpty(params.minTempLte),
          maxTempTomorrowGte: toStringOrEmpty(params.maxTempTomorrowGte),
          gustsNext24hGte: toStringOrEmpty(params.gustsNext24hGte),
          includeFocus: Boolean(meta.includeFocus ?? state.weather.includeFocus),
          notifyTitle: typeof notify?.title === "string" && notify.title.trim() ? notify.title : state.weather.notifyTitle,
          notifySeverity:
            notify?.severity === "warning" || notify?.severity === "critical"
              ? (notify.severity as GuidedWeatherState["notifySeverity"])
              : "info",
          notifyChannel:
            notify?.channel === "email" || notify?.channel === "push"
              ? (notify.channel as GuidedWeatherState["notifyChannel"])
              : "inapp",
          notifyMessage: typeof meta.message === "string" ? meta.message : state.weather.notifyMessage,
          addSuppression: Boolean(suppression),
          suppressionTaskType:
            typeof suppressionWhere.type === "string" && suppressionWhere.type.trim()
              ? suppressionWhere.type
              : state.weather.suppressionTaskType,
          suppressionDueWithinHours: toStringOrEmpty(suppressionWhere.dueWithinHours) || state.weather.suppressionDueWithinHours,
        },
      };
    }
    case "soil": {
      const actions = Array.isArray(params.actions) ? (params.actions as Record<string, unknown>[]) : [];
      const notify = actions.find((action) => action?.do === "notify") as Record<string, unknown> | undefined;
      const meta = (notify?.meta ?? {}) as Record<string, unknown>;
      const speciesArray = Array.isArray(params.species)
        ? params.species.map((entry) => String(entry)).filter(Boolean)
        : [];
      return {
        ...state,
        soil: {
          soilTemp10cmGte: toStringOrEmpty(params.soilTemp10cmGte),
          species: speciesArray.length > 0 ? speciesArray.join(", ") : state.soil.species,
          notifyTitle: typeof notify?.title === "string" && notify.title.trim() ? notify.title : state.soil.notifyTitle,
          notifyChannel:
            notify?.channel === "email" || notify?.channel === "push"
              ? (notify.channel as GuidedSoilState["notifyChannel"])
              : state.soil.notifyChannel,
          notifySeverity:
            notify?.severity === "warning" || notify?.severity === "critical"
              ? (notify.severity as GuidedSoilState["notifySeverity"])
              : state.soil.notifySeverity,
          notifyMessage: typeof meta.message === "string" ? meta.message : state.soil.notifyMessage,
        },
      };
    }
    case "phenology": {
      const actions = Array.isArray(params.actions) ? (params.actions as Record<string, unknown>[]) : [];
      const notify = actions.find((action) => action?.do === "notify") as Record<string, unknown> | undefined;
      const meta = (notify?.meta ?? {}) as Record<string, unknown>;
      return {
        ...state,
        phenology: {
          maturityGDDPctGte: toPercentageString(params.maturityGDDPctGte) || state.phenology.maturityGDDPctGte,
          notifyTitle: typeof notify?.title === "string" && notify.title.trim() ? notify.title : state.phenology.notifyTitle,
          notifyChannel:
            notify?.channel === "email" || notify?.channel === "push"
              ? (notify.channel as GuidedPhenologyState["notifyChannel"])
              : state.phenology.notifyChannel,
          notifySeverity:
            notify?.severity === "warning" || notify?.severity === "critical"
              ? (notify.severity as GuidedPhenologyState["notifySeverity"])
              : state.phenology.notifySeverity,
          notifyMessage: typeof meta.message === "string" ? meta.message : state.phenology.notifyMessage,
        },
      };
    }
    case "garden": {
      const actions = Array.isArray(params.actions) ? (params.actions as Record<string, unknown>[]) : [];
      const escalate = actions.find((action) => action?.do === "escalate") as Record<string, unknown> | undefined;
      const meta = (escalate?.meta ?? {}) as Record<string, unknown>;
      return {
        ...state,
        garden: {
          focusOnly: Boolean(params.focusOnly ?? state.garden.focusOnly),
          overdueTaskHoursGte: toStringOrEmpty(params.overdueTaskHoursGte) || state.garden.overdueTaskHoursGte,
          escalateSeverity:
            escalate?.severity === "warning" || escalate?.severity === "critical"
              ? (escalate.severity as GuidedGardenState["escalateSeverity"])
              : "info",
          escalateChannel:
            escalate?.channel === "email" || escalate?.channel === "push"
              ? (escalate.channel as GuidedGardenState["escalateChannel"])
              : "inapp",
          escalateMessage: typeof meta.message === "string" ? meta.message : state.garden.escalateMessage,
        },
      };
    }
    default:
      return state;
  }
}

function buildGuidedParams(type: RuleType, state: GuidedState[RuleType]) {
  switch (type) {
    case "time": {
      const timeState = state as GuidedTimeState;
      const params: Record<string, unknown> = {
        includeFocusFirst: timeState.includeFocusFirst,
        includeWeather: timeState.includeWeather,
      };
      const checklist = timeState.checklist
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (checklist.length > 0) {
        params.checklist = checklist;
      }
      return params;
    }
    case "weather": {
      const weatherState = state as GuidedWeatherState;
      const params: Record<string, unknown> = {};
      const precip = parseNumber(weatherState.precipProbNext24hGte);
      if (typeof precip === "number") {
        params.precipProbNext24hGte = precip / (precip > 1 ? 100 : 1);
      }
      const frost = parseNumber(weatherState.frostProbGte);
      if (typeof frost === "number") {
        params.frostProbGte = frost / (frost > 1 ? 100 : 1);
      }
      const minTemp = parseNumber(weatherState.minTempLte);
      if (typeof minTemp === "number") {
        params.minTempLte = minTemp;
      }
      const maxTempTomorrow = parseNumber(weatherState.maxTempTomorrowGte);
      if (typeof maxTempTomorrow === "number") {
        params.maxTempTomorrowGte = maxTempTomorrow;
      }
      const gusts = parseNumber(weatherState.gustsNext24hGte);
      if (typeof gusts === "number") {
        params.gustsNext24hGte = gusts;
      }

      const actions: Record<string, unknown>[] = [];
      const notifyTitle = weatherState.notifyTitle.trim();
      if (notifyTitle) {
        const meta: Record<string, unknown> = {};
        const message = weatherState.notifyMessage.trim();
        if (message) {
          meta.message = message;
        }
        if (weatherState.includeFocus) {
          meta.includeFocus = true;
        }
        actions.push({
          do: "notify",
          title: notifyTitle,
          severity: weatherState.notifySeverity,
          channel: weatherState.notifyChannel,
          meta: Object.keys(meta).length > 0 ? meta : undefined,
        });
      }
      if (weatherState.addSuppression) {
        const dueWithinHours = parseNumber(weatherState.suppressionDueWithinHours);
        actions.push({
          do: "suppress_tasks",
          where: {
            type: weatherState.suppressionTaskType.trim() || "watering",
            dueWithinHours: dueWithinHours ?? 18,
          },
        });
      }
      if (actions.length > 0) {
        params.actions = actions;
      }
      return params;
    }
    case "soil": {
      const soilState = state as GuidedSoilState;
      const params: Record<string, unknown> = {};
      const soilTemp = parseNumber(soilState.soilTemp10cmGte);
      if (typeof soilTemp === "number") {
        params.soilTemp10cmGte = soilTemp;
      }
      const species = soilState.species
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (species.length > 0) {
        params.species = species;
      }
      const notifyTitle = soilState.notifyTitle.trim();
      if (notifyTitle) {
        const meta: Record<string, unknown> = {};
        const message = soilState.notifyMessage.trim();
        if (message) {
          meta.message = message;
        }
        params.actions = [
          {
            do: "notify",
            title: notifyTitle,
            severity: soilState.notifySeverity,
            channel: soilState.notifyChannel,
            meta: Object.keys(meta).length > 0 ? meta : undefined,
          },
        ];
      }
      return params;
    }
    case "phenology": {
      const phenologyState = state as GuidedPhenologyState;
      const params: Record<string, unknown> = {};
      const maturity = parseNumber(phenologyState.maturityGDDPctGte);
      if (typeof maturity === "number") {
        params.maturityGDDPctGte = maturity / (maturity > 1 ? 100 : 1);
      }
      const notifyTitle = phenologyState.notifyTitle.trim();
      if (notifyTitle) {
        const meta: Record<string, unknown> = {};
        const message = phenologyState.notifyMessage.trim();
        if (message) {
          meta.message = message;
        }
        params.actions = [
          {
            do: "notify",
            title: notifyTitle,
            severity: phenologyState.notifySeverity,
            channel: phenologyState.notifyChannel,
            meta: Object.keys(meta).length > 0 ? meta : undefined,
          },
        ];
      }
      return params;
    }
    case "garden": {
      const gardenState = state as GuidedGardenState;
      const params: Record<string, unknown> = {
        focusOnly: gardenState.focusOnly,
      };
      const overdue = parseNumber(gardenState.overdueTaskHoursGte);
      if (typeof overdue === "number") {
        params.overdueTaskHoursGte = overdue;
      }
      const meta: Record<string, unknown> = {};
      const message = gardenState.escalateMessage.trim();
      if (message) {
        meta.message = message;
      }
      params.actions = [
        {
          do: "escalate",
          severity: gardenState.escalateSeverity,
          channel: gardenState.escalateChannel,
          meta: Object.keys(meta).length > 0 ? meta : undefined,
        },
      ];
      return params;
    }
    default:
      return {};
  }
}

function describeRule(rule: NotificationRuleSummary) {
  const parts: string[] = [];
  if (rule.schedule) {
    parts.push(`Runs on ${rule.schedule}`);
  }
  const params = rule.params ?? {};
  if (rule.type === "weather") {
    if (typeof params.precipProbNext24hGte === "number") {
      parts.push(`Triggers when precip ≥ ${Math.round(params.precipProbNext24hGte * 100)}%`);
    }
    if (typeof params.frostProbGte === "number") {
      parts.push(`Frost probability ≥ ${Math.round(params.frostProbGte * 100)}%`);
    }
    if (typeof params.minTempLte === "number") {
      parts.push(`Min temp ≤ ${params.minTempLte}°C`);
    }
    if (typeof params.maxTempTomorrowGte === "number") {
      parts.push(`Tomorrow max ≥ ${params.maxTempTomorrowGte}°C`);
    }
    if (typeof params.gustsNext24hGte === "number") {
      parts.push(`Gusts ≥ ${params.gustsNext24hGte} km/h`);
    }
  }
  if (rule.type === "soil" && typeof params.soilTemp10cmGte === "number") {
    parts.push(`Soil temp ≥ ${params.soilTemp10cmGte}°C at 10cm`);
  }
  if (rule.type === "phenology" && typeof params.maturityGDDPctGte === "number") {
    parts.push(`Maturity reaches ${Math.round(params.maturityGDDPctGte * 100)}%`);
  }
  if (rule.type === "garden" && typeof params.overdueTaskHoursGte === "number") {
    parts.push(`Tasks overdue by ${params.overdueTaskHoursGte}h`);
  }
  return parts.join(" • ");
}

function renderGuidedFields(
  type: RuleType,
  state: GuidedState,
  onChange: <K extends RuleType, Field extends keyof GuidedState[K]>(
    type: K,
    field: Field,
    value: GuidedState[K][Field],
  ) => void,
) {
  switch (type) {
    case "time":
      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={state.time.includeFocusFirst}
                onChange={(event) => onChange("time", "includeFocusFirst", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Surface focus items first
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={state.time.includeWeather}
                onChange={(event) => onChange("time", "includeWeather", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Include weather summary
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Checklist items (comma separated)
              <textarea
                value={state.time.checklist}
                onChange={(event) => onChange("time", "checklist", event.target.value)}
                rows={3}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          </div>
        </div>
      );
    case "weather":
      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Precip probability ≥ (%)
              <input
                type="number"
                min={0}
                max={100}
                value={state.weather.precipProbNext24hGte}
                onChange={(event) => onChange("weather", "precipProbNext24hGte", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Frost probability ≥ (%)
              <input
                type="number"
                min={0}
                max={100}
                value={state.weather.frostProbGte}
                onChange={(event) => onChange("weather", "frostProbGte", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Minimum temperature ≤ (°C)
              <input
                type="number"
                value={state.weather.minTempLte}
                onChange={(event) => onChange("weather", "minTempLte", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Tomorrow’s max ≥ (°C)
              <input
                type="number"
                value={state.weather.maxTempTomorrowGte}
                onChange={(event) => onChange("weather", "maxTempTomorrowGte", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Gust speed ≥ (km/h)
              <input
                type="number"
                value={state.weather.gustsNext24hGte}
                onChange={(event) => onChange("weather", "gustsNext24hGte", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Notification</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Title
                <input
                  type="text"
                  value={state.weather.notifyTitle}
                  onChange={(event) => onChange("weather", "notifyTitle", event.target.value)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Message (optional)
                <input
                  type="text"
                  value={state.weather.notifyMessage}
                  onChange={(event) => onChange("weather", "notifyMessage", event.target.value)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Severity
                <select
                  value={state.weather.notifySeverity}
                  onChange={(event) => onChange("weather", "notifySeverity", event.target.value as GuidedWeatherState["notifySeverity"])}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Channel
                <select
                  value={state.weather.notifyChannel}
                  onChange={(event) => onChange("weather", "notifyChannel", event.target.value as GuidedWeatherState["notifyChannel"])}
                  className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="inapp">In-app</option>
                  <option value="email">Email</option>
                  <option value="push">Push</option>
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={state.weather.includeFocus}
                onChange={(event) => onChange("weather", "includeFocus", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Highlight focus items inside the message
            </label>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={state.weather.addSuppression}
                onChange={(event) => onChange("weather", "addSuppression", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Skip tasks when the condition is met
            </label>
            {state.weather.addSuppression ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Task type
                  <input
                    type="text"
                    value={state.weather.suppressionTaskType}
                    onChange={(event) => onChange("weather", "suppressionTaskType", event.target.value)}
                    className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Due within (hours)
                  <input
                    type="number"
                    min={1}
                    value={state.weather.suppressionDueWithinHours}
                    onChange={(event) => onChange("weather", "suppressionDueWithinHours", event.target.value)}
                    className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>
      );
    case "soil":
      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Soil temperature ≥ (°C)
              <input
                type="number"
                value={state.soil.soilTemp10cmGte}
                onChange={(event) => onChange("soil", "soilTemp10cmGte", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Species to watch (comma separated)
              <input
                type="text"
                value={state.soil.species}
                onChange={(event) => onChange("soil", "species", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Notification title
              <input
                type="text"
                value={state.soil.notifyTitle}
                onChange={(event) => onChange("soil", "notifyTitle", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Message (optional)
              <input
                type="text"
                value={state.soil.notifyMessage}
                onChange={(event) => onChange("soil", "notifyMessage", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Severity
              <select
                value={state.soil.notifySeverity}
                onChange={(event) => onChange("soil", "notifySeverity", event.target.value as GuidedSoilState["notifySeverity"])}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Channel
              <select
                value={state.soil.notifyChannel}
                onChange={(event) => onChange("soil", "notifyChannel", event.target.value as GuidedSoilState["notifyChannel"])}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="inapp">In-app</option>
                <option value="email">Email</option>
                <option value="push">Push</option>
              </select>
            </label>
          </div>
        </div>
      );
    case "phenology":
      return (
        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Growing degree day completion ≥ (%)
            <input
              type="number"
              min={0}
              max={100}
              value={state.phenology.maturityGDDPctGte}
              onChange={(event) => onChange("phenology", "maturityGDDPctGte", event.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Notification title
              <input
                type="text"
                value={state.phenology.notifyTitle}
                onChange={(event) => onChange("phenology", "notifyTitle", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Message (optional)
              <input
                type="text"
                value={state.phenology.notifyMessage}
                onChange={(event) => onChange("phenology", "notifyMessage", event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Severity
              <select
                value={state.phenology.notifySeverity}
                onChange={(event) => onChange("phenology", "notifySeverity", event.target.value as GuidedPhenologyState["notifySeverity"])}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Channel
              <select
                value={state.phenology.notifyChannel}
                onChange={(event) => onChange("phenology", "notifyChannel", event.target.value as GuidedPhenologyState["notifyChannel"])}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="inapp">In-app</option>
                <option value="email">Email</option>
                <option value="push">Push</option>
              </select>
            </label>
          </div>
        </div>
      );
    case "garden":
      return (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={state.garden.focusOnly}
              onChange={(event) => onChange("garden", "focusOnly", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Only evaluate focus items
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Overdue threshold (hours)
            <input
              type="number"
              min={1}
              value={state.garden.overdueTaskHoursGte}
              onChange={(event) => onChange("garden", "overdueTaskHoursGte", event.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Escalation severity
              <select
                value={state.garden.escalateSeverity}
                onChange={(event) => onChange("garden", "escalateSeverity", event.target.value as GuidedGardenState["escalateSeverity"])}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Channel
              <select
                value={state.garden.escalateChannel}
                onChange={(event) => onChange("garden", "escalateChannel", event.target.value as GuidedGardenState["escalateChannel"])}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="inapp">In-app</option>
                <option value="email">Email</option>
                <option value="push">Push</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Message (optional)
            <input
              type="text"
              value={state.garden.escalateMessage}
              onChange={(event) => onChange("garden", "escalateMessage", event.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        </div>
      );
    default:
      return null;
  }
}

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
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editThrottle, setEditThrottle] = useState("");
  const [editParams, setEditParams] = useState("{}");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<RuleType>("time");
  const [customSchedule, setCustomSchedule] = useState("");
  const [customThrottle, setCustomThrottle] = useState("21600");
  const [paramsMode, setParamsMode] = useState<ParamsMode>("guided");
  const [customParams, setCustomParams] = useState("{\n  \"actions\": []\n}");
  const [guidedState, setGuidedState] = useState<GuidedState>(() => createDefaultGuidedState());
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

  const activeGuidedParams = useMemo(() => {
    return buildGuidedParams(customType, guidedState[customType]);
  }, [customType, guidedState]);

  const guidedParamsPreview = useMemo(() => JSON.stringify(activeGuidedParams, null, 2), [activeGuidedParams]);

  const handleGuidedStateChange = <K extends RuleType, Field extends keyof GuidedState[K]>(
    type: K,
    field: Field,
    value: GuidedState[K][Field],
  ) => {
    setGuidedState((current) => ({
      ...current,
      [type]: {
        ...current[type],
        [field]: value,
      },
    }));
  };

  const handleParamsModeChange = (nextMode: ParamsMode) => {
    if (nextMode === paramsMode) {
      return;
    }
    if (nextMode === "json") {
      setCustomParams(JSON.stringify(activeGuidedParams, null, 2));
    } else {
      try {
        const parsed = JSON.parse(customParams) as Record<string, unknown>;
        setGuidedState((current) => hydrateGuidedState(customType, parsed, current));
      } catch (error) {
        // ignore parse errors and keep existing guided state
      }
    }
    setParamsMode(nextMode);
  };

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

  const handleStartEdit = (rule: NotificationRuleSummary) => {
    setEditingRuleId(rule.id);
    setEditName(rule.name);
    setEditSchedule(rule.schedule ?? "");
    setEditThrottle(rule.throttleSecs ? String(rule.throttleSecs) : "");
    setEditParams(JSON.stringify(rule.params ?? {}, null, 2));
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
  };

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRuleId) {
      return;
    }
    const trimmedName = editName.trim();
    if (!trimmedName) {
      pushToast({
        title: "Name required",
        description: "Give your rule a descriptive name.",
        variant: "error",
      });
      return;
    }
    let parsedParams: Record<string, unknown> = {};
    try {
      parsedParams = JSON.parse(editParams) as Record<string, unknown>;
    } catch (error) {
      pushToast({
        title: "Invalid params",
        description: "Enter valid JSON for params.",
        variant: "error",
      });
      return;
    }
    const throttleValue = Number(editThrottle.trim());
    const throttleSecs = Number.isFinite(throttleValue) && throttleValue > 0 ? throttleValue : undefined;
    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/notification-rules/${editingRuleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          schedule: editSchedule.trim() || null,
          throttleSecs,
          params: parsedParams,
        }),
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
      setRules((current) => current.map((rule) => (rule.id === json.rule.id ? serializeRule(json.rule) : rule)));
      pushToast({
        title: "Rule updated",
        description: `${trimmedName} has been updated.`,
        variant: "success",
      });
      setEditingRuleId(null);
    } finally {
      setIsSavingEdit(false);
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

    let params: Record<string, unknown> = {};
    if (paramsMode === "guided") {
      params = activeGuidedParams;
    } else {
      const paramsSource = customParams.trim();
      if (paramsSource) {
        try {
          params = JSON.parse(paramsSource);
        } catch (error) {
          pushToast({
            title: "Invalid params",
            description: "Enter valid JSON for params.",
            variant: "error",
          });
          return;
        }
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
          params,
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
      setGuidedState(createDefaultGuidedState());
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
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Conditions & actions</p>
                <p className="text-xs text-slate-500">
                  Use the guided builder for common triggers or switch to JSON for bespoke automation logic.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={paramsMode === "guided" ? "secondary" : "ghost"}
                  onClick={() => handleParamsModeChange("guided")}
                >
                  Guided builder
                </Button>
                <Button
                  type="button"
                  variant={paramsMode === "json" ? "secondary" : "ghost"}
                  onClick={() => handleParamsModeChange("json")}
                >
                  JSON editor
                </Button>
              </div>
            </div>
            {paramsMode === "guided" ? (
              <div className="space-y-4 rounded border border-slate-200 bg-slate-50 p-4">
                {renderGuidedFields(customType, guidedState, handleGuidedStateChange)}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">JSON preview</p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900/90 p-3 text-[11px] leading-tight text-slate-100">
                    {guidedParamsPreview}
                  </pre>
                </div>
              </div>
            ) : (
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Params (JSON)
                <textarea
                  value={customParams}
                  onChange={(event) => setCustomParams(event.target.value)}
                  rows={10}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            )}
          </div>
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
            rules.map((rule) => {
              const summary = describeRule(rule);
              const isEditing = editingRuleId === rule.id;
              return (
                <div key={rule.id} className="space-y-3 rounded border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{rule.name}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{rule.type}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        rule.isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {rule.isEnabled ? "Enabled" : "Paused"}
                    </span>
                  </div>
                  {summary ? <p className="text-xs text-slate-600">{summary}</p> : null}
                  {rule.schedule ? <p className="text-xs text-slate-500">Schedule: {rule.schedule}</p> : null}
                  <details className="group">
                    <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-primary">
                      View JSON
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-900/90 p-3 text-[11px] leading-tight text-slate-100">
                      {JSON.stringify(rule.params ?? {}, null, 2)}
                    </pre>
                  </details>
                  <div className="flex flex-wrap items-center gap-2">
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
                      variant="outline"
                      onClick={() => (isEditing ? handleCancelEdit() : handleStartEdit(rule))}
                      disabled={removeRuleId === rule.id || toggleRuleId === rule.id}
                    >
                      {isEditing ? "Cancel edit" : "Edit"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleRemoveRule(rule)}
                      disabled={removeRuleId === rule.id || isEditing}
                    >
                      Remove
                    </Button>
                  </div>
                  {isEditing ? (
                    <form onSubmit={handleSaveEdit} className="space-y-3 rounded border border-slate-200 bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                          Rule name
                          <input
                            type="text"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                          Schedule (RRULE)
                          <input
                            type="text"
                            value={editSchedule}
                            onChange={(event) => setEditSchedule(event.target.value)}
                            placeholder="Leave blank to run on demand"
                            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                          Throttle seconds
                          <input
                            type="number"
                            min={300}
                            value={editThrottle}
                            onChange={(event) => setEditThrottle(event.target.value)}
                            placeholder="21600"
                            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                      </div>
                      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                        Params (JSON)
                        <textarea
                          value={editParams}
                          onChange={(event) => setEditParams(event.target.value)}
                          rows={8}
                          className="rounded border border-slate-300 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={handleCancelEdit} disabled={isSavingEdit}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSavingEdit}>
                          {isSavingEdit ? "Saving…" : "Save changes"}
                        </Button>
                      </div>
                    </form>
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
