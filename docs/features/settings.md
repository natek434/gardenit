# Settings reference

## Form structure
`SettingsForm` receives the signed-in user profile, available climate zones, notification preferences, and measurement preferences from the server. It hydrates local state for every section so the UI reacts instantly while PATCH requests run in transitions.【F:src/components/settings/settings-form.tsx†L71-L200】 Google Maps libraries are lazily loaded (using `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) and fall back to preset coordinates if the user has no saved location.【F:src/components/settings/settings-form.tsx†L95-L178】

## Profile & location
The first section lets gardeners rename their profile and pinpoint their growing location. Search uses the Places API, but you can also click the embedded map to drop a marker. Clearing the selection resets coordinates to `null`. Submitting the form PATCHes `/api/settings` with the display name and the chosen latitude/longitude so weather, seasonality, and digests stay accurate.【F:src/components/settings/settings-form.tsx†L304-L332】 If the Google Maps API key is missing we render a lightweight notice so users know to supply one before searching.【F:src/components/settings/settings-form.tsx†L515-L520】

## Climate zone
Climate zones are grouped by country and sorted alphabetically for quick scanning. Saving picks the selected zone ID (or `null`) and PATCHes `/api/settings` so the backend recomputes phenology data the next time jobs run.【F:src/components/settings/settings-form.tsx†L284-L357】

## Notification channels & quiet hours
Channel toggles (in-app, email, push) and the daily digest hour/timezone live in the Notifications form. When do-not-disturb is enabled the UI forces you to choose distinct start and end hours before allowing submission; the handler mirrors those guards and POSTs to `/api/notifications/preferences` with the normalised payload.【F:src/components/settings/settings-form.tsx†L359-L409】 The API repeats the same validation (required hours, differing values, timezone sanity checks) so invalid requests return a 400 with a descriptive message.【F:app/api/notifications/preferences/route.ts†L6-L73】 Updating the digest hour also keeps the built-in morning digest rule in sync via the notification-preference service, so you don’t have to adjust RRULEs manually.【F:src/server/notification-preference-service.ts†L1-L76】

## Measurement units
Measurement preferences span temperature, wind, pressure, precipitation, and length. The UI populates dropdowns with every supported unit (°C/°F, km/h·mph·m/s·knots, hPa·inHg·kPa·mmHg, mm·inches, centimetres·metres·inches·feet) using the descriptive labels exported from `units.ts`.【F:src/components/settings/settings-form.tsx†L128-L137】【F:src/lib/units.ts†L1-L190】 Submitting the form PATCHes `/api/settings/units`, which upserts the user’s preference row and returns the normalised snapshot so client state stays aligned.【F:src/components/settings/settings-form.tsx†L411-L442】【F:app/api/settings/units/route.ts†L1-L41】 Server helpers fall back to defaults if no record exists and coerce Prisma enums back into the exported union types.【F:src/server/measurement-preference-service.ts†L1-L70】 These units flow through the garden planner, weather dashboards, and notifications, ensuring measurement displays remain consistent across the app.【F:app/page.tsx†L1-L120】【F:src/components/garden/garden-planner.tsx†L321-L359】

## Account security
The password form validates current, new, and confirmation fields locally (minimum length, equality) before PATCHing `/api/settings` with the `password` object. Successful updates reset the inputs and surface a success toast; failures render the error returned by the API so users know what to fix.【F:src/components/settings/settings-form.tsx†L444-L492】

