import { useState, useEffect } from "react";
import { X, ChevronRight, MapPin, Megaphone, Users, CalendarDays, User, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "halchiu_tutorial_done";

const STEPS = [
  {
    icon: Leaf,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Bun venit în Hălchiu Digital!",
    body: "Platforma digitală a comunei Hălchiu, județul Brașov. Conectează cetățenii cu primăria și cu comunitatea locală.",
    cta: "Să începem",
  },
  {
    icon: MapPin,
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600",
    title: "Primăria",
    body: "Trimite sesizări despre probleme din comună — gropi, iluminat, salubrizare. Primăria îți răspunde direct în aplicație.",
    cta: "Următorul",
  },
  {
    icon: Users,
    iconBg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600",
    title: "Comunitate",
    body: "Discută cu vecinii, publică anunțuri locale sau pune întrebări despre viața în comună.",
    cta: "Următorul",
  },
  {
    icon: CalendarDays,
    iconBg: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-600",
    title: "Evenimente",
    body: "Descoperă evenimentele locale — serbări, ședințe publice, târguri. Înscrie-te și câștigă puncte civice.",
    cta: "Următorul",
  },
  {
    icon: User,
    iconBg: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-600",
    title: "Profilul tău",
    body: "Urmărește punctele civice și insignele câștigate. Personalizează notificările și widgeturile paginii principale.",
    cta: "Gata, explorează!",
  },
];

export function TutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          data-testid="button-tutorial-close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${current.iconBg} flex items-center justify-center mb-4`}>
            <Icon className={`w-7 h-7 ${current.iconColor}`} />
          </div>

          {/* Step counter */}
          <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
            Pas {step + 1} din {STEPS.length}
          </p>

          <h2 className="font-display font-bold text-xl mb-2 leading-tight">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{current.body}</p>

          {/* Dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={next}
            className="w-full gap-2"
            data-testid={`button-tutorial-next-${step}`}
          >
            {current.cta}
            {step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to reset tutorial (for dev / settings)
export function resetTutorial() {
  localStorage.removeItem(STORAGE_KEY);
}
