import { useState } from "react";
import { usePosts, useCreatePost, useAnnouncements, useCreateAnnouncement } from "@/hooks/use-halchiu";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { vibrate } from "@/hooks/use-pwa";
import { ChatWidget } from "@/components/chat-widget";
import { CHAT_CHANNELS, CHAT_CHANNEL_LABELS } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShareButton } from "@/components/share-button";
import { Users, Plus, X, MessageSquare, Bell, Search, Heart, Wrench, HelpCircle, Clock, MessageCircle, Lightbulb, HelpCircle as Question } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import type { Post, Announcement } from "@/hooks/use-halchiu";
import { ANNOUNCEMENT_TYPE_LABELS, type AnnouncementType } from "@shared/schema";

// ── Tab bar ──────────────────────────────────────────────────────────────────
type Tab = "discutii" | "anunturi" | "chat";

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 mb-5 bg-muted/50 rounded-xl p-1 overflow-x-auto scrollbar-none">
      {([
        { id: "discutii" as Tab, label: "Discuții", icon: MessageSquare },
        { id: "anunturi" as Tab, label: "Anunțuri", icon: Bell },
        { id: "chat" as Tab, label: "Chat", icon: MessageCircle },
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

// ── Discussion categories ─────────────────────────────────────────────────────
const DISCUSSION_CATEGORIES: Record<string, { label: string; icon: typeof Lightbulb; color: string }> = {
  sugestie:  { label: "Sugestie", icon: Lightbulb, color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40" },
  intrebare: { label: "Întrebare", icon: Question, color: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/40" },
  generala:  { label: "Generală", icon: MessageSquare, color: "bg-muted text-muted-foreground border-border" },
};

// ── Community post card ───────────────────────────────────────────────────────
function CommunityPost({ post }: { post: Post }) {
  const catKey = post.category?.toLowerCase() ?? "generala";
  const catInfo = DISCUSSION_CATEGORIES[catKey] ?? DISCUSSION_CATEGORIES.generala;
  const Icon = catInfo.icon;
  
  return (
    <div className="bg-card border border-card-border rounded-xl p-4" data-testid={`community-post-${post.id}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {post.author[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold">{post.author}</p>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(post.createdAt, { addSuffix: true, locale: ro })}</p>
        </div>
        {post.category && (
          <div className={`ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${catInfo.color}`}>
            <Icon className="w-3 h-3" />
            {catInfo.label}
          </div>
        )}
      </div>
      <h3 className="font-display font-semibold text-sm mb-1">{post.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{post.content}</p>
      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground flex-1">Hălchiu Digital</span>
        <ShareButton
          title={post.title}
          text={`${post.content.slice(0, 80)}…`}
          url={window.location.origin + "/comunitate"}
          size="sm"
        />
      </div>
    </div>
  );
}

// ── Announcements ─────────────────────────────────────────────────────────────
const ANN_ICON: Record<string, typeof Bell> = {
  pierdut: Search,
  gasit: HelpCircle,
  donatie: Heart,
  meserias: Wrench,
  altele: Bell,
};

const ANN_COLOR: Record<string, string> = {
  pierdut: "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/40",
  gasit:   "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700/40",
  donatie: "bg-pink-100 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-700/40",
  meserias:"bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/40",
  altele:  "bg-muted text-muted-foreground border-border",
};

function AnnouncementCard({ ann }: { ann: Announcement }) {
  const Icon = ANN_ICON[ann.type] ?? Bell;
  const colorClass = ANN_COLOR[ann.type] ?? ANN_COLOR.altele;
  return (
    <div className="bg-card border border-card-border rounded-xl p-4" data-testid={`announcement-${ann.id}`}>
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass.split(" ").slice(0,2).join(" ")}`}>
          <Icon className={`w-4.5 h-4.5 ${colorClass.split(" ").slice(2,4).join(" ")}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-sm">{ann.title}</h3>
            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
              {ANNOUNCEMENT_TYPE_LABELS[ann.type as AnnouncementType] ?? ann.type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(ann.createdAt, { addSuffix: true, locale: ro })}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{ann.description}</p>
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Expiră în 14 zile</span>
        </div>
        <a href={`tel:${ann.contact}`}>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs rounded-full" data-testid={`button-contact-ann-${ann.id}`}>
            Contact
          </Button>
        </a>
      </div>
    </div>
  );
}

const annSchema = z.object({
  type: z.enum(["pierdut", "gasit", "donatie", "meserias", "altele"]),
  title: z.string().min(5, "Minim 5 caractere"),
  description: z.string().min(10, "Minim 10 caractere"),
  contact: z.string().min(5, "Contactul este obligatoriu"),
});

function AnnouncementsTab() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("toate");

  const form = useForm<z.infer<typeof annSchema>>({
    resolver: zodResolver(annSchema),
    defaultValues: { type: "altele", title: "", description: "", contact: "" },
  });

  const filtered = filterType === "toate" ? announcements : announcements.filter(a => a.type === filterType);

  const onSubmit = (data: z.infer<typeof annSchema>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: "Anunț publicat!", description: "Anunțul tău a apărut în comunitate. Expiră în 14 zile." });
        setShowForm(false);
        form.reset();
      },
      onError: (e) => toast({ variant: "destructive", title: "Eroare", description: e.message }),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{announcements.length} anunțuri active</p>
        {user && (
          <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(v => !v)} data-testid="button-add-announcement">
            {showForm ? <><X className="w-4 h-4" />Anulează</> : <><Plus className="w-4 h-4" />Adaugă anunț</>}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5 shadow-sm">
          <h2 className="font-display font-semibold text-base mb-4">Anunț nou</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipul anunțului</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm" data-testid="select-ann-type">
                      <option value="pierdut">🔍 Pierdut</option>
                      <option value="gasit">✅ Găsit</option>
                      <option value="donatie">❤️ Donație</option>
                      <option value="meserias">🔧 Meșteșugar disponibil</option>
                      <option value="altele">📢 Altele</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Titlu</FormLabel><FormControl><Input placeholder="Descrie pe scurt..." {...field} data-testid="input-ann-title" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Detalii</FormLabel><FormControl><Textarea placeholder="Descriere completă, detalii relevante..." className="min-h-[80px] resize-none" {...field} data-testid="textarea-ann-desc" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contact" render={({ field }) => (
                <FormItem><FormLabel>Contact</FormLabel><FormControl><Input placeholder="Telefon, email..." {...field} data-testid="input-ann-contact" /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-announcement">
                {createMutation.isPending ? "Se publică..." : "Publică anunț"}
              </Button>
            </form>
          </Form>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
        {(["toate", "pierdut", "gasit", "donatie", "meserias", "altele"] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterType === t ? "bg-primary text-white border-primary" : "bg-card border-card-border text-muted-foreground hover:border-primary/30"}`}
            data-testid={`filter-ann-${t}`}
          >
            {t === "toate" ? "Toate" : ANNOUNCEMENT_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>}
      {!isLoading && (
        <div className="space-y-3">
          {filtered.map(a => <AnnouncementCard key={a.id} ann={a} />)}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nu există anunțuri în această categorie.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Community discussions tab ─────────────────────────────────────────────────
const postSchema = z.object({
  title: z.string().min(5, "Titlul trebuie să aibă cel puțin 5 caractere"),
  content: z.string().min(10, "Conținutul trebuie să aibă cel puțin 10 caractere"),
  author: z.string().min(2, "Numele este obligatoriu"),
  category: z.enum(["sugestie", "intrebare", "generala"]),
});
type PostFormValues = z.infer<typeof postSchema>;

function DiscussionsTab() {
  const { data: allPosts, isLoading } = usePosts();
  const createMutation = useCreatePost();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const [filterCat, setFilterCat] = useState<string>("toate");

  const communityPosts = allPosts?.filter(p => p.type === "community") ?? [];
  const filtered = filterCat === "toate" ? communityPosts : communityPosts.filter(p => p.category?.toLowerCase() === filterCat);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: "", content: "", author: user?.name ?? "", category: "generala" },
  });

  const isOfficial = user?.role === "administrator" || user?.role === "primar" || user?.role === "viceprimar";

  const onSubmit = (data: PostFormValues) => {
    vibrate(60);
    createMutation.mutate({ ...data, type: "community" }, {
      onSuccess: () => {
        vibrate([40, 30, 40]);
        const prev = parseInt(localStorage.getItem("halchiu_posts_count") ?? "0", 10);
        localStorage.setItem("halchiu_posts_count", String(prev + 1));
        if (isOfficial) {
          toast({ title: "Postare publicată!", description: "Mesajul tău a fost publicat imediat." });
        } else {
          toast({ title: "Postare trimisă spre moderare", description: "Mesajul tău va fi vizibil după ce un moderator îl aprobă. +5 puncte acordate." });
        }
        setShowForm(false);
        form.reset();
      },
      onError: () => toast({ variant: "destructive", title: "Eroare", description: "Nu am putut trimite postarea." }),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{communityPosts.length} postări</p>
        <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowForm(v => !v)} data-testid="button-toggle-post-form">
          {showForm ? <><X className="w-4 h-4" />Anulează</> : <><Plus className="w-4 h-4" />Postează</>}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5 shadow-sm">
          <h2 className="font-display font-semibold text-base mb-4">Postare nouă</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="author" render={({ field }) => (
                <FormItem><FormLabel>Numele tău</FormLabel><FormControl><Input placeholder="ex: Ion Ionescu" {...field} data-testid="input-author" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Titlu</FormLabel><FormControl><Input placeholder="Subiectul postării" {...field} data-testid="input-post-title" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip discuție</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm" data-testid="select-discussion-type">
                      <option value="sugestie">💡 Sugestie</option>
                      <option value="intrebare">❓ Întrebare</option>
                      <option value="generala">💬 Discuție generală</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem><FormLabel>Mesaj</FormLabel><FormControl><Textarea placeholder="Scrie mesajul tău..." className="min-h-[100px] resize-none" {...field} data-testid="textarea-content" /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-publish-post">
                {createMutation.isPending ? "Se publică..." : "Publică"}
              </Button>
            </form>
          </Form>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
        {(["toate", "sugestie", "intrebare", "generala"] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterCat === cat ? "bg-primary text-white border-primary" : "bg-card border-card-border text-muted-foreground hover:border-primary/30"}`}
            data-testid={`filter-discussion-${cat}`}
          >
            {cat === "toate" ? "Toate" : cat === "sugestie" ? "Sugestii" : cat === "intrebare" ? "Întrebări" : "Generale"}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>}
      {!isLoading && (
        <div className="space-y-3">
          {filtered.map(p => <CommunityPost key={p.id} post={p} />)}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Nu există discuții în această categorie.</p>}
          {communityPosts.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Nu există postări. Fii primul!</p>}
        </div>
      )}
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTabContent() {
  const [channel, setChannel] = useState<string>("general");
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
        {CHAT_CHANNELS.map(ch => (
          <button
            key={ch}
            onClick={() => setChannel(ch)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${channel === ch ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
            data-testid={`chat-channel-${ch}`}
          >
            {CHAT_CHANNEL_LABELS[ch as keyof typeof CHAT_CHANNEL_LABELS] || ch}
          </button>
        ))}
      </div>
      <ChatWidget channel={channel} title={`Discuții - ${CHAT_CHANNEL_LABELS[channel as keyof typeof CHAT_CHANNEL_LABELS] || channel}`} className="h-96" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Comunitate() {
  const [tab, setTab] = useState<Tab>("discutii");
  const { s } = useSettings();

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-primary/10 p-2.5 rounded-xl">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl">{s("community_title")}</h1>
          <p className="text-xs text-muted-foreground">{s("community_subtitle")}</p>
        </div>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {tab === "discutii" && <DiscussionsTab />}
      {tab === "anunturi" && <AnnouncementsTab />}
      {tab === "chat" && <ChatTabContent />}
    </div>
  );
}
