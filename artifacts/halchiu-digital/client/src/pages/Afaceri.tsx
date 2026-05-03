import { useState, useMemo, useRef, useEffect } from "react";
import { useBusinesses, useMarketplace, useCreateMarketplaceItem, useJobListings, useCreateJobListing } from "@/hooks/use-halchiu";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShoppingBag, Phone, Globe, MapPin, BadgeCheck,
  Store, Briefcase, Tag, Plus, X, PhoneCall,
  Package, Wrench, Megaphone, Clock, Map, Navigation2, Send, Loader2, Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import type { Business, MarketplaceItem, JobListing } from "@/hooks/use-halchiu";
import { JOB_TYPE_LABELS, MARKETPLACE_CATEGORY_LABELS, type JobType, type MarketplaceCategory } from "@shared/schema";

// ── Category suggestions ──────────────────────────────────────────────────────
const CATEGORY_SUGGESTIONS = [
  "Restaurant", "Cafenea", "Bar", "Fast-food",
  "Magazin alimentar", "Magazin mixt", "Supermarket",
  "Frizerie", "Coafor", "Salon înfrumusețare",
  "Service auto", "Stație ITP", "Vulcanizare",
  "Farmacie", "Cabinet medical", "Stomatologie",
  "Construcții", "Instalații", "Electrician",
  "Transport persoane", "Transport marfă",
  "Agricultură", "Apicultură", "Fermă",
  "Contabilitate", "Avocatură", "Asigurări",
  "IT & Servicii digitale", "Educație / Meditații",
  "Curățătorie", "Spălătorie auto",
  "Florărie", "Morărit / Panificație",
  "Altele",
];

