import { useSettings } from "@/hooks/use-settings";
import { Leaf, Smartphone, MapPin, Download, Wifi } from "lucide-react";

export default function QRInstall() {
  const { s } = useSettings();
  const appUrl = window.location.origin;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=ffffff&color=1a5c3a&qzone=2&data=${encodeURIComponent(appUrl)}`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10 text-center">
      {/* Brand */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
          <Leaf className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl">{s("app_name")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{s("app_county")} — {s("app_tagline")}</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-2xl p-4 shadow-md border border-border mb-6 inline-block">
        <img
          src={qrUrl}
          alt="QR Code instalare"
          width={220}
          height={220}
          className="rounded-lg"
          loading="eager"
        />
      </div>

      <p className="text-sm font-semibold mb-1">Scanează cu telefonul</p>
      <p className="text-xs text-muted-foreground mb-8 max-w-xs leading-relaxed">
        Deschide camera telefonului și îndrept-o spre codul QR de mai sus pentru a accesa aplicația.
      </p>

      {/* Steps */}
      <div className="w-full max-w-xs space-y-3 mb-8">
        {[
          { icon: Wifi, step: "1", text: "Scanează codul QR cu camera telefonului" },
          { icon: MapPin, step: "2", text: "Permite accesul la locație când ți se cere" },
          { icon: Download, step: "3", text: 'Apasă "Adaugă pe ecranul principal" pentru acces rapid' },
          { icon: Smartphone, step: "4", text: "Creează-ți contul sau intră direct ca vizitator" },
        ].map(({ icon: Icon, step, text }) => (
          <div key={step} className="flex items-start gap-3 text-left">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{step}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{text}</p>
          </div>
        ))}
      </div>

      {/* URL direct */}
      <div className="bg-muted/60 rounded-xl px-4 py-3 w-full max-w-xs">
        <p className="text-xs text-muted-foreground mb-1">Sau accesează direct:</p>
        <p className="text-sm font-mono font-medium text-foreground break-all">{appUrl}</p>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-8">
        {s("app_name")} · {s("app_county")} · aplicație gratuită pentru comunitate
      </p>
    </div>
  );
}
