import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, X, AlertCircle, Users, CalendarDays } from "lucide-react";
import { vibrate } from "@/hooks/use-pwa";
import { useAuth, canManageEvents } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function QuickActionFAB() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const canAddEvent = user && canManageEvents(user.role);

  const ACTIONS = [
    {
      icon: AlertCircle,
      label: "Sesizare",
      sub: "Raportează o problemă",
      href: "/primaria",
      color: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400",
      allowed: true,
    },
    {
      icon: Users,
      label: "Postare",
      sub: "Scrie în comunitate",
      href: "/comunitate",
      color: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
      allowed: true,
    },
    {
      icon: CalendarDays,
      label: "Eveniment",
      sub: canAddEvent ? "Adaugă în admin" : "Propune un eveniment",
      href: canAddEvent ? "/admin" : "/evenimente?propune=1",
      color: "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",
      allowed: !!user,
    },
  ];

  const toggle = () => {
    vibrate(30);
    setOpen(v => !v);
  };

  const handleAction = (href: string | null, allowed: boolean) => {
    vibrate(40);
    setOpen(false);
    if (!allowed || !href) {
      toast({ title: "Autentifică-te", description: "Trebuie să fii autentificat pentru a propune un eveniment." });
      return;
    }
    navigate(href);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action sheet — slides up from above FAB */}
      <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 transition-all duration-200 ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        {[...ACTIONS].reverse().map(({ icon: Icon, label, sub, href, color, allowed }) => (
          <button
            key={label}
            onClick={() => handleAction(href, !!allowed)}
            className={`flex items-center gap-3 bg-card border rounded-2xl px-5 py-3.5 shadow-lg w-64 text-left transition-transform active:scale-95 ${color} ${!allowed ? "opacity-60" : ""}`}
            data-testid={`fab-action-${label.toLowerCase()}`}
          >
            <div className="w-9 h-9 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="text-xs opacity-70 leading-tight">{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* FAB button */}
      <button
        onClick={toggle}
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-xl shadow-primary/35 flex items-center justify-center transition-all duration-200 active:scale-95 ${open ? "rotate-45 shadow-primary/20" : "hover:shadow-primary/50 hover:scale-105"}`}
        data-testid="button-fab"
        aria-label="Acțiune rapidă"
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </>
  );
}
