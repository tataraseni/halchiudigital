import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Leaf, Lock, Mail, KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "email" | "otp" | "done";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestReset = async () => {
    if (!email.trim()) return setError("Introdu adresa de email.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Eroare");
      setStep("otp");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    if (!otp.trim()) return setError("Introdu codul primit.");
    if (password.length < 8) return setError("Parola trebuie să aibă cel puțin 8 caractere.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Eroare");
      setStep("done");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-xl">Hălchiu Digital</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Resetare parolă super admin</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary shrink-0" />
            <h2 className="font-display font-semibold text-base">
              {step === "email" && "Verificare identitate"}
              {step === "otp" && "Introdu codul de resetare"}
              {step === "done" && "Parolă actualizată"}
            </h2>
          </div>

          {/* Step: email */}
          {step === "email" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Introdu adresa de email a contului super admin. Un cod de resetare va fi generat și afișat în consolă serverului Replit.
              </p>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Adresă de email super admin</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    className="pl-9"
                    placeholder="admin@halchiu.ro"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && requestReset()}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button className="w-full gap-2" onClick={requestReset} disabled={loading}>
                {loading ? "Se generează..." : "Generează cod de resetare"}
              </Button>
            </div>
          )}

          {/* Step: otp + new password */}
          {step === "otp" && (
            <div className="space-y-4">
              {/* Console instruction */}
              <div className="bg-muted/60 border border-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs font-semibold">Găsește codul în consola Replit</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Deschide panoul de logs al workflow-ului <span className="font-mono font-medium text-foreground">halchiu-digital: web</span> și caută mesajul:
                </p>
                <div className="bg-background border border-border rounded-lg px-3 py-2">
                  <code className="text-[11px] text-green-600 dark:text-green-400 font-mono break-all">
                    [RESET-PAROLA] Cod resetare: <span className="text-primary font-bold">XXXXXX</span>
                  </code>
                </div>
                <p className="text-[11px] text-muted-foreground">Codul este valabil <strong>15 minute</strong>.</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Cod de resetare (6 cifre)</label>
                <Input
                  placeholder="123456"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  className="font-mono tracking-widest text-center text-lg h-11"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Parolă nouă (minim 8 caractere)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPw ? "text" : "password"}
                    className="pl-9 pr-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPw(v => !v)}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => { setStep("email"); setOtp(""); setPassword(""); setError(""); }}>
                  <ArrowLeft className="w-3.5 h-3.5" />Înapoi
                </Button>
                <Button className="flex-1 gap-1.5" onClick={confirmReset} disabled={loading || otp.length < 6 || password.length < 8}>
                  {loading ? "Se verifică..." : "Schimbă parola"}
                </Button>
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Parola a fost schimbată!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Poți acum să te autentifici cu noul email și noua parolă.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Mergi la autentificare
              </Button>
            </div>
          )}
        </div>

        {step !== "done" && (
          <div className="mt-4 text-center">
            <Link href="/login">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mx-auto">
                <ArrowLeft className="w-3.5 h-3.5" />Înapoi la autentificare
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
