import { useInstallPrompt } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { Download, X, Leaf } from "lucide-react";

export function InstallPrompt() {
  const { showPrompt, install, dismiss } = useInstallPrompt();

  if (!showPrompt) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[150] max-w-sm mx-auto bg-card border border-card-border rounded-2xl shadow-xl shadow-black/10 p-4 flex items-start gap-3 animate-fade-in"
      data-testid="install-prompt"
    >
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
        <Leaf className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm mb-0.5">Adaugă pe ecranul principal</p>
        <p className="text-xs text-muted-foreground leading-relaxed">Accesează Hălchiu Digital mai rapid, ca o aplicație nativă.</p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="h-7 text-xs gap-1.5 rounded-full" onClick={install} data-testid="button-install">
            <Download className="w-3.5 h-3.5" />
            Instalează
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs rounded-full text-muted-foreground" onClick={dismiss}>
            Mai târziu
          </Button>
        </div>
      </div>
      <button className="shrink-0 text-muted-foreground hover:text-foreground p-0.5" onClick={dismiss} data-testid="button-dismiss-install">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
