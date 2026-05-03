import { useState, useCallback } from "react";

export const WIDGET_IDS = [
  "daily_pulse",
  "progress",
  "daily_action",
  "success_stories",
  "feed",
] as const;

export type WidgetId = typeof WIDGET_IDS[number];

export const WIDGET_LABELS: Record<WidgetId, { label: string; desc: string }> = {
  daily_pulse:     { label: "Noutăți de azi",        desc: "Câte știri noi au apărut de la ultima vizită" },
  progress:        { label: "Statistici comunitate",  desc: "Sesizări rezolvate, participanți și postări" },
  daily_action:    { label: "Acțiunea zilei",          desc: "Evenimentul următor sau sugestie de acțiune" },
  success_stories: { label: "Schimbări recente",       desc: "Sesizări rezolvate recent de primărie" },
  feed:            { label: "Știri și anunțuri",       desc: "Postările și anunțurile oficiale" },
};

type WidgetPrefs = Record<WidgetId, boolean>;

const STORAGE_KEY = "halchiu_widget_prefs";

const DEFAULT_PREFS: WidgetPrefs = {
  daily_pulse:     true,
  progress:        true,
  daily_action:    true,
  success_stories: true,
  feed:            true,
};

function load(): WidgetPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<WidgetPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function save(prefs: WidgetPrefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

export function useWidgets() {
  const [prefs, setPrefs] = useState<WidgetPrefs>(load);

  const toggle = useCallback((id: WidgetId) => {
    setPrefs(prev => {
      const next = { ...prev, [id]: !prev[id] };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const d = { ...DEFAULT_PREFS };
    save(d);
    setPrefs(d);
  }, []);

  const show = (id: WidgetId) => prefs[id];
  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return { prefs, toggle, reset, show, enabledCount };
}
