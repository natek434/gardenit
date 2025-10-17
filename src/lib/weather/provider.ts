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

class MockWeatherProvider implements WeatherProvider {
  async getForecast(): Promise<ForecastDay[]> {
    const now = new Date();
    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() + index);
      return {
        date: day.toISOString(),
        temperatureC: 12 + Math.sin(index) * 5,
        rainChance: Math.round(40 + Math.cos(index) * 20),
      };
    });
  }

  async getSoilTemp(): Promise<number> {
    return 16;
  }

  async getFrostRisk(_: number, __: number, date: Date): Promise<"low" | "medium" | "high"> {
    const month = date.getUTCMonth() + 1;
    if ([6, 7, 8].includes(month)) {
      return "high";
    }
    if ([5, 9].includes(month)) {
      return "medium";
    }
    return "low";
  }
}

let provider: WeatherProvider = new MockWeatherProvider();

export function setWeatherProvider(custom: WeatherProvider) {
  provider = custom;
}

export function getWeatherProvider(): WeatherProvider {
  return provider;
}
