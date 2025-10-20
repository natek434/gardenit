const OPEN_METEO_BASE_URL = process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com/v1/forecast";

export type ForecastDay = {
  date: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  rainChance: number;
  windSpeedMaxKph: number;
  windGustMaxKph: number;
  windDirectionDominantDeg: number;
  precipitationMm: number;
};

export type CurrentConditions = {
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  pressureHpa: number;
  windSpeedKph: number;
  windGustKph: number;
  windDirectionDeg: number;
};

export interface WeatherProvider {
  getForecast(lat: number, lon: number): Promise<ForecastDay[]>;
  getSoilTemp(lat: number, lon: number): Promise<number>;
  getFrostRisk(lat: number, lon: number, date: Date): Promise<"low" | "medium" | "high">;
  getCurrentConditions(lat: number, lon: number): Promise<CurrentConditions>;
}

type OpenMeteoDailyResponse = {
  daily?: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
    wind_direction_10m_dominant?: number[];
    precipitation_sum?: number[];
  };
};

type OpenMeteoHourlyResponse = {
  hourly?: {
    time: string[];
    soil_temperature_0cm?: number[];
  };
};

type OpenMeteoCurrentResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    pressure_msl?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    wind_direction_10m?: number;
  };
};

class OpenMeteoWeatherProvider implements WeatherProvider {
  async getForecast(lat: number, lon: number): Promise<ForecastDay[]> {
    const url = new URL(OPEN_METEO_BASE_URL);
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lon.toString());
    url.searchParams.set(
      "daily",
      [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "wind_direction_10m_dominant",
        "precipitation_sum",
      ].join(","),
    );
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url.toString(), { next: { revalidate: 60 * 60 } });
    if (!response.ok) {
      throw new Error(`Failed to fetch weather forecast: ${response.status}`);
    }
    const data = (await response.json()) as OpenMeteoDailyResponse;
    const times = data.daily?.time ?? [];
    const highs = data.daily?.temperature_2m_max ?? [];
    const rain = data.daily?.precipitation_probability_max ?? [];
    const lows = data.daily?.temperature_2m_min ?? [];
    const wind = data.daily?.wind_speed_10m_max ?? [];
    const gusts = data.daily?.wind_gusts_10m_max ?? [];
    const dominant = data.daily?.wind_direction_10m_dominant ?? [];
    const precipitation = data.daily?.precipitation_sum ?? [];

    return times.map((time, index) => ({
      date: time,
      temperatureMaxC: typeof highs[index] === "number" ? highs[index]! : Number.NaN,
      temperatureMinC: typeof lows[index] === "number" ? lows[index]! : Number.NaN,
      rainChance: typeof rain[index] === "number" ? Math.round(rain[index]!) : 0,
      windSpeedMaxKph: typeof wind[index] === "number" ? wind[index]! : Number.NaN,
      windGustMaxKph: typeof gusts[index] === "number" ? gusts[index]! : Number.NaN,
      windDirectionDominantDeg:
        typeof dominant[index] === "number" ? dominant[index]! : Number.NaN,
      precipitationMm: typeof precipitation[index] === "number" ? precipitation[index]! : Number.NaN,
    }));
  }

  async getSoilTemp(lat: number, lon: number): Promise<number> {
    const url = new URL(OPEN_METEO_BASE_URL);
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lon.toString());
    url.searchParams.set("hourly", "soil_temperature_0cm");
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("timezone", "UTC");

    const response = await fetch(url.toString(), { next: { revalidate: 60 * 60 } });
    if (!response.ok) {
      throw new Error(`Failed to fetch soil temperature: ${response.status}`);
    }
    const data = (await response.json()) as OpenMeteoHourlyResponse;
    const temps = data.hourly?.soil_temperature_0cm ?? [];
    if (!temps.length) {
      return Number.NaN;
    }
    const latest = temps[temps.length - 1];
    return typeof latest === "number" ? latest : Number.NaN;
  }

  async getFrostRisk(lat: number, lon: number, date: Date): Promise<"low" | "medium" | "high"> {
    const target = date.toISOString().slice(0, 10);
    const url = new URL(OPEN_METEO_BASE_URL);
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lon.toString());
    url.searchParams.set("daily", "temperature_2m_min");
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("start_date", target);
    url.searchParams.set("end_date", target);

    const response = await fetch(url.toString(), { next: { revalidate: 60 * 30 } });
    if (!response.ok) {
      throw new Error(`Failed to fetch frost risk: ${response.status}`);
    }
    const data = (await response.json()) as OpenMeteoDailyResponse;
    const minTemp = data.daily?.temperature_2m_min?.[0];
    if (typeof minTemp !== "number") {
      return "low";
    }
    if (minTemp <= 0) {
      return "high";
    }
    if (minTemp <= 3) {
      return "medium";
    }
    return "low";
  }

  async getCurrentConditions(lat: number, lon: number): Promise<CurrentConditions> {
    const url = new URL(OPEN_METEO_BASE_URL);
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lon.toString());
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m",
    );
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url.toString(), { next: { revalidate: 60 * 15 } });
    if (!response.ok) {
      throw new Error(`Failed to fetch current conditions: ${response.status}`);
    }
    const data = (await response.json()) as OpenMeteoCurrentResponse;
    const current = data.current ?? {};

    return {
      temperatureC: normalise(current.temperature_2m),
      apparentTemperatureC: normalise(current.apparent_temperature),
      humidityPercent: normalise(current.relative_humidity_2m),
      pressureHpa: normalise(current.pressure_msl),
      windSpeedKph: normalise(current.wind_speed_10m),
      windGustKph: normalise(current.wind_gusts_10m),
      windDirectionDeg: normalise(current.wind_direction_10m),
    };
  }
}

let provider: WeatherProvider = new OpenMeteoWeatherProvider();

export function setWeatherProvider(custom: WeatherProvider) {
  provider = custom;
}

export function getWeatherProvider(): WeatherProvider {
  return provider;
}

function normalise(value: number | undefined): number {
  return typeof value === "number" ? value : Number.NaN;
}
