import { auth } from "@/src/lib/auth/options";
import { getClimateZones } from "@/src/server/climate-service";
import { getWeatherProvider } from "@/src/lib/weather/provider";
import { Badge } from "@/src/components/ui/badge";

export default async function SettingsPage() {
  const session = await auth();
  const zones = await getClimateZones();
  const provider = getWeatherProvider();
  const forecast = await provider.getForecast(
    session?.user?.locationLat ?? -36.8485,
    session?.user?.locationLon ?? 174.7633,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Location & reminders</h1>
        <p className="text-sm text-slate-600">Manage your climate zone, frost preferences, and email reminders.</p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Climate zones</h2>
        <p className="mt-1 text-sm text-slate-600">Gardenit currently focuses on New Zealand zones with global expansion planned.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {zones.map((zone) => (
            <div key={zone.id} className="rounded border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">{zone.name}</h3>
                <Badge variant="muted">{zone.country}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Frost: {zone.frostFirst ? zone.frostFirst.toISOString().slice(0, 10) : "--"} -
                {" "}
                {zone.frostLast ? zone.frostLast.toISOString().slice(0, 10) : "--"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{zone.notes ?? "No notes yet."}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">7-day outlook</h2>
        <p className="mt-1 text-sm text-slate-600">Mock forecast data for your saved location.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {forecast.map((day) => (
            <div key={day.date} className="rounded border border-slate-200 p-4">
              <p className="font-medium text-slate-700">{new Date(day.date).toDateString()}</p>
              <p className="text-xs text-slate-500">Temperature: {day.temperatureC.toFixed(1)}°C</p>
              <p className="text-xs text-slate-500">Rain chance: {day.rainChance}%</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
