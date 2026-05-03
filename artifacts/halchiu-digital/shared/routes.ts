import { z } from "zod";
import { insertPostSchema, insertEventSchema, insertReportSchema, insertBusinessSchema, posts, events, reports, businesses } from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
};

export const api = {
  posts: {
    list: { method: "GET" as const, path: "/api/posts" as const, responses: { 200: z.array(z.custom<typeof posts.$inferSelect>()) } },
    create: { method: "POST" as const, path: "/api/posts" as const, input: insertPostSchema, responses: { 201: z.custom<typeof posts.$inferSelect>() } },
  },
  events: {
    list: { method: "GET" as const, path: "/api/events" as const, responses: { 200: z.array(z.custom<typeof events.$inferSelect>()) } },
    join: { method: "POST" as const, path: "/api/events/:id/join" as const, responses: { 200: z.custom<typeof events.$inferSelect>() } },
  },
  reports: {
    list: { method: "GET" as const, path: "/api/reports" as const, responses: { 200: z.array(z.custom<typeof reports.$inferSelect>()) } },
    create: { method: "POST" as const, path: "/api/reports" as const, input: insertReportSchema, responses: { 201: z.custom<typeof reports.$inferSelect>() } },
  },
  businesses: {
    list: { method: "GET" as const, path: "/api/businesses" as const, responses: { 200: z.array(z.custom<typeof businesses.$inferSelect>()) } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) Object.entries(params).forEach(([key, value]) => { url = url.replace(`:${key}`, String(value)); });
  return url;
}
