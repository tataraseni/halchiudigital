import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, canViewAdmin } from "@/hooks/use-auth";
import { useReports, usePosts, useEvents } from "@/hooks/use-halchiu";
import { useSettings } from "@/hooks/use-settings";
import { Link } from "wouter";
import {
  User, Shield, CheckCircle2, Star, TrendingUp, MessageSquare,
  AlertCircle, Award, Calendar, Wifi, WifiOff, ChevronRight, LogIn,
  Bell, BellOff, Smartphone, Trophy, Zap, MapPin, ShoppingBag,
  Briefcase, Heart, Stethoscope, Medal, Flame, Target,
} from "lucide-react";
import { useOnlineStatus, usePushNotifications } from "@/hooks/use-pwa";
import { useNotificationPrefs, PREF_LABELS, type NotificationCategory } from "@/hooks/use-notification-prefs";
import { BADGE_META, BADGE_TYPES, LEVELS, getLevel, getNextLevel } from "@shared/schema";
import type { BadgeType } from "@shared/schema";

// ─── Types ─────────────────────────────────────────────────────────────────
interface GamificationStats {
  points: number;
  badges: { id: number; userId: number; badgeType: string; awardedAt: string }[];
  activity: {
    reports: number; posts: number; marketplace: number;
    jobs: number; announcements: number; appointments: number; eventJoins: number;
  };
}
interface LeaderboardEntry {
  id: number; name: string; role: string; points: number; badgeCount: number;
}

// ─── Badge Icon Map ────────────────────────────────────────────────────────
const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MapPin, TrendingUp, MessageSquare, Star, Heart, ShoppingBag,
  Briefcase, Calendar, Stethoscope, Award, Trophy, Shield,
};

// ─── Color utilities ───────────────────────────────────────────────────────
function badgeColor(color: string) {
  const map: Record<string, string> = {
    amber:   "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 text-amber-600",
    orange:  "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 text-orange-600",
    blue:    "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 text-blue-600",
    purple:  "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800 text-purple-600",
    rose:    "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800 text-rose-600",
    teal:    "bg-teal-50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800 text-teal-600",
    cyan:    "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/20 dark:border-cyan-800 text-cyan-600",
    indigo:  "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800 text-indigo-600",
    green:   "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800 text-green-600",
    yellow:  "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800 text-yellow-600",
    gold:    "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 text-amber-700",
    primary: "bg-primary/5 border-primary/20 text-primary",
  };
  return map[color] ?? map.primary;
}

function levelBg(idx: number) {
  const bgs = ["bg-muted/50", "bg-blue-50 dark:bg-blue-950/20", "bg-green-50 dark:bg-green-950/20", "bg-purple-50 dark:bg-purple-950/20", "bg-amber-50 dark:bg-amber-950/20", "bg-primary/5"];
  return bgs[idx] ?? bgs[0];
}

// ─── Progress Bar ──────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Badge Card ────────────────────────────────────────────────────────────
function BadgeCard({ type, earned, awardedAt }: { type: BadgeType; earned: boolean; awardedAt?: string }) {
  const meta = BADGE_META[type];
  const Icon = BADGE_ICONS[meta.icon] ?? Award;
  const colorClass = badgeColor(meta.color);
  const [showTip, setShowTip] = useState(false);

  return (
    <button
      onClick={() => setShowTip(v => !v)}
      data-testid={`badge-${type}`}
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all focus:outline-none ${
        earned ? colorClass : "bg-muted/20 border-muted/40 opacity-45 grayscale"
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${earned ? "bg-white/60 dark:bg-black/20" : "bg-muted"}`}>
        <Icon className={`w-4.5 h-4.5 ${earned ? colorClass.split(" ").find(c => c.startsWith("text-")) : "text-muted-foreground"}`} />
      </div>
      <p className={`text-[11px] font-semibold leading-tight ${earned ? "text-foreground" : "text-muted-foreground"}`}>{meta.label}</p>
      {earned && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 absolute top-2 right-2" />}
      {showTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover border border-border rounded-lg shadow-lg p-2.5 text-xs text-left z-20 w-40 pointer-events-none">
          <p className="font-semibold mb-0.5">{meta.label}</p>
          <p className="text-muted-foreground">{meta.desc}</p>
          {awardedAt && <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(awardedAt).toLocaleDateString("ro-RO")}</p>}
        </div>
      )}
    </button>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      data-testid={`toggle-${checked ? "on" : "off"}`}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

// ─── Leaderboard Row ───────────────────────────────────────────────────────
function LeaderboardRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  const level = getLevel(entry.points);
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/40"}`}
      data-testid={`leaderboard-row-${entry.id}`}>
      <div className="w-7 text-center">
        {medal
          ? <span className="text-base">{medal}</span>
          : <span className="text-xs font-bold text-muted-foreground">{rank}</span>}
      </div>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">{entry.name[0]?.toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate leading-tight ${isMe ? "text-primary" : "text-foreground"}`}>
          {entry.name}{isMe && " (tu)"}
        </p>
        <p className={`text-[10px] ${level.color}`}>{level.name}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-foreground">{entry.points}</p>
        <p className="text-[10px] text-muted-foreground">{entry.badgeCount} insigne</p>
      </div>
    </div>
  );
}

