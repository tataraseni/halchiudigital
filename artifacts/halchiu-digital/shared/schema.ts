import { pgTable, text, serial, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ============ USERS ============
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("cetatean"),
  points: integer("points").default(0),
  notificationPrefs: text("notification_prefs"),  // JSON: NotificationPrefs
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ NOTIFICATIONS ============
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),           // null = broadcast to all
  type: text("type").notNull().default("info"),         // info | success | warning
  category: text("category").default("sistem"),         // anunturi_oficiale | comunitate | evenimente | sesizari | moderare | sistem
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ POSTS (feed) ============
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  category: text("category"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("approved"),
  expiresAt: timestamp("expires_at"),  // Postul se șterge automat după expirare + 24h
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ EVENTS ============
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),  // null = admin-added, set = user-submitted
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  participantCount: integer("participant_count").default(0),
  category: text("category").default("general"),  // general | voluntariat | cultural | sport
  status: text("status").notNull().default("approved"),  // approved | pending | rejected
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ REPORTS (sesizări) ============
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  location: text("location"),
  lat: real("lat"),
  lng: real("lng"),
  status: text("status").default("in_asteptare"),
  visibility: text("visibility").default("pending"),
  adminReply: text("admin_reply"),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ BUSINESSES ============
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),  // null = admin-added, set = user-submitted
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("approved"),  // approved | pending | rejected
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ MARKETPLACE ============
export const marketplaceItems = pgTable("marketplace_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),   // produse | servicii | anunturi
  price: text("price"),
  contact: text("contact").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"),   // pending | active | sold | inactive | rejected
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ COMMUNITY ANNOUNCEMENTS (anunțuri comunitare) ============
export const announcements = pgTable("community_announcements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  type: text("type").notNull(),   // pierdut | gasit | donatie | meserias | altele
  title: text("title").notNull(),
  description: text("description").notNull(),
  contact: text("contact").notNull(),
  status: text("status").notNull().default("active"),   // active | expired | removed
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ JOB LISTINGS ============
export const jobListings = pgTable("job_listings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  company: text("company").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("full_time"),   // full_time | part_time | sezonier
  contact: text("contact").notNull(),
  status: text("status").notNull().default("pending"),  // pending | active | filled | inactive | rejected
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ INSERT SCHEMAS ============
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, points: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, read: true });

// ============ NOTIFICATION PREFERENCES ============
export const NOTIFICATION_CATEGORIES = [
  "anunturi_oficiale",
  "comunitate",
  "evenimente",
  "sesizari",
  "moderare",
  "sistem",
] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];
export type NotificationPrefs = Record<NotificationCategory, boolean>;
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  anunturi_oficiale: true,
  comunitate: true,
  evenimente: true,
  sesizari: true,
  moderare: true,
  sistem: true,
};
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, status: true, expiresAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, participantCount: true, status: true, userId: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, status: true, adminReply: true });
export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, createdAt: true, verified: true, status: true, userId: true });
export const insertMarketplaceItemSchema = createInsertSchema(marketplaceItems).omit({ id: true, createdAt: true, status: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true, status: true });
export const insertJobListingSchema = createInsertSchema(jobListings).omit({ id: true, createdAt: true, status: true });

export const MARKETPLACE_STATUSES = ["pending", "active", "sold", "inactive", "rejected"] as const;
export type MarketplaceStatus = typeof MARKETPLACE_STATUSES[number];

export const JOB_STATUSES = ["pending", "active", "filled", "inactive", "rejected"] as const;
export type JobStatus = typeof JOB_STATUSES[number];

// ============ TYPES ============
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type MarketplaceItem = typeof marketplaceItems.$inferSelect;
export type InsertMarketplaceItem = z.infer<typeof insertMarketplaceItemSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type JobListing = typeof jobListings.$inferSelect;
export type InsertJobListing = z.infer<typeof insertJobListingSchema>;

// ============ SERVICES (servicii publice locale) ============
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  phone: text("phone"),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  schedule: text("schedule"),
  status: text("status").notNull().default("activ"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export const SERVICE_CATEGORIES = ["medical", "administratie", "educatie", "utilitati", "posta"] as const;
export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  medical: "Medical",
  administratie: "Administrație",
  educatie: "Educație",
  utilitati: "Utilități",
  posta: "Poștă",
};

// ============ PUSH SUBSCRIPTIONS ============
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof insertPushSubscriptionSchema._type;

