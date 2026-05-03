import { useState, useRef, useEffect, useCallback } from "react";
import { useReports, useCreateReport, useMyReports } from "@/hooks/use-halchiu";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { vibrate } from "@/hooks/use-pwa";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, CheckCircle2, Clock, Plus, X, Building2, Phone, Mail,
  MapPin, XCircle, MessageSquare, Camera, Loader2, Navigation, Eye, EyeOff,
  FileText, Send, ChevronRight,
} from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import type { Report } from "@/hooks/use-halchiu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MUNICIPAL_DEPARTMENTS } from "@shared/schema";

// ── Schema for sesizări ───────────────────────────────────────────────────────
const reportSchema = z.object({
  title: z.string().min(5, "Titlul trebuie să aibă cel puțin 5 caractere"),
  description: z.string().min(15, "Descrierea trebuie să aibă cel puțin 15 caractere"),
  category: z.string().min(1, "Alege o categorie"),
  location: z.string().optional(),
});
type ReportFormValues = z.infer<typeof reportSchema>;

// ── Schema for cereri ─────────────────────────────────────────────────────────
const requestSchema = z.object({
  title: z.string().min(5, "Titlul cererii trebuie să aibă cel puțin 5 caractere"),
  department: z.string().min(1, "Alege compartimentul"),
  description: z.string().min(20, "Descrierea trebuie să aibă cel puțin 20 caractere"),
});
type RequestFormValues = z.infer<typeof requestSchema>;

// ── Status configs ────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; icon: typeof Clock; class: string }> = {
  in_asteptare: { label: "În așteptare", icon: Clock,        class: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  in_lucru:     { label: "În lucru",     icon: AlertCircle,  class: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
  rezolvat:     { label: "Rezolvat",     icon: CheckCircle2, class: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" },
  respins:      { label: "Respins",      icon: XCircle,      class: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
};

// ── Tab type ──────────────────────────────────────────────────────────────────
type PrimariaTab = "sesizari" | "cereri";

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });
}

