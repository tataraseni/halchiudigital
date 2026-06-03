import { useState, useEffect } from "react";
import { useAuth, canManagePosts, canManageEvents, canManageReports, canManageBusinesses, canManageUsers, canDeleteReports, canApproveReports, ROLE_LABELS as ROLE_LABELS_MAP, ROLE_COLORS, ROLE_PERMISSIONS } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettings, useUpdateSetting, DEFAULTS } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogOut, Users, FileText, CalendarDays, AlertCircle, ShoppingBag,
  Pencil, Trash2, Plus, X, Check, Shield, ChevronLeft, Settings2,
  BarChart3, TrendingUp, Clock, CheckCircle2, MapPin, Activity, Target, RefreshCw,
  ShieldCheck, ShieldX, BadgeCheck, ThumbsUp, ThumbsDown, Eye, EyeOff,
  Stethoscope, Bell, Wrench, Briefcase, Megaphone, Building2, Send, BellRing, ExternalLink,
  Bus, Train, Car, Snowflake, TriangleAlert, RotateCcw, KeyRound, UserCog
} from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { ro } from "date-fns/locale";
import { ROLE_LABELS, ROLES, PERMISSION_SECTIONS, PERMISSION_SECTION_LABELS } from "@shared/schema";
import type { Role, UserPermission } from "@shared/schema";
import type { Post, Event, Report, Business, MarketplaceItem, Announcement, JobListing } from "@/hooks/use-halchiu";
import type { HealthCampaign, HealthAlert, DoctorProfile, AppointmentRequest, SocialProgram, Service } from "@shared/schema";
import { Link } from "wouter";
import { useUserPermissions, useSetPermission } from "@/hooks/use-permissions";

// ─── helpers ────────────────────────────────────────────────────────────────
async function api(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
  return res.json();
}

function useAdminData<T>(key: string) {
  return useQuery<T[]>({ queryKey: [key], queryFn: () => api("GET", key) });
}

function DeleteBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onClick} disabled={disabled}>
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

const STATUS_CLASSES: Record<string, string> = {
  in_asteptare: "bg-amber-100 text-amber-700 border-amber-200",
  in_lucru: "bg-blue-100 text-blue-700 border-blue-200",
  rezolvat: "bg-green-100 text-green-700 border-green-200",
  respins: "bg-red-100 text-red-700 border-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  in_asteptare: "În așteptare", in_lucru: "În lucru", rezolvat: "Rezolvat", respins: "Respins",
};

const POST_STATUS_CLASSES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};
const POST_STATUS_LABELS: Record<string, string> = {
  pending: "În așteptare", approved: "Aprobat", rejected: "Respins",
};

// ─── INLINE EDIT FIELD ───────────────────────────────────────────────────────
function EditableRow({
  label, value, onSave, textarea, type,
}: { label: string; value: string; onSave: (v: string) => void; textarea?: boolean; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (!editing)
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
        <span className="text-sm flex-1 truncate">{value || "—"}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setEditing(true)}><Pencil className="w-3 h-3" /></Button>
      </div>
    );
  return (
    <div className="py-1">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {textarea
        ? <Textarea value={val} onChange={e => setVal(e.target.value)} className="text-sm min-h-[80px] resize-none mb-2" />
        : <Input value={val} onChange={e => setVal(e.target.value)} type={type} className="text-sm mb-2 h-8" />
      }
      <div className="flex gap-1">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { onSave(val); setEditing(false); }}><Check className="w-3 h-3" />Salvează</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setVal(value); setEditing(false); }}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

// ─── TABS ────────────────────────────────────────────────────────────────────
type Tab = "dashboard" | "posts" | "events" | "reports" | "businesses" | "users" | "settings" | "roles" | "servicii" | "sanatate" | "comunicate" | "notificari" | "permisiuni";

const TABS: { id: Tab; label: string; icon: typeof FileText; roles: string[]; color: string; bgLight: string; bgDark: string }[] = [
  { id: "dashboard",   label: "Dashboard",   icon: BarChart3,   roles: ["administrator","primar","viceprimar","functionar_public"], color: "text-blue-600", bgLight: "bg-blue-50 border-blue-200", bgDark: "dark:bg-blue-950/30 dark:border-blue-800" },
  { id: "posts",       label: "Postări",      icon: FileText,    roles: ["administrator","primar","viceprimar","moderator"], color: "text-purple-600", bgLight: "bg-purple-50 border-purple-200", bgDark: "dark:bg-purple-950/30 dark:border-purple-800" },
  { id: "events",      label: "Evenimente", icon: CalendarDays,roles: ["administrator","primar","viceprimar"], color: "text-pink-600", bgLight: "bg-pink-50 border-pink-200", bgDark: "dark:bg-pink-950/30 dark:border-pink-800" },
  { id: "reports",     label: "Sesizări",     icon: AlertCircle, roles: ["administrator","primar","viceprimar","functionar_public"], color: "text-red-600", bgLight: "bg-red-50 border-red-200", bgDark: "dark:bg-red-950/30 dark:border-red-800" },
  { id: "businesses",  label: "Afaceri",      icon: ShoppingBag, roles: ["administrator","primar","viceprimar"], color: "text-amber-600", bgLight: "bg-amber-50 border-amber-200", bgDark: "dark:bg-amber-950/30 dark:border-amber-800" },
  { id: "servicii",    label: "Servicii",     icon: Building2,   roles: ["administrator","primar","viceprimar","functionar_public"], color: "text-green-600", bgLight: "bg-green-50 border-green-200", bgDark: "dark:bg-green-950/30 dark:border-green-800" },
  { id: "sanatate",    label: "Sănătate",     icon: Stethoscope, roles: ["administrator","primar","viceprimar","functionar_public"], color: "text-emerald-600", bgLight: "bg-emerald-50 border-emerald-200", bgDark: "dark:bg-emerald-950/30 dark:border-emerald-800" },
  { id: "comunicate",  label: "Comunitate",   icon: Megaphone,   roles: ["administrator","primar","viceprimar","moderator"], color: "text-cyan-600", bgLight: "bg-cyan-50 border-cyan-200", bgDark: "dark:bg-cyan-950/30 dark:border-cyan-800" },
  { id: "notificari",  label: "Notificări",   icon: BellRing,    roles: ["administrator","primar","viceprimar"], color: "text-indigo-600", bgLight: "bg-indigo-50 border-indigo-200", bgDark: "dark:bg-indigo-950/30 dark:border-indigo-800" },
  { id: "users",       label: "Utilizatori",  icon: Users,       roles: ["administrator"], color: "text-slate-600", bgLight: "bg-slate-50 border-slate-200", bgDark: "dark:bg-slate-950/30 dark:border-slate-800" },
  { id: "roles",       label: "Roluri",       icon: Shield,      roles: ["administrator"], color: "text-zinc-600", bgLight: "bg-zinc-50 border-zinc-200", bgDark: "dark:bg-zinc-950/30 dark:border-zinc-800" },
  { id: "permisiuni",  label: "Permisiuni",   icon: ShieldCheck, roles: ["administrator"], color: "text-teal-600", bgLight: "bg-teal-50 border-teal-200", bgDark: "dark:bg-teal-950/30 dark:border-teal-800" },
  { id: "settings",    label: "Setări",       icon: Settings2,   roles: ["administrator"], color: "text-gray-600", bgLight: "bg-gray-50 border-gray-200", bgDark: "dark:bg-gray-950/30 dark:border-gray-800" },
];

// ─── DASHBOARD TAB ───────────────────────────────────────────────────────────
interface AdminStats {
  reports: {
    total: number;
    by_status: { in_asteptare: number; in_lucru: number; rezolvat: number };
    by_category: { category: string; count: number }[];
    zone_critice: { location: string; count: number }[];
    resolution_rate: number;
    recent_unresolved: { id: number; title: string; category: string; status: string | null; createdAt: string; location: string | null }[];
  };
  posts: { total: number; this_week: number };
  events: { total: number; upcoming: number; total_participants: number };
  users: { total: number };
}

