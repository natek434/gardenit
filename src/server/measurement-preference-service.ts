import { prisma } from "@/src/lib/prisma";
import {
  DEFAULT_MEASUREMENT_PREFERENCES,
  MeasurementPreferences,
  PrecipitationUnit,
  PressureUnit,
  TemperatureUnit,
  WindSpeedUnit,
  LengthUnit,
} from "@/src/lib/units";

export type MeasurementPreferenceSnapshot = MeasurementPreferences & {
  userId: string;
};

const DEFAULT_SNAPSHOT: MeasurementPreferenceSnapshot = {
  userId: "",
  ...DEFAULT_MEASUREMENT_PREFERENCES,
};

export async function getMeasurementPreferencesByUser(
  userId: string,
): Promise<MeasurementPreferenceSnapshot> {
  const preference = await prisma.measurementPreference.findUnique({
    where: { userId },
  });
  if (!preference) {
    return { ...DEFAULT_SNAPSHOT, userId };
  }
  return {
    userId,
    temperatureUnit: preference.temperatureUnit as TemperatureUnit,
    windSpeedUnit: preference.windSpeedUnit as WindSpeedUnit,
    pressureUnit: preference.pressureUnit as PressureUnit,
    precipitationUnit: preference.precipitationUnit as PrecipitationUnit,
    lengthUnit: preference.lengthUnit as LengthUnit,
  };
}

export async function updateMeasurementPreferences(
  userId: string,
  data: Partial<MeasurementPreferences>,
): Promise<MeasurementPreferenceSnapshot> {
  const upserted = await prisma.measurementPreference.upsert({
    where: { userId },
    create: {
      userId,
      temperatureUnit: data.temperatureUnit ?? DEFAULT_MEASUREMENT_PREFERENCES.temperatureUnit,
      windSpeedUnit: data.windSpeedUnit ?? DEFAULT_MEASUREMENT_PREFERENCES.windSpeedUnit,
      pressureUnit: data.pressureUnit ?? DEFAULT_MEASUREMENT_PREFERENCES.pressureUnit,
      precipitationUnit: data.precipitationUnit ?? DEFAULT_MEASUREMENT_PREFERENCES.precipitationUnit,
      lengthUnit: data.lengthUnit ?? DEFAULT_MEASUREMENT_PREFERENCES.lengthUnit,
    },
    update: {
      temperatureUnit: data.temperatureUnit ?? undefined,
      windSpeedUnit: data.windSpeedUnit ?? undefined,
      pressureUnit: data.pressureUnit ?? undefined,
      precipitationUnit: data.precipitationUnit ?? undefined,
      lengthUnit: data.lengthUnit ?? undefined,
    },
  });

  return {
    userId,
    temperatureUnit: upserted.temperatureUnit as TemperatureUnit,
    windSpeedUnit: upserted.windSpeedUnit as WindSpeedUnit,
    pressureUnit: upserted.pressureUnit as PressureUnit,
    precipitationUnit: upserted.precipitationUnit as PrecipitationUnit,
    lengthUnit: upserted.lengthUnit as LengthUnit,
  };
}