// ============ APP SETTINGS (CMS) ============
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  groupName: text("group_name").notNull().default("general"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// ============ ROLES ============
export const ROLES = ["administrator", "primar", "viceprimar", "functionar_public", "moderator", "specialist", "cetatean"] as const;
export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<Role, string> = {
  administrator: "Administrator",
  primar: "Primar",
  viceprimar: "Viceprimar",
  functionar_public: "Funcționar Public",
  moderator: "Moderator",
  specialist: "Specialist",
  cetatean: "Cetățean",
};

// ============ USER PERMISSIONS (pentru rolul specialist) ============
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  section: text("section").notNull(),
  canRead: boolean("can_read").default(false),
  canWrite: boolean("can_write").default(false),
  canApprove: boolean("can_approve").default(false),
  canDelete: boolean("can_delete").default(false),
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({ id: true });
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

// Secțiunile aplicației (la ce poate fi restricționat un specialist)
export const PERMISSION_SECTIONS = [
  "health_campaigns",
  "health_alerts",
  "health_doctors",
  "health_appointments",
  "social_programs",
  "posts",
  "events",
  "reports",
  "businesses",
] as const;
export type PermissionSection = typeof PERMISSION_SECTIONS[number];

export const PERMISSION_SECTION_LABELS: Record<PermissionSection, string> = {
  health_campaigns: "Campanii sănătate",
  health_alerts: "Alerte sănătate",
  health_doctors: "Profiluri medici",
  health_appointments: "Programări medicale",
  social_programs: "Programe sociale",
  posts: "Postări comunitate",
  events: "Evenimente",
  reports: "Sesizări",
  businesses: "Afaceri locale",
};

// ============ STATUS CONSTANTS ============
export const POST_STATUSES = ["pending", "approved", "rejected"] as const;
export type PostStatus = typeof POST_STATUSES[number];

export const EVENT_STATUSES = ["pending", "approved", "rejected"] as const;
export type EventStatus = typeof EVENT_STATUSES[number];

export const BUSINESS_STATUSES = ["pending", "approved", "rejected"] as const;
export type BusinessStatus = typeof BUSINESS_STATUSES[number];

export const REPORT_STATUSES = ["in_asteptare", "in_lucru", "rezolvat", "respins"] as const;
export type ReportStatus = typeof REPORT_STATUSES[number];

export const MARKETPLACE_CATEGORIES = ["produse", "servicii", "anunturi"] as const;
export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number];
export const MARKETPLACE_CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  produse: "Produse locale",
  servicii: "Servicii",
  anunturi: "Anunțuri comerciale",
};

export const ANNOUNCEMENT_TYPES = ["pierdut", "gasit", "donatie", "meserias", "altele"] as const;
export type AnnouncementType = typeof ANNOUNCEMENT_TYPES[number];
export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  pierdut: "Pierdut",
  gasit: "Găsit",
  donatie: "Donație",
  meserias: "Meșteșugar",
  altele: "Altele",
};

export const JOB_TYPES = ["full_time", "part_time", "sezonier"] as const;
export type JobType = typeof JOB_TYPES[number];
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  sezonier: "Sezonier",
};

// Roles that auto-approve their own content
export const OFFICIAL_ROLES: Role[] = ["administrator", "primar", "viceprimar"];

// ============ USER BADGES ============
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  badgeType: text("badge_type").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, awardedAt: true });
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

// ── Gamification constants ─────────────────────────────────────────────────
export const BADGE_TYPES = [
  "primul_pas",      // first report
  "reporter",        // 3+ reports
  "voz_locala",      // first community post
  "ambasador",       // 5+ posts
  "voluntar",        // first volunteer event
  "comerciant",      // first marketplace listing
  "angajator",       // first job listing
  "organizator",     // first event join
  "investigator",    // first appointment request
  "campion",         // 100+ points
  "super_campion",   // 500+ points
  "cetatean_model",  // all 5 types of actions done
] as const;
export type BadgeType = typeof BADGE_TYPES[number];

