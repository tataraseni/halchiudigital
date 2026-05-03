import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, Info, CheckCircle2, AlertTriangle, X, Settings2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import type { Notification } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useNotificationPrefs, filterByPrefs } from "@/hooks/use-notification-prefs";
import { Link } from "wouter";

const TYPE_ICON = {
  info:    { icon: Info,          cls: "text-blue-500",  bg: "bg-blue-50 dark:bg-blue-950/40" },
  success: { icon: CheckCircle2,  cls: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40" },
  warning: { icon: AlertTriangle, cls: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40" },
};

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { prefs } = useNotificationPrefs();

  const { data: allNotifs = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // Apply user preferences filter
  const notifs = filterByPrefs(allNotifs, prefs);
  const unreadCount = notifs.filter(n => !n.read).length;
  const hiddenCount = allNotifs.length - notifs.length;

  const readAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const readOneMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors relative ${open ? "bg-primary text-white border-primary" : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-primary"}`}
        data-testid="button-notifications"
        aria-label="Notificări"
      >
        {unreadCount > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-sm flex-1">Notificări</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => readAllMutation.mutate()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  data-testid="button-mark-all-read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Toate citite
                </button>
              )}
              <Link href="/profil" onClick={() => setOpen(false)}>
                <button className="text-muted-foreground hover:text-foreground ml-1 transition-colors" title="Preferințe notificări" data-testid="button-notif-settings">
                  <Settings2 className="w-4 h-4" />
                </button>
              </Link>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden count notice */}
            {hiddenCount > 0 && (
              <div className="px-4 py-2 bg-muted/40 border-b border-border/30">
                <p className="text-[11px] text-muted-foreground text-center">
                  {hiddenCount} notificări filtrate prin preferințele tale ·{" "}
                  <Link href="/profil" onClick={() => setOpen(false)}>
                    <span className="text-primary hover:underline cursor-pointer">Modifică</span>
                  </Link>
                </p>
              </div>
            )}

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nicio notificare</p>
                  {hiddenCount > 0 && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {hiddenCount} ascunse prin preferințe
                    </p>
                  )}
                </div>
              )}
              {notifs.map(n => {
                const t = (n.type || "info") as keyof typeof TYPE_ICON;
                const { icon: Icon, cls, bg } = TYPE_ICON[t] ?? TYPE_ICON.info;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-border/40 cursor-pointer hover:bg-muted/30 transition-colors ${n.read ? "opacity-60" : ""}`}
                    onClick={() => { if (!n.read) readOneMutation.mutate(n.id); }}
                    data-testid={`notification-${n.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-3.5 h-3.5 ${cls}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-tight ${n.read ? "" : "text-foreground"}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-0.5" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ro }) : "acum"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