// ── Tab bar ──────────────────────────────────────────────────────────────────
type Tab = "afaceri" | "marketplace" | "joburi";
function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
    { id: "afaceri",     label: "Afaceri",     icon: ShoppingBag },
    { id: "marketplace", label: "Marketplace", icon: Store },
    { id: "joburi",      label: "Joburi",      icon: Briefcase },
  ];
  return (
    <div className="flex gap-1 mb-5 bg-muted/50 rounded-xl p-1">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${active === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          data-testid={`tab-${id}`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Businesses Map ───────────────────────────────────────────────────────────
function BusinessesMap({ businesses, selected }: { businesses: Business[]; selected: string | null }) {
  const withCoords = businesses.filter(b => b.lat && b.lng);

  const center = withCoords.length > 0
    ? { lat: withCoords.reduce((s, b) => s + (b.lat || 0), 0) / withCoords.length, lng: withCoords.reduce((s, b) => s + (b.lng || 0), 0) / withCoords.length }
    : { lat: 45.77, lng: 25.592 };

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.05},${center.lat - 0.05},${center.lng + 0.05},${center.lat + 0.05}&layer=mapnik&marker=${center.lat},${center.lng}`;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Map className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Localizare pe hartă</span>
        {withCoords.length > 0 && <span className="text-xs text-muted-foreground ml-auto">{withCoords.length} cu locație</span>}
      </div>
      <div className="relative rounded-xl overflow-hidden border border-card-border bg-card shadow-sm">
        <iframe
          width="100%"
          height="280"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          style={{ border: 0 }}
          loading="lazy"
        />
        {withCoords.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-black/60 backdrop-blur-sm rounded-lg p-2 text-xs space-y-1 max-h-[100px] overflow-y-auto">
            {withCoords.slice(0, 5).map(b => (
              <div key={b.id} className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${selected === String(b.id) ? "bg-primary/20 text-primary font-semibold" : "text-foreground hover:bg-muted"}`}>
                <div className="flex items-start gap-1">
                  <Navigation2 className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{b.name}</p>
                  </div>
                </div>
              </div>
            ))}
            {withCoords.length > 5 && <p className="text-xs text-muted-foreground px-2 py-1">+ {withCoords.length - 5} mai multe</p>}
          </div>
        )}
        {withCoords.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <p className="text-xs text-white text-center">Afacerile nu au încă locații înregistrate</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Category autocomplete input ───────────────────────────────────────────────
function CategoryInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.trim().length === 0
    ? CATEGORY_SUGGESTIONS.slice(0, 8)
    : CATEGORY_SUGGESTIONS.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="Categoria afacerii (ex: Restaurant, Service auto) *"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        data-testid="input-biz-category"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0"
                onMouseDown={() => { onChange(suggestion); setOpen(false); }}
                data-testid={`suggestion-${suggestion.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {suggestion}
                {!CATEGORY_SUGGESTIONS.includes(value) && value.trim().length >= 2 && suggestion === filtered[0] && (
                  <span className="ml-2 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">sugestie</span>
                )}
              </button>
            ))}
            {value.trim().length >= 2 && !CATEGORY_SUGGESTIONS.some(s => s.toLowerCase() === value.toLowerCase()) && (
              <button
                type="button"
                className="w-full text-left px-3.5 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors border-t border-border/30 font-medium"
                onMouseDown={() => setOpen(false)}
                data-testid="use-custom-category"
              >
                Folosește „{value}" — categorie nouă (va fi validată)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Geocode address via Nominatim ─────────────────────────────────────────────
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, Hălchiu, România`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
      headers: { "Accept-Language": "ro" },
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Generate placeholder image based on category ─────────────────────────────
function getCategoryImageSeed(category: string, name: string): string {
  const keywords: Record<string, string> = {
    restaurant: "restaurant,food,dining",
    cafenea: "cafe,coffee,coffeeshop",
    bar: "bar,pub,drinks",
    magazin: "shop,store,market",
    frizerie: "barber,haircut,salon",
    coafor: "hairdresser,beauty,salon",
    farmacie: "pharmacy,medicine,health",
    service: "garage,mechanic,car",
    construcții: "construction,building,architecture",
    agricultură: "farm,agriculture,rural",
    apicultură: "honey,bees,apiculture",
    florărie: "flowers,floral,bouquet",
  };
  const catLower = category.toLowerCase();
  const keyword = Object.entries(keywords).find(([k]) => catLower.includes(k))?.[1] ?? "business,local,community";
  // Use a stable hash of name+category as seed for picsum
  const seed = encodeURIComponent(name.slice(0, 10) + category.slice(0, 5));
  return `https://picsum.photos/seed/${seed}/800/450`;
}

// ── Submit business form for citizens ────────────────────────────────────────
function AdaugaAfacereaTabForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", category: "", description: "", address: "", phone: "", website: "", imageUrl: "" });
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState<{ lat: number; lng: number } | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced geocoding when address changes
  const handleAddressChange = (address: string) => {
    setForm(p => ({ ...p, address }));
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (address.trim().length < 5) { setGeocoded(null); return; }
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      const coords = await geocodeAddress(address);
      setGeocoded(coords);
      setGeocoding(false);
    }, 800);
  };

  const handleGenerateImage = async () => {
    if (!form.name || !form.category) {
      toast({ variant: "destructive", title: "Completează", description: "Introdu mai întâi numele și categoria afacerii." });
      return;
    }
    setGeneratingImage(true);
    // Generate a deterministic placeholder based on name + category
    const imageUrl = getCategoryImageSeed(form.category, form.name);
    await new Promise(r => setTimeout(r, 800)); // simulate loading
    setForm(p => ({ ...p, imageUrl }));
    setGeneratingImage(false);
    toast({ title: "Imagine generată", description: "O imagine reprezentativă a fost adăugată. O poți înlocui cu una mai specifică." });
  };

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload: any = { ...data };
      if (geocoded) { payload.lat = geocoded.lat; payload.lng = geocoded.lng; }
      const res = await fetch("/api/businesses/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/businesses"] });
      toast({ title: "Afacere trimisă! ✓", description: "Afacerea va fi verificată înainte de publicare în director. Vei fi notificat." });
      onClose();
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
  });

  const canSubmit = form.name.trim().length >= 2 && form.category.trim().length >= 2 && form.description.trim().length >= 10;

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 mb-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base">Adaugă afacerea ta</h2>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      {/* Verification notice */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-lg p-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-800 dark:text-blue-300">Afacerea va fi verificată înainte de publicare în director.</p>
      </div>

      <Input placeholder="Numele afacerii *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-biz-name" />

      {/* Category with autocomplete */}
      <CategoryInput value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} />
      {form.category && !CATEGORY_SUGGESTIONS.includes(form.category) && form.category.trim().length >= 2 && (
        <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1.5 rounded-lg -mt-1">
          Categorie nouă „{form.category}" — va fi validată în procesul de aprobare.
        </p>
      )}

      <Textarea placeholder="Descriere afacere (minim 10 caractere) *" className="min-h-[80px] resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} data-testid="input-biz-description" />

      {/* Address with geocoding feedback */}
      <div className="relative">
        <Input
          placeholder="Adresă (opțional)"
          value={form.address}
          onChange={e => handleAddressChange(e.target.value)}
          data-testid="input-biz-address"
        />
        {geocoding && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        )}
      </div>
      {geocoded && (
        <div className="flex items-center gap-2 -mt-1">
          <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">Locație găsită pe hartă ✓ — va fi afișată în directorul afacerilor</p>
        </div>
      )}
      {form.address && !geocoding && !geocoded && form.address.trim().length >= 5 && (
        <p className="text-xs text-muted-foreground -mt-1 flex items-center gap-1.5">
          <MapPin className="w-3 h-3 shrink-0" />Adresa nu a putut fi localizată automat
        </p>
      )}

      {geocoded && (
        <div className="rounded-xl overflow-hidden border border-card-border" style={{ height: 140 }}>
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${geocoded.lng - 0.005},${geocoded.lat - 0.005},${geocoded.lng + 0.005},${geocoded.lat + 0.005}&layer=mapnik&marker=${geocoded.lat},${geocoded.lng}`}
            className="w-full h-full border-0"
            loading="lazy"
            title="Locație afacere"
          />
        </div>
      )}

      <Input placeholder="Telefon (opțional)" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} data-testid="input-biz-phone" />
      <Input placeholder="Website (opțional)" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} data-testid="input-biz-website" />

      {/* Image URL with generate option */}
      <div className="space-y-2">
        <Input placeholder="URL imagine (opțional)" value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} data-testid="input-biz-image" />
        {!form.imageUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs border-dashed"
            onClick={handleGenerateImage}
            disabled={generatingImage || !form.name || !form.category}
            data-testid="button-generate-image"
          >
            {generatingImage ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Se generează imagine...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 text-primary" />Generează imagine din descriere</>
            )}
          </Button>
        )}
        {form.imageUrl && (
          <div className="relative rounded-xl overflow-hidden border border-card-border aspect-[16/7]">
            <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, imageUrl: "" }))}
              className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
              data-testid="button-clear-image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <Button className="w-full gap-1.5" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate(form)} data-testid="button-submit-business">
        <Send className="w-4 h-4" />{mutation.isPending ? "Se trimite..." : "Trimite spre aprobare"}
      </Button>
    </div>
  );
}

// ── Business card ─────────────────────────────────────────────────────────────
function BusinessCard({ biz }: { biz: Business }) {
  return (
    <article className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm" data-testid={`business-${biz.id}`}>
      {biz.imageUrl && (
        <div className="relative aspect-[16/7] overflow-hidden">
          <img src={biz.imageUrl} alt={biz.name} className="object-cover w-full h-full" />
          {biz.verified && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-semibold shadow">
                <BadgeCheck className="w-3 h-3" />Verificat
              </span>
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-base leading-tight">{biz.name}</h3>
            {biz.verified && !biz.imageUrl && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                <BadgeCheck className="w-3 h-3" />Verificat
              </span>
            )}
          </div>
          <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full shrink-0">{biz.category}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{biz.description}</p>
        <div className="space-y-1.5">
          {biz.address && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" /><span>{biz.address}</span>
            </div>
          )}
          {biz.phone && (
            <a href={`tel:${biz.phone}`} className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Phone className="w-3.5 h-3.5 shrink-0" /><span>{biz.phone}</span>
            </a>
          )}
          {biz.website && (
            <a href={biz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Globe className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{biz.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Marketplace tab ──────────────────────────────────────────────────────────
const CAT_ICON: Record<string, typeof Package> = {
  produse: Package,
  servicii: Wrench,
  anunturi: Megaphone,
};

const CAT_COLOR: Record<string, string> = {
  produse: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700/40",
  servicii: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/40",
  anunturi: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40",
};

function MarketplaceCard({ item }: { item: MarketplaceItem }) {
  const Icon = CAT_ICON[item.category] ?? Package;
  const colorClass = CAT_COLOR[item.category] ?? CAT_COLOR.anunturi;
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid={`marketplace-${item.id}`}>
      {item.imageUrl && (
        <div className="aspect-[16/8] overflow-hidden">
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass.split(" ").slice(0,2).join(" ")}`}>
            <Icon className={`w-4.5 h-4.5 ${colorClass.split(" ").slice(2,4).join(" ")}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-sm leading-tight">{item.title}</h3>
            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${colorClass}`}>
              {MARKETPLACE_CATEGORY_LABELS[item.category as MarketplaceCategory] ?? item.category}
            </span>
          </div>
          {item.price && (
            <div className="shrink-0 text-right">
              <span className="flex items-center gap-1 text-xs font-bold text-primary">
                <Tag className="w-3 h-3" />{item.price}
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: ro })}
          </span>
          <a href={`tel:${item.contact}`}>
            <Button size="sm" className="h-7 gap-1.5 text-xs rounded-full" data-testid={`button-contact-marketplace-${item.id}`}>
              <PhoneCall className="w-3 h-3" />Contactează
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