export const BADGE_META: Record<BadgeType, { label: string; desc: string; icon: string; color: string }> = {
  primul_pas:    { label: "Primul Pas",        desc: "Ai trimis prima sesizare",          icon: "MapPin",        color: "amber"   },
  reporter:      { label: "Reporter local",    desc: "3+ sesizări trimise",               icon: "TrendingUp",    color: "orange"  },
  voz_locala:    { label: "Voce locală",        desc: "Prima postare în comunitate",       icon: "MessageSquare", color: "blue"    },
  ambasador:     { label: "Ambasador",          desc: "5+ postări în comunitate",          icon: "Star",          color: "purple"  },
  voluntar:      { label: "Voluntar civic",     desc: "Înscris la primul eveniment civic", icon: "Heart",         color: "rose"    },
  comerciant:    { label: "Comerciant local",   desc: "Primul anunț pe Marketplace",       icon: "ShoppingBag",   color: "teal"    },
  angajator:     { label: "Angajator",          desc: "Primul anunț de angajare",          icon: "Briefcase",     color: "cyan"    },
  organizator:   { label: "Organizator",        desc: "Participant la primul eveniment",   icon: "Calendar",      color: "indigo"  },
  investigator:  { label: "Pro-activ",          desc: "Prima programare medicală",         icon: "Stethoscope",   color: "green"   },
  campion:       { label: "Campion civic",      desc: "100+ puncte acumulate",             icon: "Award",         color: "yellow"  },
  super_campion: { label: "Super Campion",      desc: "500+ puncte acumulate",             icon: "Trophy",        color: "gold"    },
  cetatean_model:{ label: "Cetățean model",     desc: "Activ în 5 module diferite",        icon: "Shield",        color: "primary" },
};

export const LEVELS = [
  { min: 0,   max: 24,  name: "Nou venit",           color: "text-muted-foreground" },
  { min: 25,  max: 99,  name: "Cetățean",             color: "text-blue-600"         },
  { min: 100, max: 249, name: "Vecin activ",          color: "text-green-600"        },
  { min: 250, max: 499, name: "Lider local",          color: "text-purple-600"       },
  { min: 500, max: 999, name: "Ambasador comunitar",  color: "text-amber-600"        },
  { min: 1000,max: Infinity, name: "Erou civic",      color: "text-primary"          },
] as const;

