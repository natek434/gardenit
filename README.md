# Gardenit

Gardenit is a location-aware gardening assistant with a focus on New Zealand growers. It provides planting guidance, care plans, and layout tooling powered by a modern Next.js stack.

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 8+
- PostgreSQL 14+

### Environment
Copy `.env.example` to `.env.local` and fill in the variables.

```bash
cp .env.example .env.local
```

`OPEN_METEO_BASE_URL` is optional—leave it as the default unless you are proxying Open-Meteo through your own gateway.

### Installation

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

The development server will start on [http://localhost:3000](http://localhost:3000).

Demo authentication credentials:

- Email: `demo@gardenit.nz`
- Password: `gardenit`

### Usage guide

See [`docs/USAGE.md`](docs/USAGE.md) for a walkthrough of core workflows, administrator tooling, and planting window maintenance tips.

### Testing & Quality

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm typecheck
```

Playwright requires browsers installed:
```bash
pnpm exec playwright install
```

### Project Highlights
- **Next.js 15 App Router** with TypeScript, Tailwind, and React Query
- **Prisma ORM** schema tuned for gardening data and reminders
- **NextAuth** authentication scaffold
- **Weather abstraction** powered by [Open-Meteo](https://open-meteo.com/) for real forecasts, soil temperatures, and frost risk
- **Seasonality logic** determining planting windows per climate zone
- **Background scheduler** for care reminders
- **CI via GitHub Actions** running linting, tests, and type checks

## Database
The Prisma schema (see `prisma/schema.prisma`) models users, plants, planting windows, gardens, beds, and reminders. The `Plant` model captures rich horticultural metadata sourced from Perenual (sunlight exposure, watering benchmarks, anatomy, hardiness, toxicity, imagery, and more) so the app can store full API responses alongside Gardenit-specific agronomic data. Seed data still covers core New Zealand crops with companion and antagonist relationships.

### Importing plant data from Perenual
- Add `PERENUAL_API_KEY` to your `.env.local`. Keys are available from [perenual.com](https://perenual.com/docs/api).
- Optional: set `PERENUAL_DAILY_REQUEST_LIMIT` to the daily quota for your plan (defaults to `90` calls so a full sync of 100 plants stays under the Basic plan's allowance) and `PERENUAL_REQUEST_INTERVAL_MS` to the minimum gap between calls (defaults to `1200` ms, roughly 50 calls/minute).
- Review the 100 common vegetables, herbs, and fruits listed in `data/perenual-targets.ts`. Adjust the list or categories if you need different crops.
- Run the importer to fetch JSON from the Perenual API and upsert the plants into your local database:

  ```bash
  pnpm perenual:import
  ```

The helper script automatically matches species by common name, fetches full detail payloads, and maps them to the extended Prisma schema. Any plants that cannot be matched are reported at the end so you can refine the target list or adjust the search term. If Perenual omits important fields (description, sunlight, watering, soil, or imagery) the importer logs a warning so you can revisit the record manually. The script is idempotent—rerunning it keeps data in sync with Perenual updates.

For day-to-day upkeep without exhausting your API quota, use the incremental sync helper:

```
pnpm perenual:sync
```

The command checks which of the 100 targets are missing Perenual details in your database, fetches only the gaps, and records two sets of outcomes in `data/perenual-sync-log.json`:

- `missingData` — plants that Perenual doesn't currently expose or that lack essential fields (description, sunlight, watering, soil, imagery). Future runs skip them until you delete the log entry.
- `apiLimit` — plants skipped after rate-limit errors. Entries include a timestamp so the next run in the same day won't re-issue the request.

Successful imports clear any existing log entries automatically.

Gardenit reads the following Perenual endpoints:

- `GET /api/species-list` for initial IDs filtered by the names in `perenual-targets.ts`
- `GET /api/species/details/:id` for sunlight, watering, toxicity, `sowing` month ranges, hardiness, and imagery

The `sowing` data in `species/details` maps directly to the `ClimatePlantWindow` month ranges used by Gardenit. Use the `growth` and `watering` objects from the same payload to populate manual imports when working offline.

### Manual imports without the API
If you are rate limited or want to curate your own dataset, use the manual import workflow:

1. Copy `data/manual-plant-template.json` to `data/manual-plant-import.json` (already tracked) and fill in the `plants` array with the fields you have available. Each entry accepts companion arrays, planting windows, and either a `sourceUrl` (the script will download the file) or a `localFile` path pointing to an image on disk.
2. Place any local image assets anywhere on your machine—the importer copies them into `public/plants`, ensuring they ship with the app when you build or containerise Gardenit.
3. Run the importer:

   ```bash
   pnpm plants:import
   # or pnpm plants:import -- --file ./path/to/custom.json
   ```

The script validates your JSON, downloads or copies images into `public/plants`, records the local path on each `Plant`, and upserts the data. Because the images live under `public/`, they are bundled automatically into production builds and container images.

### Managing climate zones manually
If you want to seed new regions or tweak frost dates without re-running the Prisma seeds, use the climate importer alongside the template in `data/manual-climate-template.json`:

```bash
pnpm climate:import
# or pnpm climate:import -- ./path/to/zones.json
```

Each entry accepts ISO timestamps for `frostFirst` and `frostLast`. These values drive frost warnings in the seasonality engine and help the Open-Meteo provider determine risk levels for your users. The importer upserts on the zone `id`, making it safe to run repeatedly.

## Weather provider
Gardenit ships with a production-ready integration for [Open-Meteo](https://open-meteo.com/). The provider powers three key calls:

- 7-day forecasts with maximum temperature and precipitation probability
- Hourly 0cm soil temperature for seed germination guidance
- Frost risk classification (high/medium/low) based on the minimum forecast temperature on a given date

Set `OPEN_METEO_BASE_URL` if you are mirroring the API; otherwise the default public endpoint is used. No API key is required. If you containerise the app, the persisted thumbnails in `public/plants` and any manually imported images are included in the build output so offline environments retain the same experience.

## Contributing
1. Fork and clone the repository.
2. Create a feature branch.
3. Make your changes and add tests.
4. Ensure linting and tests pass.
5. Submit a pull request.

## License
MIT
