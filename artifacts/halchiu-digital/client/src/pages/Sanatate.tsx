import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { HealthCampaign, HealthAlert, DoctorProfile, SocialProgram, AppointmentRequest } from "@shared/schema";
import {
  AlertTriangle, Droplets, Thermometer, Activity,
  Stethoscope, Calendar, MapPin, Phone, Clock,
  Heart, ShieldCheck, Users, ChevronRight,
  Syringe, Search, Truck, FileText, Home,
  UserCheck, AlertCircle, CheckCircle2, Info, ExternalLink,
} from "lucide-react";
import { Link } from "wouter";

// ─── TAB BAR ──────────────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: "alerte",    label: "Alerte" },
  { id: "campanii",  label: "Campanii" },
  { id: "medici",    label: "Medici" },
  { id: "asistenta", label: "Asistență" },
] as const;
type TabId = typeof ALL_TABS[number]["id"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function severityColor(severity: string) {
  if (severity === "critical") return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
  if (severity === "warning") return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
  return "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800";
}
function severityBadge(severity: string) {
  if (severity === "critical") return <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">URGENT</Badge>;
  if (severity === "warning") return <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">ATENȚIE</Badge>;
  return <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">INFO</Badge>;
}
function alertIcon(type: string) {
  if (type === "canicula") return <Thermometer className="w-5 h-5 text-orange-500" />;
  if (type === "frig") return <Droplets className="w-5 h-5 text-blue-400" />;
  if (type === "epidemie") return <Activity className="w-5 h-5 text-red-500" />;
  if (type === "apa") return <Droplets className="w-5 h-5 text-cyan-500" />;
  return <AlertTriangle className="w-5 h-5 text-amber-500" />;
}
function campaignIcon(type: string) {
  if (type === "vaccinare") return <Syringe className="w-5 h-5 text-primary" />;
  if (type === "screening") return <Search className="w-5 h-5 text-blue-500" />;
  if (type === "caravana") return <Truck className="w-5 h-5 text-purple-500" />;
  return <ShieldCheck className="w-5 h-5 text-green-600" />;
}
function campaignStatusBadge(status: string) {
  if (status === "activa") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-[10px] px-1.5">Activă</Badge>;
  if (status === "viitoare") return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] px-1.5">Viitoare</Badge>;
  return <Badge variant="secondary" className="text-[10px] px-1.5">Inactivă</Badge>;
}
function doctorStatusBadge(status: string) {
  if (status === "activ") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-[10px] px-1.5">Activ</Badge>;
  if (status === "concediu") return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] px-1.5">Concediu</Badge>;
  return <Badge variant="secondary" className="text-[10px] px-1.5">Indisponibil</Badge>;
}
function socialIcon(type: string) {
  if (type === "incalzire") return <Home className="w-5 h-5 text-orange-500" />;
  if (type === "lemne") return <FileText className="w-5 h-5 text-amber-700" />;
  if (type === "vouchere") return <ShieldCheck className="w-5 h-5 text-green-600" />;
  if (type === "sprijin") return <UserCheck className="w-5 h-5 text-blue-500" />;
  return <Info className="w-5 h-5 text-primary" />;
}
function socialStatusBadge(status: string) {
  if (status === "activ") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-[10px] px-1.5">Activ</Badge>;
  if (status === "inactiv") return <Badge variant="secondary" className="text-[10px] px-1.5">Inactiv</Badge>;
  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5">Expirat</Badge>;
}
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
}