const marketplaceSchema = z.object({
  title: z.string().min(5, "Minim 5 caractere"),
  description: z.string().min(10, "Minim 10 caractere"),
  category: z.enum(["produse", "servicii", "anunturi"]),
  price: z.string().optional(),
  contact: z.string().min(5, "Contactul este obligatoriu"),
});

function MarketplaceTab() {
  const { data: items = [], isLoading } = useMarketplace();
  const createMutation = useCreateMarketplaceItem();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("toate");

  const form = useForm<z.infer<typeof marketplaceSchema>>({
    resolver: zodResolver(marketplaceSchema),
    defaultValues: { title: "", description: "", category: "produse", price: "", contact: "" },
  });

  const filtered = filterCat === "toate" ? items : items.filter(i => i.category === filterCat);

  const onSubmit = (data: z.infer<typeof marketplaceSchema>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: "Anunț publicat!", description: "Anunțul tău a apărut în marketplace." });
        setShowForm(false);
        form.reset();
      },
      onError: (e) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{items.length} anunțuri active</p>
        {user && (
          <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(v => !v)} data-testid="button-add-marketplace">
            {showForm ? <><X className="w-4 h-4" />Anulează</> : <><Plus className="w-4 h-4" />Adaugă anunț</>}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5 shadow-sm">
          <h2 className="font-display font-semibold text-base mb-4">Anunț nou</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm" data-testid="select-marketplace-category">
                      <option value="produse">Produse locale</option>
                      <option value="servicii">Servicii</option>
                      <option value="anunturi">Anunțuri comerciale</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Titlu</FormLabel><FormControl><Input placeholder="ex: Miere naturală de albine" {...field} data-testid="input-marketplace-title" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descriere</FormLabel><FormControl><Textarea placeholder="Detalii despre produs sau serviciu..." className="min-h-[80px] resize-none" {...field} data-testid="textarea-marketplace-desc" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Preț (opțional)</FormLabel><FormControl><Input placeholder="ex: 30 RON/kg, negociabil..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contact" render={({ field }) => (
                <FormItem><FormLabel>Contact (telefon / WhatsApp)</FormLabel><FormControl><Input placeholder="07XX XXX XXX" {...field} data-testid="input-marketplace-contact" /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-marketplace">
                {createMutation.isPending ? "Se publică..." : "Publică anunț"}
              </Button>
            </form>
          </Form>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
        {["toate", "produse", "servicii", "anunturi"].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterCat === cat ? "bg-primary text-white border-primary" : "bg-card border-card-border text-muted-foreground hover:border-primary/30"}`}
            data-testid={`filter-marketplace-${cat}`}
          >
            {cat === "toate" ? "Toate" : MARKETPLACE_CATEGORY_LABELS[cat as MarketplaceCategory]}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>}
      {!isLoading && (
        <div className="space-y-3">
          {filtered.map(item => <MarketplaceCard key={item.id} item={item} />)}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Store className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nu există anunțuri în marketplace.</p>
              {user && <p className="text-xs text-primary mt-1">Fii primul care adaugă un anunț!</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Jobs tab ─────────────────────────────────────────────────────────────────
const JOB_COLORS: Record<string, string> = {
  full_time: "bg-primary/10 text-primary border-primary/20",
  part_time: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/40",
  sezonier: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40",
};

function JobCard({ job }: { job: JobListing }) {
  const colorClass = JOB_COLORS[job.type] ?? JOB_COLORS.full_time;
  return (
    <div className="bg-card border border-card-border rounded-xl p-4" data-testid={`job-${job.id}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-display font-bold text-sm leading-tight">{job.title}</h3>
          <p className="text-xs text-primary font-semibold mt-0.5">{job.company}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${colorClass}`}>
          {JOB_TYPE_LABELS[job.type as JobType] ?? job.type}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{job.description}</p>
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(job.createdAt, { addSuffix: true, locale: ro })}
        </span>
        <a href={`tel:${job.contact}`}>
          <Button size="sm" className="h-7 gap-1.5 text-xs rounded-full" data-testid={`button-apply-job-${job.id}`}>
            <PhoneCall className="w-3 h-3" />Aplică
          </Button>
        </a>
      </div>
    </div>
  );
}

const jobSchema = z.object({
  company: z.string().min(2, "Minim 2 caractere"),
  title: z.string().min(3, "Minim 3 caractere"),
  description: z.string().min(15, "Minim 15 caractere"),
  type: z.enum(["full_time", "part_time", "sezonier"]),
  contact: z.string().min(5, "Contactul este obligatoriu"),
});

function JobsTab() {
  const { data: jobs = [], isLoading } = useJobListings();
  const createMutation = useCreateJobListing();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("toate");

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: { company: "", title: "", description: "", type: "full_time", contact: "" },
  });

  const filtered = filterType === "toate" ? jobs : jobs.filter(j => j.type === filterType);

  const onSubmit = (data: z.infer<typeof jobSchema>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: "Job publicat!", description: "Anunțul de angajare a fost adăugat." });
        setShowForm(false);
        form.reset();
      },
      onError: (e) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{jobs.length} posturi disponibile</p>
        {user && (
          <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(v => !v)} data-testid="button-add-job">
            {showForm ? <><X className="w-4 h-4" />Anulează</> : <><Plus className="w-4 h-4" />Adaugă job</>}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5 shadow-sm">
          <h2 className="font-display font-semibold text-base mb-4">Anunț de angajare</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem><FormLabel>Companie / Angajator</FormLabel><FormControl><Input placeholder="ex: Ferma Văcaru" {...field} data-testid="input-job-company" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Postul disponibil</FormLabel><FormControl><Input placeholder="ex: Mecanic auto, Vânzătoare..." {...field} data-testid="input-job-title" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip angajare</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm" data-testid="select-job-type">
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="sezonier">Sezonier</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Detalii post</FormLabel><FormControl><Textarea placeholder="Cerințe, beneficii, program..." className="min-h-[80px] resize-none" {...field} data-testid="textarea-job-desc" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contact" render={({ field }) => (
                <FormItem><FormLabel>Contact pentru aplicații</FormLabel><FormControl><Input placeholder="Telefon, email, adresă..." {...field} data-testid="input-job-contact" /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-job">
                {createMutation.isPending ? "Se publică..." : "Publică anunț"}
              </Button>
            </form>
          </Form>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
        {(["toate", "full_time", "part_time", "sezonier"] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterType === t ? "bg-primary text-white border-primary" : "bg-card border-card-border text-muted-foreground hover:border-primary/30"}`}
            data-testid={`filter-job-${t}`}
          >
            {t === "toate" ? "Toate" : JOB_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>}
      {!isLoading && (
        <div className="space-y-3">
          {filtered.map(job => <JobCard key={job.id} job={job} />)}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nu există posturi disponibile momentan.</p>
            </div>
          )}
        </div>
      )}

      {!isLoading && jobs.length > 0 && (
        <div className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-3">
          <Briefcase className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Angajezi în Hălchiu?</span> Adaugă un anunț gratuit și ajunge la candidații locali.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Afaceri() {
  const { data: businesses = [], isLoading } = useBusinesses();
  const { s } = useSettings();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("afaceri");
  const [showAddBiz, setShowAddBiz] = useState(false);
  const [selectedBiz, setSelectedBiz] = useState<string | null>(null);

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-primary/10 p-2.5 rounded-xl">
          <ShoppingBag className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl">{s("businesses_title") || "Afaceri locale"}</h1>
          <p className="text-xs text-muted-foreground">{s("businesses_subtitle") || "Director de afaceri din comună"}</p>
        </div>
      </div>

      <TabBar active={tab} onChange={t => { setTab(t); setShowAddBiz(false); }} />

      {tab === "afaceri" && (
        <>
          {isLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>}
          {!isLoading && (
            <>
              {businesses.length > 0 && <BusinessesMap businesses={businesses as any} selected={selectedBiz} />}

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{businesses.length} afaceri înregistrate</p>
                {user && (
                  <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowAddBiz(v => !v)} data-testid="button-add-business">
                    {showAddBiz ? <><X className="w-4 h-4" />Anulează</> : <><Plus className="w-4 h-4" />Adaugă afacere</>}
                  </Button>
                )}
              </div>

              {showAddBiz && <AdaugaAfacereaTabForm onClose={() => setShowAddBiz(false)} />}

              <div className="space-y-4">
                {businesses.map(b => <BusinessCard key={b.id} biz={b as any} />)}
                {businesses.length === 0 && !showAddBiz && (
                  <div className="py-12 text-center">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">Nu există afaceri înregistrate încă.</p>
                    {user && <p className="text-xs text-primary mt-1">Fii primul care adaugă o afacere locală!</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === "marketplace" && <MarketplaceTab />}
      {tab === "joburi" && <JobsTab />}
    </div>
  );
}
