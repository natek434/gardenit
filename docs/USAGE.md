# Gardenit usage guide

## Core workflows

### Garden planner and beds
- Open **My Garden** to see your beds, focus filters, and draggable plant thumbnails.
- Drag a plant icon from the library onto a bed to create a planting. Plantings snap to the centre of the grid cell beneath your cursor; release to save the snapped coordinates.
- Hover over a planting chip to view its card with planting date, days to maturity, and quick actions (edit, focus toggle, reminders).
- Use the focus toggle to promote important beds, plantings, or plants—focus items float to the top of digests and filtering tools.

### Reminders, notifications, and toasts
- Visit **Notifications** to review past alerts and manage rules (time-of-day digest, weather events, soil thresholds, etc.).
- The **Notification activity** card filters in-app, email, and push history so you can audit what fired and when.
- Toast notifications surface throughout the app for success, warnings, or errors and auto-dismiss after 10 seconds.
- Focus items automatically escalate inside built-in rules like frost or overdue task checks.

### Smart notifications and focus rules
- Build conditional rules (time, weather, soil, phenology, garden) via the notification manager. Rules are throttled per the `throttleSecs` you supply.
- Morning digests and other rules prioritise focus items; toggling focus on plants or beds affects scheduling immediately.

#### Creating custom conditional rules
1. Open **Notifications → Conditional triggers** and choose **Guided builder** to start from friendly fields for the selected rule type (time, weather, soil, phenology, or garden).
2. Populate the condition inputs—e.g. weather probability thresholds, soil temperatures, or overdue task hours. Optional checkboxes let you include focus items, suppress tasks, or limit the scope to specific species.
3. Configure the action payload by setting notification titles, messages, severity, delivery channel, and (for weather rules) whether to skip tasks when the rule fires. A live JSON preview updates as you tweak the guided form so you can confirm the underlying payload.
4. Need something more specialised? Switch to **JSON editor** to paste or handcraft the `params` object directly. Toggling back to the guided builder attempts to hydrate the friendly controls from your JSON so you can fine-tune without losing structure.
5. Submit the form to create the rule. It appears under **Your conditional rules** with a natural-language summary, quick enable/pause buttons, and an expandable JSON view for auditing.

### Quiet hours and email delivery
- Add SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optional `SMTP_SECURE`, `SMTP_FROM`) to `.env.local` so Gardenit can send outbound emails. Without credentials the server logs messages to the console for debugging.
- Open **Settings → Notification preferences** to enable or disable email, push (email fallback), and in-app logging independently.
- Pick the digest hour and timezone to control when the daily summary fires. Saving your changes updates the underlying RRULE so the scheduler emits the digest at the new time.
- Toggle **Do not disturb** to mute email and push alerts between a start and end hour in your chosen timezone. Notifications that trigger during quiet hours stay in the in-app feed but aren’t delivered externally.

## Admin operations

### Promoting an administrator
Use Prisma Studio or the CLI to set the `role` column on a user to `ADMIN`:

```ts
import { prisma } from "@/src/lib/prisma";

await prisma.user.update({
  where: { email: "you@example.com" },
  data: { role: "ADMIN" },
});
```

JWT/session payloads now expose `session.user.role`, and protected routes rely on it.

### Plant management dashboard
- Navigate to **Admin → Manage plant data** (visible only to admins).
- Each card summarises a plant’s category, sun requirement, and last update timestamp.
- Click **Edit** to reveal an inline form. Required fields (common name, category, sun requirement) must be filled; optional numeric fields accept blank values to clear them.
- Save changes to persist updates via `/api/admin/plants/[id]`. Successful updates trigger a toast and refresh cached planner data.

## Updating planting windows

`ClimatePlantWindow` stores sowing and transplant windows as JSON arrays of `{ "start": number, "end": number }`, where numbers are month indices (January = 1, December = 12). This supports ranges that wrap over the end of the year.

If you have data expressed as month names, convert them to month numbers before updating:

```ts
const monthIndex = (label: string) => {
  const mapping = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  } as const;
  const key = label.trim().toLowerCase() as keyof typeof mapping;
  return mapping[key];
};

await prisma.climatePlantWindow.update({
  where: { plantId_climateZoneId: { plantId, climateZoneId } },
  data: {
    sowOutdoors: [{ start: monthIndex("September"), end: monthIndex("April") }],
    transplant: [{ start: monthIndex("October"), end: monthIndex("December") }],
  },
});
```

Because the Prisma column type is `Json`, you can store any array shape, but sticking to the `{ start, end }` structure keeps the seasonality utilities working. Blank or unknown windows should be set to `null`.

## Reference: data model expectations

- `User.role` is an enum (`USER` | `ADMIN`) and defaults to `USER`.
- `FocusItem.kind` is an enum (`planting`, `bed`, `plant`, `task`) to ensure valid focus scopes.
- `NotificationRule.type` is an enum (`time`, `weather`, `soil`, `phenology`, `garden`) that matches scheduler logic.
- `Notification.severity` and `Notification.channel` are enums for consistent downstream handling.
- `ClimatePlantWindow` window fields are JSON blobs but expect arrays of numeric month ranges as described above.
- `Plant` numeric agronomy fields (`daysToMaturity`, `sowDepthMm`, `spacingInRowCm`, `spacingBetweenRowsCm`) accept integers or `null`.

Refer back to this guide whenever you need to seed new data, adjust planting windows, or operate the admin tooling.
