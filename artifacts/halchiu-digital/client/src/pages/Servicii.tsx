import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Search, Phone, MapPin, Clock, CheckCircle2, XCircle,
  Stethoscope, Building2, GraduationCap, Zap, Mail,
  ChevronDown, ChevronUp, Navigation, Calendar,
  Bus, Train, Car, Info, ArrowRight, Siren, HeartPulse, ShieldCheck, Flame,
} from "lucide-react";
import type { Service } from "@shared/schema";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@shared/schema";

// ── Tab bar ──────────────────────────────────────────────────────────────────
type Tab = "servicii" | "transport";

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 mb-5 bg-muted/50 rounded-xl p-1">
      {([
        { id: "servicii" as Tab, label: "Servicii", icon: Building2 },
        { id: "transport" as Tab, label: "Transport", icon: Bus },
      ]).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${active === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          data-testid={`tab-${id}`}
        >
          <Icon className="w-3.5 h-3.5" />{label}
        </button>
      ))}
    </div>
  );
}

// ── Category config ───────────────────────────────────────────────────────────
const CAT_CONFIG: Record<ServiceCategory, { icon: typeof Stethoscope; color: string; bg: string; chipBg: string }> = {
  medical:      { icon: Stethoscope, color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/30",    chipBg: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/40" },
  administratie:{ icon: Building2,   color: "text-primary",    bg: "bg-primary/5",                    chipBg: "bg-primary/10 text-primary border-primary/20" },
  educatie:     { icon: GraduationCap,color:"text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30",  chipBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/40" },
  utilitati:    { icon: Zap,          color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30",chipBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40" },
  posta:        { icon: Mail,         color: "text-purple-600",bg: "bg-purple-50 dark:bg-purple-950/30",chipBg:"bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/40" },
};

// ── Schedule parser ──────────────────────────────────────────────────────────
type ScheduleData = { lv?: string; s?: string; d?: string; };

function parseSchedule(raw: string | null | undefined): ScheduleData {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function isOpenNow(schedule: ScheduleData): boolean | null {
  if (!schedule.lv && !schedule.s && !schedule.d) return null;
  const now = new Date();
  const day = now.getDay();
  const hhmm = now.getHours() * 60 + now.getMinutes();
  let slot: string | undefined;
  if (day >= 1 && day <= 5) slot = schedule.lv;
  else if (day === 6) slot = schedule.s;
  else slot = schedule.d;
  if (!slot || slot === "inchis") return false;
  const [from, to] = slot.split("-").map(t => {
    const [h, m] = t.trim().split(":").map(Number);
    return h * 60 + (m || 0);
  });
  return hhmm >= from && hhmm < to;
}

function ScheduleBadge({ schedule }: { schedule: ScheduleData }) {
  const open = isOpenNow(schedule);
  if (open === null) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${open ? "bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700 dark:text-green-400" : "bg-muted/50 border-border text-muted-foreground"}`}>
      {open ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {open ? "Deschis acum" : "Închis acum"}
    </span>
  );
}

function ScheduleDetails({ schedule }: { schedule: ScheduleData }) {
  const rows: { label: string; value: string }[] = [];
  if (schedule.lv) rows.push({ label: "Luni–Vineri", value: schedule.lv === "inchis" ? "Închis" : schedule.lv });
  if (schedule.s)  rows.push({ label: "Sâmbătă",     value: schedule.s  === "inchis" ? "Închis" : schedule.s });
  if (schedule.d)  rows.push({ label: "Duminică",    value: schedule.d  === "inchis" ? "Închis" : schedule.d });
  if (rows.length === 0) return null;
  return (
    <div className="mt-2 space-y-0.5">
      {rows.map(r => (
        <div key={r.label} className="flex justify-between text-xs">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="font-medium">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function ServiceMap({ svc }: { svc: Service }) {
  if (svc.lat && svc.lng) {
    const delta = 0.006;
    const bbox = `${svc.lng - delta},${svc.lat - delta},${svc.lng + delta},${svc.lat + delta}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${svc.lat},${svc.lng}`;
    const gmaps = `https://maps.google.com/?q=${svc.lat},${svc.lng}`;
    return (
      <div className="relative mt-3 rounded-xl overflow-hidden border border-border/60" style={{ height: 148 }}>
        <iframe src={src} className="w-full h-full" loading="lazy" title={`Hartă ${svc.name}`} data-testid={`map-${svc.id}`} />
        <a href={gmaps} target="_blank" rel="noopener noreferrer"
          className="absolute bottom-2 right-2 flex items-center gap-1 bg-white dark:bg-card text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-md border border-border hover:bg-primary hover:text-white hover:border-primary transition-colors"
          data-testid={`button-navigate-${svc.id}`}>
          <Navigation className="w-3 h-3" />Navighează
        </a>
      </div>
    );
  }
  if (svc.address) {
    const osmSearch = `https://www.openstreetmap.org/search?query=${encodeURIComponent(svc.address + ", Hălchiu, Romania")}`;
    return (
      <div className="mt-3 rounded-xl overflow-hidden border border-border/60 bg-muted/40">
        <a href={osmSearch} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/70 transition-colors"
          data-testid={`map-link-${svc.id}`}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{svc.address}</p>
            <p className="text-[10px] text-muted-foreground">Deschide pe hartă →</p>
          </div>
        </a>
      </div>
    );
  }
  return null;
}

function ServiceCard({ svc }: { svc: Service }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const cat = (svc.category as ServiceCategory) ?? "administratie";
  const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG.administratie;
  const Icon = cfg.icon;
  const schedule = parseSchedule(svc.schedule);
  const hasSchedule = Object.keys(schedule).length > 0;
  const hasAddress = !!(svc.address || (svc.lat && svc.lng));

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid={`service-${svc.id}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-display font-bold text-sm leading-tight">{svc.name}</h3>
              <ScheduleBadge schedule={schedule} />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.chipBg}`}>
                {SERVICE_CATEGORY_LABELS[cat]}
              </span>
              {svc.phone && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Phone className="w-3 h-3 shrink-0" />{svc.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          {svc.phone && (
            <a href={`tel:${svc.phone}`} className="flex-1">
              <Button size="sm" className="w-full h-8 gap-1.5 text-xs" data-testid={`button-call-${svc.id}`}>
                <Phone className="w-3.5 h-3.5" />Sună
              </Button>
            </a>
          )}
          {hasSchedule && (
            <button
              onClick={() => setShowSchedule(v => !v)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              data-testid={`button-schedule-${svc.id}`}
            >
              <Clock className="w-3.5 h-3.5" />
              {showSchedule ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Program
            </button>
          )}
          {!svc.phone && (
            <Button size="sm" variant="outline" className="flex-1 h-8 gap-1.5 text-xs opacity-50" disabled>
              <Calendar className="w-3.5 h-3.5" />Programare
            </Button>
          )}
        </div>

        {showSchedule && hasSchedule && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <div className="flex items-start gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <ScheduleDetails schedule={schedule} />
            </div>
          </div>
        )}

        {hasAddress && <ServiceMap svc={svc} />}
      </div>
    </div>
  );
}

// ── Transport tab ─────────────────────────────────────────────────────────────
interface DbTransportRoute {
  id: number;
  type: string;
  line: string;
  direction: string;
  operator: string;
  departures: string;
  departuresWeekend: string | null;
  notes: string | null;
  status: string;
}

const TRANSPORT_ICON_MAP: Record<string, typeof Bus> = {
  autobuz: Bus, tren: Train, taxi: Car, maxitaxi: Car, avion: Bus,
};
const TRANSPORT_COLOR_MAP: Record<string, string> = {
  autobuz: "text-blue-600", tren: "text-amber-600", taxi: "text-yellow-600", maxitaxi: "text-amber-500", avion: "text-sky-600",
};
const TRANSPORT_BG_MAP: Record<string, string> = {
  autobuz: "bg-blue-50 dark:bg-blue-950/30", tren: "bg-amber-50 dark:bg-amber-950/30",
  taxi: "bg-yellow-50 dark:bg-yellow-950/30", maxitaxi: "bg-amber-50 dark:bg-amber-950/30", avion: "bg-sky-50 dark:bg-sky-950/30",
};

function parseDepartures(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

function getNextDepartures(departures: string[], count = 3): string[] {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return departures.filter(d => { const [h, m] = d.split(":").map(Number); return h * 60 + m > nowMins; }).slice(0, count);
}

function isWeekend(): boolean {
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

function RouteCard({ route }: { route: DbTransportRoute }) {
  const [showAll, setShowAll] = useState(false);
  const [scheduleView, setScheduleView] = useState<"auto" | "weekday" | "weekend">("auto");

  const weekdayDeps = parseDepartures(route.departures);
  const weekendDeps = parseDepartures(route.departuresWeekend);
  const hasWeekend = weekendDeps.length > 0;

  const today = isWeekend();
  const effectiveView = scheduleView === "auto" ? (today ? "weekend" : "weekday") : scheduleView;
  const departures = (effectiveView === "weekend" && hasWeekend) ? weekendDeps : weekdayDeps;

  const nextDeps = getNextDepartures(departures);
  const Icon = TRANSPORT_ICON_MAP[route.type] ?? Bus;
  const color = TRANSPORT_COLOR_MAP[route.type] ?? "text-blue-600";
  const bg = TRANSPORT_BG_MAP[route.type] ?? "bg-blue-50 dark:bg-blue-950/30";

  return (
    <div className="bg-card border border-card-border rounded-xl p-4" data-testid={`route-${route.id}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center text-xs font-bold bg-primary text-white px-2.5 py-0.5 rounded-full">{route.line}</span>
            <span className="text-xs text-muted-foreground">{route.operator}</span>
          </div>
          <p className="text-sm font-semibold mt-1 flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />{route.direction}
          </p>
          {route.notes && <p className="text-xs text-muted-foreground mt-0.5">{route.notes}</p>}
        </div>
      </div>

      {/* Weekday / Weekend toggle — only shown when a weekend schedule exists */}
      {hasWeekend && (
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5 mb-3">
          {(["weekday", "weekend"] as const).map(v => (
            <button
              key={v}
              onClick={() => setScheduleView(prev => prev === v ? "auto" : v)}
              className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                effectiveView === v
                  ? v === "weekend"
                    ? "bg-violet-600 text-white"
                    : "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "weekday" ? "Luni – Vineri" : "Sâmbătă – Duminică"}
              {scheduleView === "auto" && ((v === "weekend" && today) || (v === "weekday" && !today)) && (
                <span className="ml-1 text-[9px] opacity-70">azi</span>
              )}
            </button>
          ))}
        </div>
      )}

      {departures.length > 0 ? (
        <>
          {nextDeps.length > 0 ? (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg p-2.5 mb-3">
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1.5">Plecări în curând</p>
              <div className="flex gap-2 flex-wrap">
                {nextDeps.map(d => (
                  <span key={d} className="inline-flex items-center gap-1 text-xs font-bold bg-green-600 text-white px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" />{d}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 border border-border rounded-lg p-2.5 mb-3">
              <p className="text-xs text-muted-foreground text-center">Nu mai sunt plecări azi. Primul mâine: {departures[0]}</p>
            </div>
          )}
          <button onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            data-testid={`button-all-departures-${route.id}`}>
            <Clock className="w-3.5 h-3.5" />
            {showAll ? "Ascunde toate orele" : `Toate plecările (${departures.length})`}
            {showAll ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {showAll && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {departures.map(d => {
                const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
                const [h, m] = d.split(":").map(Number);
                const isPast = h * 60 + m <= nowMins;
                return (
                  <span key={d} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${isPast ? "text-muted-foreground/50 border-border/50 bg-muted/30" : "text-foreground border-border bg-muted/40"}`}>{d}</span>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Contact direct pentru orar.</p>
      )}
    </div>
  );
}

function TransportTab() {
  const { data: routes = [], isLoading } = useQuery<DbTransportRoute[]>({ queryKey: ["/api/transport"] });

  const busRoutes = routes.filter(r => r.type === "autobuz" && r.status === "activ");
  const trainRoutes = routes.filter(r => r.type === "tren" && r.status === "activ");
  const taxiRoutes = routes.filter(r => r.type === "taxi" && r.status === "activ");
  const otherRoutes = routes.filter(r => !["autobuz","tren","taxi"].includes(r.type) && r.status === "activ");

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Transport public Hălchiu – Brașov</p>
          <p className="text-xs text-muted-foreground mt-0.5">Orare orientative. Verificați modificările la operator sau la stație.</p>
        </div>
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted/40 rounded-xl animate-pulse" />)}</div>}

      {trainRoutes.length > 0 && trainRoutes.map(r => <RouteCard key={r.id} route={r} />)}

      {trainRoutes.length === 0 && !isLoading && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
              <Train className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <span className="inline-flex items-center text-xs font-bold bg-amber-600 text-white px-2.5 py-0.5 rounded-full mb-1">CFR Călători</span>
              <p className="text-sm font-semibold">Hălchiu → Brașov (tren)</p>
              <p className="text-xs text-muted-foreground mt-1">Stația CFR Hălchiu se află la ~2 km de centrul comunei.</p>
              <a href="https://www.cfrcalatori.ro" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline font-medium">
                <ArrowRight className="w-3 h-3" />Caută tren pe CFR Călători
              </a>
            </div>
          </div>
        </div>
      )}

      {busRoutes.map(r => <RouteCard key={r.id} route={r} />)}
      {otherRoutes.map(r => <RouteCard key={r.id} route={r} />)}

      {taxiRoutes.length > 0 ? taxiRoutes.map(r => <RouteCard key={r.id} route={r} />) : (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold mb-1">Taxi local</p>
              <a href="tel:0266000000" className="flex items-center gap-2 text-xs text-primary hover:underline">
                <Phone className="w-3 h-3 shrink-0" />Taxi Hălchiu: 0266 XXX XXX
              </a>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center px-4">
        * Orare orientative. Pot exista modificări în funcție de sezon, sărbători legale sau lucrări rutiere.
      </p>
    </div>
  );
}

// ── Servicii Page ─────────────────────────────────────────────────────────────
export default function Servicii() {
  const [tab, setTab] = useState<Tab>("servicii");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "toate">("toate");

  const { data: allServices = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const filtered = useMemo(() => {
    return allServices.filter(s => {
      const matchCat = activeCategory === "toate" || s.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allServices, activeCategory, search]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of allServices) counts[s.category] = (counts[s.category] ?? 0) + 1;
    return counts;
  }, [allServices]);

  const openCount = useMemo(() => {
    return allServices.filter(s => {
      const schedule = parseSchedule(s.schedule);
      return isOpenNow(schedule) === true;
    }).length;
  }, [allServices]);

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
      <div className="mb-5">
        <h1 className="font-display font-bold text-2xl leading-tight">
          {tab === "transport" ? "Transport public" : "Servicii publice"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {tab === "servicii" ? (
            <>
              {allServices.length} servicii locale
              {openCount > 0 && <span className="text-green-600 font-medium"> · {openCount} deschise acum</span>}
            </>
          ) : "Autobuze, tren și taxi din Hălchiu"}
        </p>
      </div>

      <TabBar active={tab} onChange={(t) => { setTab(t); setSearch(""); setActiveCategory("toate"); }} />

      {tab === "servicii" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Caută serviciu, adresă..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
              data-testid="input-search-servicii"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-5">
            <button
              onClick={() => setActiveCategory("toate")}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeCategory === "toate" ? "bg-primary text-white border-primary" : "bg-card border-card-border text-muted-foreground hover:border-primary/30"}`}
              data-testid="chip-toate"
            >
              Toate ({allServices.length})
            </button>
            {SERVICE_CATEGORIES.map(cat => {
              const cfg = CAT_CONFIG[cat];
              const Icon = cfg.icon;
              const count = countByCategory[cat] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeCategory === cat ? "bg-primary text-white border-primary" : "bg-card border-card-border text-muted-foreground hover:border-primary/30"}`}
                  data-testid={`chip-${cat}`}
                >
                  <Icon className="w-3 h-3" />
                  {SERVICE_CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                {search ? `Niciun serviciu găsit pentru „${search}"` : "Niciun serviciu în această categorie"}
              </p>
              {search && <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline mt-2">Șterge căutarea</button>}
            </div>
          ) : (
            <div className="space-y-3">{filtered.map(s => <ServiceCard key={s.id} svc={s} />)}</div>
          )}

          {/* ── URGENȚE 112 ── */}
          <div className="mt-6 rounded-2xl overflow-hidden border-2 border-red-300 dark:border-red-700 shadow-sm">
            {/* Header */}
            <div className="bg-red-600 px-4 py-3 flex items-center gap-3">
              <Siren className="w-5 h-5 text-white shrink-0" />
              <div>
                <p className="text-white font-bold text-sm">Urgențe — Sună 112</p>
                <p className="text-red-100 text-xs">Ambulanță · Poliție · Pompieri · SMURD</p>
              </div>
              <a
                href="tel:112"
                className="ml-auto inline-flex items-center gap-1.5 bg-white text-red-700 font-bold text-sm px-3.5 py-1.5 rounded-full shadow hover:bg-red-50 transition-colors active:scale-95"
                data-testid="button-call-112"
              >
                <Phone className="w-4 h-4" />112
              </a>
            </div>
            {/* Service cards */}
            <div className="bg-red-50 dark:bg-red-950/20 grid grid-cols-2 divide-x divide-y divide-red-200 dark:divide-red-800/40">
              {[
                { icon: HeartPulse, label: "Ambulanță",  desc: "SMURD Brașov",   nr: "112", color: "text-red-600" },
                { icon: ShieldCheck, label: "Poliție",   desc: "IPJ Brașov",    nr: "112", color: "text-blue-700" },
                { icon: Flame,       label: "Pompieri",  desc: "ISU Brașov",    nr: "112", color: "text-orange-600" },
                { icon: HeartPulse,  label: "SMURD",     desc: "Intervenție rapidă", nr: "112", color: "text-red-600" },
              ].map(({ icon: Icon, label, desc, nr, color }) => (
                <a
                  key={label}
                  href={`tel:${nr}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-100/60 dark:hover:bg-red-900/20 transition-colors active:scale-95"
                  data-testid={`button-emergency-${label.toLowerCase()}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-card border border-red-200 dark:border-red-800 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon className={`w-4.5 h-4.5 ${color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">{label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 px-4 py-2 border-t border-red-200 dark:border-red-800/40">
              <p className="text-[10px] text-red-600 dark:text-red-400 text-center font-medium">
                Numărul unic de urgență <strong>112</strong> este disponibil 24/7 — gratuit din orice rețea
              </p>
            </div>
          </div>
        </>
      )}

      {tab === "transport" && <TransportTab />}
    </div>
  );
}
