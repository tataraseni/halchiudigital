import { useMemo, useEffect, useState } from "react";
import { usePosts, useReports, useEvents } from "@/hooks/use-halchiu";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useWidgets, WIDGET_IDS, WIDGET_LABELS, type WidgetId } from "@/hooks/use-widgets";
import { formatDistanceToNow, isToday, isThisWeek, format, differenceInDays } from "date-fns";
import { ro } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import {
  AlertTriangle, Megaphone, Users, Leaf, Bell, CheckCircle2,
  CalendarDays, ChevronRight, TrendingUp, Sparkles, Clock, MapPin,
  SlidersHorizontal, X, Eye, EyeOff, RotateCcw,
} from "lucide-react";
import { Link } from "wouter";
import type { Post, Report, Event } from "@/hooks/use-halchiu";

// ── type config ────────────────────────────────────────────────────────────────
const typeConfig: Record<string, { label: string; icon: typeof Megaphone; color: string; bg: string; priority: number }> = {
  alert:        { label: "Alertă",        icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", priority: 0 },
  announcement: { label: "Anunț oficial", icon: Megaphone,     color: "text-primary",     bg: "bg-primary/10 border-primary/20",         priority: 1 },
  community:    { label: "Comunitate",    icon: Users,         color: "text-accent",      bg: "bg-accent/10 border-accent/20",            priority: 2 },
};

// ── PostCard ───────────────────────────────────────────────────────────────────
function PostCard({ post, index }: { post: Post; index: number }) {
  const cfg = typeConfig[post.type] ?? typeConfig.community;
  const Icon = cfg.icon;
  const isNew = isToday(post.createdAt);

  return (
    <article
      className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`post-${post.id}`}
    >
      {post.imageUrl && (
        <div className="relative aspect-[16/7] overflow-hidden">
          <img src={post.imageUrl} alt={post.title} loading="lazy" className="object-cover w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
            <Icon className="w-3 h-3" />{cfg.label}
          </span>
          {post.category && <Badge variant="outline" className="text-xs font-normal">{post.category}</Badge>}
          {isNew && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">Nou</span>
          )}
        </div>
        <h3 className="font-display font-bold text-base leading-tight mb-1">{post.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.content}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">{post.author}</span>
          <div className="flex items-center gap-2">
            <span>{formatDistanceToNow(post.createdAt, { addSuffix: true, locale: ro })}</span>
            <ShareButton title={post.title} text={post.content} url={window.location.origin} />
          </div>
        </div>
      </div>
    </article>
  );
}

// ── ResolvedWinCard ────────────────────────────────────────────────────────────
function ResolvedWinCard({ report }: { report: Report }) {
  return (
    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 animate-fade-in" data-testid={`resolved-${report.id}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded-full">Rezolvat</span>
            {report.category && <Badge variant="outline" className="text-xs">{report.category}</Badge>}
          </div>
          <p className="font-semibold text-sm text-foreground leading-tight mb-1">{report.title}</p>
          {report.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
              <MapPin className="w-2.5 h-2.5" />{report.location}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(report.createdAt, { addSuffix: true, locale: ro })}</span>
            <ShareButton
              title={`Rezolvat: ${report.title}`}
              text={`Sesizarea a fost rezolvata de Primaria Halchiu prin aplicatia Halchiu Digital.`}
              url={window.location.origin}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DailyPulse ─────────────────────────────────────────────────────────────────
function DailyPulse({ newCount, todayDate }: { newCount: number; todayDate: string }) {
  if (newCount === 0) return null;
  return (
    <div className="flex items-center gap-2.5 bg-primary/5 border border-primary/15 rounded-xl px-3.5 py-2.5 mb-4 animate-fade-in" data-testid="daily-pulse">
      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
      <p className="text-xs text-primary font-medium flex-1">
        <span className="font-bold">{newCount} {newCount === 1 ? "noutate" : "noutăți"}</span> în {todayDate}
      </p>
      <Sparkles className="w-3.5 h-3.5 text-primary/60 shrink-0" />
    </div>
  );
}

// ── ProgressStrip ──────────────────────────────────────────────────────────────
function ProgressStrip({
  resolvedCount, activeCount, totalParticipants, weekPosts, userContributions,
}: {
  resolvedCount: number; activeCount: number; totalParticipants: number; weekPosts: number; userContributions: number;
}) {
  const stats = [
    { value: resolvedCount,      label: "Sesizări rezolvate",         icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" },
    { value: activeCount,        label: "Sesizări active",            icon: Clock,        color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" },
    { value: totalParticipants,  label: "Participanți evenimente",    icon: Users,        color: "text-blue-600",  bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
    { value: weekPosts,          label: "Postări această săptămână",  icon: TrendingUp,   color: "text-primary",   bg: "bg-primary/5 border-primary/20" },
  ].filter(s => s.value > 0);

  if (stats.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Comunitatea ta</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {stats.map(({ value, label, icon: Icon, color, bg }) => (
          <div key={label} className={`flex flex-col items-center gap-0.5 border rounded-xl px-3.5 py-2.5 shrink-0 min-w-[72px] ${bg}`}>
            <Icon className={`w-4 h-4 ${color} mb-0.5`} />
            <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
          </div>
        ))}
        {userContributions > 0 && (
          <div className="flex flex-col items-center gap-0.5 border border-primary/30 bg-primary/5 rounded-xl px-3.5 py-2.5 shrink-0 min-w-[72px]">
            <Leaf className="w-4 h-4 text-primary mb-0.5" />
            <span className="text-lg font-bold leading-none text-primary">{userContributions}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">ale tale</span>
          </div>
        )}
      </div>
      {userContributions > 0 && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
          Ai contribuit la <span className="font-semibold text-foreground">&nbsp;{userContributions} {userContributions === 1 ? "schimbare locală" : "schimbări locale"}</span>
        </p>
      )}
    </div>
  );
}

// ── DailyAction ────────────────────────────────────────────────────────────────
function DailyAction({ nextEvent }: { nextEvent: Event | null }) {
  if (nextEvent) {
    const daysUntil = differenceInDays(nextEvent.date, new Date());
    const when = daysUntil === 0 ? "Azi" : daysUntil === 1 ? "Mâine" : `În ${daysUntil} zile`;
    return (
      <div className="mb-5 animate-fade-in" data-testid="daily-action">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Acțiunea zilei</p>
        <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">{when}</span>
              <span className="text-xs text-muted-foreground">{nextEvent.participantCount} participanți</span>
            </div>
            <p className="font-semibold text-sm leading-tight truncate">{nextEvent.title}</p>
            <p className="text-xs text-muted-foreground truncate">{nextEvent.location}</p>
          </div>
          <Link href="/evenimente">
            <Button size="sm" className="shrink-0 h-8 px-3 gap-1 text-xs" data-testid="button-daily-action-event">
              Participă <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 animate-fade-in" data-testid="daily-action">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Acțiunea zilei</p>
      <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">Raportează o problemă</p>
          <p className="text-xs text-muted-foreground">Ajută comunitatea să se îmbunătățească</p>
        </div>
        <Link href="/primaria">
          <Button size="sm" variant="outline" className="shrink-0 h-8 px-3 gap-1 text-xs" data-testid="button-daily-action-report">
            Sesizare <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── WidgetCustomizer (slide-up drawer) ────────────────────────────────────────
function WidgetToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function WidgetCustomizer({
  open, onClose, prefs, toggle, reset, enabledCount,
}: {
  open: boolean;
  onClose: () => void;
  prefs: Record<WidgetId, boolean>;
  toggle: (id: WidgetId) => void;
  reset: () => void;
  enabledCount: number;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-card border border-card-border rounded-t-2xl shadow-2xl pb-safe animate-fade-in">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/60">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-sm flex-1">Personalizează pagina principală</span>
          <span className="text-xs text-muted-foreground">{enabledCount}/{WIDGET_IDS.length} active</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground px-4 pt-2 pb-3">Activează sau dezactivează secțiunile vizibile pe pagina principală.</p>
        <div className="px-4 space-y-3 pb-4">
          {WIDGET_IDS.map(id => {
            const { label, desc } = WIDGET_LABELS[id];
            const enabled = prefs[id];
            return (
              <div key={id} className="flex items-center justify-between gap-3" data-testid={`widget-row-${id}`}>
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className={`mt-0.5 shrink-0 ${enabled ? "text-primary" : "text-muted-foreground/40"}`}>
                    {enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium leading-tight ${enabled ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
                <WidgetToggle checked={enabled} onChange={() => toggle(id)} />
              </div>
            );
          })}
        </div>
        <div className="px-4 pb-6 pt-1 border-t border-border/40">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-widget-reset"
          >
            <RotateCcw className="w-3 h-3" /> Resetează la implicit
          </button>
        </div>
      </div>
    </>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: posts,   isLoading: postsLoading   } = usePosts();
  const { data: reports, isLoading: reportsLoading  } = useReports();
  const { data: events,  isLoading: eventsLoading   } = useEvents();
  const { user } = useAuth();
  const { s } = useSettings();
  const { prefs, toggle, reset, show, enabledCount } = useWidgets();
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const [userContributions] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("halchiu_reports_count") ?? "0", 10) || 0; } catch { return 0; }
  });

  const [newSinceLastVisit, setNewSinceLastVisit] = useState(0);
  useEffect(() => {
    if (enabledCount === 0) {
      reset();
    }
  }, [enabledCount, reset]);

  useEffect(() => {
    const lastVisit = parseInt(localStorage.getItem("halchiu_last_visit") ?? "0", 10);
    const now = Date.now();
    if (posts && lastVisit > 0) {
      const n = posts.filter(p => new Date(p.createdAt).getTime() > lastVisit).length;
      setNewSinceLastVisit(n);
    }
    localStorage.setItem("halchiu_last_visit", String(now));
  }, [posts]);

  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => {
      const pa = typeConfig[a.type]?.priority ?? 2;
      const pb = typeConfig[b.type]?.priority ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts]);

  const resolvedCount    = useMemo(() => reports?.filter(r => r.status === "rezolvat").length ?? 0, [reports]);
  const activeCount      = useMemo(() => reports?.filter(r => r.status !== "rezolvat").length ?? 0, [reports]);
  const totalParticipants = useMemo(() => events?.reduce((s, e) => s + e.participantCount, 0) ?? 0, [events]);
  const weekPosts        = useMemo(() => posts?.filter(p => isThisWeek(p.createdAt)).length ?? 0, [posts]);

  const resolvedReports = useMemo(() => {
    if (!reports) return [];
    return reports.filter(r => r.status === "rezolvat").slice(0, 2);
  }, [reports]);

  const nextEvent = useMemo<Event | null>(() => {
    if (!events) return null;
    const upcoming = events
      .filter(e => e.date >= new Date() && differenceInDays(e.date, new Date()) <= 14)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming[0] ?? null;
  }, [events]);

  const todayStr = format(new Date(), "d MMMM", { locale: ro });
  const isLoading = postsLoading || reportsLoading || eventsLoading;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-5 bg-gradient-to-br from-primary to-primary/80 p-6 text-white shadow-lg shadow-primary/20">
        <div className="absolute top-0 right-0 opacity-10">
          <Leaf className="w-32 h-32 -mt-4 -mr-4" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">{s("home_hero_county")}</p>
        <h1 className="font-display text-2xl font-bold mb-1">{s("home_hero_title")}</h1>
        <p className="text-sm opacity-85">{s("home_hero_subtitle")}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs opacity-70">{format(new Date(), "EEEE, d MMMM yyyy", { locale: ro })}</span>
          <button
            onClick={() => setCustomizerOpen(true)}
            className="flex items-center gap-1 text-[10px] font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2 py-1 rounded-full transition-colors"
            data-testid="button-customize-widgets"
          >
            <SlidersHorizontal className="w-3 h-3" />
            Personalizează
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <div className="flex gap-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 flex-1 rounded-xl" />)}</div>
        </div>
      ) : (
        <>
          {show("daily_pulse") && (
            <DailyPulse newCount={newSinceLastVisit} todayDate={todayStr} />
          )}

          {show("progress") && (
            <ProgressStrip
              resolvedCount={resolvedCount}
              activeCount={activeCount}
              totalParticipants={totalParticipants}
              weekPosts={weekPosts}
              userContributions={userContributions}
            />
          )}

          {show("daily_action") && (
            <DailyAction nextEvent={nextEvent} />
          )}

          {show("success_stories") && resolvedReports.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Schimbări recente</p>
              <div className="space-y-3">
                {resolvedReports.map(r => <ResolvedWinCard key={r.id} report={r} />)}
              </div>
            </div>
          )}

          {show("feed") && (
            <>
              <h2 className="font-display font-bold text-lg mb-3">{s("home_feed_title")}</h2>
              <div className="space-y-4">
                {sortedPosts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
                {sortedPosts.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-12">Nu există postări momentan.</p>
                )}
              </div>
            </>
          )}

          {enabledCount === 0 && (
            <div className="py-12 text-center">
              <EyeOff className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Toate secțiunile sunt ascunse</p>
              <button
                onClick={() => setCustomizerOpen(true)}
                className="text-xs text-primary hover:underline mt-2"
              >
                Personalizează pagina →
              </button>
            </div>
          )}
        </>
      )}

      <WidgetCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        prefs={prefs}
        toggle={toggle}
        reset={reset}
        enabledCount={enabledCount}
      />
    </div>
  );
}
