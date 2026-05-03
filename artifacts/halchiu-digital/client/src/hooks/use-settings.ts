import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Settings = Record<string, string>;

// All default values — used when DB setting isn't loaded yet
export const DEFAULTS: Settings = {
  // Identitate
  app_name: "Hălchiu Digital",
  app_tagline: "Platforma digitală a comunei",
  app_county: "Brașov",
  app_logo_text: "HD",
  // Home
  home_hero_county: "Județul Brașov",
  home_hero_title: "Hălchiu Digital",
  home_hero_subtitle: "construit cu grijă pentru comunitate",
  home_feed_title: "Ultimele știri",
  // Primăria
  primaria_name: "Primăria Hălchiu",
  primaria_subtitle: "Sesizări, probleme și solicitări",
  primaria_address: "Str. Principală nr. 1, Hălchiu, BV",
  primaria_phone: "0266 XXX XXX",
  primaria_email: "primaria@halchiu.ro",
  primaria_schedule: "Luni–Joi 08:00–16:30, Vineri 08:00–14:00",
  // Evenimente
  events_title: "Evenimente",
  events_subtitle: "Ce se întâmplă în Hălchiu",
  // Comunitate
  community_title: "Comunitate",
  community_subtitle: "Discuții și anunțuri locale",
  // Afaceri
  businesses_title: "Afaceri locale",
  businesses_subtitle: "Firme și servicii din Hălchiu",
  // Navigație
  nav_home: "Acasă",
  nav_primaria: "Primăria",
  nav_events: "Evenimente",
  nav_community: "Comunitate",
  nav_businesses: "Afaceri",
  // Geolocație
  geo_radius_km: "15",
  geo_gate_title: "Verificare geolocație",
  geo_gate_description: "Această aplicație este destinată exclusiv comunității comunei Hălchiu, județul Brașov. Accesul este permis doar dacă te afli în zonă.",
  geo_outside_title: "Acces restricționat",
  geo_outside_message: "Aplicația este disponibilă exclusiv pentru cetățenii și vizitatorii comunei Hălchiu.",
  geo_denied_title: "Locație refuzată",
  geo_denied_message: "Accesul la locație este necesar pentru a folosi aplicația. Activează permisiunea în setările browserului, apoi încearcă din nou.",
};

async function fetchSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) return {};
  return res.json();
}

export function useSettings() {
  const { data } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: fetchSettings,
    staleTime: 0,
  });

  // Merge DB values over defaults
  const merged: Settings = { ...DEFAULTS, ...(data ?? {}) };

  // s(key) returns value with fallback
  const s = (key: string): string => merged[key] ?? DEFAULTS[key] ?? key;

  return { settings: merged, s };
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch(`/api/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error("Eroare la salvare");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/settings"] }),
  });
}
