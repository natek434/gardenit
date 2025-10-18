import type { ComponentType, ReactNode } from "react";
import { SunGlyph, WaterGlyph, FlowerGlyph, ThornGlyph, EdibleGlyph, CautionGlyph } from "./icons";

export function PlantIconLegend() {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Icon legend</h2>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <LegendRow
          label="Sunlight"
          description="1 = suited to shade, 5 = thrives in full sun"
          icons={<RatingPreview Icon={SunGlyph} />}
        />
        <LegendRow
          label="Water"
          description="1 = drought tolerant, 5 = needs frequent watering"
          icons={<RatingPreview Icon={WaterGlyph} />}
        />
        <LegendRow label="Flowering" description="Blooming habit" icons={<FlowerGlyph active />} />
        <LegendRow label="Edible" description="Harvestable parts" icons={<EdibleGlyph active />} />
        <LegendRow label="Thorny" description="Has thorns or spines" icons={<ThornGlyph active />} />
        <LegendRow label="Caution" description="Poisonous to humans or pets" icons={<CautionGlyph active />} />
      </div>
    </section>
  );
}

type LegendRowProps = {
  label: string;
  description: string;
  icons: ReactNode;
};

function LegendRow({ label, description, icons }: LegendRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-slate-700">
        <span className="font-semibold">{label}</span>
        <span className="flex items-center gap-1">{icons}</span>
      </div>
      <p className="text-[11px] text-slate-500">{description}</p>
    </div>
  );
}

function RatingPreview({ Icon }: { Icon: ComponentType<{ active?: boolean }> }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} active={index === 4} />
      ))}
    </span>
  );
}
