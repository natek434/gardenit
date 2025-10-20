import Link from "next/link";
import { auth } from "@/src/lib/auth/options";
import { getClimateZones } from "@/src/server/climate-service";
import { getUserProfile } from "@/src/server/user-service";
import { SettingsForm } from "@/src/components/settings/settings-form";
import { getNotificationPreferencesByUser } from "@/src/server/notification-preference-service";

export default async function SettingsPage() {
  const session = await auth();
  const zones = await getClimateZones();
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
  const preferences = await getNotificationPreferencesByUser(session.user.id);

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
        <h1 className="text-2xl font-semibold">Account & location</h1>
        <p className="text-sm text-slate-600">Update your profile, climate zone, and notification preferences.</p>
      </header>

      <SettingsForm user={user} zones={zoneOptions} preferences={preferences} />
    </div>
  );
}