function ReportCard({ report, pending = false }: { report: Report; pending?: boolean }) {
  const st = statusConfig[report.status ?? "in_asteptare"] ?? statusConfig.in_asteptare;
  const Icon = st.icon;
  const photos: string[] = (() => {
    try { return report.imageUrls ? JSON.parse(report.imageUrls) : []; } catch { return []; }
  })();

  return (
    <div className="bg-card border border-card-border rounded-xl p-4" data-testid={`report-${report.id}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display font-semibold text-sm leading-tight flex-1">{report.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {pending && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
              <Eye className="w-2.5 h-2.5" />În așteptare aprobare
            </span>
          )}
          {!pending && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${st.class}`}>
              <Icon className="w-3 h-3" />{st.label}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{report.description}</p>

      {photos.length > 0 && (
        <div className="flex gap-1.5 mb-2 overflow-x-auto">
          {photos.map((src, i) => (
            <img key={i} src={src} alt={`Foto ${i+1}`} className="h-16 w-20 object-cover rounded-lg shrink-0 border border-border" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">{report.category}</Badge>
        {report.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{report.location}</span>}
        <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(report.createdAt, { addSuffix: true, locale: ro })}</span>
      </div>

      {report.status === "rezolvat" && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400 font-medium flex-1">Problemă rezolvată de primărie</p>
            <ShareButton
              title={`✅ Rezolvat: ${report.title}`}
              text={`Sesizarea „${report.title}" a fost rezolvată de Primăria Hălchiu.`}
              url={window.location.origin}
            />
          </div>
          {report.adminReply && (
            <div className="flex items-start gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Primăria: </span>{report.adminReply}</p>
            </div>
          )}
        </div>
      )}
      {report.status === "respins" && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400 font-medium flex-1">Sesizare respinsă de administrație</p>
          </div>
          {report.adminReply && (
            <div className="flex items-start gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Motivare: </span>{report.adminReply}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────
type MunicipalRequest = {
  id: number;
  title: string;
  department: string;
  description: string;
  status: string;
  adminReply?: string | null;
  createdAt: string;
};

function RequestCard({ req }: { req: MunicipalRequest }) {
  const st = statusConfig[req.status ?? "in_asteptare"] ?? statusConfig.in_asteptare;
  const Icon = st.icon;
  return (
    <div className="bg-card border border-card-border rounded-xl p-4" data-testid={`request-${req.id}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display font-semibold text-sm leading-tight flex-1">{req.title}</h3>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${st.class}`}>
          <Icon className="w-3 h-3" />{st.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{req.description}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">{req.department}</Badge>
        <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: ro })}</span>
      </div>
      {req.adminReply && (
        <div className="mt-2 flex items-start gap-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300"><span className="font-semibold">Primăria: </span>{req.adminReply}</p>
        </div>
      )}
    </div>
  );
}

// ── Cereri section ────────────────────────────────────────────────────────────
function CereriSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: myRequests = [], isLoading } = useQuery<MunicipalRequest[]>({
    queryKey: ["/api/municipal-requests/mine"],
    enabled: !!user,
  });

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { title: "", department: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RequestFormValues) => {
      const res = await fetch("/api/municipal-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/municipal-requests/mine"] });
      toast({ title: "Cerere înregistrată! ✓", description: "Cererea ta a fost transmisă compartimentului selectat." });
      setShowForm(false);
      form.reset();
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
  });

  if (!user) {
    return (
      <div className="py-10 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Autentifică-te pentru a trimite cereri</p>
        <p className="text-xs text-muted-foreground mt-1">Cererile sunt procesate și urmărite individual pentru fiecare cetățean.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with add button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{myRequests.length} cereri trimise</p>
        </div>
        <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(v => !v)} data-testid="button-toggle-request-form">
          {showForm ? <><X className="w-4 h-4" />Anulează</> : <><Plus className="w-4 h-4" />Cerere nouă</>}
        </Button>
      </div>

      {/* Info banner */}
      {!showForm && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-3 mb-5 flex items-start gap-3">
          <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Cereri adresate primăriei</p>
            <p className="text-xs text-muted-foreground mt-0.5">Trimite cereri oficiale compartimentelor din primărie: urbanism, stare civilă, asistență socială și altele. Vei primi răspuns în termenul legal.</p>
          </div>
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5 shadow-sm">
          <h2 className="font-display font-semibold text-base mb-1">Cerere nouă</h2>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-lg p-2.5 mb-4 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-300">Cererea va fi procesată în termenul legal. Vei fi notificat când primești răspuns.</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-3">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subiectul cererii</FormLabel>
                  <FormControl><Input placeholder="ex: Solicitare adeverință fiscală, Aviz construire..." {...field} data-testid="input-request-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>Compartiment destinatar</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-request-department"><SelectValue placeholder="Alege compartimentul" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MUNICIPAL_DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conținutul cererii</FormLabel>
                  <FormControl><Textarea placeholder="Descrie detaliat solicitarea ta (minim 20 caractere)..." className="min-h-[100px] resize-none" {...field} data-testid="textarea-request-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full gap-1.5" disabled={createMutation.isPending} data-testid="button-submit-request">
                <Send className="w-4 h-4" />{createMutation.isPending ? "Se trimite..." : "Trimite cererea"}
              </Button>
            </form>
          </Form>
        </div>
      )}

      {/* My requests list */}
      {isLoading && <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}
      {!isLoading && myRequests.length === 0 && !showForm && (
        <div className="py-10 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nu ai trimis nicio cerere încă</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
            data-testid="button-first-request"
          >
            <ChevronRight className="w-3 h-3" />Trimite prima cerere
          </button>
        </div>
      )}
      {!isLoading && myRequests.length > 0 && (
        <div className="space-y-3">
          {myRequests.map(r => <RequestCard key={r.id} req={r} />)}
        </div>
      )}
    </div>
  );
}

