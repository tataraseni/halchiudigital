import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const postSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  author: z.string(),
  category: z.string().nullable(),
  imageUrl: z.string().nullable(),
  status: z.string(),
  createdAt: z.coerce.date(),
});

const eventSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  location: z.string(),
  imageUrl: z.string().nullable(),
  participantCount: z.number(),
  category: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.coerce.date(),
});

const reportSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  location: z.string().nullable(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  status: z.string().nullable(),
  visibility: z.string().nullable().optional(),
  adminReply: z.string().nullable().optional(),
  imageUrl: z.string().nullable(),
  imageUrls: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});

const businessSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  imageUrl: z.string().nullable(),
  verified: z.boolean(),
  status: z.string().default("approved"),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  createdAt: z.coerce.date(),
});

const marketplaceItemSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.string().nullable().optional(),
  contact: z.string(),
  imageUrl: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.coerce.date(),
});

const announcementSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  contact: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
});

const jobListingSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  company: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.string(),
  contact: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
});

export type Post = z.infer<typeof postSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Report = z.infer<typeof reportSchema>;
export type Business = z.infer<typeof businessSchema>;
export type MarketplaceItem = z.infer<typeof marketplaceItemSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type JobListing = z.infer<typeof jobListingSchema>;

async function apiFetch<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Eroare la încărcarea datelor");
  return schema.parse(await res.json());
}

export function usePosts() {
  return useQuery({
    queryKey: ["/api/posts"],
    queryFn: () => apiFetch("/api/posts", z.array(postSchema)),
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ["/api/events"],
    queryFn: () => apiFetch("/api/events", z.array(eventSchema)),
  });
}

export function useJoinEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/events/${id}/join`, { method: "POST" });
      if (!res.ok) throw new Error("Eroare");
      return eventSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/events"] }),
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["/api/reports"],
    queryFn: () => apiFetch("/api/reports", z.array(reportSchema)),
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description: string; category: string; location?: string; lat?: number | null; lng?: number | null; imageUrls?: string[] }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          imageUrls: data.imageUrls ? JSON.stringify(data.imageUrls) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Eroare");
      }
      return reportSchema.parse(await res.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      qc.invalidateQueries({ queryKey: ["/api/reports/mine"] });
    },
  });
}

export function useMyReports() {
  return useQuery({
    queryKey: ["/api/reports/mine"],
    queryFn: () => apiFetch("/api/reports/mine", z.array(reportSchema)),
  });
}

export function useAllReports() {
  return useQuery({
    queryKey: ["/api/reports/all"],
    queryFn: () => apiFetch("/api/reports/all", z.array(reportSchema)),
  });
}

export function useApproveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/reports/${id}/approve`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reports/all"] });
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { type: string; title: string; content: string; author: string; category?: string }) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Eroare");
      return postSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/posts"] }),
  });
}

export function useBusinesses() {
  return useQuery({
    queryKey: ["/api/businesses"],
    queryFn: () => apiFetch("/api/businesses", z.array(businessSchema)),
  });
}

// ── Marketplace ──────────────────────────────────────────────────────────────
export function useMarketplace() {
  return useQuery({
    queryKey: ["/api/marketplace"],
    queryFn: () => apiFetch("/api/marketplace", z.array(marketplaceItemSchema)),
  });
}

export function useCreateMarketplaceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description: string; category: string; price?: string; contact: string; imageUrl?: string }) => {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
      return marketplaceItemSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/marketplace"] }),
  });
}

export function useMarkItemSold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/marketplace/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sold" }),
      });
      if (!res.ok) throw new Error("Eroare");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/marketplace"] }),
  });
}

// ── Announcements ─────────────────────────────────────────────────────────────
export function useAnnouncements() {
  return useQuery({
    queryKey: ["/api/announcements"],
    queryFn: () => apiFetch("/api/announcements", z.array(announcementSchema)),
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { type: string; title: string; description: string; contact: string }) => {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
      return announcementSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/announcements"] }),
  });
}

// ── Job Listings ──────────────────────────────────────────────────────────────
export function useJobListings() {
  return useQuery({
    queryKey: ["/api/jobs"],
    queryFn: () => apiFetch("/api/jobs", z.array(jobListingSchema)),
  });
}

export function useCreateJobListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { company: string; title: string; description: string; type: string; contact: string }) => {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
      return jobListingSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/jobs"] }),
  });
}

// ── Recommendations ───────────────────────────────────────────────────────────
const recommendationSchema = z.object({
  id: z.number(),
  kind: z.enum(["event", "business", "post", "job", "marketplace"]),
  title: z.string(),
  subtitle: z.string(),
  category: z.string(),
  score: z.number(),
  href: z.string(),
  imageUrl: z.string().nullable().optional(),
});
export type RecommendationItem = z.infer<typeof recommendationSchema>;

export function useRecommendations() {
  return useQuery({
    queryKey: ["/api/recommendations"],
    queryFn: () => apiFetch("/api/recommendations", z.array(recommendationSchema)),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
