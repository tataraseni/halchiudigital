import { MapPin, Loader2, CheckCircle2, AlertTriangle, XCircle, Leaf, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import type { GeoStatus } from "@/hooks/use-geolocation";

interface Props {
  status: GeoStatus;
  distanceKm: number | null;
  onRequest: () => void;
}

export function LocationGate({ status, distanceKm, onRequest }: Props) {
  const { s } = useSettings();
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center border-2 border-background">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl">{s("app_name")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 italic">{s("home_hero_subtitle")}</p>
        </div>
      </div>

      {status === "idle" && <IdleScreen onRequest={onRequest} gateTitle={s("geo_gate_title")} gateDesc={s("geo_gate_description")} />}
      {status === "requesting" && <RequestingScreen />}
      {status === "in_zone" && <InZoneScreen appName={s("app_name")} county={s("app_county")} />}
      {status === "outside_zone" && <OutsideScreen distanceKm={distanceKm} title={s("geo_outside_title")} message={s("geo_outside_message")} radius={s("geo_radius_km")} />}
      {status === "denied" && <DeniedScreen onRequest={onRequest} title={s("geo_denied_title")} message={s("geo_denied_message")} />}
      {status === "error" && <ErrorScreen onRequest={onRequest} />}
    </div>
  );
}

function IdleScreen({ onRequest, gateTitle, gateDesc }: { onRequest: () => void; gateTitle: string; gateDesc: string }) {
  return (
    <div className="flex flex-col items-center gap-6 max-w-xs w-full">
      <div className="bg-primary/10 rounded-2xl p-5 w-full">
        <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-sm font-semibold text-center mb-1">{gateTitle}</p>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">{gateDesc}</p>
      </div>
      <Button className="w-full gap-2 rounded-full h-11" onClick={onRequest} data-testid="button-request-location">
        <MapPin className="w-4 h-4" />
        Verifică locația mea
      </Button>
    </div>
  );
}

function RequestingScreen() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Se determină locația ta...</p>
    </div>
  );
}

function InZoneScreen({ appName, county }: { appName: string; county: string }) {
  return (
    <div className="flex flex-col items-center gap-4 max-w-xs">
      <CheckCircle2 className="w-12 h-12 text-green-500" />
      <div>
        <p className="font-display font-bold text-xl">Bun venit în {county}!</p>
        <p className="text-sm text-muted-foreground mt-1">Locația ta confirmă că ești în zonă. Se deschide {appName}...</p>
      </div>
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
  );
}

function OutsideScreen({ distanceKm, title, message, radius }: { distanceKm: number | null; title: string; message: string; radius: string }) {
  return (
    <div className="flex flex-col items-center gap-5 max-w-xs">
      <div className="bg-destructive/10 rounded-full p-4">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <div>
        <p className="font-display font-bold text-xl">{title}</p>
        {distanceKm !== null && (
          <p className="text-sm text-muted-foreground mt-1">
            Ești la <span className="font-semibold text-foreground">{distanceKm} km</span> față de zonă.
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{message} (raza de {radius} km)</p>
      </div>
      <div className="bg-muted/60 rounded-xl p-3 w-full text-xs text-muted-foreground text-left leading-relaxed">
        <strong className="text-foreground">Ești locuitor al comunei?</strong><br />
        Asigură-te că ești în zonă și reîncarcă pagina.
      </div>
    </div>
  );
}

function DeniedScreen({ onRequest, title, message }: { onRequest: () => void; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-5 max-w-xs w-full">
      <div className="bg-destructive/10 rounded-full p-4">
        <XCircle className="w-8 h-8 text-destructive" />
      </div>
      <div>
        <p className="font-display font-bold text-xl">{title}</p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{message}</p>
      </div>
      <div className="bg-muted/60 rounded-xl p-3 w-full text-xs text-left space-y-1 text-muted-foreground">
        <p className="font-semibold text-foreground">Cum activezi locația:</p>
        <p>• Apasă pe iconița lacăt/setări din bara de adresă</p>
        <p>• Setează <em>Locație</em> pe <strong>Permite</strong></p>
        <p>• Reîncarcă pagina</p>
      </div>
      <Button variant="outline" className="w-full rounded-full gap-2" onClick={onRequest} data-testid="button-retry-location">
        <RefreshCw className="w-4 h-4" />
        Încearcă din nou
      </Button>
    </div>
  );
}

function ErrorScreen({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 max-w-xs w-full">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
      <div>
        <p className="font-display font-bold text-xl">Eroare geolocație</p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Nu am putut determina locația. Verifică dacă GPS-ul sau serviciile de locație sunt activate.
        </p>
      </div>
      <Button className="w-full rounded-full gap-2" onClick={onRequest} data-testid="button-retry-location">
        <RefreshCw className="w-4 h-4" />
        Încearcă din nou
      </Button>
    </div>
  );
}
