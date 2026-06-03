import { useSettings } from "@/hooks/use-settings";
import { TriangleAlert, Info, Megaphone, X } from "lucide-react";
import { useState } from "react";

export function SiteBanner() {
  const { settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  const active = settings["site_banner_active"] === "true";
  const text = settings["site_banner_text"] ?? "";
  const type = settings["site_banner_type"] ?? "info";

  if (!active || !text.trim() || dismissed) return null;

  const styles: Record<string, { bar: string; icon: React.ReactNode }> = {
    info:    { bar: "bg-primary text-white",   icon: <Info className="w-3.5 h-3.5 shrink-0" /> },
    warning: { bar: "bg-amber-500 text-white", icon: <TriangleAlert className="w-3.5 h-3.5 shrink-0" /> },
    urgent:  { bar: "bg-red-600 text-white",   icon: <Megaphone className="w-3.5 h-3.5 shrink-0" /> },
  };
  const { bar, icon } = styles[type] ?? styles.info;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] flex items-center gap-2 px-4 py-2 text-xs font-medium ${bar}`}
      data-testid="site-banner"
    >
      {icon}
      <span className="flex-1 text-center">{text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-80 hover:opacity-100 transition-opacity ml-1"
        aria-label="Închide banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
