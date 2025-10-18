"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  useLoadScript,
} from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";
import { Button } from "../ui/button";

export type SettingsFormProps = {
  user: {
    name: string | null;
    locationName: string | null;
    locationLat: number | null;
    locationLon: number | null;
    climateZoneId: string | null;
  } | null;
  zones: Array<{ id: string; name: string; country: string }>;
};

export function SettingsForm({ user, zones }: SettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const defaultCenter = useMemo(() => ({ lat: -36.8485, lng: 174.7633 }), []);
  const [selectedLocation, setSelectedLocation] = useState<
    { lat: number; lon: number; name: string } | null
  >(
    user?.locationLat != null && user?.locationLon != null
      ? {
          lat: user.locationLat,
          lon: user.locationLon,
          name: user.locationName ?? "",
        }
      : null,
  );
  const [mapCenter, setMapCenter] = useState(() =>
    selectedLocation
      ? { lat: selectedLocation.lat, lng: selectedLocation.lon }
      : defaultCenter,
  );
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
    const name = place?.formatted_address ?? place?.name ?? "";
    setSelectedLocation({ lat, lon, name });
    setMapCenter({ lat, lng: lon });
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
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setMapCenter(defaultCenter);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const zone = String(form.get("climateZoneId") ?? "");
    const passwordCurrent = currentPassword.trim();
    const passwordNext = newPassword.trim();
    const passwordConfirm = confirmPassword.trim();

    if ((passwordCurrent && !passwordNext) || (!passwordCurrent && passwordNext)) {
      setError("Provide both your current and new password to make a change");
      return;
    }

    if (passwordNext && passwordNext.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    if (passwordNext && passwordNext !== passwordConfirm) {
      setError("New passwords do not match");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.length ? name : null,
          climateZoneId: zone.length ? zone : null,
          locationName: selectedLocation?.name?.length ? selectedLocation.name : null,
          locationLat: selectedLocation ? selectedLocation.lat : null,
          locationLon: selectedLocation ? selectedLocation.lon : null,
          password:
            passwordCurrent && passwordNext
              ? {
                  current: passwordCurrent,
                  next: passwordNext,
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to save settings" }));
        setError(typeof data.error === "string" ? data.error : "Unable to save settings");
        return;
      }

      setSuccess("Settings updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Display name</span>
          <input
            type="text"
            name="name"
            defaultValue={user?.name ?? ""}
            minLength={2}
            maxLength={80}
            placeholder="e.g. Sam Gardner"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Climate zone</span>
          <select
            name="climateZoneId"
            defaultValue={user?.climateZoneId ?? ""}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select a zone</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.country})
              </option>
            ))}
          </select>
        </label>
      </div>
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
        {loadError ? (
          <p className="text-sm text-red-600">Google Maps failed to load. Please refresh and try again.</p>
        ) : null}
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
            <Button type="button" variant="outline" size="sm" onClick={clearLocation}>
              Clear location
            </Button>
          </div>
        </div>
      </fieldset>
      <fieldset className="space-y-3 rounded border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Security</legend>
        <p className="text-xs text-slate-500">Change your password from here. Leave blank to keep your current password.</p>
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
      </fieldset>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
