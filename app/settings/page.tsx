import Link from "next/link";
import { Cloud, CloudRain, MapPin, Sun, ThermometerSun } from "lucide-react";
import { auth } from "@/src/lib/auth/options";
import { getClimateZones } from "@/src/server/climate-service";
import { getWeatherProvider } from "@/src/lib/weather/provider";
import { getUserProfile } from "@/src/server/user-service";
import { Badge } from "@/src/components/ui/badge";
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

  if (hasLocation) {
    try {
      forecast = await provider.getForecast(latitude, longitude);
      soilTemp = await provider.getSoilTemp(latitude, longitude);
      todayFrostRisk = await provider.getFrostRisk(latitude, longitude, new Date());
    } catch (error) {
      console.error("Weather lookup failed", error);
    }
  }

  const getWeatherStyle = (rainChance: number) => {
    if (rainChance >= 60) {
      return {
        tone: "bg-blue-50 border-blue-100",
        accent: "text-blue-600",
        Icon: CloudRain,
        label: "Likely rain",
      };
    }
    if (rainChance >= 30) {
      return {
        tone: "bg-slate-50 border-slate-100",
        accent: "text-slate-600",
        Icon: Cloud,
        label: "Cloudy spells",
      };
    }
    return {
      tone: "bg-amber-50 border-amber-100",
      accent: "text-amber-600",
      Icon: Sun,
      label: "Plenty of sun",
    };
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Location & reminders</h1>
        <p className="text-sm text-slate-600">Manage your climate zone, frost preferences, and email reminders.</p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Your profile</h2>
        <p className="mt-1 text-sm text-slate-600">Update your coordinates to personalise weather insights and sowing reminders.</p>
        <div className="mt-4">
          <SettingsForm user={user} zones={zones} />
        </div>
      </section>

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
        <p className="mt-1 text-sm text-slate-600">
          Live observations provided by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Open-Meteo
          </a>
          . Soil and frost metrics update hourly.
        </p>
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
              Soil temperature:{" "}
              {hasLocation && soilTemp !== null && Number.isFinite(soilTemp) ? `${soilTemp.toFixed(1)}°C` : "—"}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-slate-500" aria-hidden />
            <span>Frost risk today: {hasLocation ? todayFrostRisk : "—"}</span>
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {forecast.length === 0 ? (
            <p className="text-sm text-slate-500">
              {hasLocation
                ? "Weather data is unavailable right now. Check your internet connection or try again soon."
                : "Select a location above to unlock a personalised forecast."}
            </p>
          ) : (
            forecast.map((day) => {
              const style = getWeatherStyle(day.rainChance);
              const Icon = style.Icon;
              return (
                <div key={day.date} className={`rounded border p-4 transition hover:shadow-sm ${style.tone}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{new Date(day.date).toDateString()}</p>
                      <p className={`text-xs font-medium ${style.accent}`}>{style.label}</p>
                    </div>
                    <Icon className={`h-5 w-5 ${style.accent}`} aria-hidden />
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <dt>High</dt>
                      <dd>{Number.isFinite(day.temperatureMaxC) ? `${day.temperatureMaxC.toFixed(1)}°C` : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Low</dt>
                      <dd>{Number.isFinite(day.temperatureMinC) ? `${day.temperatureMinC.toFixed(1)}°C` : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Rain chance</dt>
                      <dd>{day.rainChance ?? 0}%</dd>
                    </div>
                  </dl>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
