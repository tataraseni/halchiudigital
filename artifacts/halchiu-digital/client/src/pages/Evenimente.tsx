import { useState, useEffect } from "react";
import { useEvents, useJoinEvent } from "@/hooks/use-halchiu";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, MapPin, Users, ChevronRight, TrendingUp, Leaf, TreePine, Heart, Plus, X, Send, Clock, ChevronDown, ChevronUp, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import type { Event } from "@/hooks/use-halchiu";
import { ShareButton } from "@/components/share-button";
import { useSearch } from "wouter";

// ── Tab bar ──────────────────────────────────────────────────────────────────
type Tab = "evenimente" | "voluntariat";

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 mb-5 bg-muted/50 rounded-xl p-1">
      {([
        { id: "evenimente" as Tab, label: "Evenimente", icon: CalendarDays },
        { id: "voluntariat" as Tab, label: "Voluntariat", icon: Leaf },
      ]).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${active === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          data-testid={`tab-${id}`}
        >
          <Icon className="w-3.5 h-3.5" />{label}
        </button>
      ))}
    </div>
  );
}

// ── Participant list ──────────────────────────────────────────────────────────
function ParticipantList({ eventId, count }: { eventId: number; count: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data: participants = [], isLoading } = useQuery<{ id: number; userName: string; joinedAt: string }[]>({
    queryKey: ["/api/events", eventId, "participants"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/participants`);
      if (!res.ok) throw new Error("eroare");
      return res.json();
    },
    enabled: expanded,
  });

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid={`button-participants-${eventId}`}
      >
        <Users className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-semibold text-primary">{count}</span>
        <span>persoane participă</span>
        {count >= 5 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
            <TrendingUp className="w-2.5 h-2.5" />Popular
          </span>
        )}
        {count > 0 && (expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />)}
      </button>
      {expanded && (
        <div className="mt-2 bg-muted/40 rounded-lg px-3 py-2 space-y-1.5">
          {isLoading && <p className="text-xs text-muted-foreground">Se încarcă...</p>}
          {!isLoading && participants.length === 0 && <p className="text-xs text-muted-foreground italic">Nicio înregistrare disponibilă.</p>}
          {!isLoading && participants.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs font-medium">{p.userName}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{formatDistanceToNow(new Date(p.joinedAt), { addSuffix: true, locale: ro })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Volunteer participant list ─────────────────────────────────────────────────
function VolunteerList({ eventId, count }: { eventId: number; count: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data: participants = [], isLoading } = useQuery<{ id: number; userName: string; joinedAt: string }[]>({
    queryKey: ["/api/events", eventId, "participants"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/participants`);
      if (!res.ok) throw new Error("eroare");
      return res.json();
    },
    enabled: expanded,
  });

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid={`button-volunteers-${eventId}`}
      >
        <Heart className="w-3.5 h-3.5 text-green-600 shrink-0" />
        <span className="font-semibold text-green-700 dark:text-green-400">{count}</span>
        <span>voluntari înscriși</span>
        {count > 0 && (expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />)}
      </button>
      {expanded && (
        <div className="mt-2 bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2 space-y-1.5">
          {isLoading && <p className="text-xs text-muted-foreground">Se încarcă...</p>}
          {!isLoading && participants.length === 0 && <p className="text-xs text-muted-foreground italic">Nicio înregistrare disponibilă.</p>}
          {!isLoading && participants.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-green-700 dark:text-green-300" />
              </div>
              <span className="text-xs font-medium">{p.userName}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{formatDistanceToNow(new Date(p.joinedAt), { addSuffix: true, locale: ro })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event }: { event: Event }) {
  const joinMutation = useJoinEvent();
  const { toast } = useToast();
  const { user } = useAuth();
  const isPast = event.date < new Date();

  const handleJoin = () => {
    if (!user) {
      toast({ variant: "destructive", title: "Autentifică-te", description: "Trebuie să fii autentificat pentru a participa." });
      return;
    }
    joinMutation.mutate(event.id, {
      onSuccess: () => toast({ title: "Te-ai înscris!", description: `Ești înregistrat la „${event.title}".` }),
      onError: (e: any) => toast({ variant: "destructive", title: "Eroare", description: e.message ?? "Nu am putut procesa înscrierea." }),
    });
  };

  return (
    <article className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm" data-testid={`event-${event.id}`}>
      {event.imageUrl && (
        <div className="relative aspect-[16/7] overflow-hidden">
          <img src={event.imageUrl} alt={event.title} className="object-cover w-full h-full" />
          {isPast && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-sm font-semibold bg-black/60 px-3 py-1 rounded-full">Eveniment trecut</span></div>}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-display font-bold text-base mb-2">{event.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-medium">{format(event.date, "EEEE, d MMMM yyyy 'la' HH:mm", { locale: ro })}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">{event.location}</span>
          </div>
          <ParticipantList eventId={event.id} count={event.participantCount ?? 0} />
        </div>
        <div className="flex gap-2">
          {!isPast && (
            <Button size="sm" onClick={handleJoin} disabled={joinMutation.isPending} className="flex-1 gap-1.5" data-testid={`button-join-${event.id}`}>
              {joinMutation.isPending ? "Se procesează..." : <><span>Participă</span><ChevronRight className="w-4 h-4" /></>}
            </Button>
          )}
          <ShareButton
            title={event.title}
            text={`${event.title} — ${format(event.date, "d MMMM", { locale: ro })} la ${event.location}`}
            url={`${window.location.origin}/evenimente`}
          />
        </div>
      </div>
    </article>
  );
}

// ── Voluntariat card ──────────────────────────────────────────────────────────
function VoluntariatCard({ event }: { event: Event }) {
  const joinMutation = useJoinEvent();
  const { toast } = useToast();
  const { user } = useAuth();
  const isPast = event.date < new Date();
  const totalParticipants = event.participantCount ?? 0;

  const handleJoin = () => {
    if (!user) {
      toast({ variant: "destructive", title: "Autentifică-te", description: "Trebuie să fii autentificat pentru a te înscrie." });
      return;
    }
    joinMutation.mutate(event.id, {
      onSuccess: () => toast({ title: "Mulțumim!", description: `Te-ai înscris ca voluntar la „${event.title}". +5 puncte!` }),
      onError: (e: any) => toast({ variant: "destructive", title: "Eroare", description: e.message ?? "Nu am putut procesa înscrierea." }),
    });
  };

  return (
    <article className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm" data-testid={`voluntariat-${event.id}`}>
      {event.imageUrl && (
        <div className="relative aspect-[16/7] overflow-hidden">
          <img src={event.imageUrl} alt={event.title} className="object-cover w-full h-full" />
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-semibold shadow">
              <Leaf className="w-3 h-3" />Voluntariat
            </span>
          </div>
          {isPast && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-sm font-semibold bg-black/60 px-3 py-1 rounded-full">Acțiune încheiată</span></div>}
        </div>
      )}
      {!event.imageUrl && (
        <div className="bg-green-50 dark:bg-green-950/20 px-4 pt-4 pb-0">
          <span className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-semibold">
            <Leaf className="w-3 h-3" />Voluntariat civic
          </span>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-display font-bold text-base mb-2">{event.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{event.description}</p>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <CalendarDays className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="font-medium">{format(event.date, "EEEE, d MMMM yyyy 'la' HH:mm", { locale: ro })}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="text-muted-foreground">{event.location}</span>
          </div>
          <VolunteerList eventId={event.id} count={totalParticipants} />
        </div>
        {!isPast && (
          <Button
            size="sm"
            onClick={handleJoin}
            disabled={joinMutation.isPending}
            className="w-full gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0"
            data-testid={`button-volunteer-${event.id}`}
          >
            {joinMutation.isPending ? "Se procesează..." : <><Leaf className="w-4 h-4" /><span>Mă înscriu ca voluntar</span></>}
          </Button>
        )}
      </div>
    </article>
  );
}

// ── PropuneEveniment form ─────────────────────────────────────────────────────
function PropuneEvenimentForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", date: "", location: "", imageUrl: "" });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, date: new Date(data.date) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Eveniment propus! ✓", description: "Propunerea ta a fost trimisă spre aprobare la primărie." });
      onClose();
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
  });

  const canSubmit = form.title.trim().length >= 3 && form.description.trim().length >= 10 && form.date && form.location.trim().length >= 3;

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 mb-5 shadow-sm space-y-3" id="propune-form">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base">Propune un eveniment</h2>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-lg p-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-800 dark:text-blue-300">Evenimentul va fi verificat înainte de publicare.</p>
      </div>
      <Input placeholder="Titlu eveniment *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="input-event-title" />
      <Input placeholder="Locație *" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} data-testid="input-event-location" />
      <div>
        <p className="text-xs text-muted-foreground mb-1">Data și ora *</p>
        <Input type="datetime-local" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} data-testid="input-event-date" />
      </div>
      <Textarea placeholder="Descriere eveniment (minim 10 caractere) *" className="min-h-[80px] resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} data-testid="input-event-description" />
      <Input placeholder="URL imagine (opțional)" value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} data-testid="input-event-image" />
      <Button className="w-full gap-1.5" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate(form)} data-testid="button-submit-event">
        <Send className="w-4 h-4" />{mutation.isPending ? "Se trimite..." : "Trimite spre aprobare"}
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Evenimente() {
  const { data: events, isLoading } = useEvents();
  const [tab, setTab] = useState<Tab>("evenimente");
  const { s } = useSettings();
  const { user } = useAuth();
  const [showPropune, setShowPropune] = useState(false);
  const search = useSearch();

  // Auto-open the proposal form if navigated with ?propune=1 (from FAB)
  useEffect(() => {
    if (search?.includes("propune=1")) {
      setShowPropune(true);
      setTimeout(() => {
        document.getElementById("propune-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [search]);

  const regularEvents = events?.filter(e => e.category !== "voluntariat") ?? [];
  const voluntariatEvents = events?.filter(e => e.category === "voluntariat") ?? [];

  const upcoming = regularEvents.filter(e => e.date >= new Date());
  const past = regularEvents.filter(e => e.date < new Date());
  const upcomingVol = voluntariatEvents.filter(e => e.date >= new Date());
  const pastVol = voluntariatEvents.filter(e => e.date < new Date());

  const totalVolunteers = voluntariatEvents.reduce((s, e) => s + (e.participantCount ?? 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-primary/10 p-2.5 rounded-xl">
          {tab === "voluntariat"
            ? <TreePine className="w-6 h-6 text-green-600" />
            : <CalendarDays className="w-6 h-6 text-primary" />}
        </div>
        <div>
          <h1 className="font-display font-bold text-xl">
            {tab === "voluntariat" ? "Voluntariat civic" : s("events_title")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {tab === "voluntariat"
              ? `${voluntariatEvents.length} acțiuni · ${totalVolunteers} voluntari`
              : s("events_subtitle")}
          </p>
        </div>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {/* Propune eveniment — for any logged-in user */}
      {user && tab === "evenimente" && !showPropune && (
        <div className="mb-5">
          <Button size="sm" variant="outline" className="w-full gap-1.5 rounded-xl h-10 border-dashed border-primary/40 text-primary hover:bg-primary/5" onClick={() => setShowPropune(true)} data-testid="button-propune-eveniment">
            <Plus className="w-4 h-4" />Propune un eveniment
          </Button>
        </div>
      )}
      {showPropune && <PropuneEvenimentForm onClose={() => setShowPropune(false)} />}

      {isLoading && <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>}

      {!isLoading && tab === "evenimente" && (
        <>
          {upcoming.length > 0 && (
            <>
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Viitoare</h2>
              <div className="space-y-4 mb-6">{upcoming.map(e => <EventCard key={e.id} event={e} />)}</div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Trecute</h2>
              <div className="space-y-4">{past.map(e => <EventCard key={e.id} event={e} />)}</div>
            </>
          )}
          {regularEvents.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Nu există evenimente programate.</p>}
        </>
      )}

      {!isLoading && tab === "voluntariat" && (
        <>
          {/* Social proof banner */}
          {totalVolunteers > 0 && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl p-3 mb-5 flex items-center gap-3">
              <Heart className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                <span className="font-bold">{totalVolunteers}</span> persoane s-au implicat în comunitate!
              </p>
            </div>
          )}

          {upcomingVol.length > 0 && (
            <>
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Acțiuni viitoare</h2>
              <div className="space-y-4 mb-6">{upcomingVol.map(e => <VoluntariatCard key={e.id} event={e} />)}</div>
            </>
          )}
          {pastVol.length > 0 && (
            <>
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Acțiuni trecute</h2>
              <div className="space-y-4">{pastVol.map(e => <VoluntariatCard key={e.id} event={e} />)}</div>
            </>
          )}
          {voluntariatEvents.length === 0 && (
            <div className="py-12 text-center">
              <TreePine className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Nu există acțiuni de voluntariat planificate.</p>
              <p className="text-xs text-muted-foreground mt-1">Primăria poate adăuga acțiuni civice în curând.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