export default function Primaria() {
  const { data: reports, isLoading } = useReports();
  const { data: myReports } = useMyReports();
  const createMutation = useCreateReport();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<PrimariaTab>("sesizari");
  const { s } = useSettings();
  const { user } = useAuth();

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { title: "", description: "", category: "", location: "" },
  });

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsCoords({ lat, lng });
        const locStr = form.getValues("location");
        if (!locStr) form.setValue("location", `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [form]);

  useEffect(() => {
    if (showForm) detectLocation();
    else { setGpsCoords(null); setPhotos([]); }
  }, [showForm]);

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = 3 - photos.length;
    const toProcess = files.slice(0, remaining);
    const compressed = await Promise.all(toProcess.map(compressImage));
    setPhotos(p => [...p, ...compressed]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));

  const onSubmit = (data: ReportFormValues) => {
    vibrate(60);
    createMutation.mutate(
      { ...data, lat: gpsCoords?.lat ?? null, lng: gpsCoords?.lng ?? null, imageUrls: photos.length > 0 ? photos : undefined },
      {
        onSuccess: () => {
          vibrate([40, 30, 40]);
          try {
            const prev = parseInt(localStorage.getItem("halchiu_reports_count") ?? "0", 10) || 0;
            localStorage.setItem("halchiu_reports_count", String(prev + 1));
          } catch (_) {}
          toast({ title: "Sesizare trimisă!", description: "Va fi verificată și publicată după aprobare." });
          setShowForm(false);
          form.reset();
          setGpsCoords(null);
          setPhotos([]);
        },
        onError: (e) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
      }
    );
  };

  const pendingMine = myReports?.filter(r => r.visibility === "pending") ?? [];

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-primary/10 p-2.5 rounded-xl">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl">{s("primaria_name")}</h1>
          <p className="text-xs text-muted-foreground">{s("primaria_subtitle")}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <Button size="sm" variant="outline" className="rounded-full gap-1.5 h-8 text-xs" onClick={() => { setActiveTab("cereri"); setShowForm(false); }} data-testid="button-open-cereri">
              <FileText className="w-3.5 h-3.5" />Cerere
            </Button>
          )}
          {activeTab === "sesizari" && (
            <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(v => !v)} data-testid="button-toggle-form">
              {showForm ? <><X className="w-4 h-4" />Anulează</> : <><Plus className="w-4 h-4" />Sesizare</>}
            </Button>
          )}
        </div>
      </div>

      {/* Contact info */}
      {(s("primaria_address") || s("primaria_phone") || s("primaria_email") || s("primaria_schedule")) && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5 space-y-2">
          {s("primaria_address") && (
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{s("primaria_address")}</span>
            </div>
          )}
          {s("primaria_phone") && (
            <a href={`tel:${s("primaria_phone")}`} className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Phone className="w-3.5 h-3.5 shrink-0" /><span>{s("primaria_phone")}</span>
            </a>
          )}
          {s("primaria_email") && (
            <a href={`mailto:${s("primaria_email")}`} className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Mail className="w-3.5 h-3.5 shrink-0" /><span>{s("primaria_email")}</span>
            </a>
          )}
          {s("primaria_schedule") && (
            <div className="flex items-start gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground whitespace-pre-line">{s("primaria_schedule")}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab bar — only Sesizări visible publicly; Cereri are private (button in header) */}
      <div className="flex gap-1 mb-5 bg-muted/50 rounded-xl p-1">
        <button
          onClick={() => { setActiveTab("sesizari"); setShowForm(false); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === "sesizari" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-sesizari"
        >
          <AlertCircle className="w-3.5 h-3.5" />Sesizări
        </button>
        {user && (
          <button
            onClick={() => { setActiveTab("cereri"); setShowForm(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === "cereri" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            data-testid="tab-cereri"
          >
            <FileText className="w-3.5 h-3.5" />Cererile mele
          </button>
        )}
      </div>

      {/* ── SESIZĂRI TAB ── */}
      {activeTab === "sesizari" && (
        <>
          {showForm && (
            <div className="bg-card border border-card-border rounded-xl p-4 mb-5 shadow-sm">
              <h2 className="font-display font-semibold text-base mb-4">Raportează o problemă</h2>

              {/* GPS Map */}
              <div className="rounded-xl overflow-hidden border border-border mb-4 relative" style={{ height: 160 }}>
                {gpsCoords ? (
                  <iframe
                    title="harta-sesizare"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsCoords.lng - 0.003},${gpsCoords.lat - 0.003},${gpsCoords.lng + 0.003},${gpsCoords.lat + 0.003}&layer=mapnik&marker=${gpsCoords.lat},${gpsCoords.lng}`}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/40 flex flex-col items-center justify-center gap-2">
                    {gpsLoading ? (
                      <><Loader2 className="w-5 h-5 text-primary animate-spin" /><p className="text-xs text-muted-foreground">Se detectează locația...</p></>
                    ) : (
                      <><MapPin className="w-5 h-5 text-muted-foreground" /><p className="text-xs text-muted-foreground">Locație nedisponibilă</p></>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={gpsLoading}
                  className="absolute bottom-2 right-2 bg-white dark:bg-card border border-border shadow-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                  data-testid="button-detect-location"
                >
                  {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5 text-primary" />}
                  {gpsLoading ? "Se detectează..." : "Locația mea"}
                </button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titlu scurt</FormLabel>
                      <FormControl><Input placeholder="ex: Groapă pe Str. Principală" {...field} data-testid="input-report-title" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categorie</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category"><SelectValue placeholder="Alege categoria" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Drum", "Iluminat", "Salubrizare", "Apă/Canal", "Vegetație", "Altele"].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Locație
                        {gpsCoords && <span className="text-[10px] font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded-full border border-green-200 dark:border-green-800">GPS detectat</span>}
                      </FormLabel>
                      <FormControl><Input placeholder="Strada, numărul sau coordonate GPS..." {...field} data-testid="input-location" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descriere</FormLabel>
                      <FormControl><Textarea placeholder="Descrie problema în detaliu..." className="min-h-[90px] resize-none" {...field} data-testid="textarea-description" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Photos */}
                  <div>
                    <p className="text-sm font-medium mb-2">Fotografii {photos.length > 0 && <span className="text-muted-foreground font-normal">({photos.length}/3)</span>}</p>
                    {photos.length > 0 && (
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {photos.map((src, i) => (
                          <div key={i} className="relative">
                            <img src={src} alt={`Foto ${i+1}`} className="h-20 w-24 object-cover rounded-lg border border-border" />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center shadow"
                              data-testid={`button-remove-photo-${i}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {photos.length < 3 && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          className="hidden"
                          onChange={handlePhotos}
                          data-testid="input-photos"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 w-full h-10 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors justify-center"
                          data-testid="button-add-photo"
                        >
                          <Camera className="w-4 h-4" />
                          {photos.length === 0 ? "Adaugă fotografii (max. 3)" : "Adaugă altă fotografie"}
                        </button>
                      </>
                    )}
                  </div>

                  {!user && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                      Autentifică-te pentru a primi puncte și a urmări starea sesizării.
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-report">
                    {createMutation.isPending ? "Se trimite..." : "Trimite sesizarea"}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {/* Pending mine */}
          {user && pendingMine.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <EyeOff className="w-4 h-4 text-amber-600" />
                <h2 className="font-display font-semibold text-sm text-amber-700 dark:text-amber-400">Sesizările mele — în așteptare aprobare</h2>
                <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">{pendingMine.length}</span>
              </div>
              <div className="space-y-3">
                {pendingMine.map(r => <ReportCard key={r.id} report={r} pending />)}
              </div>
            </div>
          )}

          <h2 className="font-display font-semibold text-base mb-3">Sesizări publice</h2>
          {isLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}
          {!isLoading && reports && (
            <div className="space-y-3">
              {reports.map(r => <ReportCard key={r.id} report={r} />)}
              {reports.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nu există sesizări publice momentan.</p>}
            </div>
          )}
        </>
      )}

      {/* ── CERERI TAB ── */}
      {activeTab === "cereri" && <CereriSection />}
    </div>
  );
}
