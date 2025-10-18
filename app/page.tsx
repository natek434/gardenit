import Link from "next/link";
import { Cloud, CloudRain, MapPin, Sun, ThermometerSun } from "lucide-react";
import { auth } from "@/src/lib/auth/options";
import { getPlants } from "@/src/server/plant-service";
import { getUserProfile } from "@/src/server/user-service";
import { getWeatherProvider } from "@/src/lib/weather/provider";
import { PlantCard } from "@/src/components/plants/plant-card";
import { Button } from "@/src/components/ui/button";

export default async function HomePage() {
  const [plants, session] = await Promise.all([getPlants(), auth()]);
  const provider = getWeatherProvider();
  const sowNow = plants.filter((plant) => plant.status.status === "NOW").slice(0, 6);

  let forecast: Awaited<ReturnType<typeof provider.getForecast>> = [];
  let locationName = "";
  let latitude: number | null = null;
  let longitude: number | null = null;
  let hasLocation = false;
  let zone = "";

  if (session?.user?.id) {
    const profile = await getUserProfile(session.user.id);
    if (profile?.locationLat != null && profile?.locationLon != null) {
      hasLocation = true;
      latitude = profile.locationLat;
      longitude = profile.locationLon;
      locationName = profile.locationName ?? "Custom coordinates";
      zone = profile.climateZone?.name ?? locationName;
      try {
        forecast = await provider.getForecast(profile.locationLat, profile.locationLon);
      } catch (error) {
        console.error("Forecast lookup failed", error);
      }
    }
  }

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
