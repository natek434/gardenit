export type TemperatureUnit = "CELSIUS" | "FAHRENHEIT";
export type WindSpeedUnit = "KPH" | "MPH" | "MPS" | "KNOTS";
export type PressureUnit = "HPA" | "INHG" | "KPA" | "MMHG";
export type PrecipitationUnit = "MILLIMETERS" | "INCHES";
export type LengthUnit = "CENTIMETERS" | "METERS" | "INCHES" | "FEET";

export type MeasurementPreferences = {
  temperatureUnit: TemperatureUnit;
  windSpeedUnit: WindSpeedUnit;
  pressureUnit: PressureUnit;
  precipitationUnit: PrecipitationUnit;
  lengthUnit: LengthUnit;
};

export const DEFAULT_MEASUREMENT_PREFERENCES: MeasurementPreferences = {
  temperatureUnit: "CELSIUS",
  windSpeedUnit: "KPH",
  pressureUnit: "HPA",
  precipitationUnit: "MILLIMETERS",
  lengthUnit: "CENTIMETERS",
};

const TEMPERATURE_SYMBOL: Record<TemperatureUnit, string> = {
  CELSIUS: "°C",
  FAHRENHEIT: "°F",
};

const WIND_SPEED_SYMBOL: Record<WindSpeedUnit, string> = {
  KPH: "km/h",
  MPH: "mph",
  MPS: "m/s",
  KNOTS: "kn",
};

const PRESSURE_SYMBOL: Record<PressureUnit, string> = {
  HPA: "hPa",
  INHG: "inHg",
  KPA: "kPa",
  MMHG: "mmHg",
};

const PRECIPITATION_SYMBOL: Record<PrecipitationUnit, string> = {
  MILLIMETERS: "mm",
  INCHES: "in",
};

const LENGTH_SYMBOL: Record<LengthUnit, string> = {
  CENTIMETERS: "cm",
  METERS: "m",
  INCHES: "in",
  FEET: "ft",
};

export const TEMPERATURE_UNITS: TemperatureUnit[] = ["CELSIUS", "FAHRENHEIT"];
export const WIND_SPEED_UNITS: WindSpeedUnit[] = ["KPH", "MPH", "MPS", "KNOTS"];
export const PRESSURE_UNITS: PressureUnit[] = ["HPA", "INHG", "KPA", "MMHG"];
export const PRECIPITATION_UNITS: PrecipitationUnit[] = ["MILLIMETERS", "INCHES"];
export const LENGTH_UNITS: LengthUnit[] = ["CENTIMETERS", "METERS", "INCHES", "FEET"];

const TEMPERATURE_LABEL: Record<TemperatureUnit, string> = {
  CELSIUS: "Celsius (°C)",
  FAHRENHEIT: "Fahrenheit (°F)",
};

const WIND_SPEED_LABEL: Record<WindSpeedUnit, string> = {
  KPH: "Kilometres per hour (km/h)",
  MPH: "Miles per hour (mph)",
  MPS: "Metres per second (m/s)",
  KNOTS: "Knots (kn)",
};

const PRESSURE_LABEL: Record<PressureUnit, string> = {
  HPA: "Hectopascals (hPa)",
  INHG: "Inches of mercury (inHg)",
  KPA: "Kilopascals (kPa)",
  MMHG: "Millimetres of mercury (mmHg)",
};

const PRECIPITATION_LABEL: Record<PrecipitationUnit, string> = {
  MILLIMETERS: "Millimetres (mm)",
  INCHES: "Inches (in)",
};

const LENGTH_LABEL: Record<LengthUnit, string> = {
  CENTIMETERS: "Centimetres (cm)",
  METERS: "Metres (m)",
  INCHES: "Inches (in)",
  FEET: "Feet (ft)",
};

export function describeTemperatureUnit(unit: TemperatureUnit) {
  return TEMPERATURE_LABEL[unit];
}

export function describeWindSpeedUnit(unit: WindSpeedUnit) {
  return WIND_SPEED_LABEL[unit];
}

export function describePressureUnit(unit: PressureUnit) {
  return PRESSURE_LABEL[unit];
}

export function describePrecipitationUnit(unit: PrecipitationUnit) {
  return PRECIPITATION_LABEL[unit];
}

export function describeLengthUnit(unit: LengthUnit) {
  return LENGTH_LABEL[unit];
}

