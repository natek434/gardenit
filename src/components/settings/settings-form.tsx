"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  useLoadScript,
} from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";
import { Button } from "../ui/button";
import {
  LENGTH_UNITS,
  PRECIPITATION_UNITS,
  PRESSURE_UNITS,
  TEMPERATURE_UNITS,
  WIND_SPEED_UNITS,
  describeLengthUnit,
  describePrecipitationUnit,
  describePressureUnit,
  describeTemperatureUnit,
  describeWindSpeedUnit,
  type LengthUnit,
  type PrecipitationUnit,
  type PressureUnit,
  type TemperatureUnit,
  type WindSpeedUnit,
} from "@/src/lib/units";
import type { MeasurementPreferenceSnapshot } from "@/src/server/measurement-preference-service";

type SerializableZone = {
  id: string;
  name: string;
  country: string;
  frostFirst: string | null;
  frostLast: string | null;
  notes: string | null;
};

const FALLBACK_TIMEZONES = ["Pacific/Auckland", "Pacific/Chatham", "Australia/Sydney", "UTC"] as const;

const detectLocalTimezone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz ?? "UTC";
  } catch (error) {
    console.warn("[Gardenit] Unable to detect local timezone", error);
    return "UTC";
  }
};

const getSupportedTimezones = (): string[] => {
  try {
    const values = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (typeof values === "function") {
      return values.call(Intl, "timeZone");
    }
  } catch (error) {
    console.warn("[Gardenit] Unable to enumerate IANA timezones", error);
  }
  return [...FALLBACK_TIMEZONES];
};

const formatHourLabel = (hour: number) => {
  const date = new Date(Date.UTC(2020, 0, 1, hour, 0, 0));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export type SettingsFormProps = {
  user: {
    name: string | null;
    locationName: string | null;
    locationLat: number | null;
    locationLon: number | null;
    climateZoneId: string | null;
  } | null;
  zones: SerializableZone[];
  preferences: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
    emailDigestHour: number;
    emailDigestTimezone: string | null;
    dndEnabled: boolean;
    dndStartHour: number | null;
    dndEndHour: number | null;
  };
  measurementPreferences: MeasurementPreferenceSnapshot;
};

type LocationSelection = { lat: number; lon: number; name: string } | null;