export function getLevel(points: number) {
  return LEVELS.find(l => points >= l.min && points <= l.max) ?? LEVELS[0];
}
export function getNextLevel(points: number) {
  const idx = LEVELS.findIndex(l => points >= l.min && points <= l.max);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

// ============ HEALTH CAMPAIGNS ============
export const healthCampaigns = pgTable("health_campaigns", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),         // vaccinare | preventie | screening | caravana
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetGroup: text("target_group"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  location: text("location"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("activa"),  // activa | inactiva | viitoare
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ HEALTH ALERTS ============
export const healthAlerts = pgTable("health_alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),         // canicula | frig | epidemie | apa | sanitara
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("info"),  // info | warning | critical
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("activa"),    // activa | expirata
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ DOCTOR PROFILES ============
export const doctorProfiles = pgTable("doctor_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialization: text("specialization").notNull(),
  cabinetName: text("cabinet_name"),
  address: text("address"),
  phone: text("phone"),
  schedule: text("schedule"),              // JSON: { lv, s, d }
  status: text("status").notNull().default("activ"),  // activ | concediu | indisponibil
  substituteName: text("substitute_name"),
  substitutePhone: text("substitute_phone"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ APPOINTMENT REQUESTS ============
export const appointmentRequests = pgTable("appointment_requests", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull(),
  userId: integer("user_id"),
  patientName: text("patient_name").notNull(),
  phone: text("phone").notNull(),
  requestedDate: text("requested_date").notNull(),
  status: text("status").notNull().default("in_asteptare"),  // in_asteptare | confirmat | anulat
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ SOCIAL PROGRAMS ============
export const socialPrograms = pgTable("social_programs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),          // incalzire | lemne | sprijin | informare | vouchere
  title: text("title").notNull(),
  description: text("description").notNull(),
  eligibility: text("eligibility"),
  period: text("period"),
  documentsNeeded: text("documents_needed"),
  contactInfo: text("contact_info"),
  status: text("status").notNull().default("activ"),  // activ | inactiv | expirat
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ HEALTH / SOCIAL INSERT SCHEMAS ============
export const insertHealthCampaignSchema = createInsertSchema(healthCampaigns).omit({ id: true, createdAt: true });
export const insertHealthAlertSchema = createInsertSchema(healthAlerts).omit({ id: true, createdAt: true });
export const insertDoctorProfileSchema = createInsertSchema(doctorProfiles).omit({ id: true, createdAt: true });
export const insertAppointmentRequestSchema = createInsertSchema(appointmentRequests).omit({ id: true, createdAt: true, status: true });
export const insertSocialProgramSchema = createInsertSchema(socialPrograms).omit({ id: true, createdAt: true });

// ============ HEALTH / SOCIAL TYPES ============
export type HealthCampaign = typeof healthCampaigns.$inferSelect;
export type InsertHealthCampaign = z.infer<typeof insertHealthCampaignSchema>;
export type HealthAlert = typeof healthAlerts.$inferSelect;
export type InsertHealthAlert = z.infer<typeof insertHealthAlertSchema>;
export type DoctorProfile = typeof doctorProfiles.$inferSelect;
export type InsertDoctorProfile = z.infer<typeof insertDoctorProfileSchema>;
export type AppointmentRequest = typeof appointmentRequests.$inferSelect;
export type InsertAppointmentRequest = z.infer<typeof insertAppointmentRequestSchema>;
export type SocialProgram = typeof socialPrograms.$inferSelect;
export type InsertSocialProgram = z.infer<typeof insertSocialProgramSchema>;

// ============ HEALTH LABEL CONSTANTS ============
export const HEALTH_CAMPAIGN_TYPES = ["vaccinare", "preventie", "screening", "caravana"] as const;
export type HealthCampaignType = typeof HEALTH_CAMPAIGN_TYPES[number];
export const HEALTH_CAMPAIGN_TYPE_LABELS: Record<HealthCampaignType, string> = {
  vaccinare: "Vaccinare",
  preventie: "Prevenție",
  screening: "Screening",
  caravana: "Caravană medicală",
};

export const HEALTH_ALERT_TYPES = ["canicula", "frig", "epidemie", "apa", "sanitara"] as const;
export type HealthAlertType = typeof HEALTH_ALERT_TYPES[number];
export const HEALTH_ALERT_TYPE_LABELS: Record<HealthAlertType, string> = {
  canicula: "Caniculă",
  frig: "Frig extrem",
  epidemie: "Epidemie / Gripă",
  apa: "Calitate apă",
  sanitara: "Avertizare sanitară",
};

export const SOCIAL_PROGRAM_TYPES = ["incalzire", "lemne", "sprijin", "informare", "vouchere"] as const;
export type SocialProgramType = typeof SOCIAL_PROGRAM_TYPES[number];
export const SOCIAL_PROGRAM_TYPE_LABELS: Record<SocialProgramType, string> = {
  incalzire: "Ajutor încălzire",
  lemne: "Cote lemne",
  sprijin: "Sprijin social",
  informare: "Informare",
  vouchere: "Vouchere",
};

// ============ EVENT PARTICIPANTS ============
export const eventParticipants = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({ id: true, joinedAt: true });
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;

// ============ MUNICIPAL REQUESTS (cereri adresate primăriei) ============
export const municipalRequests = pgTable("municipal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userName: text("user_name"),
  title: text("title").notNull(),
  department: text("department").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("in_asteptare"),  // in_asteptare | in_lucru | rezolvat | respins
  adminReply: text("admin_reply"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMunicipalRequestSchema = createInsertSchema(municipalRequests).omit({ id: true, createdAt: true, status: true, adminReply: true });
export type MunicipalRequest = typeof municipalRequests.$inferSelect;
export type InsertMunicipalRequest = z.infer<typeof insertMunicipalRequestSchema>;

export const MUNICIPAL_DEPARTMENTS = [
  "Secretariat General",
  "Compartiment Urbanism",
  "Compartiment Financiar-Contabil",
  "Compartiment Stare Civilă",
  "Compartiment Asistență Socială",
  "Compartiment Agricol",
  "Compartiment Juridic",
  "Altul",
] as const;
export type MunicipalDepartment = typeof MUNICIPAL_DEPARTMENTS[number];

// ============ CHAT MESSAGES ============
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  channel: text("channel").notNull().default("general"),  // general | local_news | volunteering | marketplace | events
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export const CHAT_CHANNELS = ["general", "local_news", "volunteering", "marketplace", "events"] as const;
export type ChatChannel = typeof CHAT_CHANNELS[number];
export const CHAT_CHANNEL_LABELS: Record<ChatChannel, string> = {
  general: "Discuții generale",
  local_news: "Noutăți locale",
  volunteering: "Voluntariat",
  marketplace: "Piața locală",
  events: "Evenimente",
};

// ============ WEATHER CACHE ============
export const weatherCache = pgTable("weather_cache", {
  id: serial("id").primaryKey(),
  location: text("location").notNull().unique(),
  temperature: real("temperature"),
  condition: text("condition"),
  humidity: integer("humidity"),
  windSpeed: real("wind_speed"),
  feelsLike: real("feels_like"),
  forecast: text("forecast"),  // JSON array of daily forecasts
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertWeatherCacheSchema = createInsertSchema(weatherCache).omit({ id: true, lastUpdated: true });
export type WeatherCache = typeof weatherCache.$inferSelect;
export type InsertWeatherCache = z.infer<typeof insertWeatherCacheSchema>;
