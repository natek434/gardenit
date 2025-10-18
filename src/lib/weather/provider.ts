const OPEN_METEO_BASE_URL = process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com/v1/forecast";

export type ForecastDay = {
  date: string;
  temperatureC: number;
  rainChance: number;
};

export interface WeatherProvider {
  getForecast(lat: number, lon: number): Promise<ForecastDay[]>;
  getSoilTemp(lat: number, lon: number): Promise<number>;
  getFrostRisk(lat: number, lon: number, date: Date): Promise<"low" | "medium" | "high">;
}

type OpenMeteoDailyResponse = {
  daily?: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

type OpenMeteoHourlyResponse = {
  hourly?: {
    time: string[];
    soil_temperature_0cm?: number[];
  };
};

class OpenMeteoWeatherProvider implements WeatherProvider {
  async getForecast(lat: number, lon: number): Promise<ForecastDay[]> {
    const url = new URL(OPEN_METEO_BASE_URL);
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lon.toString());
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
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

    return times.map((time, index) => ({
      date: time,
      temperatureC: typeof highs[index] === "number" ? highs[index]! : Number.NaN,
      rainChance: typeof rain[index] === "number" ? Math.round(rain[index]!) : 0,
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
}

let provider: WeatherProvider = new OpenMeteoWeatherProvider();

export function setWeatherProvider(custom: WeatherProvider) {
  provider = custom;
}

export function getWeatherProvider(): WeatherProvider {
  return provider;
}
