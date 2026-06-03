import { useInstallPrompt } from "@/hooks/use-pwa";
import { Button } from "@/components/ui/button";
import { Download, X, Leaf, Share, MoreHorizontal } from "lucide-react";

function IOSInstructions({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[150] max-w-sm mx-auto bg-card border border-card-border rounded-2xl shadow-xl shadow-black/15 p-4 animate-fade-in"
      data-testid="install-prompt-ios"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Leaf className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="font-display font-semibold text-sm">Instalează aplicația</p>
            <p className="text-[11px] text-muted-foreground">Adaugă pe ecranul principal</p>
          </div>
        </div>
        <button className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 mt-0.5" onClick={onDismiss}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Share className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold">1. Apasă butonul Share</p>
            <p className="text-[11px] text-muted-foreground">Iconița cu săgeata în sus din bara Safari</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
            <MoreHorizontal className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold">2. Alege „Adaugă pe ecranul principal"</p>
            <p className="text-[11px] text-muted-foreground">Derulează în jos în lista de opțiuni</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Leaf className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold">3. Apasă „Adaugă"</p>
            <p className="text-[11px] text-muted-foreground">Aplicația apare pe ecranul tău principal</p>
          </div>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full h-8 text-xs rounded-full text-muted-foreground"
        onClick={onDismiss}
      >
        Am înțeles
      </Button>

      {/* Arrow pointing down toward Safari bottom bar */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-card-border" />
      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-card" />
    </div>
  );
}

export function InstallPrompt() {
  const { showPrompt, install, dismiss, isIOS } = useInstallPrompt();

  if (!showPrompt) return null;

  if (isIOS) {
    return <IOSInstructions onDismiss={dismiss} />;
  }

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
        <p className="text-xs text-muted-foreground leading-relaxed">Accesează Hălchiu Digital mai rapid, direct ca o aplicație.</p>
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
