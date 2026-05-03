import { useOnlineStatus } from "@/hooks/use-pwa";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [visible, setVisible] = useState(false);
  const [justCameBack, setJustCameBack] = useState(false);

  useEffect(() => {
    if (!online) {
      setVisible(true);
      setJustCameBack(false);
    } else if (visible) {
      setJustCameBack(true);
      const t = setTimeout(() => { setVisible(false); setJustCameBack(false); }, 2500);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-all duration-300 ${
        justCameBack
          ? "bg-green-500 text-white"
          : "bg-amber-500 text-white"
      }`}
      data-testid="offline-banner"
    >
      {justCameBack ? (
        <span>Conexiune restabilită</span>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Ești offline – conținutul salvat este disponibil</span>
        </>
      )}
    </div>
  );
}