function KPICard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: typeof BarChart3; color: string }) {
  return (
    <div className={`bg-card border border-card-border rounded-xl p-4 flex flex-col gap-1`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold font-display leading-none">{value}</p>
      <p className="text-xs font-medium text-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatusBar({ byStatus, total }: { byStatus: { in_asteptare: number; in_lucru: number; rezolvat: number }; total: number }) {
  if (total === 0) return null;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distribuție status</p>
        <p className="text-xs text-muted-foreground">{total} total</p>
      </div>
      <div className="flex rounded-full overflow-hidden h-3 mb-2.5 gap-0.5">
        {byStatus.rezolvat > 0 && <div className="bg-green-500 transition-all" style={{ width: `${pct(byStatus.rezolvat)}%` }} title={`Rezolvat: ${byStatus.rezolvat}`} />}
        {byStatus.in_lucru > 0 && <div className="bg-blue-500 transition-all" style={{ width: `${pct(byStatus.in_lucru)}%` }} title={`În lucru: ${byStatus.in_lucru}`} />}
        {byStatus.in_asteptare > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${pct(byStatus.in_asteptare)}%` }} title={`În așteptare: ${byStatus.in_asteptare}`} />}
      </div>
      <div className="flex gap-4 flex-wrap">
        {[
          { label: "Rezolvat", count: byStatus.rezolvat, color: "bg-green-500" },
          { label: "În lucru", count: byStatus.in_lucru, color: "bg-blue-500" },
          { label: "În așteptare", count: byStatus.in_asteptare, color: "bg-amber-400" },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs text-muted-foreground">{label}: <span className="font-semibold text-foreground">{count}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: stats, isLoading, refetch, isFetching } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => api("GET", "/api/admin/stats"),
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );

  if (!stats) return null;

  const maxCat = Math.max(...stats.reports.by_category.map(c => c.count), 1);
  const maxZone = Math.max(...stats.reports.zone_critice.map(z => z.count), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">Panou de control</h2>
          <p className="text-xs text-muted-foreground">Date actualizate în timp real</p>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-stats">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard label="Total sesizări" value={stats.reports.total} sub={`${stats.reports.by_status.in_asteptare} în așteptare`} icon={AlertCircle} color="bg-amber-50 dark:bg-amber-950/30 text-amber-600" />
        <KPICard label="Rezolvate" value={stats.reports.by_status.rezolvat} sub={`${stats.reports.resolution_rate}% rată rezolvare`} icon={CheckCircle2} color="bg-green-50 dark:bg-green-950/30 text-green-600" />
        <KPICard label="În lucru" value={stats.reports.by_status.in_lucru} sub="procesate activ" icon={Activity} color="bg-blue-50 dark:bg-blue-950/30 text-blue-600" />
        <KPICard label="Utilizatori" value={stats.users.total} sub={`${stats.events.total_participants} participanți evenimente`} icon={Users} color="bg-primary/10 text-primary" />
      </div>

      {/* Status distribution */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <StatusBar byStatus={stats.reports.by_status} total={stats.reports.total} />
      </div>

      {/* Activitate generală */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activitate generală</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-primary">{stats.posts.this_week}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">postări<br />săptămâna asta</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600">{stats.events.upcoming}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">evenimente<br />viitoare</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{stats.events.total_participants}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">participanți<br />la evenimente</p>
          </div>
        </div>
      </div>

      {/* Sesizări urgente — oldest unresolved */}
      {stats.reports.recent_unresolved.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />Necesită atenție
          </p>
          <div className="space-y-2">
            {stats.reports.recent_unresolved.map(r => {
              const daysOpen = differenceInDays(new Date(), new Date(r.createdAt));
              const isUrgent = daysOpen >= 7;
              return (
                <div key={r.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${isUrgent ? "bg-destructive/5 border border-destructive/15" : "bg-muted/40"}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${r.status === "in_lucru" ? "bg-blue-500" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{r.category}</span>
                      {r.location && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{r.location}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[11px] font-semibold ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>{daysOpen === 0 ? "azi" : `${daysOpen}z`}</span>
                    <p className="text-[10px] text-muted-foreground">{STATUS_LABELS[r.status ?? "in_asteptare"]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorii breakdown */}
      {stats.reports.by_category.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />Sesizări pe categorii
          </p>
          <div className="space-y-2.5">
            {stats.reports.by_category.map(({ category, count }) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{category}</span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${Math.round((count / maxCat) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone critice */}
      {stats.reports.zone_critice.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-destructive" />Zone cu sesizări
          </p>
          <div className="space-y-2">
            {stats.reports.zone_critice.map(({ location, count }, idx) => (
              <div key={location} className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${idx === 0 ? "bg-destructive/15 text-destructive" : idx === 1 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium truncate">{location}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{count} {count === 1 ? "sesizare" : "sesizări"}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${idx === 0 ? "bg-destructive/60" : "bg-amber-400/70"}`} style={{ width: `${Math.round((count / maxZone) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transparență publică */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />Transparență automată
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Rata de rezolvare <span className="font-bold text-foreground">{stats.reports.resolution_rate}%</span> este vizibilă cetățenilor în timp real. 
          {stats.reports.resolution_rate >= 50
            ? " Performanță bună — continuă să actualizezi statusurile."
            : " Actualizează statusurile sesizărilor pentru a crește transparența."}
        </p>
      </div>
    </div>
  );
}

// ─── SETTINGS SCHEMA ─────────────────────────────────────────────────────────
const SETTINGS_GROUPS = [
  {
    group: "Identitate Aplicație",
    items: [
      { key: "app_name", label: "Denumire aplicație" },
      { key: "app_tagline", label: "Slogan" },
      { key: "app_county", label: "Județul" },
      { key: "app_logo_text", label: "Inițiale logo (max 2 caractere)" },
    ],
  },
  {
    group: "Pagina Principală",
    items: [
      { key: "home_hero_county", label: "Hero – supertitlu" },
      { key: "home_hero_title", label: "Hero – titlu principal" },
      { key: "home_hero_subtitle", label: "Hero – subtitlu" },
      { key: "home_feed_title", label: "Titlu secțiune știri" },
    ],
  },
  {
    group: "Primăria",
    items: [
      { key: "primaria_name", label: "Denumire primărie" },
      { key: "primaria_subtitle", label: "Subtitlu secțiune" },
      { key: "primaria_address", label: "Adresă" },
      { key: "primaria_phone", label: "Telefon" },
      { key: "primaria_email", label: "Email" },
      { key: "primaria_schedule", label: "Program ghișeu", textarea: true },
    ],
  },
  {
    group: "Titluri Secțiuni",
    items: [
      { key: "events_title", label: "Titlu Evenimente" },
      { key: "events_subtitle", label: "Subtitlu Evenimente" },
      { key: "community_title", label: "Titlu Comunitate" },
      { key: "community_subtitle", label: "Subtitlu Comunitate" },
      { key: "businesses_title", label: "Titlu Afaceri" },
      { key: "businesses_subtitle", label: "Subtitlu Afaceri" },
    ],
  },
  {
    group: "Navigație",
    items: [
      { key: "nav_home", label: "Etichetă Acasă" },
      { key: "nav_primaria", label: "Etichetă Primăria" },
      { key: "nav_events", label: "Etichetă Evenimente" },
      { key: "nav_community", label: "Etichetă Comunitate" },
      { key: "nav_businesses", label: "Etichetă Afaceri" },
    ],
  },
  {
    group: "Geolocație",
    items: [
      { key: "geo_radius_km", label: "Raza zonei (km)" },
      { key: "geo_gate_title", label: "Titlu ecran verificare" },
      { key: "geo_gate_description", label: "Descriere ecran verificare", textarea: true },
      { key: "geo_outside_title", label: "Titlu blocare acces" },
      { key: "geo_outside_message", label: "Mesaj blocare acces", textarea: true },
      { key: "geo_denied_title", label: "Titlu locație refuzată" },
      { key: "geo_denied_message", label: "Mesaj locație refuzată", textarea: true },
    ],
  },
];

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingRow({ settingKey, label, textarea }: { settingKey: string; label: string; textarea?: boolean }) {
  const { settings } = useSettings();
  const updateMutation = useUpdateSetting();
  const { toast } = useToast();
  const currentValue = settings[settingKey] ?? DEFAULTS[settingKey] ?? "";
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentValue);

  const handleSave = () => {
    updateMutation.mutate({ key: settingKey, value: val }, {
      onSuccess: () => { toast({ title: "Setare salvată" }); setEditing(false); },
      onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
    });
  };

  if (!editing) {
    return (
      <div className="flex items-start gap-2 py-2 border-b border-border/40 last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className="text-sm leading-relaxed break-words">{currentValue || <span className="text-muted-foreground italic">—</span>}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 mt-0.5" onClick={() => { setVal(currentValue); setEditing(true); }} data-testid={`edit-setting-${settingKey}`}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-border/40 last:border-0">
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      {textarea
        ? <Textarea value={val} onChange={e => setVal(e.target.value)} className="text-sm min-h-[80px] resize-none mb-2" data-testid={`textarea-setting-${settingKey}`} />
        : <Input value={val} onChange={e => setVal(e.target.value)} className="text-sm h-8 mb-2" data-testid={`input-setting-${settingKey}`} />
      }
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={updateMutation.isPending}>
          <Check className="w-3 h-3" />{updateMutation.isPending ? "Salvează..." : "Salvează"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setVal(currentValue); setEditing(false); }}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── SUPER ADMIN SETUP CARD ──────────────────────────────────────────────────
function SuperAdminSetupCard() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ configured: boolean; name?: string; email?: string }>({
    queryKey: ["/api/admin/super-admin/config"],
    queryFn: () => fetch("/api/admin/super-admin/config").then(r => r.json()),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/super-admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message);
      toast({ title: "Super Admin salvat", description: body.message });
      setPassword("");
      setEditing(false);
      refetch();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Eroare", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    setName(data?.name ?? "");
    setEmail(data?.email ?? "");
    setPassword("");
    setEditing(true);
  };

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <UserCog className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm">Cont Super Administrator</p>
          <p className="text-[11px] text-muted-foreground">Persistent la resetare. Autentificare cu email.</p>
        </div>
        {!isLoading && data?.configured && !editing && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={startEdit}>
            <Pencil className="w-3 h-3" />Modifică
          </Button>
        )}
      </div>
      <div className="px-4 py-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Se încarcă...</p>
        ) : !editing && data?.configured ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">Cont configurat</span>
            </div>
            <p className="text-sm font-medium mt-1">{data.name}</p>
            <p className="text-xs text-muted-foreground">{data.email}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Autentifică-te cu acest email și parola setată. Contul este păstrat la orice resetare a bazei de date.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {!data?.configured && (
              <p className="text-xs text-muted-foreground mb-1">
                Creează un cont personalizat de administrator care supraviețuiește resetărilor bazei de date.
              </p>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nume complet</label>
              <Input
                placeholder="ex. Ion Popescu"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Adresă de email</label>
              <Input
                type="email"
                placeholder="ex. admin@halchiu.ro"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Parolă {data?.configured ? "(lasă gol pentru a păstra parola actuală — sau introdu una nouă)" : "(minim 8 caractere)"}
              </label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-8 text-sm pr-9"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw(v => !v)}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleSave}
                disabled={saving || !name.trim() || !email.trim() || (!data?.configured && !password.trim())}
              >
                <KeyRound className="w-3 h-3" />
                {saving ? "Se salvează..." : data?.configured ? "Actualizează" : "Creează cont"}
              </Button>
              {editing && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
                  Anulează
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { settings } = useSettings();
  const updateMutation = useUpdateSetting();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "Identitate Aplicație": true });
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const toggle = (group: string) => setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));

  const demoMode = settings["demo_mode"] === "true";

  const toggleDemoMode = () => {
    const newVal = demoMode ? "false" : "true";
    updateMutation.mutate({ key: "demo_mode", value: newVal }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/settings"] });
        toast({ title: newVal === "true" ? "Modul demonstrativ activat" : "Modul demonstrativ dezactivat", description: newVal === "true" ? "Aplicația este acum read-only. Cetățenii nu pot posta." : "Aplicația este acum în modul normal." });
      },
    });
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-content", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).message);
      toast({ title: "Baza de date resetată", description: "Tot conținutul a fost șters. Contul tău a fost păstrat." });
      qc.invalidateQueries();
      setConfirmReset(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Eroare la resetare", description: e.message });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Modificările se aplică imediat în toată aplicația.</p>

      {/* Demo mode toggle */}
      <div className={`border rounded-xl p-4 flex items-center gap-3 ${demoMode ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/50" : "bg-card border-card-border"}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${demoMode ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
          <Snowflake className={`w-4.5 h-4.5 ${demoMode ? "text-amber-600" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{demoMode ? "Modul demonstrativ activ" : "Mod demonstrativ"}</p>
          <p className="text-xs text-muted-foreground">Înghețați aplicația în read-only. Nicio postare nouă nu va fi acceptată.</p>
        </div>
        <Button
          size="sm"
          variant={demoMode ? "default" : "outline"}
          className={`shrink-0 gap-1.5 ${demoMode ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600" : ""}`}
          onClick={toggleDemoMode}
          disabled={updateMutation.isPending}
        >
          {demoMode ? <><Snowflake className="w-3.5 h-3.5" />Dezactivează</> : <><Snowflake className="w-3.5 h-3.5" />Activează</>}
        </Button>
      </div>

      {SETTINGS_GROUPS.map(({ group, items }) => (
        <div key={group} className="bg-card border border-card-border rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            onClick={() => toggle(group)}
            data-testid={`settings-group-${group}`}
          >
            <span className="font-display font-semibold text-sm">{group}</span>
            <span className="text-muted-foreground text-xs">{openGroups[group] ? "▲" : "▼"}</span>
          </button>
          {openGroups[group] && (
            <div className="px-4 pb-3">
              {items.map(item => (
                <SettingRow key={item.key} settingKey={item.key} label={item.label} textarea={item.textarea} />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Super Admin personalizat */}
      <SuperAdminSetupCard />

      {/* Danger zone — DB reset */}
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TriangleAlert className="w-4 h-4 text-red-600 shrink-0" />
          <h3 className="font-display font-semibold text-sm text-red-800 dark:text-red-400">Resetare conținut bază de date</h3>
        </div>
        <p className="text-xs text-red-700 dark:text-red-400">
          Șterge tot conținutul: postări, sesizări, afaceri, evenimente, marketplace, joburi, servicii, transport, sănătate, chat și toți utilizatorii <strong>cu excepția contului super admin</strong>.
          Setările aplicației sunt păstrate. Această acțiune este <strong>ireversibilă</strong>.
        </p>
        {!confirmReset ? (
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="w-3.5 h-3.5" />Resetează conținutul
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-red-700 dark:text-red-400">Ești sigur? Această acțiune nu poate fi anulată!</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleReset} disabled={resetting}>
                <RotateCcw className="w-3.5 h-3.5" />{resetting ? "Se resetează..." : "Da, șterge tot"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>Anulează</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── POSTS TAB ───────────────────────────────────────────────────────────────
function PostsTab({ role }: { role: Role }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  // Admin panel sees ALL posts (all statuses)
  const { data: posts, isLoading } = useAdminData<Post>("/api/admin/posts");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [newPost, setNewPost] = useState({ type: "announcement", title: "", content: "", author: "", category: "" });

  const pendingCount = posts?.filter(p => p.status === "pending").length ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/posts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/posts"] }); qc.invalidateQueries({ queryKey: ["/api/posts"] }); toast({ title: "Postare ștearsă" }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Post> }) => api("PUT", `/api/posts/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/posts"] }); qc.invalidateQueries({ queryKey: ["/api/posts"] }); },
  });
  const createMutation = useMutation({
    mutationFn: (data: typeof newPost) => api("POST", "/api/posts", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/posts"] }); qc.invalidateQueries({ queryKey: ["/api/posts"] }); setCreating(false); setNewPost({ type: "announcement", title: "", content: "", author: "", category: "" }); toast({ title: "Postare creată și aprobată automat" }); },
  });

  const filtered = filter === "all" ? (posts ?? []) : (posts?.filter(p => p.status === filter) ?? []);

  return (
    <div className="space-y-3">
      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300 flex-1">
            <span className="font-bold">{pendingCount}</span> {pendingCount === 1 ? "postare necesită" : "postări necesită"} moderare
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700" onClick={() => setFilter("pending")}>
            Verifică
          </Button>
        </div>
      )}

      {/* Filter + New button */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all","pending","approved","rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:bg-muted"}`}>
            {f === "all" ? "Toate" : POST_STATUS_LABELS[f]}
            {f === "pending" && pendingCount > 0 && <span className="ml-1 font-bold text-amber-600">({pendingCount})</span>}
          </button>
        ))}
        {canManagePosts(role) && (
          <Button size="sm" className="gap-1.5 rounded-full ml-auto" onClick={() => setCreating(v => !v)}>
            {creating ? <><X className="w-3.5 h-3.5" />Anulează</> : <><Plus className="w-3.5 h-3.5" />Postare nouă</>}
          </Button>
        )}
      </div>

      {creating && (
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground">Postările create de oficiali sunt aprobate automat.</p>
          <select className="w-full text-sm border rounded-lg px-3 py-2 bg-background" value={newPost.type} onChange={e => setNewPost(p => ({ ...p, type: e.target.value }))}>
            <option value="announcement">Anunț oficial</option>
            <option value="alert">Alertă</option>
            <option value="community">Comunitate</option>
          </select>
          <Input placeholder="Titlu" value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} />
          <Input placeholder="Autor" value={newPost.author} onChange={e => setNewPost(p => ({ ...p, author: e.target.value }))} />
          <Input placeholder="Categorie" value={newPost.category} onChange={e => setNewPost(p => ({ ...p, category: e.target.value }))} />
          <Textarea placeholder="Conținut..." className="min-h-[80px] resize-none" value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} />
          <Button size="sm" className="w-full" onClick={() => createMutation.mutate(newPost)} disabled={createMutation.isPending}>Publică</Button>
        </div>
      )}

      {isLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}
      {filtered.map(post => (
        <div key={post.id} className={`bg-card border rounded-xl p-4 ${post.status === "pending" ? "border-amber-300 dark:border-amber-700" : "border-card-border"}`}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{post.type}</Badge>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${POST_STATUS_CLASSES[post.status ?? "approved"]}`}>
                {POST_STATUS_LABELS[post.status ?? "approved"]}
              </span>
            </div>
            <DeleteBtn onClick={() => deleteMutation.mutate(post.id)} disabled={deleteMutation.isPending} />
          </div>
          <EditableRow label="Titlu" value={post.title} onSave={v => updateMutation.mutate({ id: post.id, data: { title: v } })} />
          <EditableRow label="Autor" value={post.author} onSave={v => updateMutation.mutate({ id: post.id, data: { author: v } })} />
          <EditableRow label="Conținut" value={post.content} textarea onSave={v => updateMutation.mutate({ id: post.id, data: { content: v } })} />
          {/* Moderation actions for pending posts */}
          {post.status === "pending" && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
                onClick={() => updateMutation.mutate({ id: post.id, data: { status: "approved" } })} disabled={updateMutation.isPending}>
                <ThumbsUp className="w-3.5 h-3.5" />Aprobă
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-red-700 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => updateMutation.mutate({ id: post.id, data: { status: "rejected" } })} disabled={updateMutation.isPending}>
                <ThumbsDown className="w-3.5 h-3.5" />Respinge
              </Button>
            </div>
          )}
        </div>
      ))}
      {!isLoading && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          {filter === "pending" ? "Nu sunt postări în așteptare." : "Nu există postări."}
        </p>
      )}
    </div>
  );
}

// ─── EVENTS TAB ──────────────────────────────────────────────────────────────
function EventsTab({ role }: { role: Role }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  // Admin sees ALL events (all statuses)
  const { data: evts, isLoading } = useAdminData<Event>("/api/admin/events");
  const [creating, setCreating] = useState(false);
  const [newEvt, setNewEvt] = useState({ title: "", description: "", date: "", location: "", imageUrl: "" });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["/api/admin/events"] }); qc.invalidateQueries({ queryKey: ["/api/events"] }); };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/events/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Eveniment șters" }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Event> }) => api("PUT", `/api/events/${id}`, data),
    onSuccess: () => invalidate(),
  });
  const createMutation = useMutation({
    mutationFn: (data: typeof newEvt) => api("POST", "/api/events", { ...data, date: new Date(data.date) }),
    onSuccess: () => { invalidate(); setCreating(false); toast({ title: "Eveniment creat și aprobat automat" }); },
  });

  const pendingEvts = evts?.filter(e => e.status === "pending").length ?? 0;

  return (
    <div className="space-y-3">
      {pendingEvts > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">{pendingEvts} {pendingEvts === 1 ? "eveniment" : "evenimente"} necesit{pendingEvts === 1 ? "ă" : "ă"} aprobare</p>
        </div>
      )}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setCreating(v => !v)}>
          {creating ? <><X className="w-3.5 h-3.5" />Anulează</> : <><Plus className="w-3.5 h-3.5" />Eveniment nou</>}
        </Button>
      </div>
      {creating && (
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <Input placeholder="Titlu" value={newEvt.title} onChange={e => setNewEvt(p => ({ ...p, title: e.target.value }))} />
          <Input placeholder="Locație" value={newEvt.location} onChange={e => setNewEvt(p => ({ ...p, location: e.target.value }))} />
          <Input type="datetime-local" value={newEvt.date} onChange={e => setNewEvt(p => ({ ...p, date: e.target.value }))} />
          <Textarea placeholder="Descriere..." className="min-h-[80px] resize-none" value={newEvt.description} onChange={e => setNewEvt(p => ({ ...p, description: e.target.value }))} />
          <Input placeholder="URL imagine (opțional)" value={newEvt.imageUrl} onChange={e => setNewEvt(p => ({ ...p, imageUrl: e.target.value }))} />
          <Button size="sm" className="w-full" onClick={() => createMutation.mutate(newEvt)} disabled={createMutation.isPending}>Creează</Button>
        </div>
      )}
      {isLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}
      {evts?.map(evt => (
        <div key={evt.id} className={`bg-card border rounded-xl p-4 ${evt.status === "pending" ? "border-amber-300 dark:border-amber-700" : "border-card-border"}`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{new Date(evt.date).toLocaleDateString("ro-RO")}</span>
              {evt.status === "pending" && (
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">În așteptare</span>
              )}
              {evt.status === "approved" && (
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">Aprobat</span>
              )}
            </div>
            <DeleteBtn onClick={() => deleteMutation.mutate(evt.id)} />
          </div>
          <EditableRow label="Titlu" value={evt.title} onSave={v => updateMutation.mutate({ id: evt.id, data: { title: v } })} />
          <EditableRow label="Locație" value={evt.location} onSave={v => updateMutation.mutate({ id: evt.id, data: { location: v } })} />
          <EditableRow label="Descriere" value={evt.description} textarea onSave={v => updateMutation.mutate({ id: evt.id, data: { description: v } })} />
          {evt.status === "pending" && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
                onClick={() => api("POST", `/api/events/${evt.id}/approve`, {}).then(invalidate)} disabled={updateMutation.isPending}>
                <ThumbsUp className="w-3.5 h-3.5" />Aprobă
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => api("POST", `/api/events/${evt.id}/reject`, {}).then(invalidate)} disabled={updateMutation.isPending}>
                <ThumbsDown className="w-3.5 h-3.5" />Respinge
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── REPORTS TAB ─────────────────────────────────────────────────────────────
function ReportCard({ rep, canDelete, canApprove, onDelete, onUpdate, onApprove }: {
  rep: Report;
  canDelete: boolean;
  canApprove: boolean;
  onDelete: () => void;
  onUpdate: (data: any) => void;
  onApprove: () => void;
}) {
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [reply, setReply] = useState(rep.adminReply ?? "");
  const [showReply, setShowReply] = useState(false);
  const isPublic = rep.visibility === "public";
  const isPending = !isPublic;
  const photos: string[] = (() => { try { return rep.imageUrls ? JSON.parse(rep.imageUrls) : []; } catch { return []; } })();

  const needsReply = pendingStatus === "rezolvat" || pendingStatus === "respins";

  const handleStatusChange = (v: string) => {
    if (v === "rezolvat" || v === "respins") { setPendingStatus(v); setShowReply(true); }
    else onUpdate({ status: v });
  };

  const handleConfirm = () => {
    if (!reply.trim()) return;
    onUpdate({ status: pendingStatus, adminReply: reply });
    setPendingStatus(null); setShowReply(false);
  };

  return (
    <div className={`bg-card border rounded-xl p-4 ${rep.status === "respins" ? "border-red-200 dark:border-red-800/40" : rep.status === "rezolvat" ? "border-green-200 dark:border-green-800/40" : isPending ? "border-amber-200 dark:border-amber-800/40" : "border-card-border"}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-semibold text-sm flex-1">{rep.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          {isPending && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
              Nepublicat
            </span>
          )}
          {canDelete && <DeleteBtn onClick={onDelete} />}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rep.description}</p>

      {photos.length > 0 && (
        <div className="flex gap-1.5 mb-2 overflow-x-auto">
          {photos.map((src, i) => (
            <img key={i} src={src} alt={`Foto ${i+1}`} className="h-14 w-18 object-cover rounded-lg shrink-0 border border-border" />
          ))}
        </div>
      )}

      {rep.adminReply && (
        <div className="bg-muted/50 rounded-lg p-2.5 mb-2 text-xs">
          <span className="font-semibold text-muted-foreground">Răspuns: </span>
          <span className="text-foreground">{rep.adminReply}</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">{rep.category}</Badge>
        {rep.location && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{rep.location}</span>}
        <div className="ml-auto flex items-center gap-1.5">
          {canApprove && isPending && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400" onClick={onApprove}>
              <Eye className="w-3 h-3" />Publică
            </Button>
          )}
          <Select value={rep.status ?? "in_asteptare"} onValueChange={handleStatusChange}>
            <SelectTrigger className={`h-7 text-xs rounded-full border px-3 ${STATUS_CLASSES[rep.status ?? "in_asteptare"]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showReply && needsReply && (
        <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Răspuns obligatoriu</span> — {pendingStatus === "rezolvat" ? "Explică cum a fost rezolvată sesizarea." : "Motivează respingerea."}
          </p>
          <Textarea
            placeholder="Scrie răspunsul tău pentru cetățean..."
            className="min-h-[70px] resize-none text-xs"
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleConfirm} disabled={!reply.trim()}>
              <Check className="w-3 h-3 mr-1" />Confirmă {pendingStatus === "rezolvat" ? "rezolvarea" : "respingerea"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowReply(false); setPendingStatus(null); }}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsTab({ role }: { role: Role }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: reps, isLoading } = useAdminData<Report>("/api/reports/all");
  const canDelete = canDeleteReports(role);
  const canApprove = canApproveReports(role);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/reports/all"] });
    qc.invalidateQueries({ queryKey: ["/api/reports"] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api("PUT", `/api/reports/${id}`, data),
    onSuccess: () => { invalidate(); toast({ title: "Sesizare actualizată" }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/reports/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Sesizare ștearsă" }); },
  });
  const approveMutation = useMutation({
    mutationFn: (id: number) => api("POST", `/api/reports/${id}/approve`, {}),
    onSuccess: () => { invalidate(); toast({ title: "Sesizare publicată" }); },
  });

  const pending = reps?.filter(r => r.visibility !== "public") ?? [];
  const published = reps?.filter(r => r.visibility === "public") ?? [];

  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sesizările <span className="font-semibold text-foreground">nepublicate</span> sunt vizibile doar aici.{canApprove ? " Apasă «Publică» pentru a le face vizibile cetățenilor." : " Doar admin/moderator le poate publica."}
        </p>
      </div>
      {isLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" />Nepublicate ({pending.length})
          </p>
          {pending.map(rep => (
            <ReportCard key={rep.id} rep={rep} canDelete={canDelete} canApprove={canApprove}
              onDelete={() => deleteMutation.mutate(rep.id)}
              onUpdate={data => updateMutation.mutate({ id: rep.id, data })}
              onApprove={() => approveMutation.mutate(rep.id)}
            />
          ))}
        </div>
      )}

      {published.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />Publicate ({published.length})
          </p>
          {published.map(rep => (
            <ReportCard key={rep.id} rep={rep} canDelete={canDelete} canApprove={false}
              onDelete={() => deleteMutation.mutate(rep.id)}
              onUpdate={data => updateMutation.mutate({ id: rep.id, data })}
              onApprove={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BUSINESSES TAB ──────────────────────────────────────────────────────────
function BusinessesTab({ role }: { role: Role }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  // Use admin endpoint that returns ALL businesses (including pending)
  const { data: bizs, isLoading } = useQuery<Business[]>({
    queryKey: ["/api/admin/businesses"],
    queryFn: () => api("GET", "/api/admin/businesses"),
  });
  const [creating, setCreating] = useState(false);
  const [newBiz, setNewBiz] = useState({ name: "", category: "", description: "", address: "", phone: "", website: "", imageUrl: "" });
  const canVerify = role === "administrator" || role === "primar";

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/businesses"] });
    qc.invalidateQueries({ queryKey: ["/api/businesses"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/businesses/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Afacere ștearsă" }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Business> }) => api("PUT", `/api/businesses/${id}`, data),
    onSuccess: () => invalidate(),
  });
  const verifyMutation = useMutation({
    mutationFn: (id: number) => api("POST", `/api/businesses/${id}/verify`, {}),
    onSuccess: (biz: Business) => { invalidate(); toast({ title: biz.verified ? "Afacere verificată ✓" : "Verificare retrasă" }); },
  });
  const approveMutation = useMutation({
    mutationFn: (id: number) => api("POST", `/api/businesses/${id}/approve`, {}),
    onSuccess: () => { invalidate(); toast({ title: "Afacere aprobată ✓" }); },
  });
  const rejectMutation = useMutation({
    mutationFn: (id: number) => api("POST", `/api/businesses/${id}/reject`, {}),
    onSuccess: () => { invalidate(); toast({ title: "Afacere respinsă" }); },
  });
  const createMutation = useMutation({
    mutationFn: (data: typeof newBiz) => api("POST", "/api/businesses", data),
    onSuccess: () => { invalidate(); setCreating(false); toast({ title: "Afacere adăugată" }); },
  });

  const pendingBizs = bizs?.filter(b => (b as any).status === "pending") ?? [];
  const approvedBizs = bizs?.filter(b => (b as any).status !== "pending") ?? [];

  return (
    <div className="space-y-3">
      {pendingBizs.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">{pendingBizs.length} {pendingBizs.length === 1 ? "afacere necesită" : "afaceri necesită"} aprobare</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Afacerile <span className="font-semibold text-foreground">verificate</span> apar primele și au o insignă vizibilă.</p>
        <Button size="sm" className="gap-1.5 rounded-full shrink-0" onClick={() => setCreating(v => !v)}>
          {creating ? <><X className="w-3.5 h-3.5" />Anulează</> : <><Plus className="w-3.5 h-3.5" />Afacere nouă</>}
        </Button>
      </div>
      {creating && (
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          {[["name","Nume"], ["category","Categorie"], ["description","Descriere"], ["address","Adresă"], ["phone","Telefon"], ["website","Website"], ["imageUrl","URL imagine"]].map(([k, l]) => (
            <Input key={k} placeholder={l} value={(newBiz as any)[k]} onChange={e => setNewBiz(p => ({ ...p, [k]: e.target.value }))} />
          ))}
          <Button size="sm" className="w-full" onClick={() => createMutation.mutate(newBiz)} disabled={createMutation.isPending}>Adaugă</Button>
        </div>
      )}

      {/* Pending section */}
      {pendingBizs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />Propuse de cetățeni — necesită aprobare ({pendingBizs.length})
          </p>
          {pendingBizs.map(biz => (
            <div key={biz.id} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">În așteptare</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{biz.category}</span>
                </div>
                <DeleteBtn onClick={() => deleteMutation.mutate(biz.id)} />
              </div>
              <p className="font-semibold text-sm mb-1">{biz.name}</p>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{biz.description}</p>
              {biz.address && <p className="text-xs text-muted-foreground mb-1">📍 {biz.address}</p>}
              {biz.phone && <p className="text-xs text-muted-foreground mb-3">📞 {biz.phone}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
                  onClick={() => approveMutation.mutate(biz.id)} disabled={approveMutation.isPending}>
                  <ThumbsUp className="w-3.5 h-3.5" />Aprobă
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => rejectMutation.mutate(biz.id)} disabled={rejectMutation.isPending}>
                  <ThumbsDown className="w-3.5 h-3.5" />Respinge
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approved section */}
      {isLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}
      {approvedBizs.length > 0 && (
        <div className="space-y-2">
          {pendingBizs.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />Afaceri aprobate ({approvedBizs.length})
            </p>
          )}
          {approvedBizs.map(biz => (
            <div key={biz.id} className={`bg-card border rounded-xl p-4 ${biz.verified ? "border-green-200 dark:border-green-800/40" : "border-card-border"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{biz.category}</span>
                  {biz.verified && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      <BadgeCheck className="w-3 h-3" />Verificat
                    </span>
                  )}
                </div>
                <DeleteBtn onClick={() => deleteMutation.mutate(biz.id)} />
              </div>
              <EditableRow label="Nume" value={biz.name} onSave={v => updateMutation.mutate({ id: biz.id, data: { name: v } })} />
              <EditableRow label="Descriere" value={biz.description} textarea onSave={v => updateMutation.mutate({ id: biz.id, data: { description: v } })} />
              <EditableRow label="Adresă" value={biz.address ?? ""} onSave={v => updateMutation.mutate({ id: biz.id, data: { address: v } })} />
              <EditableRow label="Telefon" value={biz.phone ?? ""} onSave={v => updateMutation.mutate({ id: biz.id, data: { phone: v } })} />
              {canVerify && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`w-full h-8 text-xs gap-1.5 ${biz.verified ? "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" : "text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"}`}
                    onClick={() => verifyMutation.mutate(biz.id)}
                    disabled={verifyMutation.isPending}
                  >
                    {biz.verified ? <><EyeOff className="w-3.5 h-3.5" />Retrage verificarea</> : <><BadgeCheck className="w-3.5 h-3.5" />Marchează ca verificat</>}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────
interface AdminUser { id: number; username: string; name: string; role: string; createdAt: string; }

function UsersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: userList, isLoading } = useAdminData<AdminUser>("/api/admin/users");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", name: "", role: "cetatean" });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Utilizator șters" }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => api("PUT", `/api/admin/users/${id}`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Rol actualizat" }); },
  });
  const createMutation = useMutation({
    mutationFn: (data: typeof newUser) => api("POST", "/api/admin/users", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setCreating(false); setNewUser({ username: "", password: "", name: "", role: "cetatean" }); toast({ title: "Utilizator creat" }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setCreating(v => !v)}>
          {creating ? <><X className="w-3.5 h-3.5" />Anulează</> : <><Plus className="w-3.5 h-3.5" />Utilizator nou</>}
        </Button>
      </div>
      {creating && (
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <Input placeholder="Username" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
          <Input placeholder="Parolă" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
          <Input placeholder="Nume complet" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
          <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="w-full" onClick={() => createMutation.mutate(newUser)} disabled={createMutation.isPending}>Creează</Button>
        </div>
      )}
      {isLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}
      {userList?.map(u => {
        const isSelf = u.id === undefined; // will be determined at runtime via useAuth
        return (
        <div key={u.id} className={`bg-card border rounded-xl p-4 ${u.role === "administrator" ? "border-primary/30 dark:border-primary/20" : u.role === "specialist" ? "border-teal-200 dark:border-teal-800/40" : "border-card-border"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${u.role === "administrator" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
              {u.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate">{u.name}</p>
                {u.role === "administrator" && <Shield className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
            </div>
            <Select value={u.role} onValueChange={v => updateRoleMutation.mutate({ id: u.id, role: v })}>
              <SelectTrigger className="h-7 text-xs w-36 rounded-full border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            <DeleteBtn onClick={() => deleteMutation.mutate(u.id)} disabled={deleteMutation.isPending} />
          </div>
          {u.role === "specialist" && (
            <PermissionEditor userId={u.id} userName={u.name} />
          )}
        </div>
        );
      })}
    </div>
  );
}

// ─── PERMISSION EDITOR ───────────────────────────────────────────────────────
function PermissionEditor({ userId, userName }: { userId: number; userName: string }) {
  const { data: permissions, isLoading } = useUserPermissions(userId);
  const setMutation = useSetPermission(userId);
  const { toast } = useToast();

  if (isLoading) return <div className="space-y-2 mt-3">{[1, 2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;

  const handleToggle = (section: string, action: "canRead" | "canWrite" | "canApprove" | "canDelete") => {
    const perm = permissions?.find(p => p.section === section);
    if (!perm) return;
    const newVal = !(perm[action] ?? false);
    setMutation.mutate(
      { section, canRead: action === "canRead" ? newVal : (perm.canRead ?? false), canWrite: action === "canWrite" ? newVal : (perm.canWrite ?? false), canApprove: action === "canApprove" ? newVal : (perm.canApprove ?? false), canDelete: action === "canDelete" ? newVal : (perm.canDelete ?? false) },
      { onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }) }
    );
  };

  return (
    <div className="space-y-2 mt-3">
      {PERMISSION_SECTIONS.map(section => {
        const perm = permissions?.find(p => p.section === section) ?? { section, canRead: false, canWrite: false, canApprove: false, canDelete: false };
        const hasAnyPerm = perm.canRead || perm.canWrite || perm.canApprove || perm.canDelete;
        return (
          <div key={section} className={`text-xs border rounded-lg p-2.5 ${hasAnyPerm ? "border-teal-200 dark:border-teal-800/40 bg-teal-50 dark:bg-teal-950/10" : "border-border bg-muted/30"}`}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-semibold text-foreground">{PERMISSION_SECTION_LABELS[section]}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${hasAnyPerm ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400" : "bg-muted text-muted-foreground"}`}>
                {[perm.canRead, perm.canWrite, perm.canApprove, perm.canDelete].filter(Boolean).length}/4
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { action: "canRead" as const, label: "Citire", color: "text-blue-600 dark:text-blue-400" },
                { action: "canWrite" as const, label: "Scriere", color: "text-green-600 dark:text-green-400" },
                { action: "canApprove" as const, label: "Aprobare", color: "text-purple-600 dark:text-purple-400" },
                { action: "canDelete" as const, label: "Ștergere", color: "text-red-600 dark:text-red-400" },
              ].map(({ action, label, color }) => (
                <button
                  key={action}
                  onClick={() => handleToggle(section, action)}
                  disabled={setMutation.isPending}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors ${
                    (perm[action] ?? false)
                      ? `${color} bg-current/10 border-current/30`
                      : "text-muted-foreground border-border hover:bg-muted"
                  }`}
                  data-testid={`permission-${section}-${action}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PERMISIUNI TAB ──────────────────────────────────────────────────────────
function PermisiuniTab() {
  const { data: userList, isLoading } = useAdminData<AdminUser>("/api/admin/users");
  const specialists = userList?.filter(u => u.role === "specialist") ?? [];
  const others = userList?.filter(u => u.role !== "specialist" && u.role !== "administrator") ?? [];
  const allNonAdmin = [...specialists, ...others];

  return (
    <div className="space-y-4">
      <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <h2 className="font-display font-semibold text-sm">Permisiuni granulare per utilizator</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Configură accesul individual pentru fiecare utilizator — independent de rolul său de bază.
          Permisiunile se aplică suplimentar față de permisiunile implicite ale rolului.
        </p>
      </div>

      {isLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      {specialists.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />Specialiști (permisiuni configurabile)
          </p>
          {specialists.map(u => (
            <div key={u.id} className="bg-card border border-teal-200 dark:border-teal-800/40 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-950/40 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                  {u.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </div>
              <PermissionEditor userId={u.id} userName={u.name} />
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />Alți utilizatori (permisiuni opționale)
          </p>
          {others.map(u => (
            <div key={u.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {u.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username} · {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</p>
                </div>
              </div>
              <PermissionEditor userId={u.id} userName={u.name} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && allNonAdmin.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">Nu există utilizatori de configurat.</p>
      )}
    </div>
  );
}

// ─── ROLES TAB ───────────────────────────────────────────────────────────────
function RolesTab() {
  const roleOrder: Role[] = ["administrator", "primar", "viceprimar", "functionar_public", "moderator", "specialist", "cetatean"];

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold text-sm">Ierarhia rolurilor</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Administrator</span> are acces deplin și suprasuprascrie orice restricție de rol.
          Celelalte roluri au permisiuni limitate, definite mai jos.
        </p>
      </div>

      {/* Role cards */}
      {roleOrder.map(role => {
        const perms = ROLE_PERMISSIONS[role];
        const colorClass = ROLE_COLORS[role];
        const label = ROLE_LABELS_MAP[role];
        const allowedCount = perms.filter(p => p.allowed).length;

        return (
          <div key={role} className="bg-card border border-card-border rounded-xl overflow-hidden">
            {/* Role header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>{label}</span>
              {role === "administrator" && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Acces total
                </span>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground">{allowedCount}/{perms.length} permisiuni</span>
            </div>

            {/* Permission list */}
            <div className="divide-y divide-border/40">
              {perms.map((perm, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  {perm.allowed
                    ? <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    : <ShieldX className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  }
                  <span className={`text-xs ${perm.allowed ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {perm.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Demo accounts info */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-2">Conturi demo disponibile</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            { u: "admin", p: "admin123", r: "Administrator" },
            { u: "primar", p: "primar123", r: "Primar" },
            { u: "viceprimar", p: "vice123", r: "Viceprimar" },
            { u: "functionar", p: "func123", r: "Funcționar" },
            { u: "moderator", p: "mod123", r: "Moderator" },
            { u: "cetatean", p: "cet123", r: "Cetățean" },
          ].map(a => (
            <div key={a.u} className="text-[11px]">
              <span className="font-semibold text-amber-900 dark:text-amber-300">{a.u}</span>
              <span className="text-amber-700/70 dark:text-amber-500/70"> / {a.p}</span>
              <span className="text-amber-600/60 dark:text-amber-600/60 ml-1">({a.r})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SERVICII TAB ────────────────────────────────────────────────────────────
const SERVICE_CATEGORY_OPTIONS = ["medical","administratie","educatie","utilitati","posta"] as const;
const SERVICE_CATEGORY_LABELS_MAP: Record<string, string> = {
  medical:"Medical", administratie:"Administrație", educatie:"Educație", utilitati:"Utilități", posta:"Poștă"
};

type ServiceSubTab = "servicii" | "transport";

const TRANSPORT_TYPE_ICONS: Record<string, typeof Bus> = {
  autobuz: Bus, tren: Train, taxi: Car, maxitaxi: Car, avion: Bus,
};
const TRANSPORT_TYPE_LABELS_ADMIN: Record<string, string> = {
  autobuz: "Autobuz", tren: "Tren", taxi: "Taxi", maxitaxi: "Maxitaxi", avion: "Avion",
};

interface TransportRoute {
  id: number; type: string; line: string; direction: string; operator: string;
  departures: string; departuresWeekend: string | null; notes: string | null; status: string;
}

function TransportAdminSection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: routes, isLoading } = useQuery<TransportRoute[]>({
    queryKey: ["/api/admin/transport"],
    queryFn: () => api("GET", "/api/admin/transport"),
  });
  const [creating, setCreating] = useState(false);
  const [newRoute, setNewRoute] = useState({ type: "autobuz", line: "", direction: "", operator: "", departures: "", departuresWeekend: "", notes: "", status: "activ" });

  const inv = () => { qc.invalidateQueries({ queryKey: ["/api/admin/transport"] }); qc.invalidateQueries({ queryKey: ["/api/transport"] }); };
  const deleteMutation = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/transport/${id}`), onSuccess: () => { inv(); toast({ title: "Rută ștearsă" }); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => api("PUT", `/api/transport/${id}`, data), onSuccess: () => inv() });
  const createMutation = useMutation({
    mutationFn: (d: typeof newRoute) => api("POST", "/api/transport", {
      ...d,
      departures: JSON.stringify(d.departures.split(",").map(s => s.trim()).filter(Boolean)),
      departuresWeekend: d.departuresWeekend.trim()
        ? JSON.stringify(d.departuresWeekend.split(",").map(s => s.trim()).filter(Boolean))
        : null,
    }),
    onSuccess: () => { inv(); setCreating(false); setNewRoute({ type: "autobuz", line: "", direction: "", operator: "", departures: "", departuresWeekend: "", notes: "", status: "activ" }); toast({ title: "Rută adăugată" }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
  });

  const parseDeps = (d: string | null | undefined) => { try { return JSON.parse(d ?? "[]") as string[]; } catch { return []; } };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Rute transport public — autobuz, tren, taxi, maxitaxi.</p>
        <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setCreating(v => !v)}>
          {creating ? <><X className="w-3.5 h-3.5" />Anulează</> : <><Plus className="w-3.5 h-3.5" />Rută nouă</>}
        </Button>
      </div>
      {creating && (
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <select className="w-full text-sm border rounded-lg px-3 py-2 bg-background" value={newRoute.type} onChange={e => setNewRoute(p=>({...p,type:e.target.value}))}>
            {Object.entries(TRANSPORT_TYPE_LABELS_ADMIN).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Input placeholder="Linie (ex: Linia 19, CFR Călători)" value={newRoute.line} onChange={e => setNewRoute(p=>({...p,line:e.target.value}))} />
          <Input placeholder="Direcție (ex: Hălchiu → Brașov)" value={newRoute.direction} onChange={e => setNewRoute(p=>({...p,direction:e.target.value}))} />
          <Input placeholder="Operator (ex: RAT Brașov)" value={newRoute.operator} onChange={e => setNewRoute(p=>({...p,operator:e.target.value}))} />
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">Plecări Luni–Vineri (separate prin virgulă)</p>
            <Input placeholder="ex: 06:05, 07:20, 08:00" value={newRoute.departures} onChange={e => setNewRoute(p=>({...p,departures:e.target.value}))} />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">Plecări Weekend — opțional (Sâmbătă–Duminică)</p>
            <Input placeholder="ex: 08:00, 10:00, 14:00 (lasă gol dacă același orar)" value={newRoute.departuresWeekend} onChange={e => setNewRoute(p=>({...p,departuresWeekend:e.target.value}))} />
          </div>
          <Input placeholder="Note (opțional)" value={newRoute.notes} onChange={e => setNewRoute(p=>({...p,notes:e.target.value}))} />
          <Button size="sm" className="w-full" onClick={() => createMutation.mutate(newRoute)} disabled={!newRoute.line || !newRoute.direction || createMutation.isPending}>Adaugă rută</Button>
        </div>
      )}
      {isLoading && <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div>}
      {routes?.map(r => {
        const Icon = TRANSPORT_TYPE_ICONS[r.type] ?? Bus;
        const deps = parseDeps(r.departures);
        return (
          <div key={r.id} className={`bg-card border rounded-xl p-4 ${r.status !== "activ" ? "border-muted opacity-60" : "border-card-border"}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700/40">
                  <Icon className="w-3 h-3" />{TRANSPORT_TYPE_LABELS_ADMIN[r.type] ?? r.type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${r.status === "activ" ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border"}`}>{r.status}</span>
              </div>
              <DeleteBtn onClick={() => deleteMutation.mutate(r.id)} />
            </div>
            <EditableRow label="Linie" value={r.line} onSave={v => updateMutation.mutate({ id: r.id, data: { line: v } })} />
            <EditableRow label="Direcție" value={r.direction} onSave={v => updateMutation.mutate({ id: r.id, data: { direction: v } })} />
            <EditableRow label="Operator" value={r.operator} onSave={v => updateMutation.mutate({ id: r.id, data: { operator: v } })} />
            <EditableRow label="Note" value={r.notes ?? ""} onSave={v => updateMutation.mutate({ id: r.id, data: { notes: v } })} />
            <div className="mt-2 space-y-1.5">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Plecări L–V ({deps.length}): <span className="text-foreground/60">{deps.slice(0,5).join(", ")}{deps.length > 5 ? "…" : ""}</span></p>
                <EditableRow label="Plecări L–V (virgulă)" value={deps.join(", ")} onSave={v => {
                  const arr = v.split(",").map(s => s.trim()).filter(Boolean);
                  updateMutation.mutate({ id: r.id, data: { departures: JSON.stringify(arr) } });
                }} />
              </div>
              <div>
                {(() => { const wd = parseDeps(r.departuresWeekend); return (
                  <>
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      Plecări weekend ({wd.length}): {wd.length > 0 ? <span className="text-foreground/60">{wd.slice(0,5).join(", ")}{wd.length > 5 ? "…" : ""}</span> : <span className="italic">același orar ca L–V</span>}
                    </p>
                    <EditableRow label="Plecări S–D (virgulă, gol = același orar)" value={wd.join(", ")} onSave={v => {
                      const arr = v.split(",").map(s => s.trim()).filter(Boolean);
                      updateMutation.mutate({ id: r.id, data: { departuresWeekend: arr.length ? JSON.stringify(arr) : null } });
                    }} />
                  </>
                ); })()}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/40">
              <Select value={r.status} onValueChange={v => updateMutation.mutate({ id: r.id, data: { status: v } })}>
                <SelectTrigger className="h-7 text-xs rounded-full w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activ">Activ</SelectItem>
                  <SelectItem value="inactiv">Inactiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ServciiTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sub, setSub] = useState<ServiceSubTab>("servicii");
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
    queryFn: () => api("GET", "/api/admin/services"),
  });
  const [creating, setCreating] = useState(false);
  const [newSvc, setNewSvc] = useState({ name:"", category:"medical", type:"", phone:"", address:"", status:"activ" });

  const inv = () => { qc.invalidateQueries({ queryKey: ["/api/admin/services"] }); qc.invalidateQueries({ queryKey: ["/api/services"] }); };
  const deleteMutation = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/services/${id}`), onSuccess: () => { inv(); toast({ title: "Serviciu șters" }); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => api("PUT", `/api/services/${id}`, data), onSuccess: () => inv() });
  const createMutation = useMutation({
    mutationFn: (d: typeof newSvc) => api("POST", "/api/services", d),
    onSuccess: () => { inv(); setCreating(false); setNewSvc({ name:"", category:"medical", type:"", phone:"", address:"", status:"activ" }); toast({ title: "Serviciu adăugat" }); },
  });

  return (
    <div className="space-y-3">
      {/* Sub-tab selector */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
        {([
          { id: "servicii" as ServiceSubTab, label: "Servicii publice", icon: Building2 },
          { id: "transport" as ServiceSubTab, label: "Transport", icon: Bus },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSub(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${sub === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {sub === "transport" ? (
        <TransportAdminSection />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Servicii publice locale vizibile în pagina Servicii.</p>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/servicii" data-testid="link-public-servicii">
                <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  Pagina publică <ExternalLink className="w-3 h-3" />
                </span>
              </Link>
              <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setCreating(v => !v)}>
                {creating ? <><X className="w-3.5 h-3.5" />Anulează</> : <><Plus className="w-3.5 h-3.5" />Serviciu nou</>}
              </Button>
            </div>
          </div>
          {creating && (
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <Input placeholder="Nume serviciu" value={newSvc.name} onChange={e => setNewSvc(p=>({...p,name:e.target.value}))} />
              <select className="w-full text-sm border rounded-lg px-3 py-2 bg-background" value={newSvc.category} onChange={e => setNewSvc(p=>({...p,category:e.target.value}))}>
                {SERVICE_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{SERVICE_CATEGORY_LABELS_MAP[c]}</option>)}
              </select>
              <Input placeholder="Tip (ex: farmacie, scoala, primarie)" value={newSvc.type} onChange={e => setNewSvc(p=>({...p,type:e.target.value}))} />
              <Input placeholder="Telefon" value={newSvc.phone} onChange={e => setNewSvc(p=>({...p,phone:e.target.value}))} />
              <Input placeholder="Adresă" value={newSvc.address} onChange={e => setNewSvc(p=>({...p,address:e.target.value}))} />
              <Button size="sm" className="w-full" onClick={() => createMutation.mutate(newSvc)} disabled={createMutation.isPending}>Adaugă</Button>
            </div>
          )}
          {isLoading && <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div>}
          {services?.map(svc => (
            <div key={svc.id} className={`bg-card border rounded-xl p-4 ${svc.status !== "activ" ? "border-muted" : "border-card-border"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{SERVICE_CATEGORY_LABELS_MAP[svc.category] ?? svc.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${svc.status === "activ" ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border"}`}>{svc.status}</span>
                </div>
                <DeleteBtn onClick={() => deleteMutation.mutate(svc.id)} />
              </div>
              <EditableRow label="Nume" value={svc.name} onSave={v => updateMutation.mutate({ id: svc.id, data: { name: v } })} />
              <EditableRow label="Telefon" value={svc.phone ?? ""} onSave={v => updateMutation.mutate({ id: svc.id, data: { phone: v } })} />
              <EditableRow label="Adresă" value={svc.address ?? ""} onSave={v => updateMutation.mutate({ id: svc.id, data: { address: v } })} />
              <div className="mt-3 pt-3 border-t border-border/40">
                <Select value={svc.status} onValueChange={v => updateMutation.mutate({ id: svc.id, data: { status: v } })}>
                  <SelectTrigger className="h-7 text-xs rounded-full w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activ">Activ</SelectItem>
                    <SelectItem value="inactiv">Inactiv</SelectItem>
                    <SelectItem value="temporar_inchis">Temporar închis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── SĂNĂTATE ADMIN TAB ───────────────────────────────────────────────────────
type HealthSubTab = "campanii" | "alerte" | "doctori" | "programari" | "sociale";

function SanatateAdminTab() {
  const [sub, setSub] = useState<HealthSubTab>("campanii");
  const qc = useQueryClient();
  const { toast } = useToast();

  // Campaigns
  const { data: campaigns, isLoading: cLoading } = useQuery<HealthCampaign[]>({ queryKey: ["/api/health/campaigns"], queryFn: () => api("GET", "/api/health/campaigns") });
  const [newCamp, setNewCamp] = useState({ type:"preventie", title:"", description:"", targetGroup:"", location:"" });
  const [creatingCamp, setCreatingCamp] = useState(false);
  const deleteCamp = useMutation({ mutationFn: (id:number)=>api("DELETE",`/api/health/campaigns/${id}`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/health/campaigns"]});toast({title:"Campanie ștearsă"});} });
  const createCamp = useMutation({ mutationFn:(d:any)=>api("POST","/api/health/campaigns",d), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/health/campaigns"]});setCreatingCamp(false);toast({title:"Campanie adăugată"});} });
  const updateCamp = useMutation({ mutationFn:({id,data}:{id:number;data:any})=>api("PUT",`/api/health/campaigns/${id}`,data), onSuccess:()=>qc.invalidateQueries({queryKey:["/api/health/campaigns"]}) });

  // Alerts
  const { data: alerts, isLoading: aLoading } = useQuery<HealthAlert[]>({ queryKey: ["/api/health/alerts"], queryFn: () => api("GET", "/api/health/alerts") });
  const [newAlert, setNewAlert] = useState({ type:"sanitara", title:"", description:"", severity:"warning" });
  const [creatingAlert, setCreatingAlert] = useState(false);
  const deleteAlert = useMutation({ mutationFn:(id:number)=>api("DELETE",`/api/health/alerts/${id}`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/health/alerts"]});toast({title:"Alertă ștearsă"});} });
  const createAlert = useMutation({ mutationFn:(d:any)=>api("POST","/api/health/alerts",d), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/health/alerts"]});setCreatingAlert(false);toast({title:"Alertă adăugată"});} });
  const updateAlert = useMutation({ mutationFn:({id,data}:{id:number;data:any})=>api("PUT",`/api/health/alerts/${id}`,data), onSuccess:()=>qc.invalidateQueries({queryKey:["/api/health/alerts"]}) });

  // Doctors
  const { data: doctors, isLoading: dLoading } = useQuery<DoctorProfile[]>({ queryKey: ["/api/health/doctors"], queryFn: () => api("GET", "/api/health/doctors") });
  const [newDoc, setNewDoc] = useState({ name:"", specialization:"", cabinetName:"", phone:"", address:"", status:"activ" });
  const [creatingDoc, setCreatingDoc] = useState(false);
  const deleteDoc = useMutation({ mutationFn:(id:number)=>api("DELETE",`/api/health/doctors/${id}`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/health/doctors"]});toast({title:"Medic șters"});} });
  const createDoc = useMutation({ mutationFn:(d:any)=>api("POST","/api/health/doctors",d), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/health/doctors"]});setCreatingDoc(false);toast({title:"Medic adăugat"});} });
  const updateDoc = useMutation({ mutationFn:({id,data}:{id:number;data:any})=>api("PUT",`/api/health/doctors/${id}`,data), onSuccess:()=>qc.invalidateQueries({queryKey:["/api/health/doctors"]}) });

  // Appointments
  const { data: appts, isLoading: apLoading } = useQuery<AppointmentRequest[]>({ queryKey: ["/api/health/appointments"], queryFn: () => api("GET", "/api/health/appointments") });
  const updateAppt = useMutation({ mutationFn:({id,data}:{id:number;data:any})=>api("PUT",`/api/health/appointments/${id}`,data), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/health/appointments"]});toast({title:"Programare actualizată"});} });

  // Social programs
  const { data: socials, isLoading: sLoading } = useQuery<SocialProgram[]>({ queryKey: ["/api/social/programs"], queryFn: () => api("GET", "/api/social/programs") });
  const [newSocial, setNewSocial] = useState({ type:"informare", title:"", description:"", eligibility:"", contactInfo:"" });
  const [creatingSocial, setCreatingSocial] = useState(false);
  const deleteSocial = useMutation({ mutationFn:(id:number)=>api("DELETE",`/api/social/programs/${id}`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/social/programs"]});toast({title:"Program șters"});} });
  const createSocial = useMutation({ mutationFn:(d:any)=>api("POST","/api/social/programs",d), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/social/programs"]});setCreatingSocial(false);toast({title:"Program adăugat"});} });
  const updateSocial = useMutation({ mutationFn:({id,data}:{id:number;data:any})=>api("PUT",`/api/social/programs/${id}`,data), onSuccess:()=>qc.invalidateQueries({queryKey:["/api/social/programs"]}) });

  const subTabs: { id: HealthSubTab; label: string }[] = [
    { id:"campanii", label:"Campanii" }, { id:"alerte", label:"Alerte" }, { id:"doctori", label:"Medici" },
    { id:"programari", label:"Programări" }, { id:"sociale", label:"Sociale" },
  ];

  const SEVERITY_CLASSES: Record<string, string> = {
    info:"bg-blue-100 text-blue-700 border-blue-200", warning:"bg-amber-100 text-amber-700 border-amber-200", critical:"bg-red-100 text-red-700 border-red-200"
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none flex-1">
          {subTabs.map(st => (
            <button key={st.id} onClick={() => setSub(st.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${sub === st.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {st.label}
            </button>
          ))}
        </div>
        <Link href="/sanatate" data-testid="link-public-sanatate">
          <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors whitespace-nowrap shrink-0">
            Pagina publică <ExternalLink className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* CAMPANII */}
      {sub === "campanii" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setCreatingCamp(v=>!v)}>
              {creatingCamp ? <><X className="w-3.5 h-3.5"/>Anulează</> : <><Plus className="w-3.5 h-3.5"/>Campanie nouă</>}
            </Button>
          </div>
          {creatingCamp && (
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <select className="w-full text-sm border rounded-lg px-3 py-2 bg-background" value={newCamp.type} onChange={e=>setNewCamp(p=>({...p,type:e.target.value}))}>
                {["vaccinare","preventie","screening","caravana"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <Input placeholder="Titlu" value={newCamp.title} onChange={e=>setNewCamp(p=>({...p,title:e.target.value}))} />
              <Textarea placeholder="Descriere" className="min-h-[70px] resize-none" value={newCamp.description} onChange={e=>setNewCamp(p=>({...p,description:e.target.value}))} />
              <Input placeholder="Grup țintă" value={newCamp.targetGroup} onChange={e=>setNewCamp(p=>({...p,targetGroup:e.target.value}))} />
              <Input placeholder="Locație" value={newCamp.location} onChange={e=>setNewCamp(p=>({...p,location:e.target.value}))} />
              <Button size="sm" className="w-full" onClick={()=>createCamp.mutate(newCamp)} disabled={createCamp.isPending}>Adaugă</Button>
            </div>
          )}
          {cLoading && <Skeleton className="h-24 rounded-xl"/>}
          {campaigns?.map(c => (
            <div key={c.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{c.type}</span>
                <div className="flex items-center gap-1">
                  <Select value={c.status} onValueChange={v=>updateCamp.mutate({id:c.id,data:{status:v}})}>
                    <SelectTrigger className="h-7 text-xs rounded-full w-28"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activa">Activă</SelectItem>
                      <SelectItem value="viitoare">Viitoare</SelectItem>
                      <SelectItem value="inactiva">Inactivă</SelectItem>
                    </SelectContent>
                  </Select>
                  <DeleteBtn onClick={()=>deleteCamp.mutate(c.id)} />
                </div>
              </div>
              <EditableRow label="Titlu" value={c.title} onSave={v=>updateCamp.mutate({id:c.id,data:{title:v}})} />
              <EditableRow label="Descriere" value={c.description} textarea onSave={v=>updateCamp.mutate({id:c.id,data:{description:v}})} />
              <EditableRow label="Grup țintă" value={c.targetGroup??""} onSave={v=>updateCamp.mutate({id:c.id,data:{targetGroup:v}})} />
              <EditableRow label="Locație" value={c.location??""} onSave={v=>updateCamp.mutate({id:c.id,data:{location:v}})} />
            </div>
          ))}
          {!cLoading && !campaigns?.length && <p className="text-center text-sm text-muted-foreground py-8">Nu există campanii.</p>}
        </div>
      )}

      {/* ALERTE */}
      {sub === "alerte" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 rounded-full" onClick={()=>setCreatingAlert(v=>!v)}>
              {creatingAlert ? <><X className="w-3.5 h-3.5"/>Anulează</> : <><Plus className="w-3.5 h-3.5"/>Alertă nouă</>}
            </Button>
          </div>
          {creatingAlert && (
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <select className="w-full text-sm border rounded-lg px-3 py-2 bg-background" value={newAlert.type} onChange={e=>setNewAlert(p=>({...p,type:e.target.value}))}>
                {["canicula","frig","epidemie","apa","sanitara"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <select className="w-full text-sm border rounded-lg px-3 py-2 bg-background" value={newAlert.severity} onChange={e=>setNewAlert(p=>({...p,severity:e.target.value}))}>
                <option value="info">Info</option>
                <option value="warning">Avertizare</option>
                <option value="critical">Critică</option>
              </select>
              <Input placeholder="Titlu" value={newAlert.title} onChange={e=>setNewAlert(p=>({...p,title:e.target.value}))} />
              <Textarea placeholder="Descriere" className="min-h-[70px] resize-none" value={newAlert.description} onChange={e=>setNewAlert(p=>({...p,description:e.target.value}))} />
              <Button size="sm" className="w-full" onClick={()=>createAlert.mutate(newAlert)} disabled={createAlert.isPending}>Adaugă</Button>
            </div>
          )}
          {aLoading && <Skeleton className="h-24 rounded-xl"/>}
          {alerts?.map(a => (
            <div key={a.id} className={`bg-card border rounded-xl p-4 ${a.severity === "critical" ? "border-red-200 dark:border-red-800/40" : a.severity === "warning" ? "border-amber-200 dark:border-amber-800/40" : "border-card-border"}`}>
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_CLASSES[a.severity]}`}>{a.severity}</span>
                <div className="flex items-center gap-1">
                  <Select value={a.status} onValueChange={v=>updateAlert.mutate({id:a.id,data:{status:v}})}>
                    <SelectTrigger className="h-7 text-xs rounded-full w-28"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activa">Activă</SelectItem>
                      <SelectItem value="expirata">Expirată</SelectItem>
                    </SelectContent>
                  </Select>
                  <DeleteBtn onClick={()=>deleteAlert.mutate(a.id)} />
                </div>
              </div>
              <EditableRow label="Titlu" value={a.title} onSave={v=>updateAlert.mutate({id:a.id,data:{title:v}})} />
              <EditableRow label="Descriere" value={a.description} textarea onSave={v=>updateAlert.mutate({id:a.id,data:{description:v}})} />
            </div>
          ))}
          {!aLoading && !alerts?.length && <p className="text-center text-sm text-muted-foreground py-8">Nu există alerte active.</p>}
        </div>
      )}

      {/* DOCTORI */}
      {sub === "doctori" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 rounded-full" onClick={()=>setCreatingDoc(v=>!v)}>
              {creatingDoc ? <><X className="w-3.5 h-3.5"/>Anulează</> : <><Plus className="w-3.5 h-3.5"/>Medic nou</>}
            </Button>
          </div>
          {creatingDoc && (
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <Input placeholder="Nume medic" value={newDoc.name} onChange={e=>setNewDoc(p=>({...p,name:e.target.value}))} />
              <Input placeholder="Specializare" value={newDoc.specialization} onChange={e=>setNewDoc(p=>({...p,specialization:e.target.value}))} />
              <Input placeholder="Cabinet" value={newDoc.cabinetName} onChange={e=>setNewDoc(p=>({...p,cabinetName:e.target.value}))} />
              <Input placeholder="Telefon" value={newDoc.phone} onChange={e=>setNewDoc(p=>({...p,phone:e.target.value}))} />
              <Input placeholder="Adresă" value={newDoc.address} onChange={e=>setNewDoc(p=>({...p,address:e.target.value}))} />
              <Button size="sm" className="w-full" onClick={()=>createDoc.mutate(newDoc)} disabled={createDoc.isPending}>Adaugă</Button>
            </div>
          )}
          {dLoading && <Skeleton className="h-24 rounded-xl"/>}
          {doctors?.map(d => (
            <div key={d.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d.specialization}</span>
                <div className="flex items-center gap-1">
                  <Select value={d.status} onValueChange={v=>updateDoc.mutate({id:d.id,data:{status:v}})}>
                    <SelectTrigger className="h-7 text-xs rounded-full w-32"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activ">Activ</SelectItem>
                      <SelectItem value="concediu">Concediu</SelectItem>
                      <SelectItem value="indisponibil">Indisponibil</SelectItem>
                    </SelectContent>
                  </Select>
                  <DeleteBtn onClick={()=>deleteDoc.mutate(d.id)} />
                </div>
              </div>
              <EditableRow label="Nume" value={d.name} onSave={v=>updateDoc.mutate({id:d.id,data:{name:v}})} />
              <EditableRow label="Cabinet" value={d.cabinetName??""} onSave={v=>updateDoc.mutate({id:d.id,data:{cabinetName:v}})} />
              <EditableRow label="Telefon" value={d.phone??""} onSave={v=>updateDoc.mutate({id:d.id,data:{phone:v}})} />
              <EditableRow label="Adresă" value={d.address??""} onSave={v=>updateDoc.mutate({id:d.id,data:{address:v}})} />
              <EditableRow label="Note" value={d.notes??""} textarea onSave={v=>updateDoc.mutate({id:d.id,data:{notes:v}})} />
            </div>
          ))}
          {!dLoading && !doctors?.length && <p className="text-center text-sm text-muted-foreground py-8">Nu există medici înregistrați.</p>}
        </div>
      )}

      {/* PROGRAMĂRI */}
      {sub === "programari" && (
        <div className="space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
            Programările trimise de cetățeni. Confirmați sau anulați fiecare cerere.
          </div>
          {apLoading && <Skeleton className="h-24 rounded-xl"/>}
          {appts?.map(ap => (
            <div key={ap.id} className={`bg-card border rounded-xl p-4 ${ap.status === "confirmat" ? "border-green-200 dark:border-green-800/40" : ap.status === "anulat" ? "border-red-200 dark:border-red-800/40" : "border-amber-200 dark:border-amber-800/40"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-sm">{ap.patientName}</p>
                  <p className="text-xs text-muted-foreground">{ap.phone} · {ap.requestedDate}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ap.status === "confirmat" ? "bg-green-100 text-green-700 border-green-200" : ap.status === "anulat" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                  {ap.status === "confirmat" ? "Confirmat" : ap.status === "anulat" ? "Anulat" : "În așteptare"}
                </span>
              </div>
              {ap.notes && <p className="text-xs text-muted-foreground mb-2 italic">{ap.notes}</p>}
              {ap.status === "in_asteptare" && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border/40">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-green-700 border-green-300 hover:bg-green-50"
                    onClick={()=>updateAppt.mutate({id:ap.id,data:{status:"confirmat"}})} disabled={updateAppt.isPending}>
                    <Check className="w-3.5 h-3.5"/>Confirmă
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs text-red-700 border-red-300 hover:bg-red-50"
                    onClick={()=>updateAppt.mutate({id:ap.id,data:{status:"anulat"}})} disabled={updateAppt.isPending}>
                    <X className="w-3.5 h-3.5"/>Anulează
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!apLoading && !appts?.length && <p className="text-center text-sm text-muted-foreground py-8">Nu există programări.</p>}
        </div>
      )}

      {/* SOCIALE */}
      {sub === "sociale" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 rounded-full" onClick={()=>setCreatingSocial(v=>!v)}>
              {creatingSocial ? <><X className="w-3.5 h-3.5"/>Anulează</> : <><Plus className="w-3.5 h-3.5"/>Program nou</>}
            </Button>
          </div>
          {creatingSocial && (
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <select className="w-full text-sm border rounded-lg px-3 py-2 bg-background" value={newSocial.type} onChange={e=>setNewSocial(p=>({...p,type:e.target.value}))}>
                {["incalzire","lemne","sprijin","informare","vouchere"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <Input placeholder="Titlu" value={newSocial.title} onChange={e=>setNewSocial(p=>({...p,title:e.target.value}))} />
              <Textarea placeholder="Descriere" className="min-h-[70px] resize-none" value={newSocial.description} onChange={e=>setNewSocial(p=>({...p,description:e.target.value}))} />
              <Input placeholder="Criterii eligibilitate" value={newSocial.eligibility} onChange={e=>setNewSocial(p=>({...p,eligibility:e.target.value}))} />
              <Input placeholder="Contact" value={newSocial.contactInfo} onChange={e=>setNewSocial(p=>({...p,contactInfo:e.target.value}))} />
              <Button size="sm" className="w-full" onClick={()=>createSocial.mutate(newSocial)} disabled={createSocial.isPending}>Adaugă</Button>
            </div>
          )}
          {sLoading && <Skeleton className="h-24 rounded-xl"/>}
          {socials?.map(s => (
            <div key={s.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s.type}</span>
                <div className="flex items-center gap-1">
                  <Select value={s.status} onValueChange={v=>updateSocial.mutate({id:s.id,data:{status:v}})}>
                    <SelectTrigger className="h-7 text-xs rounded-full w-28"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activ">Activ</SelectItem>
                      <SelectItem value="inactiv">Inactiv</SelectItem>
                      <SelectItem value="expirat">Expirat</SelectItem>
                    </SelectContent>
                  </Select>
                  <DeleteBtn onClick={()=>deleteSocial.mutate(s.id)} />
                </div>
              </div>
              <EditableRow label="Titlu" value={s.title} onSave={v=>updateSocial.mutate({id:s.id,data:{title:v}})} />
              <EditableRow label="Descriere" value={s.description} textarea onSave={v=>updateSocial.mutate({id:s.id,data:{description:v}})} />
              <EditableRow label="Eligibilitate" value={s.eligibility??""} onSave={v=>updateSocial.mutate({id:s.id,data:{eligibility:v}})} />
              <EditableRow label="Contact" value={s.contactInfo??""} onSave={v=>updateSocial.mutate({id:s.id,data:{contactInfo:v}})} />
            </div>
          ))}
          {!sLoading && !socials?.length && <p className="text-center text-sm text-muted-foreground py-8">Nu există programe sociale.</p>}
        </div>
      )}
    </div>
  );
}

// ─── COMUNITATE ADMIN TAB (marketplace + jobs + announcements) ────────────────
type ComSubTab = "marketplace" | "joburi" | "anunturi";

function ComunicareTab() {
  const [sub, setSub] = useState<ComSubTab>("marketplace");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: marketplace, isLoading: mLoading } = useQuery<MarketplaceItem[]>({
    queryKey: ["/api/admin/marketplace"], queryFn: () => api("GET", "/api/admin/marketplace"),
  });
  const { data: jobs, isLoading: jLoading } = useQuery<JobListing[]>({
    queryKey: ["/api/admin/jobs"], queryFn: () => api("GET", "/api/admin/jobs"),
  });
  const { data: anns, isLoading: annLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"], queryFn: () => api("GET", "/api/admin/announcements"),
  });

  const deleteMarket = useMutation({ mutationFn:(id:number)=>api("DELETE",`/api/marketplace/${id}`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/marketplace"]});qc.invalidateQueries({queryKey:["/api/marketplace"]});toast({title:"Anunț șters"});} });
  const updateMarket = useMutation({ mutationFn:({id,data}:{id:number;data:any})=>api("PUT",`/api/marketplace/${id}`,data), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/marketplace"]});qc.invalidateQueries({queryKey:["/api/marketplace"]});} });
  const approveMarket = useMutation({ mutationFn:(id:number)=>api("POST",`/api/marketplace/${id}/approve`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/marketplace"]});qc.invalidateQueries({queryKey:["/api/marketplace"]});toast({title:"Anunț aprobat ✓"});} });
  const rejectMarket = useMutation({ mutationFn:(id:number)=>api("POST",`/api/marketplace/${id}/reject`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/marketplace"]});qc.invalidateQueries({queryKey:["/api/marketplace"]});toast({title:"Anunț respins"});} });
  const deleteJob = useMutation({ mutationFn:(id:number)=>api("DELETE",`/api/jobs/${id}`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/jobs"]});qc.invalidateQueries({queryKey:["/api/jobs"]});toast({title:"Job șters"});} });
  const updateJob = useMutation({ mutationFn:({id,data}:{id:number;data:any})=>api("PUT",`/api/jobs/${id}`,data), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/jobs"]});qc.invalidateQueries({queryKey:["/api/jobs"]});} });
  const approveJob = useMutation({ mutationFn:(id:number)=>api("POST",`/api/jobs/${id}/approve`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/jobs"]});qc.invalidateQueries({queryKey:["/api/jobs"]});toast({title:"Job aprobat ✓"});} });
  const rejectJob = useMutation({ mutationFn:(id:number)=>api("POST",`/api/jobs/${id}/reject`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/jobs"]});qc.invalidateQueries({queryKey:["/api/jobs"]});toast({title:"Job respins"});} });
  const deleteAnn = useMutation({ mutationFn:(id:number)=>api("DELETE",`/api/announcements/${id}`), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/announcements"]});qc.invalidateQueries({queryKey:["/api/announcements"]});toast({title:"Anunț șters"});} });
  const updateAnn = useMutation({ mutationFn:({id,data}:{id:number;data:any})=>api("PUT",`/api/announcements/${id}`,data), onSuccess:()=>{qc.invalidateQueries({queryKey:["/api/admin/announcements"]});qc.invalidateQueries({queryKey:["/api/announcements"]});} });

  const ITEM_STATUS_CLASSES: Record<string, string> = {
    active:"bg-green-100 text-green-700 border-green-200", sold:"bg-blue-100 text-blue-700 border-blue-200", inactive:"bg-muted text-muted-foreground border-border",
    filled:"bg-blue-100 text-blue-700 border-blue-200", expired:"bg-muted text-muted-foreground border-border",
    pending:"bg-amber-100 text-amber-700 border-amber-200", rejected:"bg-red-100 text-red-700 border-red-200",
  };

  const TAB_DESCRIPTIONS: Record<ComSubTab, { icon: typeof ShoppingBag; desc: string }> = {
    marketplace: { icon: ShoppingBag, desc: "Vânzări/achizițiii/troc — cumpără și vinde local" },
    joburi: { icon: Briefcase, desc: "Oferte de muncă — vezi ce locuri sunt libere" },
    anunturi: { icon: Bell, desc: "Anunțuri comunitare — informații și noutăți locale" },
  };

  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground mb-2">
        Administrează conținutul postat de cetățeni în secțiunile de comunitate.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        {([["marketplace","Marketplace"],["joburi","Joburi"],["anunturi","Anunțuri"]] as const).map(([id]) => {
          const Icon = TAB_DESCRIPTIONS[id as ComSubTab].icon;
          const desc = TAB_DESCRIPTIONS[id as ComSubTab].desc;
          const count = id==="marketplace" ? (marketplace?.length??0) : id==="joburi" ? (jobs?.length??0) : (anns?.length??0);
          return (
            <button key={id} onClick={()=>setSub(id as ComSubTab)}
              className={`p-3 rounded-lg border text-left transition-all ${sub === id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-card-border hover:border-primary/50 text-foreground"}`}>
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm">{id==="marketplace"?"Marketplace":id==="joburi"?"Joburi":"Anunțuri"}</div>
                  <div className={`text-xs ${sub === id ? "opacity-90" : "text-muted-foreground"}`}>{desc}</div>
                  <div className={`text-xs font-semibold mt-1 ${sub === id ? "opacity-75" : "text-primary"}`}>{count} anunțuri</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none sm:hidden">
        {([["marketplace","Marketplace"],["joburi","Joburi"],["anunturi","Anunțuri"]] as const).map(([id, label]) => (
          <button key={id} onClick={()=>setSub(id as ComSubTab)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${sub === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {label}
            <span className="ml-1.5 text-[10px] opacity-70">
              {id==="marketplace" ? (marketplace?.length??0) : id==="joburi" ? (jobs?.length??0) : (anns?.length??0)}
            </span>
          </button>
        ))}
      </div>

      {sub === "marketplace" && (
        <div className="space-y-2">
          {mLoading && <Skeleton className="h-24 rounded-xl"/>}
          {marketplace?.map(item => (
            <div key={item.id} className={`bg-card border rounded-xl p-4 ${item.status === "pending" ? "border-amber-300 dark:border-amber-700" : "border-card-border"}`}>
              {item.status === "pending" && (
                <div className="flex items-center gap-2 mb-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex-1">Necesită aprobare</span>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-green-700 hover:text-green-800 hover:bg-green-50" onClick={()=>approveMarket.mutate(item.id)} disabled={approveMarket.isPending}><ThumbsUp className="w-3 h-3"/>Aprobă</Button>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-red-700 hover:text-red-800 hover:bg-red-50" onClick={()=>rejectMarket.mutate(item.id)} disabled={rejectMarket.isPending}><ThumbsDown className="w-3 h-3"/>Respinge</Button>
                </div>
              )}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{item.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ITEM_STATUS_CLASSES[item.status] ?? ""}`}>{item.status}</span>
                  {item.price && <span className="text-xs font-semibold text-green-700">{item.price}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Select value={item.status} onValueChange={v=>updateMarket.mutate({id:item.id,data:{status:v}})}>
                    <SelectTrigger className="h-7 text-xs rounded-full w-24"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activ</SelectItem>
                      <SelectItem value="sold">Vândut</SelectItem>
                      <SelectItem value="inactive">Inactiv</SelectItem>
                    </SelectContent>
                  </Select>
                  <DeleteBtn onClick={()=>deleteMarket.mutate(item.id)} />
                </div>
              </div>
              <EditableRow label="Titlu" value={item.title} onSave={v=>updateMarket.mutate({id:item.id,data:{title:v}})} />
              <EditableRow label="Descriere" value={item.description} textarea onSave={v=>updateMarket.mutate({id:item.id,data:{description:v}})} />
              <EditableRow label="Contact" value={item.contact} onSave={v=>updateMarket.mutate({id:item.id,data:{contact:v}})} />
              {item.price !== undefined && <EditableRow label="Preț" value={item.price??""} onSave={v=>updateMarket.mutate({id:item.id,data:{price:v}})} />}
            </div>
          ))}
          {!mLoading && !marketplace?.length && <p className="text-center text-sm text-muted-foreground py-8">Nu există anunțuri marketplace.</p>}
        </div>
      )}

      {sub === "joburi" && (
        <div className="space-y-2">
          {jLoading && <Skeleton className="h-24 rounded-xl"/>}
          {jobs?.map(job => (
            <div key={job.id} className={`bg-card border rounded-xl p-4 ${job.status === "pending" ? "border-amber-300 dark:border-amber-700" : "border-card-border"}`}>
              {job.status === "pending" && (
                <div className="flex items-center gap-2 mb-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex-1">Necesită aprobare</span>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-green-700 hover:text-green-800 hover:bg-green-50" onClick={()=>approveJob.mutate(job.id)} disabled={approveJob.isPending}><ThumbsUp className="w-3 h-3"/>Aprobă</Button>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-red-700 hover:text-red-800 hover:bg-red-50" onClick={()=>rejectJob.mutate(job.id)} disabled={rejectJob.isPending}><ThumbsDown className="w-3 h-3"/>Respinge</Button>
                </div>
              )}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{job.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ITEM_STATUS_CLASSES[job.status] ?? ""}`}>{job.status}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Select value={job.status} onValueChange={v=>updateJob.mutate({id:job.id,data:{status:v}})}>
                    <SelectTrigger className="h-7 text-xs rounded-full w-28"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activ</SelectItem>
                      <SelectItem value="filled">Ocupat</SelectItem>
                      <SelectItem value="inactive">Inactiv</SelectItem>
                    </SelectContent>
                  </Select>
                  <DeleteBtn onClick={()=>deleteJob.mutate(job.id)} />
                </div>
              </div>
              <EditableRow label="Titlu" value={job.title} onSave={v=>updateJob.mutate({id:job.id,data:{title:v}})} />
              <EditableRow label="Companie" value={job.company} onSave={v=>updateJob.mutate({id:job.id,data:{company:v}})} />
              <EditableRow label="Descriere" value={job.description} textarea onSave={v=>updateJob.mutate({id:job.id,data:{description:v}})} />
              <EditableRow label="Contact" value={job.contact} onSave={v=>updateJob.mutate({id:job.id,data:{contact:v}})} />
            </div>
          ))}
          {!jLoading && !jobs?.length && <p className="text-center text-sm text-muted-foreground py-8">Nu există oferte de joburi.</p>}
        </div>
      )}

      {sub === "anunturi" && (
        <div className="space-y-2">
          {annLoading && <Skeleton className="h-24 rounded-xl"/>}
          {anns?.map(ann => (
            <div key={ann.id} className={`bg-card border rounded-xl p-4 ${ann.status === "removed" ? "border-red-200 dark:border-red-800/40 opacity-60" : "border-card-border"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ann.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ann.status === "active" ? "bg-green-100 text-green-700 border-green-200" : ann.status === "removed" ? "bg-red-100 text-red-700 border-red-200" : "bg-muted text-muted-foreground border-border"}`}>{ann.status}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Select value={ann.status} onValueChange={v=>updateAnn.mutate({id:ann.id,data:{status:v}})}>
                    <SelectTrigger className="h-7 text-xs rounded-full w-28"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activ</SelectItem>
                      <SelectItem value="expired">Expirat</SelectItem>
                      <SelectItem value="removed">Eliminat</SelectItem>
                    </SelectContent>
                  </Select>
                  <DeleteBtn onClick={()=>deleteAnn.mutate(ann.id)} />
                </div>
              </div>
              <EditableRow label="Titlu" value={ann.title} onSave={v=>updateAnn.mutate({id:ann.id,data:{title:v}})} />
              <EditableRow label="Descriere" value={ann.description} textarea onSave={v=>updateAnn.mutate({id:ann.id,data:{description:v}})} />
              <EditableRow label="Contact" value={ann.contact} onSave={v=>updateAnn.mutate({id:ann.id,data:{contact:v}})} />
            </div>
          ))}
          {!annLoading && !anns?.length && <p className="text-center text-sm text-muted-foreground py-8">Nu există anunțuri comunitare.</p>}
        </div>
      )}
    </div>
  );
}

// ─── NOTIFICĂRI ADMIN TAB ─────────────────────────────────────────────────────
function NotificariTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ title:"", message:"", type:"info", category:"anunturi_oficiale" });
  const [lastResult, setLastResult] = useState<{ sent: number } | null>(null);

  const sendMutation = useMutation({
    mutationFn: (data: typeof form) => api("POST", "/api/admin/notifications", data),
    onSuccess: (res) => {
      setLastResult({ sent: res.sent });
      toast({ title: `Notificare trimisă la ${res.sent} utilizatori` });
      setForm({ title:"", message:"", type:"info", category:"anunturi_oficiale" });
    },
    onError: (e: Error) => toast({ variant:"destructive", title:"Eroare", description: e.message }),
  });

  const criticalMutation = useMutation({
    mutationFn: (data: { title: string; message: string }) => api("POST", "/api/alerts/critical", { ...data, type:"warning" }),
    onSuccess: (res) => {
      toast({ title: `Alertă critică trimisă la ${res.usersNotified} utilizatori` });
      setForm({ title:"", message:"", type:"info", category:"anunturi_oficiale" });
    },
    onError: (e: Error) => toast({ variant:"destructive", title:"Eroare", description: e.message }),
  });

  const TYPE_OPTIONS = [
    { value:"info", label:"Info (albastru)" },
    { value:"success", label:"Succes (verde)" },
    { value:"warning", label:"Avertizare (galben)" },
  ];
  const CATEGORY_OPTIONS = [
    { value:"anunturi_oficiale", label:"Anunțuri oficiale" },
    { value:"comunitate", label:"Comunitate" },
    { value:"evenimente", label:"Evenimente" },
    { value:"sesizari", label:"Sesizări" },
    { value:"sistem", label:"Sistem" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Trimite notificare în aplicație</h3>
        </div>
        <p className="text-xs text-muted-foreground">Notificarea va apărea în clopotul din aplicație pentru toți utilizatorii.</p>
        <Select value={form.type} onValueChange={v=>setForm(p=>({...p,type:v}))}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tip notificare" /></SelectTrigger>
          <SelectContent>{TYPE_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.category} onValueChange={v=>setForm(p=>({...p,category:v}))}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Categorie" /></SelectTrigger>
          <SelectContent>{CATEGORY_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Titlu notificare" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} />
        <Textarea placeholder="Mesaj notificare..." className="min-h-[80px] resize-none" value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} />
        <Button className="w-full gap-2" onClick={()=>sendMutation.mutate(form)} disabled={!form.title||!form.message||sendMutation.isPending}>
          <Send className="w-4 h-4" />{sendMutation.isPending ? "Trimite..." : "Trimite la toți utilizatorii"}
        </Button>
        {lastResult && (
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />Trimisă cu succes la {lastResult.sent} utilizatori
          </p>
        )}
      </div>

      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <h3 className="font-display font-semibold text-sm text-red-800 dark:text-red-400">Alertă critică (push + aplicație)</h3>
        </div>
        <p className="text-xs text-red-700 dark:text-red-400">
          Trimite o alertă urgentă cu push notification (dacă utilizatorul e abonat) și notificare în aplicație. Folosește cu atenție.
        </p>
        <Input placeholder="Titlu alertă critică" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
          className="border-red-200 dark:border-red-800" />
        <Textarea placeholder="Mesaj alertă..." className="min-h-[80px] resize-none border-red-200 dark:border-red-800" value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} />
        <Button variant="destructive" className="w-full gap-2" onClick={()=>criticalMutation.mutate({title:form.title,message:form.message})} disabled={!form.title||!form.message||criticalMutation.isPending}>
          <AlertCircle className="w-4 h-4" />{criticalMutation.isPending ? "Trimite..." : "Trimite alertă critică"}
        </Button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Admin() {
  const { user, logout, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [isLoading, user]);

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Skeleton className="w-48 h-8 rounded-xl" />
    </div>
  );

  if (!user) return null;

  const visibleTabs = TABS.filter(t => t.roles.includes(user.role));

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => { toast({ title: "Deconectat" }); navigate("/login"); },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-panel border-b border-border/60">
        <div className="max-w-2xl mx-auto flex h-14 items-center px-4 gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs">Aplicație</span>
          </Link>
          <div className="w-px h-4 bg-border mx-1" />
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm flex-1">Panou Admin</span>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold">{user.name}</p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Tab grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  active 
                    ? `${tab.bgLight} ${tab.bgDark} ${tab.color} shadow-md scale-105` 
                    : `${tab.bgLight} ${tab.bgDark} ${tab.color} hover:shadow-sm`
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold text-center leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "dashboard"  && <DashboardTab />}
        {activeTab === "posts"      && <PostsTab role={user.role} />}
        {activeTab === "events"     && <EventsTab role={user.role} />}
        {activeTab === "reports"    && <ReportsTab role={user.role} />}
        {activeTab === "businesses" && <BusinessesTab role={user.role} />}
        {activeTab === "servicii"   && <ServciiTab />}
        {activeTab === "sanatate"   && <SanatateAdminTab />}
        {activeTab === "comunicate" && <ComunicareTab />}
        {activeTab === "notificari" && <NotificariTab />}
        {activeTab === "users"      && <UsersTab />}
        {activeTab === "roles"      && <RolesTab />}
        {activeTab === "permisiuni" && <PermisiuniTab />}
        {activeTab === "settings"   && <SettingsTab />}
      </div>
    </div>
  );
}