// ─── APPOINTMENT DIALOG ────────────────────────────────────────────────────────
function AppointmentDialog({ doctor }: { doctor: DoctorProfile }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientName: "", phone: "", requestedDate: "", notes: "" });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/health/appointments", { ...data, doctorId: doctor.id }),
    onSuccess: () => {
      toast({ title: "Programare trimisă!", description: "Veți fi contactat pentru confirmare." });
      setOpen(false);
      setForm({ patientName: "", phone: "", requestedDate: "", notes: "" });
    },
    onError: () => toast({ title: "Eroare", description: "Nu s-a putut trimite programarea.", variant: "destructive" }),
  });

  const canSubmit = form.patientName.trim() && form.phone.trim() && form.requestedDate.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs" disabled={doctor.status !== "activ"} data-testid={`button-appointment-${doctor.id}`}>
          <Calendar className="w-3.5 h-3.5 mr-1" />
          Programare
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Cerere programare</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">la {doctor.name}</p>
        <div className="space-y-3 mt-1">
          <div>
            <Label className="text-xs">Nume pacient *</Label>
            <Input
              placeholder="Prenume Nume"
              value={form.patientName}
              onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
              data-testid="input-appointment-name"
            />
          </div>
          <div>
            <Label className="text-xs">Telefon *</Label>
            <Input
              placeholder="07XX XXX XXX"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              data-testid="input-appointment-phone"
            />
          </div>
          <div>
            <Label className="text-xs">Data / Perioada dorită *</Label>
            <Input
              placeholder="ex: 10 mai dimineața"
              value={form.requestedDate}
              onChange={e => setForm(f => ({ ...f, requestedDate: e.target.value }))}
              data-testid="input-appointment-date"
            />
          </div>
          <div>
            <Label className="text-xs">Motivul consultației (opțional)</Label>
            <Textarea
              placeholder="Descrie pe scurt motivul..."
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              data-testid="input-appointment-notes"
            />
          </div>
          <Button
            className="w-full"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate(form)}
            data-testid="button-appointment-submit"
          >
            {mutation.isPending ? "Se trimite..." : "Trimite cererea"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ALERTE TAB ───────────────────────────────────────────────────────────────
function AlerteTab() {
  const { data: alerts = [], isLoading } = useQuery<HealthAlert[]>({
    queryKey: ["/api/health/alerts"],
  });

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-3 p-4">
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
          <p className="font-semibold text-foreground">Nicio alertă activă</p>
          <p className="text-sm text-muted-foreground mt-1">Nu există avertizări de sănătate publică în acest moment.</p>
        </div>
      ) : alerts.map(alert => (
        <div key={alert.id} className={`rounded-xl border p-4 ${severityColor(alert.severity)}`} data-testid={`alert-health-${alert.id}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{alertIcon(alert.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {severityBadge(alert.severity)}
                <span className="text-[10px] text-muted-foreground">
                  {fmtDate(alert.startDate)}
                  {alert.endDate && ` – ${fmtDate(alert.endDate)}`}
                </span>
              </div>
              <p className="font-semibold text-sm text-foreground leading-tight">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CampaniiTab() {
  const [filter, setFilter] = useState<string>("all");

  const { data: campaigns = [], isLoading } = useQuery<HealthCampaign[]>({
    queryKey: ["/api/health/campaigns"],
  });

  const filters = [
    { id: "all", label: "Toate" },
    { id: "vaccinare", label: "Vaccinare" },
    { id: "screening", label: "Screening" },
    { id: "caravana", label: "Caravane" },
    { id: "preventie", label: "Prevenție" },
  ];

  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.type === filter);

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div>
      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            data-testid={`filter-campaign-${f.id}`}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filter === f.id
                ? "bg-primary text-white border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Syringe className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Nicio campanie în această categorie
          </div>
        ) : filtered.map(c => (
          <Card key={c.id} className="shadow-sm border-border/60" data-testid={`card-campaign-${c.id}`}>
            {c.imageUrl && (
              <div className="relative h-36 overflow-hidden rounded-t-xl">
                <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {campaignIcon(c.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {campaignStatusBadge(c.status)}
                    <span className="text-[10px] text-muted-foreground capitalize">{c.type}</span>
                  </div>
                  <p className="font-semibold text-sm leading-tight">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
                  <div className="mt-2 space-y-1">
                    {c.targetGroup && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{c.targetGroup}</span>
                      </div>
                    )}
                    {c.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{c.location}</span>
                      </div>
                    )}
                    {(c.startDate || c.endDate) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {fmtDate(c.startDate)}
                          {c.endDate && ` – ${fmtDate(c.endDate)}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MediciTab() {
  const { data: doctors = [], isLoading } = useQuery<DoctorProfile[]>({
    queryKey: ["/api/health/doctors"],
  });

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  if (doctors.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <Stethoscope className="w-12 h-12 text-muted-foreground/40 mb-3" />
      <p className="font-semibold text-foreground">Niciun profil medical adăugat</p>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      {doctors.map(doc => {
        let schedule: Record<string, string> = {};
        try { schedule = JSON.parse(doc.schedule || "{}"); } catch {}

        return (
          <Card key={doc.id} className={`shadow-sm border-border/60 overflow-hidden ${doc.status === "concediu" ? "opacity-80" : ""}`} data-testid={`card-doctor-${doc.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                  </div>
                </div>
                {doctorStatusBadge(doc.status)}
              </div>

              <div className="space-y-1.5 mb-3">
                {doc.cabinetName && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Heart className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
                    <span>{doc.cabinetName}</span>
                  </div>
                )}
                {doc.address && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{doc.address}</span>
                  </div>
                )}
                {doc.phone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${doc.phone}`} className="text-primary font-medium">{doc.phone}</a>
                  </div>
                )}
              </div>

              {/* Schedule */}
              {Object.keys(schedule).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-2.5 mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Program consultații</span>
                  </div>
                  <div className="space-y-0.5">
                    {schedule.lv && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Luni–Vineri</span>
                        <span className="font-medium">{schedule.lv}</span>
                      </div>
                    )}
                    {schedule.s && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Sâmbătă</span>
                        <span className="font-medium">{schedule.s}</span>
                      </div>
                    )}
                    {schedule.d && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Duminică</span>
                        <span className="font-medium">{schedule.d}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Substitute when on leave */}
              {doc.status === "concediu" && doc.substituteName && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mb-3 text-xs">
                  <p className="font-medium text-amber-800 dark:text-amber-300 mb-0.5">Medic înlocuitor:</p>
                  <p className="text-amber-700 dark:text-amber-400">{doc.substituteName}</p>
                  {doc.substitutePhone && (
                    <a href={`tel:${doc.substitutePhone}`} className="text-primary font-medium">{doc.substitutePhone}</a>
                  )}
                </div>
              )}

              {doc.notes && (
                <p className="text-xs text-muted-foreground mb-3 italic">{doc.notes}</p>
              )}

              <div className="flex gap-2">
                {doc.phone && (
                  <a href={`tel:${doc.phone}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs" data-testid={`button-call-doctor-${doc.id}`}>
                      <Phone className="w-3.5 h-3.5 mr-1" />
                      Sună
                    </Button>
                  </a>
                )}
                <div className="flex-1">
                  <AppointmentDialog doctor={doc} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Info card */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Urgențe medicale</p>
            <p>Sunați la <strong>112</strong> pentru urgențe sau la <strong>0800 800 358</strong> (TelVerde DSP Brașov).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AsistentaTab() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: programs = [], isLoading } = useQuery<SocialProgram[]>({
    queryKey: ["/api/social/programs"],
  });

  const activePrograms = programs.filter(p => p.status !== "expirat");

  if (isLoading) return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      {/* Header info */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Asistență Socială Hălchiu</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            Compartimentul de Asistență Socială funcționează la Primăria Hălchiu, Luni–Joi 09:00–15:00.
            Tel: <a href="tel:0266200100" className="font-medium underline">0266 200 100</a>
          </p>
        </div>
      </div>

      {activePrograms.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          Niciun program activ în acest moment
        </div>
      ) : activePrograms.map(p => (
        <Card
          key={p.id}
          className="shadow-sm border-border/60 cursor-pointer"
          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
          data-testid={`card-social-${p.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {socialIcon(p.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {socialStatusBadge(p.status)}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded === p.id ? "rotate-90" : ""}`} />
                </div>
                <p className="font-semibold text-sm leading-tight">{p.title}</p>
                <p className={`text-xs text-muted-foreground mt-1 leading-relaxed ${expanded !== p.id ? "line-clamp-2" : ""}`}>
                  {p.description}
                </p>

                {expanded === p.id && (
                  <div className="mt-3 space-y-2.5 border-t border-border/50 pt-3">
                    {p.eligibility && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-0.5">Condiții de eligibilitate</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.eligibility}</p>
                      </div>
                    )}
                    {p.period && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{p.period}</span>
                      </div>
                    )}
                    {p.documentsNeeded && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-0.5">Documente necesare</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.documentsNeeded}</p>
                      </div>
                    )}
                    {p.contactInfo && (
                      <div className="bg-muted/60 rounded-lg p-2.5">
                        <p className="text-xs font-medium text-foreground mb-0.5">Contact</p>
                        <p className="text-xs text-muted-foreground">{p.contactInfo}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function Sanatate() {
  const [tab, setTab] = useState<TabId>("alerte");
  const { user } = useAuth();
  const isAdmin = ["administrator", "primar", "viceprimar", "functionar_public", "specialist"].includes(user?.role ?? "");

  return (
    <div className="max-w-lg mx-auto">
      {/* Hero */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-tight">Sănătate Locală</h1>
            <p className="text-xs text-muted-foreground">Hub medical – comuna Hălchiu</p>
          </div>
        </div>
      </div>

      {/* Admin banner */}
      {isAdmin && (
        <div className="mx-4 mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl p-3 flex items-center justify-between gap-2">
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">
            Gestionează alertele, campaniile și programările din Panoul Admin.
          </p>
          <Link href="/admin" data-testid="link-admin-health">
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-semibold whitespace-nowrap hover:underline">
              Admin <ExternalLink className="w-3 h-3" />
            </span>
          </Link>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex border-b border-border/60 bg-background sticky top-14 z-30 overflow-x-auto scrollbar-none">
        {ALL_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`tab-sanatate-${t.id}`}
            className={`flex-1 min-w-fit px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "alerte" && <AlerteTab />}
      {tab === "campanii" && <CampaniiTab />}
      {tab === "medici" && <MediciTab />}
      {tab === "asistenta" && <AsistentaTab />}
    </div>
  );
}
