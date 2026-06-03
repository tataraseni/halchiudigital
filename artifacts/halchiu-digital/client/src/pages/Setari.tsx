import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Link } from "wouter";
import { Moon, Sun, Bell, ChevronRight, LogOut, Settings, Shield, Download, Share, MoreHorizontal, Leaf, Smartphone, CheckCircle2 } from "lucide-react";
import { useNotificationPrefs, PREF_LABELS, type NotificationCategory } from "@/hooks/use-notification-prefs";
import { useInstallPrompt, isIOS, isAndroid, isMobile, isInStandaloneMode } from "@/hooks/use-pwa";

const CATEGORY_ORDER: NotificationCategory[] = [
  "anunturi_oficiale", "sesizari", "evenimente", "comunitate", "moderare", "sistem",
];

function InstallCard() {
  const { install, deferredPrompt, resetDismissed, platform } = useInstallPrompt();
  const [iosExpanded, setIosExpanded] = useState(false);
  const [androidFallback, setAndroidFallback] = useState(false);
  const installed = isInStandaloneMode();

  if (installed) {
    return (
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Aplicația e instalată</p>
          <p className="text-xs text-green-700/70 dark:text-green-400/70 mt-0.5">Rulezi Hălchiu Digital ca aplicație nativă.</p>
        </div>
      </div>
    );
  }

  const onAndroid = isAndroid() || (!isIOS() && isMobile());
  const onIOS = isIOS();

  const handleAndroidInstall = () => {
    if (deferredPrompt) {
      install();
    } else {
      resetDismissed();
      setAndroidFallback(true);
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Instalează aplicația</p>
          <p className="text-xs text-muted-foreground mt-0.5">Acces rapid, notificări și mod offline</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 gap-1.5">
        {[
          "Pictogramă pe ecranul principal",
          "Notificări push pentru anunțuri și sesizări",
          "Funcționează și fără internet",
          "Experiență ca o aplicație nativă",
        ].map(b => (
          <div key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            {b}
          </div>
        ))}
      </div>

      {/* Android install */}
      {(onAndroid || (!onIOS && !onAndroid)) && (
        <div className="space-y-2">
          <button
            onClick={handleAndroidInstall}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Instalează
          </button>
          {androidFallback && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Instalare manuală din browser:</p>
              <p>În Chrome, apasă <strong>⋮</strong> (meniu, colț dreapta sus) → <strong>Adaugă pe ecranul principal</strong>.</p>
              <p>Pagina va fi reîncărcată data viitoare cu opțiunea de instalare activă.</p>
            </div>
          )}
        </div>
      )}

      {/* iOS install */}
      {onIOS && (
        <div className="space-y-2">
          <button
            onClick={() => setIosExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Share className="w-4 h-4" />
            {iosExpanded ? "Ascunde instrucțiunile" : "Cum instalez?"}
          </button>
          {iosExpanded && (
            <div className="space-y-2">
              {[
                { icon: <Share className="w-3.5 h-3.5 text-blue-600" />, bg: "bg-blue-100 dark:bg-blue-900/40", step: '1. Apasă butonul Share', desc: 'Iconița cu săgeata în sus din bara Safari' },
                { icon: <MoreHorizontal className="w-3.5 h-3.5 text-green-600" />, bg: "bg-green-100 dark:bg-green-900/40", step: '2. „Adaugă pe ecranul principal"', desc: 'Derulează în lista de opțiuni' },
                { icon: <Leaf className="w-3.5 h-3.5 text-primary" />, bg: "bg-primary/10", step: '3. Apasă „Adaugă"', desc: 'Aplicația apare pe ecranul tău principal' },
              ].map(({ icon, bg, step, desc }) => (
                <div key={step} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                  <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
                  <div>
                    <p className="text-xs font-semibold">{step}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Setari() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { prefs, toggle: togglePref, updateMutation } = useNotificationPrefs();
  const [showLogout, setShowLogout] = useState(false);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-20">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground mb-4">Trebuie să te autentifici pentru a accesa setările.</p>
          <Link href="/login">
            <button className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors">
              Autentifică-te
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const enabledCount = Object.values(prefs).filter(Boolean).length;
  const totalCount = Object.keys(prefs).length;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg">Setări</h1>
        </div>
        <p className="text-sm text-muted-foreground">Personalizează aplicația după preferințele tale</p>
      </div>

      {/* Install card */}
      <InstallCard />

      {/* Dark Mode */}
      <div className="bg-card border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              {theme === "dark" ? <Moon className="w-4.5 h-4.5 text-primary" /> : <Sun className="w-4.5 h-4.5 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-semibold">Mod întunecat</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {theme === "dark" ? "Mod întunecat activ" : "Mod luminos activ"}
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            data-testid="button-dark-mode-toggle"
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-sm">Notificări</h2>
          </div>
          <p className="text-xs text-muted-foreground">Alege ce notificări vrei să primești</p>
        </div>

        <div className="bg-card border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40">
          {CATEGORY_ORDER.map((cat) => {
            const { label, desc } = PREF_LABELS[cat];
            const enabled = prefs[cat];
            return (
              <div key={cat} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${enabled ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => togglePref(cat)}
                  disabled={updateMutation.isPending}
                  data-testid={`toggle-notif-${cat}`}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{enabledCount} din {totalCount} categorii active</p>
      </div>

      {/* Account */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-sm">Cont</h2>
        </div>
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40">
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Utilizator</p>
            <p className="font-semibold text-sm">{user.name}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Rol</p>
            <p className="font-semibold text-sm capitalize">{user.role.replace("_", " ")}</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div>
        {!showLogout ? (
          <button
            onClick={() => setShowLogout(true)}
            className="w-full flex items-center gap-3 bg-card border border-destructive/20 rounded-xl p-4 hover:bg-destructive/5 transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4.5 h-4.5 text-destructive shrink-0" />
            <span className="flex-1 text-left font-medium text-destructive text-sm">Deconectare</span>
            <ChevronRight className="w-4 h-4 text-destructive/50 shrink-0" />
          </button>
        ) : (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-3">
            <p className="text-sm text-destructive font-medium">Sigur vrei să te deconectezi?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg font-semibold hover:bg-muted/70 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={() => {
                  logout.mutate(undefined, {
                    onSuccess: () => {
                      window.location.href = "/login";
                    }
                  });
                }}
                disabled={logout.isPending}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {logout.isPending ? "Se deconectează..." : "Deconectare"}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">Versiune 1.0 · Toate setările sunt sincronizate</p>
    </div>
  );
}
