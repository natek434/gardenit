import Link from "next/link";
import { Cloud, CloudRain, Droplet, GaugeCircle, MapPin, Navigation, Sun, ThermometerSun, Wind } from "lucide-react";
import { auth } from "@/src/lib/auth/options";
import { getClimateZones } from "@/src/server/climate-service";
import { getWeatherProvider } from "@/src/lib/weather/provider";
import { getUserProfile } from "@/src/server/user-service";
import { SettingsForm } from "@/src/components/settings/settings-form";

export default async function SettingsPage() {
  const session = await auth();
  const zones = await getClimateZones();
  const provider = getWeatherProvider();

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in to manage your settings</h1>
        <p className="text-sm text-slate-600">
          You need a Gardenit account to customise your climate zone, coordinates, and notification preferences.
        </p>
        <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  const user = await getUserProfile(session.user.id);
  const hasLocation = typeof user?.locationLat === "number" && typeof user?.locationLon === "number";
  const latitude = hasLocation ? (user?.locationLat as number) : -36.8485;
  const longitude = hasLocation ? (user?.locationLon as number) : 174.7633;
  const locationName = hasLocation ? user?.locationName ?? "Custom coordinates" : "Location not set";

  let forecast: Awaited<ReturnType<typeof provider.getForecast>> = [];
  let soilTemp: number | null = null;
  let todayFrostRisk: "low" | "medium" | "high" = "low";
  let currentConditions: Awaited<ReturnType<typeof provider.getCurrentConditions>> | null = null;

  if (hasLocation) {
    try {
      [forecast, soilTemp, todayFrostRisk, currentConditions] = await Promise.all([
        provider.getForecast(latitude, longitude),
        provider.getSoilTemp(latitude, longitude),
        provider.getFrostRisk(latitude, longitude, new Date()),
        provider.getCurrentConditions(latitude, longitude),
      ]);
    } catch (error) {
      console.error("Weather lookup failed", error);
    }
  }

  const today = forecast[0] ?? null;
  const style = getWeatherStyle(today?.rainChance ?? 0);
  const Icon = style.Icon;

  const zoneOptions = zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    country: zone.country,
    frostFirst: zone.frostFirst ? zone.frostFirst.toISOString() : null,
    frostLast: zone.frostLast ? zone.frostLast.toISOString() : null,
    notes: zone.notes ?? null,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Location & reminders</h1>
        <p className="text-sm text-slate-600">Manage your climate zone, frost preferences, and email reminders.</p>
      </header>

      <SettingsForm user={user} zones={zoneOptions} />

      <section className={`rounded-lg border ${style.tone} p-6 shadow-sm`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800">Today&apos;s outlook</h2>
            <p className="text-sm text-slate-600">
              Live observations powered by Open-Meteo. Refresh your location above to refine these insights.
            </p>
          </div>
          <Icon className={`h-8 w-8 ${style.accent}`} aria-hidden />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            <span>
              {locationName}
              {hasLocation ? (
                <span className="ml-1 text-xs text-slate-500">
                  ({latitude.toFixed(3)}, {longitude.toFixed(3)})
                </span>
              ) : null}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <ThermometerSun className="h-4 w-4 text-amber-500" aria-hidden />
            <span>
              Soil temperature: {hasLocation && soilTemp !== null && Number.isFinite(soilTemp) ? `${soilTemp.toFixed(1)}°C` : "—"}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-slate-500" aria-hidden />
            <span>Frost risk today: {hasLocation ? todayFrostRisk : "—"}</span>
          </p>
        </div>
        <div className="mt-6">
          {hasLocation ? (
            today || currentConditions ? (
              <dl className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Sun className="h-4 w-4 text-amber-500" aria-hidden /> High
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {today && Number.isFinite(today.temperatureMaxC) ? `${today.temperatureMaxC.toFixed(1)}°C` : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <CloudRain className="h-4 w-4 text-blue-500" aria-hidden /> Rain chance
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">{today ? `${today.rainChance ?? 0}%` : "—"}</dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Wind className="h-4 w-4 text-sky-600" aria-hidden /> Wind speed
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {currentConditions && Number.isFinite(currentConditions.windSpeedKph)
                      ? `${currentConditions.windSpeedKph.toFixed(1)} km/h`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Wind className="h-4 w-4 rotate-45 text-sky-600" aria-hidden /> Wind gust
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {currentConditions && Number.isFinite(currentConditions.windGustKph)
                      ? `${currentConditions.windGustKph.toFixed(1)} km/h`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Navigation className="h-4 w-4 text-slate-600" aria-hidden /> Wind direction
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {currentConditions && Number.isFinite(currentConditions.windDirectionDeg)
                      ? `${toCardinal(currentConditions.windDirectionDeg)} (${Math.round(currentConditions.windDirectionDeg)}°)`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Droplet className="h-4 w-4 text-cyan-600" aria-hidden /> Humidity
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {currentConditions && Number.isFinite(currentConditions.humidityPercent)
                      ? `${Math.round(currentConditions.humidityPercent)}%`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <GaugeCircle className="h-4 w-4 text-indigo-600" aria-hidden /> Pressure
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {currentConditions && Number.isFinite(currentConditions.pressureHpa)
                      ? `${Math.round(currentConditions.pressureHpa)} hPa`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <ThermometerSun className="h-4 w-4 text-amber-500" aria-hidden /> Feels like
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {currentConditions && Number.isFinite(currentConditions.apparentTemperatureC)
                      ? `${currentConditions.apparentTemperatureC.toFixed(1)}°C`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Cloud className="h-4 w-4 text-slate-500" aria-hidden /> Overnight low
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {today && Number.isFinite(today.temperatureMinC) ? `${today.temperatureMinC.toFixed(1)}°C` : "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-600">
                Weather data is unavailable right now. Check your internet connection or try again soon.
              </p>
            )
          ) : (
            <p className="text-sm text-slate-600">
              Set your location above to unlock a personalised daily forecast with wind, humidity, and pressure details.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function getWeatherStyle(rainChance: number) {
  if (rainChance >= 60) {
    return {
      tone: "bg-blue-50 border-blue-100",
      accent: "text-blue-600",
      Icon: CloudRain,
    } as const;
  }
  if (rainChance >= 30) {
    return {
      tone: "bg-slate-50 border-slate-100",
      accent: "text-slate-600",
      Icon: Cloud,
    } as const;
  }
  return {
    tone: "bg-amber-50 border-amber-100",
    accent: "text-amber-600",
    Icon: Sun,
  } as const;
}

function toCardinal(degrees: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((degrees % 360) / 45 + 8) % 8);
  return dirs[index];
}
