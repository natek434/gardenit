import Link from "next/link";
import {
  Cloud,
  CloudRain,
  Droplet,
  GaugeCircle,
  MapPin,
  Navigation,
  Sun,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { auth } from "@/src/lib/auth/options";
import { getPlants } from "@/src/server/plant-service";
import { getUserProfile } from "@/src/server/user-service";
import { getWeatherProvider } from "@/src/lib/weather/provider";
import { PlantCard } from "@/src/components/plants/plant-card";
import { Button } from "@/src/components/ui/button";
import {
  DEFAULT_MEASUREMENT_PREFERENCES,
  formatPrecipitation,
  formatPressure,
  formatTemperature,
  formatWindSpeed,
} from "@/src/lib/units";
import { getMeasurementPreferencesByUser } from "@/src/server/measurement-preference-service";

export default async function HomePage() {
  const [plants, session] = await Promise.all([getPlants(), auth()]);
  const provider = getWeatherProvider();
  const sowNow = plants.filter((plant) => plant.status.status === "NOW").slice(0, 6);

  let measurement = { ...DEFAULT_MEASUREMENT_PREFERENCES };
  let forecast: Awaited<ReturnType<typeof provider.getForecast>> = [];
  let locationName = "Location not set";
  let latitude: number | null = null;
  let longitude: number | null = null;
  let hasLocation = false;
  let soilTemp: number | null = null;
  let todayFrostRisk: "low" | "medium" | "high" = "low";
  let currentConditions: Awaited<ReturnType<typeof provider.getCurrentConditions>> | null = null;
  let zone: string = ""; 

  if (session?.user?.id) {
    const [profile, measurementSnapshot] = await Promise.all([
      getUserProfile(session.user.id),
      getMeasurementPreferencesByUser(session.user.id),
    ]);

    measurement = {
      temperatureUnit: measurementSnapshot.temperatureUnit,
      windSpeedUnit: measurementSnapshot.windSpeedUnit,
      pressureUnit: measurementSnapshot.pressureUnit,
      precipitationUnit: measurementSnapshot.precipitationUnit,
      lengthUnit: measurementSnapshot.lengthUnit,
    };

    if (profile?.locationLat != null && profile?.locationLon != null) {
      hasLocation = true;
      latitude = profile.locationLat;
      longitude = profile.locationLon;
      locationName = profile.locationName ?? "Custom coordinates";
      zone = profile.climateZone?.name ?? locationName;
      try {
        [forecast, soilTemp, todayFrostRisk, currentConditions] = await Promise.all([
          provider.getForecast(profile.locationLat, profile.locationLon),
          provider.getSoilTemp(profile.locationLat, profile.locationLon),
          provider.getFrostRisk(profile.locationLat, profile.locationLon, new Date()),
          provider.getCurrentConditions(profile.locationLat, profile.locationLon),
        ]);
      } catch (error) {
        console.error("Forecast lookup failed", error);
      }
    }
  }

  const today = forecast[0] ?? null;
  const todayStyle = getWeatherStyle(today?.rainChance ?? 0);
  const TodayIcon = todayStyle.Icon;
  const formatTemp = (value: number) => formatTemperature(value, measurement.temperatureUnit);
  const formatWind = (value: number) => formatWindSpeed(value, measurement.windSpeedUnit);
  const formatPress = (value: number) => formatPressure(value, measurement.pressureUnit);
  const formatPrecip = (value: number) => formatPrecipitation(value, measurement.precipitationUnit);

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-slate-200 bg-white px-8 py-12 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Grow smarter with Gardenit</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Discover plants that thrive in your climate, receive tailored care plans, and keep your beds productive year-round.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/plants">
            <Button>Browse plants</Button>
          </Link>
          <Link href="/garden">
            <Button variant="secondary">Plan your beds</Button>
          </Link>
        </div>
      </section>

            <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Plant now in {zone}</h2>
          <Link href="/plants" className="text-sm text-primary hover:underline">
            View all plants
          </Link>
        </div>
        {sowNow.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sowNow.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No immediate sowing opportunities. Check back soon!</p>
        )}
      </section>

      <section className={`rounded-xl border ${todayStyle.tone} bg-white p-6 shadow-sm`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-800">Today&apos;s outlook</h2>
            <p className="text-sm text-slate-600">
              Live observations powered by Open-Meteo. Update your location in settings to refine these insights.
            </p>
          </div>
          <TodayIcon className={`h-8 w-8 ${todayStyle.accent}`} aria-hidden />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            <span>
              {locationName}
              {hasLocation && latitude != null && longitude != null ? (
                <span className="ml-1 text-xs text-slate-500">
                  ({latitude.toFixed(3)}, {longitude.toFixed(3)})
                </span>
              ) : null}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <ThermometerSun className="h-4 w-4 text-amber-500" aria-hidden />
            <span>
              Soil temperature: {hasLocation && soilTemp !== null ? formatTemp(soilTemp) : "—"}
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
                    {formatTemp(today?.temperatureMaxC ?? Number.NaN)}
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
                    {formatWind(currentConditions?.windSpeedKph ?? Number.NaN)}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Wind className="h-4 w-4 rotate-45 text-sky-600" aria-hidden /> Wind gust
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {formatWind(currentConditions?.windGustKph ?? Number.NaN)}
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
                    {formatPress(currentConditions?.pressureHpa ?? Number.NaN)}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <ThermometerSun className="h-4 w-4 text-amber-500" aria-hidden /> Feels like
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {formatTemp(currentConditions?.apparentTemperatureC ?? Number.NaN)}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Cloud className="h-4 w-4 text-slate-500" aria-hidden /> Overnight low
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-800">
                    {formatTemp(today?.temperatureMinC ?? Number.NaN)}
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
              Sign in and set your garden location in settings to unlock live observations for today.
            </p>
          )}
        </div>
      </section>



      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">7-day forecast</h2>
            <p className="text-sm text-slate-600">Powered by Open-Meteo and tailored to your saved location.</p>
          </div>
          <Link href="/settings" className="text-sm font-semibold text-primary hover:underline">
            Update location
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            <span>
              {hasLocation ? locationName : "Location not set"}
              {hasLocation && latitude != null && longitude != null ? (
                <span className="ml-1 text-xs text-slate-500">
                  ({latitude.toFixed(3)}, {longitude.toFixed(3)})
                </span>
              ) : null}
            </span>
          </p>
          {hasLocation ? null : (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ThermometerSun className="h-4 w-4 text-amber-500" aria-hidden />
              Save a location in settings to unlock your personalised outlook.
            </p>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {forecast.length ? (
            forecast.map((day) => {
              const style = getWeatherStyle(day.rainChance);
              const Icon = style.Icon;
              return (
                <details
                  key={day.date}
                  className={`group rounded border p-4 transition hover:shadow-sm ${style.tone}`}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-slate-700">
                    <div>
                      <p className="font-medium text-slate-800">{new Date(day.date).toDateString()}</p>
                      <p className={`text-xs font-medium ${style.accent}`}>{style.label}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right text-xs sm:text-sm">
                      <span>High: {formatTemp(day.temperatureMaxC ?? Number.NaN)}</span>
                      <span>Low: {formatTemp(day.temperatureMinC ?? Number.NaN)}</span>
                      <span>Wind: {formatWind(day.windSpeedMaxKph ?? Number.NaN)}</span>
                    </div>
                    <Icon className={`h-5 w-5 shrink-0 ${style.accent}`} aria-hidden />
                  </summary>
                  <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <div className="flex justify-between">
                      <dt>Rain chance</dt>
                      <dd>{day.rainChance ?? 0}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Precipitation</dt>
                      <dd>{formatPrecip(day.precipitationMm ?? Number.NaN)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Wind gust</dt>
                      <dd>{formatWind(day.windGustMaxKph ?? Number.NaN)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Dominant wind</dt>
                      <dd>
                        {Number.isFinite(day.windDirectionDominantDeg)
                          ? `${toCardinal(day.windDirectionDominantDeg)} (${Math.round(day.windDirectionDominantDeg)}°)`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </details>
              );
            })
          ) : (
            <p className="text-sm text-slate-600">
              {session?.user?.id
                ? "Add your location in settings to see a 7-day forecast for your garden."
                : "Sign in and add a location in settings to unlock a personalised 7-day forecast."}
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
      label: "Likely rain",
    } as const;
  }
  if (rainChance >= 30) {
    return {
      tone: "bg-slate-50 border-slate-100",
      accent: "text-slate-600",
      Icon: Cloud,
      label: "Cloudy spells",
    } as const;
  }
  return {
    tone: "bg-amber-50 border-amber-100",
    accent: "text-amber-600",
    Icon: Sun,
    label: "Plenty of sun",
  } as const;
}

function toCardinal(degrees: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((degrees % 360) / 45 + 8) % 8);
  return dirs[index];
}