export function SettingsForm({ user, zones, preferences, measurementPreferences }: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const defaultCenter = useMemo(() => ({ lat: -36.8485, lng: 174.7633 }), []);
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection>(
    user?.locationLat != null && user?.locationLon != null
      ? {
          lat: user.locationLat,
          lon: user.locationLon,
          name: user.locationName ?? "",
        }
      : null,
  );
  const [mapCenter, setMapCenter] = useState(() =>
    selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lon } : defaultCenter,
  );
  const [selectedClimateId, setSelectedClimateId] = useState(user?.climateZoneId ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [climateMessage, setClimateMessage] = useState<string | null>(null);
  const [climateError, setClimateError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [unitsMessage, setUnitsMessage] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>(
    measurementPreferences.temperatureUnit,
  );
  const [windSpeedUnit, setWindSpeedUnit] = useState<WindSpeedUnit>(measurementPreferences.windSpeedUnit);
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(measurementPreferences.pressureUnit);
  const [precipitationUnit, setPrecipitationUnit] = useState<PrecipitationUnit>(
    measurementPreferences.precipitationUnit,
  );
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>(measurementPreferences.lengthUnit);

  const [isLocationPending, startLocationTransition] = useTransition();
  const [isClimatePending, startClimateTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [isNotificationsPending, startNotificationsTransition] = useTransition();
  const [isUnitsPending, startUnitsTransition] = useTransition();

  const timezoneOptions = useMemo(() => getSupportedTimezones(), []);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const [emailEnabled, setEmailEnabled] = useState(preferences.emailEnabled);
  const [pushEnabled, setPushEnabled] = useState(preferences.pushEnabled);
  const [inAppEnabled, setInAppEnabled] = useState(preferences.inAppEnabled);
  const [emailDigestHour, setEmailDigestHour] = useState(preferences.emailDigestHour);
  const [emailTimezone, setEmailTimezone] = useState(preferences.emailDigestTimezone ?? detectLocalTimezone());
  const [dndEnabled, setDndEnabled] = useState(preferences.dndEnabled);
  const [dndStartHour, setDndStartHour] = useState<number | "">(preferences.dndStartHour ?? "");
  const [dndEndHour, setDndEndHour] = useState<number | "">(preferences.dndEndHour ?? "");

  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const libraries = useMemo<Libraries>(() => ["places"], []);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
    libraries,
    preventGoogleFontsLoading: true,
  });

  useEffect(() => {
    if (user?.locationLat != null && user?.locationLon != null) {
      setSelectedLocation({
        lat: user.locationLat,
        lon: user.locationLon,
        name: user.locationName ?? "",
      });
      setMapCenter({ lat: user.locationLat, lng: user.locationLon });
    } else {
      setSelectedLocation(null);
      setMapCenter(defaultCenter);
    }
  }, [user?.locationLat, user?.locationLon, user?.locationName, defaultCenter]);

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  useEffect(() => {
    setSelectedClimateId(user?.climateZoneId ?? "");
  }, [user?.climateZoneId]);

  useEffect(() => {
    setEmailEnabled(preferences.emailEnabled);
    setPushEnabled(preferences.pushEnabled);
    setInAppEnabled(preferences.inAppEnabled);
    setEmailDigestHour(preferences.emailDigestHour);
    setEmailTimezone(preferences.emailDigestTimezone ?? detectLocalTimezone());
    setDndEnabled(preferences.dndEnabled);
    setDndStartHour(preferences.dndStartHour ?? "");
    setDndEndHour(preferences.dndEndHour ?? "");
  }, [
    preferences.emailEnabled,
    preferences.pushEnabled,
    preferences.inAppEnabled,
    preferences.emailDigestHour,
    preferences.emailDigestTimezone,
    preferences.dndEnabled,
    preferences.dndStartHour,
    preferences.dndEndHour,
  ]);

  useEffect(() => {
    setTemperatureUnit(measurementPreferences.temperatureUnit);
    setWindSpeedUnit(measurementPreferences.windSpeedUnit);
    setPressureUnit(measurementPreferences.pressureUnit);
    setPrecipitationUnit(measurementPreferences.precipitationUnit);
    setLengthUnit(measurementPreferences.lengthUnit);
  }, [
    measurementPreferences.temperatureUnit,
    measurementPreferences.windSpeedUnit,
    measurementPreferences.pressureUnit,
    measurementPreferences.precipitationUnit,
    measurementPreferences.lengthUnit,
  ]);

  const ensureGeocoder = () => {
    if (typeof window === "undefined" || !window.google?.maps) {
      return null;
    }
    if (!geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
    return geocoderRef.current;
  };

  const reverseGeocode = (coords: google.maps.LatLngLiteral) => {
    const geocoder = ensureGeocoder();
    if (!geocoder) {
      return;
    }
    geocoder.geocode({ location: coords }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        setSelectedLocation((prev) => {
          if (!prev) {
            return { lat: coords.lat, lon: coords.lng, name: results[0]!.formatted_address ?? "" };
          }
          return { ...prev, name: results[0]!.formatted_address ?? prev.name };
        });
      }
    });
  };

  const handlePlacesChanged = () => {
    const place = searchBoxRef.current?.getPlaces?.()?.[0];
    const location = place?.geometry?.location;
    if (!location) {
      return;
    }
    const lat = location.lat();
    const lon = location.lng();
    const locationName = place?.formatted_address ?? place?.name ?? "";
    setSelectedLocation({ lat, lon, name: locationName });
    setMapCenter({ lat, lng: lon });
    setLocationError(null);
    setLocationMessage(null);
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    const lat = event.latLng?.lat();
    const lon = event.latLng?.lng();
    if (lat == null || lon == null) {
      return;
    }
    setSelectedLocation({ lat, lon, name: selectedLocation?.name ?? "" });
    setMapCenter({ lat, lng: lon });
    reverseGeocode({ lat, lng: lon });
    setLocationError(null);
    setLocationMessage(null);
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setMapCenter(defaultCenter);
    setLocationError(null);
    setLocationMessage("Location cleared. Save to apply changes.");
  };

  const groupedZones = useMemo(() => {
    const buckets = new Map<string, SerializableZone[]>();
    zones.forEach((zone) => {
      const list = buckets.get(zone.country) ?? [];
      list.push(zone);
      buckets.set(zone.country, list);
    });
    return Array.from(buckets.entries()).map(([country, list]) => ({
      country,
      zones: list.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [zones]);

  const formatFrostDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const handleSaveLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocationError(null);
    setLocationMessage(null);

    const trimmedName = name.trim();

    startLocationTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName.length ? trimmedName : null,
          locationName: selectedLocation?.name?.length ? selectedLocation.name : null,
          locationLat: selectedLocation ? selectedLocation.lat : null,
          locationLon: selectedLocation ? selectedLocation.lon : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to save location" }));
        setLocationError(typeof data.error === "string" ? data.error : "Unable to save location");
        return;
      }

      setLocationMessage("Location saved");
      router.refresh();
    });
  };

  const handleSaveClimate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClimateError(null);
    setClimateMessage(null);

    startClimateTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          climateZoneId: selectedClimateId ? selectedClimateId : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to save climate zone" }));
        setClimateError(typeof data.error === "string" ? data.error : "Unable to save climate zone");
        return;
      }

      setClimateMessage("Climate zone updated");
      router.refresh();
    });
  };

  const handleSaveNotifications = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotificationError(null);
    setNotificationMessage(null);

    if (dndEnabled) {
      if (dndStartHour === "" || dndEndHour === "") {
        setNotificationError("Choose start and end hours for do not disturb mode");
        return;
      }
      if (dndStartHour === dndEndHour) {
        setNotificationError("Start and end hours cannot match when do not disturb is enabled");
        return;
      }
    }

    const normalizedTimezone = emailTimezone && emailTimezone.length ? emailTimezone : null;
    const payload = {
      emailEnabled,
      pushEnabled,
      inAppEnabled,
      emailDigestHour,
      emailDigestTimezone: normalizedTimezone,
      dndEnabled,
      dndStartHour:
        dndEnabled && dndStartHour !== "" ? Number(dndStartHour) : null,
      dndEndHour:
        dndEnabled && dndEndHour !== "" ? Number(dndEndHour) : null,
    };

    startNotificationsTransition(async () => {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Unable to update notification preferences" }));
        setNotificationError(
          typeof data.error === "string" ? data.error : "Unable to update notification preferences",
        );
        return;
      }

      setNotificationMessage("Notification preferences saved");
      router.refresh();
    });
  };

  const handleSaveUnits = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUnitsError(null);
    setUnitsMessage(null);

    startUnitsTransition(async () => {
      const response = await fetch("/api/settings/units", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperatureUnit,
          windSpeedUnit,
          pressureUnit,
          precipitationUnit,
          lengthUnit,
        }),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Unable to update measurement preferences" }));
        setUnitsError(
          typeof data.error === "string" ? data.error : "Unable to update measurement preferences",
        );
        return;
      }

      setUnitsMessage("Measurement preferences saved");
      router.refresh();
    });
  };

  const handleSavePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current || !next) {
      setPasswordError("Enter your current and new password");
      return;
    }

    if (next.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    if (next !== confirm) {
      setPasswordError("New passwords do not match");
      return;
    }

    startPasswordTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: {
            current,
            next,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to update password" }));
        setPasswordError(typeof data.error === "string" ? data.error : "Unable to update password");
        return;
      }

      setPasswordMessage("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Profile & location</h2>
          <p className="text-sm text-slate-600">Update your display name and choose precise map coordinates.</p>
        </header>
        <form onSubmit={handleSaveLocation} className="space-y-5">
          <label className="block space-y-2 text-sm">
            <span className="font-medium text-slate-700">Display name</span>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={80}
              placeholder="e.g. Sam Gardner"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <fieldset className="space-y-3 rounded border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Location</legend>
            <p className="text-xs text-slate-500">
              Search for an address or click the map to drop a marker. We&apos;ll use it to tailor climate insights.
            </p>
            {apiKey ? null : (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">
                Add <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the interactive map.
              </p>
            )}
            {loadError ? <p className="text-sm text-red-600">Google Maps failed to load. Please refresh and try again.</p> : null}
            {isLoaded && apiKey ? (
              <div className="space-y-3">
                <StandaloneSearchBox onLoad={(ref) => (searchBoxRef.current = ref)} onPlacesChanged={handlePlacesChanged}>
                  <input
                    type="text"
                    placeholder="Search for a suburb or landmark"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </StandaloneSearchBox>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "240px" }}
                    center={mapCenter}
                    zoom={selectedLocation ? 11 : 6}
                    onClick={handleMapClick}
                    options={{ disableDefaultUI: true, zoomControl: true }}
                  >
                    {selectedLocation ? (
                      <Marker position={{ lat: selectedLocation.lat, lng: selectedLocation.lon }} />
                    ) : null}
                  </GoogleMap>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                {selectedLocation ? (
                  <>
                    <p className="font-medium text-slate-700">{selectedLocation.name || "Custom location"}</p>
                    <p>
                      {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
                    </p>
                  </>
                ) : (
                  <p>No saved location yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={clearLocation}>
                  Clear location
                </Button>
              </div>
            </div>
          </fieldset>
          {locationError ? (
            <p className="text-sm text-red-600" role="alert">
              {locationError}
            </p>
          ) : null}
          {locationMessage ? <p className="text-sm text-emerald-600">{locationMessage}</p> : null}
          <Button type="submit" disabled={isLocationPending}>
            {isLocationPending ? "Saving…" : "Save location"}
          </Button>
        </form>
      </section>

      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Climate zone</h2>
          <p className="text-sm text-slate-600">Browse zones by country and highlight the one that matches your garden.</p>
        </header>
        <form onSubmit={handleSaveClimate} className="space-y-4">
          <div className="space-y-3">
            {groupedZones.map((group) => (
              <details
                key={group.country}
                className="rounded border border-slate-200 bg-slate-50 p-4"
                open={group.zones.some((zone) => zone.id === selectedClimateId)}
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  {group.country}
                </summary>
                <div className="mt-3 space-y-2">
                  {group.zones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedClimateId(zone.id)}
                      className={classNames(
                        "w-full rounded border p-3 text-left transition focus:outline-none focus:ring-2",
                        {
                          "border-primary bg-primary/10 text-primary focus:ring-primary/40": zone.id === selectedClimateId,
                          "border-slate-200 bg-white text-slate-700 hover:border-primary/40": zone.id !== selectedClimateId,
                        },
                      )}
                    >
                      <p className="text-sm font-semibold">{zone.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Frost window: {formatFrostDate(zone.frostFirst)} – {formatFrostDate(zone.frostLast)}
                      </p>
                      {zone.notes ? (
                        <p className="mt-1 text-xs text-slate-500">{zone.notes}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <p>
              Selected zone:{" "}
              {selectedClimateId
                ? zones.find((zone) => zone.id === selectedClimateId)?.name ?? "Unknown zone"
                : "None"}
            </p>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-wide text-red-500"
              onClick={() => setSelectedClimateId("")}
            >
              Clear selection
            </button>
          </div>
          {climateError ? <p className="text-sm text-red-600">{climateError}</p> : null}
          {climateMessage ? <p className="text-sm text-emerald-600">{climateMessage}</p> : null}
      <Button type="submit" disabled={isClimatePending}>
        {isClimatePending ? "Saving…" : "Save climate zone"}
      </Button>
    </form>
  </section>

      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Measurement units</h2>
          <p className="text-sm text-slate-600">
            Choose how temperatures, wind, pressure, precipitation, and bed dimensions appear across Gardenit.
          </p>
        </header>
        <form onSubmit={handleSaveUnits} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Temperature</span>
              <select
                value={temperatureUnit}
                onChange={(event) => setTemperatureUnit(event.target.value as TemperatureUnit)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {TEMPERATURE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {describeTemperatureUnit(unit)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Wind speed</span>
              <select
                value={windSpeedUnit}
                onChange={(event) => setWindSpeedUnit(event.target.value as WindSpeedUnit)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {WIND_SPEED_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {describeWindSpeedUnit(unit)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Pressure</span>
              <select
                value={pressureUnit}
                onChange={(event) => setPressureUnit(event.target.value as PressureUnit)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {PRESSURE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {describePressureUnit(unit)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Precipitation</span>
              <select
                value={precipitationUnit}
                onChange={(event) => setPrecipitationUnit(event.target.value as PrecipitationUnit)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {PRECIPITATION_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {describePrecipitationUnit(unit)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Garden dimensions</span>
              <select
                value={lengthUnit}
                onChange={(event) => setLengthUnit(event.target.value as LengthUnit)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {LENGTH_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {describeLengthUnit(unit)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-slate-500">
            These preferences apply to the dashboard forecast, garden planner, and any future climate-powered features.
          </p>
          {unitsError ? (
            <p className="text-sm text-red-600" role="alert">
              {unitsError}
            </p>
          ) : null}
          {unitsMessage ? <p className="text-sm text-emerald-600">{unitsMessage}</p> : null}
          <Button type="submit" disabled={isUnitsPending}>
            {isUnitsPending ? "Saving…" : "Save measurement settings"}
          </Button>
        </form>
      </section>

      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Notification preferences</h2>
          <p className="text-sm text-slate-600">Tune email delivery, in-app alerts, and quiet hours.</p>
        </header>
        <form onSubmit={handleSaveNotifications} className="space-y-5">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(event) => setEmailEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-slate-700">Send email notifications</span>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Preferred digest hour</span>
                <select
                  value={String(emailDigestHour)}
                  onChange={(event) => setEmailDigestHour(Number(event.target.value))}
                  disabled={!emailEnabled}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {hours.map((hour) => (
                    <option key={hour} value={String(hour)}>
                      {formatHourLabel(hour)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Timezone</span>
                <select
                  value={emailTimezone}
                  onChange={(event) => setEmailTimezone(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {timezoneOptions.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(event) => setPushEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-slate-700">
                Allow push alerts (emails sent when push is unavailable)
              </span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={inAppEnabled}
                onChange={(event) => setInAppEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-slate-700">Show in-app notifications</span>
            </label>
          </div>
          <fieldset className="space-y-3 rounded border border-slate-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Do not disturb</legend>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={dndEnabled}
                onChange={(event) => {
                  const next = event.target.checked;
                  setDndEnabled(next);
                  if (next) {
                    setDndStartHour((prev) => (prev === "" ? 22 : prev));
                    setDndEndHour((prev) => (prev === "" ? 7 : prev));
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-slate-700">Mute email and push between these hours</span>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Start hour</span>
                <select
                  value={dndStartHour === "" ? "" : String(dndStartHour)}
                  onChange={(event) =>
                    setDndStartHour(event.target.value === "" ? "" : Number(event.target.value))
                  }
                  disabled={!dndEnabled}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">None</option>
                  {hours.map((hour) => (
                    <option key={`start-${hour}`} value={String(hour)}>
                      {formatHourLabel(hour)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">End hour</span>
                <select
                  value={dndEndHour === "" ? "" : String(dndEndHour)}
                  onChange={(event) =>
                    setDndEndHour(event.target.value === "" ? "" : Number(event.target.value))
                  }
                  disabled={!dndEnabled}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">None</option>
                  {hours.map((hour) => (
                    <option key={`end-${hour}`} value={String(hour)}>
                      {formatHourLabel(hour)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Quiet hours apply to email and push notifications using your selected timezone. Alerts resume immediately after the
              end hour.
            </p>
          </fieldset>
          {notificationError ? (
            <p className="text-sm text-red-600" role="alert">
              {notificationError}
            </p>
          ) : null}
          {notificationMessage ? <p className="text-sm text-emerald-600">{notificationMessage}</p> : null}
          <Button type="submit" disabled={isNotificationsPending}>
            {isNotificationsPending ? "Saving…" : "Save notification settings"}
          </Button>
        </form>
      </section>

      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Password</h2>
          <p className="text-sm text-slate-600">Update your Gardenit password from here.</p>
        </header>
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Current password</span>
              <input
                type="password"
                name="currentPassword"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoComplete="current-password"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">New password</span>
              <input
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoComplete="new-password"
                minLength={8}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Confirm new password</span>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoComplete="new-password"
                minLength={8}
              />
            </label>
          </div>
          {passwordError ? (
            <p className="text-sm text-red-600" role="alert">
              {passwordError}
            </p>
          ) : null}
          {passwordMessage ? <p className="text-sm text-emerald-600">{passwordMessage}</p> : null}
          <Button type="submit" disabled={isPasswordPending}>
            {isPasswordPending ? "Saving…" : "Save password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
