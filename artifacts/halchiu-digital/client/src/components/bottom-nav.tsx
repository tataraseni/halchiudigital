import { Link, useLocation } from "wouter";
import { Home, Building2, CalendarDays, Users, ShoppingBag, Landmark, Heart } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

export function BottomNav() {
  const [location] = useLocation();
  const { s } = useSettings();

  const items = [
    { href: "/",           label: s("nav_home"),        Icon: Home },
    { href: "/primaria",   label: s("nav_primaria"),     Icon: Building2 },
    { href: "/servicii",   label: "Servicii",            Icon: Landmark },
    { href: "/sanatate",   label: "Sănătate",            Icon: Heart },
    { href: "/evenimente", label: s("nav_events"),       Icon: CalendarDays },
    { href: "/comunitate", label: s("nav_community"),    Icon: Users },
    { href: "/afaceri",    label: s("nav_businesses"),   Icon: ShoppingBag },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-border/60 safe-area-pb" data-testid="bottom-nav">
      <div className="flex items-stretch h-16 max-w-lg mx-auto overflow-x-auto scrollbar-none" data-testid="bottom-nav-items">
        {items.map(({ href, label, Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-none flex flex-col items-center justify-center gap-0.5 transition-colors no-underline relative ${items.length > 7 ? "min-w-[60px]" : "w-[14.28%] min-w-[52px]"}`}
              data-testid={`nav-${href.replace("/", "") || "home"}`}
            >
              <Icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium transition-colors leading-tight text-center ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              {active && <span className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
