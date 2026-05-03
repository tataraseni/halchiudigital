import { useQuery } from "@tanstack/react-query";

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  forecast: { day: string; high: number; low: number; condition: string }[];
}

export function useWeather() {
  const { data, isLoading, error } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    refetchInterval: 3600000, // Refetch every hour
    refetchOnWindowFocus: false,
  });

  return { weather: data, isLoading, error: error as Error | null };
}
