import { useWeather } from "@/hooks/use-weather";
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from "lucide-react";

const WEATHER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Însorit": Sun,
  "Parțial noros": Cloud,
  "Ploaie ușoară": CloudRain,
  "Ploaie": CloudRain,
};

export function WeatherWidget() {
  const { weather, isLoading } = useWeather();

  if (isLoading || !weather) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">Se încarc meteo...</p>
      </div>
    );
  }

  const Icon = WEATHER_ICONS[weather.condition] || Sun;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{Math.round(weather.temperature)}°</p>
          <p className="text-xs text-blue-700 dark:text-blue-300">{weather.condition}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-white/40 dark:bg-black/20 rounded-lg p-2">
          <Droplets className="w-3 h-3 mx-auto mb-0.5 text-blue-600 dark:text-blue-400" />
          <p className="font-semibold text-blue-900 dark:text-blue-200">{weather.humidity}%</p>
          <p className="text-blue-700 dark:text-blue-400">Umiditate</p>
        </div>
        <div className="bg-white/40 dark:bg-black/20 rounded-lg p-2">
          <Wind className="w-3 h-3 mx-auto mb-0.5 text-blue-600 dark:text-blue-400" />
          <p className="font-semibold text-blue-900 dark:text-blue-200">{Math.round(weather.windSpeed)} km/h</p>
          <p className="text-blue-700 dark:text-blue-400">Vânt</p>
        </div>
        <div className="bg-white/40 dark:bg-black/20 rounded-lg p-2">
          <Eye className="w-3 h-3 mx-auto mb-0.5 text-blue-600 dark:text-blue-400" />
          <p className="font-semibold text-blue-900 dark:text-blue-200">{Math.round(weather.feelsLike)}°</p>
          <p className="text-blue-700 dark:text-blue-400">Se simte ca</p>
        </div>
      </div>

      {weather.forecast && weather.forecast.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-blue-200 dark:border-blue-800/40">
          <p className="text-[10px] font-semibold text-blue-900 dark:text-blue-200">Previziune</p>
          <div className="space-y-1">
            {weather.forecast.map((day, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
                <span>{day.day}</span>
                <span>{day.condition}</span>
                <span className="font-semibold">{day.high}° / {day.low}°</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
