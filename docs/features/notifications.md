# Notifications and automation

## Page overview
The **Smart notifications** page loads the user’s reminders, conditional rules, and historical notifications in one request, shaping them into the structures consumed by each UI section (activity feed, conditional rule manager, smart reminders). If the visitor is unauthenticated the page immediately renders a sign-in prompt instead of touching any data services.【F:app/notifications/page.tsx†L1-L78】

## Notification activity feed
`NotificationFeed` accepts the already-hydrated notification entries and sorts them newest-first. Pill buttons across the top let users filter by in-app, email, or push channels; badges show the count in each category and disabled states prevent selecting empty filters.【F:src/components/notifications/notification-feed.tsx†L46-L110】 Each card highlights severity, channel, title, body, and the formatted timestamp, making it easy to audit exactly what was sent. When there are no messages for the active channel, the component displays a dashed placeholder instead of an empty list.【F:src/components/notifications/notification-feed.tsx†L111-L152】

## Smart reminder presets
`SmartNotificationManager` provides three guided reminder categories—soil temperature, pH level, and disease scouting—with sensible default titles, details, and cadences. Switching categories rewrites the editable fields so users can either accept the suggested copy or customise it before saving.【F:src/components/reminders/smart-notification-manager.tsx†L21-L69】 Submissions validate that a date and title were supplied, then POST to `/api/reminders` with the selected cadence and a type prefix (`smart-{category}`) so downstream jobs can tell smart automations apart from ad-hoc reminders.【F:src/components/reminders/smart-notification-manager.tsx†L79-L130】 The right-hand column lists upcoming smart reminders chronologically so gardeners can confirm what’s scheduled.【F:src/components/reminders/smart-notification-manager.tsx†L133-L200】

## Conditional rule manager
### Built-in templates
The top grid of cards exposes ready-made rules for the most common triggers: morning digests, weekly checklists, rain skip suppression, frost/heat/wind alerts, soil temperature thresholds, GDD harvest warnings, and focus escalations. Each template bundles a type, schedule, parameters, and optional throttle seconds so enabling it is a single click.【F:src/components/reminders/conditional-rule-manager.tsx†L24-L204】 The “focus escalation” preset currently defines an `actions` array containing `{ do: "escalate" }` payloads—see the TODO list for implementation status of that verb.【F:src/components/reminders/conditional-rule-manager.tsx†L184-L201】

### Guided builder vs JSON
Below the templates you can create bespoke rules. Choose the rule type, name, schedule (RRULE string), and throttle window. The builder tracks whether you’re in **Guided** or **JSON** mode—guided surfaces tailored form fields for each type (time, weather, soil, phenology, garden) while generating a live JSON preview of the resulting `params` object. Switching to JSON opens a textarea so advanced users can hand-author parameters or actions.【F:src/components/reminders/conditional-rule-manager.tsx†L1236-L1474】 Guided state slices show exactly what inputs are available (e.g. precipitation probabilities, frost thresholds, species lists, escalation severity/channel).【F:src/components/reminders/conditional-rule-manager.tsx†L206-L258】

### Creating and managing rules
Submitting the custom rule form POSTs to `/api/notification-rules`. On success the new rule is appended to the list and a success toast confirms activation. Invalid JSON, missing names, or network errors all surface descriptive toasts without clearing the form so users can retry.【F:src/components/reminders/conditional-rule-manager.tsx†L1208-L1474】 Existing rules render with status badges, natural-language summaries, schedule metadata, and expandable JSON payloads to aid audits. Buttons beside each rule allow pausing/resuming or deleting; both actions call the appropriate API route, refresh the list, and raise toasts reflecting the outcome.【F:src/components/reminders/conditional-rule-manager.tsx†L1200-L1521】

### Runtime behaviour
At execution time the scheduler evaluates rule types against their context:

* **Weather** rules look for precipitation probability, frost risk, temperature spikes, or wind gusts, then execute `actions` arrays that support `suppress_tasks` (delay reminders) and `notify` (send channel-specific alerts, optionally restricted to focus items).【F:src/jobs/scheduler.ts†L600-L685】
* **Soil** rules watch for 10 cm soil temperature thresholds, optionally filtering plantings by species keywords before dispatching notifications.【F:src/jobs/scheduler.ts†L688-L723】
* **Phenology** rules compute progress toward growing-degree-day goals and email harvest nudges once plantings pass the configured ratio.【F:src/jobs/scheduler.ts†L725-L756】
* **Garden** rules escalate overdue reminders, with optional focus-only filtering, via a consolidated in-app message.【F:src/jobs/scheduler.ts†L758-L790】

All channels respect throttle windows, do-not-disturb settings, and email availability before persisting notifications. Push currently falls back to email delivery—see the TODO list for next steps on push infrastructure.【F:src/jobs/scheduler.ts†L793-L836】

## Notification preferences and quiet hours
Channel toggles, daily digest timing/timezone, and do-not-disturb windows are editable from the Settings page. The form validates that quiet hours have distinct start/end values before PATCHing `/api/notifications/preferences`, and the API enforces the same guardrails server-side so invalid requests are rejected with descriptive errors.【F:src/components/settings/settings-form.tsx†L359-L409】【F:app/api/notifications/preferences/route.ts†L6-L73】 Measurement unit updates live alongside notification settings and use `/api/settings/units`, described in the Settings documentation.