function createFormatter(maximumFractionDigits: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

export function convertTemperature(valueC: number, unit: TemperatureUnit) {
  if (!Number.isFinite(valueC)) return Number.NaN;
  if (unit === "FAHRENHEIT") {
    return valueC * (9 / 5) + 32;
  }
  return valueC;
}

export function formatTemperature(valueC: number, unit: TemperatureUnit, fallback = "—") {
  if (!Number.isFinite(valueC)) return fallback;
  const converted = convertTemperature(valueC, unit);
  const formatter = createFormatter(1);
  return `${formatter.format(converted)}${TEMPERATURE_SYMBOL[unit]}`;
}

export function convertWindSpeed(valueKph: number, unit: WindSpeedUnit) {
  if (!Number.isFinite(valueKph)) return Number.NaN;
  switch (unit) {
    case "MPH":
      return valueKph * 0.621371;
    case "MPS":
      return valueKph / 3.6;
    case "KNOTS":
      return valueKph / 1.852;
    default:
      return valueKph;
  }
}

export function formatWindSpeed(valueKph: number, unit: WindSpeedUnit, fallback = "—") {
  if (!Number.isFinite(valueKph)) return fallback;
  const converted = convertWindSpeed(valueKph, unit);
  const formatter = createFormatter(unit === "MPS" ? 2 : 1);
  return `${formatter.format(converted)} ${WIND_SPEED_SYMBOL[unit]}`;
}

export function convertPressure(valueHpa: number, unit: PressureUnit) {
  if (!Number.isFinite(valueHpa)) return Number.NaN;
  switch (unit) {
    case "INHG":
      return valueHpa * 0.029529983071445;
    case "KPA":
      return valueHpa / 10;
    case "MMHG":
      return valueHpa * 0.750061683;
    default:
      return valueHpa;
  }
}

export function formatPressure(valueHpa: number, unit: PressureUnit, fallback = "—") {
  if (!Number.isFinite(valueHpa)) return fallback;
  const converted = convertPressure(valueHpa, unit);
  const formatter = createFormatter(unit === "INHG" ? 2 : 1);
  return `${formatter.format(converted)} ${PRESSURE_SYMBOL[unit]}`;
}

export function convertPrecipitation(valueMm: number, unit: PrecipitationUnit) {
  if (!Number.isFinite(valueMm)) return Number.NaN;
  switch (unit) {
    case "INCHES":
      return valueMm / 25.4;
    default:
      return valueMm;
  }
}

export function formatPrecipitation(valueMm: number, unit: PrecipitationUnit, fallback = "—") {
  if (!Number.isFinite(valueMm)) return fallback;
  const converted = convertPrecipitation(valueMm, unit);
  const formatter = createFormatter(unit === "INCHES" ? 2 : 1);
  return `${formatter.format(converted)} ${PRECIPITATION_SYMBOL[unit]}`;
}

export function convertLengthFromCm(valueCm: number, unit: LengthUnit) {
  if (!Number.isFinite(valueCm)) return Number.NaN;
  switch (unit) {
    case "METERS":
      return valueCm / 100;
    case "INCHES":
      return valueCm / 2.54;
    case "FEET":
      return valueCm / 30.48;
    default:
      return valueCm;
  }
}

export function convertLengthToCm(value: number, unit: LengthUnit) {
  if (!Number.isFinite(value)) return Number.NaN;
  switch (unit) {
    case "METERS":
      return value * 100;
    case "INCHES":
      return value * 2.54;
    case "FEET":
      return value * 30.48;
    default:
      return value;
  }
}

export function formatLength(valueCm: number, unit: LengthUnit, fallback = "—") {
  if (!Number.isFinite(valueCm)) return fallback;
  const converted = convertLengthFromCm(valueCm, unit);
  const maximumFractionDigits = unit === "CENTIMETERS" ? 0 : unit === "METERS" ? 2 : 2;
  const formatter = createFormatter(maximumFractionDigits);
  return `${formatter.format(converted)} ${LENGTH_SYMBOL[unit]}`;
}

export function getLengthUnitSymbol(unit: LengthUnit) {
  return LENGTH_SYMBOL[unit];
}

export function getWindSpeedUnitSymbol(unit: WindSpeedUnit) {
  return WIND_SPEED_SYMBOL[unit];
}

export function getTemperatureSymbol(unit: TemperatureUnit) {
  return TEMPERATURE_SYMBOL[unit];
}

export function getPressureSymbol(unit: PressureUnit) {
  return PRESSURE_SYMBOL[unit];
}

export function getPrecipitationSymbol(unit: PrecipitationUnit) {
  return PRECIPITATION_SYMBOL[unit];
}

export function getLengthStep(unit: LengthUnit) {
  switch (unit) {
    case "CENTIMETERS":
      return 1;
    case "METERS":
      return 0.01;
    case "FEET":
      return 0.1;
    default:
      return 0.25;
  }
}
