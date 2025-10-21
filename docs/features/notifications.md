# Notifications and automation

## Page overview
The **Smart notifications** page now focuses on two data sets: rule definitions and the activity feed. On load we gather the authenticated user’s enabled rules plus any notifications that have not been cleared. If the visitor isn’t signed in the page renders a sign-in prompt and skips every server call.【F:app/notifications/page.tsx†L1-L69】

## Notification inbox
`NotificationFeed` turns the server payload into a channel-filtered inbox with quick triage controls. Each row shows severity, channel, originating rule (when available), and the sent timestamp; expanding the row reveals the full message, any structured metadata rendered in human-friendly terms, and a clear action. Opening a notification automatically marks it as read, while bulk controls above the list let gardeners mark everything read or clear the queue entirely.【F:src/components/notifications/notification-feed.tsx†L1-L347】 If no notifications remain for the active channel the component swaps in a soft placeholder rather than leaving empty whitespace.【F:src/components/notifications/notification-feed.tsx†L381-L384】

The header picks up the same data via `/api/notifications/summary`, presenting a compact dropdown with the latest entries and unread counts. Clicking the bell navigates directly to the relevant notification while marking it read so the badge stays accurate.【F:src/components/notifications/notification-bell.tsx†L1-L231】

## Conditional rule manager
### Built-in templates
The top grid of cards exposes ready-made rules for the most common triggers: morning digests, weekly checklists, rain skip suppression, frost/heat/wind alerts, soil temperature thresholds, GDD harvest warnings, and focus escalations. Each template bundles a type, schedule, parameters, and optional throttle seconds so enabling it is a single click.【F:src/components/reminders/conditional-rule-manager.tsx†L24-L204】 The “focus escalation” preset currently defines an `actions` array containing `{ do: "escalate" }` payloads—see the TODO list for implementation status of that verb.【F:src/components/reminders/conditional-rule-manager.tsx†L184-L201】

### Guided builder vs JSON
Below the templates you can create bespoke rules. Choose the rule type, name, schedule (RRULE string), and throttle window. The builder tracks whether you’re in **Guided** or **JSON** mode—guided surfaces tailored form fields for each type (time, weather, soil, phenology, garden) while generating a live JSON preview of the resulting `params` object. Switching to JSON opens a textarea so advanced users can hand-author parameters or actions.【F:src/components/reminders/conditional-rule-manager.tsx†L1236-L1474】 Guided state slices show exactly what inputs are available (e.g. precipitation probabilities, frost thresholds, species lists, escalation severity/channel).【F:src/components/reminders/conditional-rule-manager.tsx†L206-L258】

### Creating and managing rules
Submitting the custom rule form POSTs to `/api/notification-rules`. On success the new rule is appended to the list and a success toast confirms activation. Invalid JSON, missing names, or network errors all surface descriptive toasts without clearing the form so users can retry.【F:src/components/reminders/conditional-rule-manager.tsx†L1208-L1379】 Existing rules render with status badges, natural-language summaries, schedule metadata, and expandable JSON payloads to aid audits. Action buttons beside each card allow pausing/resuming, editing, or deleting rules; edits expose an inline form for name, schedule, throttle, and parameters before issuing a PATCH request back to the API.【F:src/components/reminders/conditional-rule-manager.tsx†L1550-L1658】 Both deletes and updates refresh the list and raise contextual toasts to confirm the outcome.【F:src/components/reminders/conditional-rule-manager.tsx†L1181-L1306】

### Runtime behaviour
At execution time the scheduler evaluates rule types against their context:

* **Weather** rules look for precipitation probability, frost risk, temperature spikes, or wind gusts, then execute `actions` arrays that support `suppress_tasks` (delay reminders) and `notify` (send channel-specific alerts, optionally restricted to focus items).【F:src/jobs/scheduler.ts†L600-L685】
* **Soil** rules watch for 10 cm soil temperature thresholds, optionally filtering plantings by species keywords before dispatching notifications.【F:src/jobs/scheduler.ts†L688-L723】
* **Phenology** rules compute progress toward growing-degree-day goals and email harvest nudges once plantings pass the configured ratio.【F:src/jobs/scheduler.ts†L725-L756】
* **Garden** rules escalate overdue reminders, with optional focus-only filtering, via a consolidated in-app message.【F:src/jobs/scheduler.ts†L758-L790】

All channels respect throttle windows, do-not-disturb settings, and email availability before persisting notifications. Push currently falls back to email delivery—see the TODO list for next steps on push infrastructure.【F:src/jobs/scheduler.ts†L793-L836】

## Notification preferences and quiet hours
Channel toggles, daily digest timing/timezone, and do-not-disturb windows are editable from the Settings page. The form validates that quiet hours have distinct start/end values before PATCHing `/api/notifications/preferences`, and the API enforces the same guardrails server-side so invalid requests are rejected with descriptive errors.【F:src/components/settings/settings-form.tsx†L359-L409】【F:app/api/notifications/preferences/route.ts†L6-L73】 Measurement unit updates live alongside notification settings and use `/api/settings/units`, described in the Settings documentation.