// ─── Points actions reference ──────────────────────────────────────────────
const POINT_ACTIONS = [
  { icon: AlertCircle, label: "Sesizare trimisă",    pts: "+10", color: "text-amber-600" },
  { icon: MessageSquare, label: "Postare comunitate", pts: "+5",  color: "text-blue-600"  },
  { icon: Heart, label: "Eveniment voluntariat",       pts: "+5",  color: "text-rose-600"  },
  { icon: Briefcase, label: "Anunț de angajare",       pts: "+5",  color: "text-cyan-600"  },
  { icon: Calendar, label: "Participi la eveniment",   pts: "+3",  color: "text-indigo-600" },
  { icon: ShoppingBag, label: "Anunț Marketplace",     pts: "+3",  color: "text-teal-600"  },
  { icon: MapPin, label: "Anunț comunitar",             pts: "+2",  color: "text-green-600" },
  { icon: Stethoscope, label: "Programare medicală",   pts: "+2",  color: "text-primary"   },
];

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Profil() {
  const { user } = useAuth();
  const { data: allEvents } = useEvents();
  const { data: allReports } = useReports();
  const { data: allPosts } = usePosts();
  const { s } = useSettings();
  const isOnline = useOnlineStatus();
  const { prefs, toggle, updateMutation } = useNotificationPrefs();
  const { isSupported: pushSupported, isPushEnabled, isLoading: pushLoading, requestPush, disablePush } = usePushNotifications();

  const [leaderboardTab, setLeaderboardTab] = useState(false);

  const { data: stats } = useQuery<GamificationStats>({
    queryKey: ["/api/gamification/stats"],
    enabled: !!user,
    refetchOnWindowFocus: true,
  });
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/gamification/leaderboard"],
  });

  const points = stats?.points ?? user?.points ?? 0;
  const earnedBadgeTypes = new Set((stats?.badges ?? []).map(b => b.badgeType));
  const earnedCount = earnedBadgeTypes.size;
  const badgeAwardDates = Object.fromEntries((stats?.badges ?? []).map(b => [b.badgeType, b.awardedAt]));

  const level = getLevel(points);
  const nextLevel = getNextLevel(points);
  const levelIdx = LEVELS.findIndex(l => l.name === level.name);
  const progressPct = nextLevel
    ? Math.round(((points - level.min) / (nextLevel.min - level.min)) * 100)
    : 100;

  const resolvedCount     = useMemo(() => allReports?.filter(r => r.status === "rezolvat").length ?? 0, [allReports]);
  const communityPosts    = useMemo(() => allPosts?.filter(p => p.type === "community").length ?? 0, [allPosts]);
  const upcomingEvents    = useMemo(() => allEvents?.filter(e => new Date(e.date) >= new Date()).length ?? 0, [allEvents]);
  const totalParticipants = useMemo(() => allEvents?.reduce((s, e) => s + e.participantCount, 0) ?? 0, [allEvents]);

  const enabledCount = Object.values(prefs).filter(Boolean).length;
  const totalCount   = Object.keys(prefs).length;

  const CATEGORY_ORDER: NotificationCategory[] = [
    "anunturi_oficiale", "sesizari", "evenimente", "comunitate", "moderare", "sistem",
  ];

  const myRank = leaderboard.findIndex(e => e.id === user?.id) + 1;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-5">

      {/* ── Profile hero ──────────────────────────────────────────────────── */}
      <div className={`relative rounded-2xl overflow-hidden p-5 text-white shadow-lg shadow-primary/20 ${levelBg(levelIdx)} bg-gradient-to-br from-primary/90 to-primary/70`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 text-white font-bold text-xl">
              {user ? user.name[0].toUpperCase() : <User className="w-7 h-7" />}
            </div>
            {earnedCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-[9px] font-bold text-amber-900">{earnedCount}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl leading-tight">
              {user ? user.name : "Vizitator"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {user && (
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 opacity-80" />
                  <span className="text-xs opacity-80 capitalize">{user.role.replace("_", " ")}</span>
                </div>
              )}
              <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isOnline ? "bg-green-400/30" : "bg-white/10"}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? "Online" : "Offline"}
              </div>
              {myRank > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20">
                  <Medal className="w-3 h-3" />
                  Loc #{myRank}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Level + points */}
        {user ? (
          <div className="bg-white/15 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-300" />
                <span className="text-sm font-bold">{level.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-sm font-bold">{points} puncte</span>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden mb-1">
              <div
                className="h-2 rounded-full bg-amber-300 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {nextLevel
              ? <p className="text-[10px] opacity-75">{nextLevel.min - points} puncte până la <strong>{nextLevel.name}</strong></p>
              : <p className="text-[10px] opacity-75">Nivel maxim atins! 🎉</p>}
          </div>
        ) : (
          <div className="bg-white/15 rounded-xl p-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300" />
            <p className="text-xs font-medium">Autentifică-te pentru a câștiga puncte și insigne</p>
          </div>
        )}
      </div>

      {/* ── Personal stats grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: points,                                label: "Puncte",    Icon: Star,          color: "text-yellow-500" },
          { value: stats?.activity?.reports ?? 0,        label: "Sesizări",  Icon: AlertCircle,   color: "text-amber-600"  },
          { value: stats?.activity?.posts ?? 0,          label: "Postări",   Icon: MessageSquare, color: "text-blue-600"   },
          { value: earnedCount,                           label: "Insigne",   Icon: Award,         color: "text-primary"    },
        ].map(({ value, label, Icon, color }) => (
          <div key={label} className="bg-card border border-border/60 rounded-xl p-3 text-center" data-testid={`stat-${label.toLowerCase()}`}>
            <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
            <p className="text-lg font-bold font-display">{value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Badges ────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold text-sm flex-1">Insignele mele</h2>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">{earnedCount}/{BADGE_TYPES.length}</span>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <ProgressBar value={earnedCount} max={BADGE_TYPES.length} />
          {earnedCount === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {user ? "Trimite o sesizare sau postează pentru prima insignă!" : "Autentifică-te pentru a câștiga insigne."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {BADGE_TYPES.map(type => (
            <BadgeCard
              key={type}
              type={type}
              earned={earnedBadgeTypes.has(type)}
              awardedAt={badgeAwardDates[type]}
            />
          ))}
        </div>
      </div>

      {/* ── How to earn points ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold text-sm">Cum câștig puncte?</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {POINT_ACTIONS.map(({ icon: Icon, label, pts, color }) => (
            <div key={label} className="flex items-center gap-2 bg-muted/30 rounded-lg px-2.5 py-2">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{label}</p>
              </div>
              <span className="text-xs font-bold text-green-600 shrink-0">{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ───────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-xl p-4">
        <button
          className="flex items-center gap-2 w-full"
          onClick={() => setLeaderboardTab(v => !v)}
          data-testid="button-leaderboard-toggle"
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <h2 className="font-display font-semibold text-sm flex-1 text-left">Clasament comunitar</h2>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${leaderboardTab ? "rotate-90" : ""}`} />
        </button>

        {leaderboardTab && (
          <div className="mt-3 space-y-1">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nimeni nu a acumulat puncte încă.</p>
            ) : leaderboard.map((entry, i) => (
              <LeaderboardRow key={entry.id} entry={entry} rank={i + 1} isMe={entry.id === user?.id} />
            ))}
            {myRank === 0 && user && (
              <p className="text-xs text-muted-foreground text-center pt-2">Tu nu ești încă în top 10. Participă activ!</p>
            )}
          </div>
        )}

        {!leaderboardTab && leaderboard.length > 0 && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-xl">
            <span className="text-lg">{leaderboard[0] ? "🥇" : "—"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{leaderboard[0]?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{leaderboard[0]?.points ?? 0} puncte</p>
            </div>
            <p className="text-xs text-muted-foreground">Apasă pentru top 10 →</p>
          </div>
        )}
      </div>

      {/* ── Community snapshot ────────────────────────────────────────────── */}
      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold text-sm">Comunitatea {s("app_name")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: resolvedCount,     label: "Probleme rezolvate",     color: "text-green-600"  },
            { value: communityPosts,    label: "Postări comunitate",     color: "text-blue-600"   },
            { value: upcomingEvents,    label: "Evenimente viitoare",    color: "text-primary"    },
            { value: totalParticipants, label: "Participanți la events", color: "text-orange-600" },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-muted/40 rounded-xl p-3">
              <p className={`text-lg font-bold font-display ${color}`}>{value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Push notifications ────────────────────────────────────────────── */}
      {user && pushSupported && (
        <div className="bg-card border border-border/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-sm flex-1">Notificări pe telefon</h2>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isPushEnabled ? "bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700 dark:text-green-400" : "bg-muted/50 border-border text-muted-foreground"}`}>
              {isPushEnabled ? "Activat" : "Inactiv"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Primești notificări direct pe telefon chiar dacă aplicația este închisă.
          </p>
          <button
            onClick={isPushEnabled ? disablePush : requestPush}
            disabled={pushLoading}
            data-testid="button-push-toggle"
            className={`w-full h-9 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 ${isPushEnabled ? "bg-muted/40 border-border text-muted-foreground hover:bg-muted/70" : "bg-primary text-white border-primary hover:bg-primary/90"}`}
          >
            {pushLoading ? "Se procesează..." : isPushEnabled ? "Dezactivează notificările push" : "Activează notificările push"}
          </button>
        </div>
      )}

      {/* ── Notification preferences ─────────────────────────────────────── */}
      {user && (
        <div className="bg-card border border-border/60 rounded-xl p-4" id="notificari">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-sm flex-1">Preferințe notificări</h2>
            <span className="text-xs text-muted-foreground">{enabledCount}/{totalCount} active</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Alege ce tipuri de notificări vrei să primești.
          </p>
          <div className="space-y-3">
            {CATEGORY_ORDER.map(cat => {
              const { label, desc } = PREF_LABELS[cat];
              const enabled = prefs[cat];
              return (
                <div key={cat} className="flex items-center justify-between gap-3" data-testid={`pref-${cat}`}>
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={`mt-0.5 shrink-0 ${enabled ? "text-primary" : "text-muted-foreground/40"}`}>
                      {enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium leading-tight ${enabled ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <Toggle checked={enabled} onChange={() => toggle(cat)} disabled={updateMutation.isPending} />
                </div>
              );
            })}
          </div>
          {enabledCount === 0 && (
            <div className="mt-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2.5">
              <BellOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">Toate notificările sunt dezactivate.</p>
            </div>
          )}
          {updateMutation.isPending && (
            <p className="text-xs text-muted-foreground text-center mt-3">Salvez preferințele...</p>
          )}
        </div>
      )}

      {/* ── Quick links ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {[
          { href: "/primaria",   icon: AlertCircle,   label: "Trimite o sesizare",     sub: "Raportează o problemă • +10 pts" },
          { href: "/comunitate", icon: MessageSquare, label: "Postează în comunitate", sub: "Contribuie la dialog • +5 pts"   },
          { href: "/sanatate",   icon: Heart,         label: "Sănătate locală",        sub: "Campanii, medici, programări"    },
        ].map(({ href, icon: Icon, label, sub }) => (
          <Link key={href} href={href}>
            <div className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors" data-testid={`profil-link-${href.replace("/", "")}`}>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Admin / Auth ──────────────────────────────────────────────────── */}
      {user && canViewAdmin(user.role) ? (
        <Link href="/admin">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-4.5 h-4.5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Panou Administrare</p>
              <p className="text-xs text-muted-foreground">Accesat ca {user.role.replace("_", " ")}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>
      ) : !user ? (
        <Link href="/login">
          <div className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-3">
            <LogIn className="w-4.5 h-4.5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Autentifică-te</p>
              <p className="text-xs text-muted-foreground">Pentru puncte, insigne și funcții avansate</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">{s("app_name")} · {s("app_county")} · v1.0</p>
    </div>
  );
}
