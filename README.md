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
- **Weather abstraction** ready for real providers
- **Seasonality logic** determining planting windows per climate zone
- **Background scheduler** for care reminders
- **CI via GitHub Actions** running linting, tests, and type checks

## Database
The Prisma schema (see `prisma/schema.prisma`) models users, plants, planting windows, gardens, beds, and reminders. The `Plant` model captures rich horticultural metadata sourced from Perenual (sunlight exposure, watering benchmarks, anatomy, hardiness, toxicity, imagery, and more) so the app can store full API responses alongside Gardenit-specific agronomic data. Seed data still covers core New Zealand crops with companion and antagonist relationships.

### Importing plant data from Perenual
- Add `PERENUAL_API_KEY` to your `.env.local`. Keys are available from [perenual.com](https://perenual.com/docs/api).
- Review the 100 common vegetables, herbs, and fruits listed in `data/perenual-targets.ts`. Adjust the list or categories if you need different crops.
- Run the importer to fetch JSON from the Perenual API and upsert the plants into your local database:

  ```bash
  pnpm perenual:import
  ```

The helper script automatically matches species by common name, fetches full detail payloads, and maps them to the extended Prisma schema. Any plants that cannot be matched are reported at the end so you can refine the target list or adjust the search term. The script is idempotent—rerunning it keeps data in sync with Perenual updates.

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

## Contributing
1. Fork and clone the repository.
2. Create a feature branch.
3. Make your changes and add tests.
4. Ensure linting and tests pass.
5. Submit a pull request.

## License
MIT
