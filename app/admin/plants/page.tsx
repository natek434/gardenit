import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth/options";
import { PlantAdminManager } from "@/src/components/admin/plant-admin-manager";
import { getPlantsForAdmin } from "@/src/server/plant-service";

export const metadata: Metadata = {
  title: "Plant admin | Gardenit",
};

export default async function AdminPlantsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const plants = await getPlantsForAdmin(100);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Manage plant data</h1>
        <p className="mt-1 text-sm text-slate-600">
          Update core horticultural fields and media references. Changes take effect immediately across the app.
        </p>
      </header>
      <PlantAdminManager
        initialPlants={plants.map((plant) => ({
          ...plant,
          updatedAt: plant.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
