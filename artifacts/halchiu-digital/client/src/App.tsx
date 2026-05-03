import React, { useState } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Primaria from "@/pages/Primaria";
import Evenimente from "@/pages/Evenimente";
import Comunitate from "@/pages/Comunitate";
import Afaceri from "@/pages/Afaceri";
import Servicii from "@/pages/Servicii";
import Sanatate from "@/pages/Sanatate";
import Profil from "@/pages/Profil";
import Setari from "@/pages/Setari";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Admin from "@/pages/Admin";
import QRInstall from "@/pages/QRInstall";
import { BottomNav } from "@/components/bottom-nav";
import { LocationGate } from "@/components/location-gate";
import { OfflineBanner } from "@/components/offline-banner";
import { InstallPrompt } from "@/components/install-prompt";
import { NotificationsBell } from "@/components/notifications-bell";
import { TutorialOverlay } from "@/components/tutorial-overlay";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSettings } from "@/hooks/use-settings";
import { useServiceWorker } from "@/hooks/use-pwa";
import { useAuth } from "@/hooks/use-auth";
import { useThemeState, ThemeContext } from "@/hooks/use-theme";
import { Link } from "wouter";
import { User, Sun, Moon, Plus, AlertCircle, MessageSquare, CalendarDays, LogOut } from "lucide-react";

function AppHeader() {
  const { s } = useSettings();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { theme, toggle } = useThemeState();
  const isProfilActive = location === "/profil";
  const [fabOpen, setFabOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-border/60">
      <div className="max-w-lg mx-auto flex h-14 items-center px-4 gap-2">
        {/* Left: Logo + App Name */}
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs">{s("app_logo_text")}</span>
        </div>
        <span className="font-display font-bold text-base">{s("app_name")}</span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: County + Actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">{s("app_county")}</span>

          {/* Quick Action Inline */}
          <button
            onClick={() => setFabOpen(v => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors relative"
            data-testid="button-header-fab"
            aria-label="Acțiune rapidă"
            title="Sesizare / Postare / Eveniment"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* FAB dropdown menu */}
          {fabOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />
              <div className="absolute top-14 right-4 z-50 bg-card border border-border rounded-2xl shadow-xl py-2 w-56 animate-fade-in">
                <button onClick={() => { setFabOpen(false); window.location.href = "/primaria"; }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors">
                  <AlertCircle className="w-4 h-4 inline mr-2" /> Sesizare
                </button>
                <button onClick={() => { setFabOpen(false); window.location.href = "/comunitate"; }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors">
                  <MessageSquare className="w-4 h-4 inline mr-2" /> Postare
                </button>
                {user && ["administrator", "primar", "viceprimar"].includes(user.role) && (
                  <button onClick={() => { setFabOpen(false); window.location.href = "/admin"; }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors">
                    <CalendarDays className="w-4 h-4 inline mr-2" /> Eveniment
                  </button>
                )}
              </div>
            </>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            data-testid="button-theme-toggle"
            aria-label={theme === "dark" ? "Activează modul luminos" : "Activează modul întunecat"}
          >
            {theme === "dark"
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />}
          </button>

          <NotificationsBell />

          {user ? (
            <div className="relative group">
              <button
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${isProfilActive ? "bg-primary text-white border-primary" : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-primary"}`}
                data-testid="button-header-profil"
                aria-label="Profilul meu"
              >
                <span className="text-xs font-bold">{user.name[0].toUpperCase()}</span>
              </button>
              <div className="absolute right-0 top-10 w-40 bg-card border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link href="/profil">
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors">Profilul meu</button>
                </Link>
                <button
                  onClick={() => logout.mutate()}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2"
                  data-testid="button-logout"
                >
                  <LogOut className="w-3.5 h-3.5" /> Deconectare
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login">
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                data-testid="button-header-login"
                aria-label="Conectare"
              >
                <User className="w-4 h-4" />
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function AppShell() {
  const { status, distanceKm, requestLocation } = useGeolocation();
  const [path] = useLocation();
  useServiceWorker();

  const isAuthPath = path === "/login" || path === "/admin" || path === "/register";
  const isQRPath = path === "/qr";

  if (isQRPath) return <QRInstall />;

  if (status !== "unlocked" && !isAuthPath) {
    return (
      <LocationGate
        status={status}
        distanceKm={distanceKm}
        onRequest={requestLocation}
      />
    );
  }

  if (isAuthPath) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/admin" component={Admin} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <OfflineBanner />
      <InstallPrompt />
      <AppHeader />
      <TutorialOverlay />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/primaria" component={Primaria} />
          <Route path="/evenimente" component={Evenimente} />
          <Route path="/comunitate" component={Comunitate} />
          <Route path="/afaceri" component={Afaceri} />
          <Route path="/servicii" component={Servicii} />
          <Route path="/sanatate" component={Sanatate} />
          <Route path="/profil" component={Profil} />
          <Route path="/setari" component={Setari} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <BottomNav />
    </div>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeState = useThemeState();
  return (
    <ThemeContext.Provider value={themeState}>
      {children}
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Router>
            <AppShell />
          </Router>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
