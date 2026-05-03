import { db } from "./db";
import { posts, events, reports, businesses, users, appSettings, notifications, services, pushSubscriptions, marketplaceItems, announcements, jobListings, healthCampaigns, healthAlerts, doctorProfiles, appointmentRequests, socialPrograms, userBadges, chatMessages, weatherCache, userPermissions, eventParticipants, municipalRequests } from "@shared/schema";
import { eq, sql, or, isNull, desc, and } from "drizzle-orm";
import type {
  Post, InsertPost,
  Event, InsertEvent,
  Report, InsertReport,
  Business, InsertBusiness,
  User, InsertUser,
  AppSetting,
  Notification, InsertNotification,
  Service, InsertService,
  PushSubscription, InsertPushSubscription,
  MarketplaceItem, InsertMarketplaceItem,
  Announcement, InsertAnnouncement,
  JobListing, InsertJobListing,
  HealthCampaign, InsertHealthCampaign,
  HealthAlert, InsertHealthAlert,
  DoctorProfile, InsertDoctorProfile,
  AppointmentRequest, InsertAppointmentRequest,
  SocialProgram, InsertSocialProgram,
  UserBadge, InsertUserBadge,
  ChatMessage, InsertChatMessage,
  WeatherCache, InsertWeatherCache,
  UserPermission,
  EventParticipant,
  MunicipalRequest, InsertMunicipalRequest,
} from "@shared/schema";

export type RecommendationItem = {
  id: number;
  kind: "event" | "business" | "post" | "job" | "marketplace";
  title: string;
  subtitle: string;
  category: string;
  score: number;
  href: string;
  imageUrl?: string | null;
};

export interface IStorage {
  // Settings
  getSettings(): Promise<Record<string, string>>;
  setSetting(key: string, value: string, label: string, groupName: string): Promise<void>;
  updateSetting(key: string, value: string): Promise<void>;
  // Users
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  addPoints(userId: number, pts: number): Promise<void>;
  // Notifications
  getNotificationsForUser(userId: number): Promise<Notification[]>;
  createNotification(n: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;
  // Notification Preferences
  getNotificationPrefs(userId: number): Promise<Record<string, boolean>>;
  updateNotificationPrefs(userId: number, prefs: Record<string, boolean>): Promise<void>;
  // Posts
  getPosts(): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  createPostWithStatus(post: InsertPost, status: string): Promise<Post>;
  updatePost(id: number, data: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: number): Promise<void>;
  getExpiredPosts(): Promise<Post[]>;
  deleteExpiredPosts(): Promise<void>;
  // Events
  getEvents(): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  createEventWithStatus(event: InsertEvent, status: string): Promise<Event>;
  updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;
  getPendingEvents(): Promise<Event[]>;
  approveEvent(id: number): Promise<Event | undefined>;
  rejectEvent(id: number): Promise<Event | undefined>;
  joinEvent(id: number): Promise<Event | undefined>;
  // Event Participants
  getEventParticipants(eventId: number): Promise<EventParticipant[]>;
  addEventParticipant(eventId: number, userId: number, userName: string): Promise<EventParticipant>;
  hasUserJoinedEvent(eventId: number, userId: number): Promise<boolean>;
  // Reports
  getReports(): Promise<Report[]>;
  getAllReports(): Promise<Report[]>;
  getReportsByUser(userId: number): Promise<Report[]>;
  getReportById(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, data: Partial<Report>): Promise<Report | undefined>;
  deleteReport(id: number): Promise<void>;
  // Businesses
  getBusinesses(): Promise<Business[]>;
  getBusinessById(id: number): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: number, data: Partial<Business>): Promise<Business | undefined>;
  deleteBusiness(id: number): Promise<void>;
  getPendingBusinesses(): Promise<Business[]>;
  approveBusiness(id: number): Promise<Business | undefined>;
  rejectBusiness(id: number): Promise<Business | undefined>;
  createBusinessByUser(business: InsertBusiness, userId: number): Promise<Business>;
  getAllBusinesses(): Promise<Business[]>;
  // Services
  getServices(): Promise<Service[]>;
  getServiceById(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;
  // Push Subscriptions
  savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  getPushSubscriptionsForUser(userId: number): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  // Marketplace
  getMarketplaceItems(): Promise<MarketplaceItem[]>;
  getMarketplaceItemById(id: number): Promise<MarketplaceItem | undefined>;
  createMarketplaceItem(item: InsertMarketplaceItem): Promise<MarketplaceItem>;
  updateMarketplaceItem(id: number, data: Partial<MarketplaceItem>): Promise<MarketplaceItem | undefined>;
  deleteMarketplaceItem(id: number): Promise<void>;
  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  getAnnouncementById(id: number): Promise<Announcement | undefined>;
  createAnnouncement(ann: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, data: Partial<Announcement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<void>;
  // Job Listings
  getJobListings(): Promise<JobListing[]>;
  getJobListingById(id: number): Promise<JobListing | undefined>;
  createJobListing(job: InsertJobListing): Promise<JobListing>;
  updateJobListing(id: number, data: Partial<JobListing>): Promise<JobListing | undefined>;
  deleteJobListing(id: number): Promise<void>;
  // Health Campaigns
  getHealthCampaigns(): Promise<HealthCampaign[]>;
  getHealthCampaignById(id: number): Promise<HealthCampaign | undefined>;
  createHealthCampaign(c: InsertHealthCampaign): Promise<HealthCampaign>;
  updateHealthCampaign(id: number, data: Partial<HealthCampaign>): Promise<HealthCampaign | undefined>;
  deleteHealthCampaign(id: number): Promise<void>;
  // Health Alerts
  getHealthAlerts(): Promise<HealthAlert[]>;
  getHealthAlertById(id: number): Promise<HealthAlert | undefined>;
  createHealthAlert(a: InsertHealthAlert): Promise<HealthAlert>;
  updateHealthAlert(id: number, data: Partial<HealthAlert>): Promise<HealthAlert | undefined>;
  deleteHealthAlert(id: number): Promise<void>;
  // Doctor Profiles
  getDoctorProfiles(): Promise<DoctorProfile[]>;
  getDoctorProfileById(id: number): Promise<DoctorProfile | undefined>;
  createDoctorProfile(d: InsertDoctorProfile): Promise<DoctorProfile>;
  updateDoctorProfile(id: number, data: Partial<DoctorProfile>): Promise<DoctorProfile | undefined>;
  deleteDoctorProfile(id: number): Promise<void>;
  // Appointment Requests
  getAppointmentRequests(): Promise<AppointmentRequest[]>;
  getAppointmentRequestsByDoctor(doctorId: number): Promise<AppointmentRequest[]>;
  getAppointmentRequestsByUser(userId: number): Promise<AppointmentRequest[]>;
  createAppointmentRequest(r: InsertAppointmentRequest): Promise<AppointmentRequest>;
  updateAppointmentRequest(id: number, data: Partial<AppointmentRequest>): Promise<AppointmentRequest | undefined>;
  // Social Programs
  getSocialPrograms(): Promise<SocialProgram[]>;
  getSocialProgramById(id: number): Promise<SocialProgram | undefined>;
  createSocialProgram(p: InsertSocialProgram): Promise<SocialProgram>;
  updateSocialProgram(id: number, data: Partial<SocialProgram>): Promise<SocialProgram | undefined>;
  deleteSocialProgram(id: number): Promise<void>;
  // Badges & Gamification
  getUserBadges(userId: number): Promise<UserBadge[]>;
  awardBadge(userId: number, badgeType: string): Promise<UserBadge | null>; // null if already has it
  getLeaderboard(limit?: number): Promise<{ id: number; name: string; role: string; points: number; badgeCount: number }[]>;
  getUserActivityCounts(userId: number): Promise<{ reports: number; posts: number; marketplace: number; jobs: number; announcements: number; appointments: number; eventJoins: number }>;
  getRecommendations(userId: number): Promise<RecommendationItem[]>;
  // Chat
  getChatMessages(channel: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  // Weather
  getWeatherCache(location: string): Promise<WeatherCache | undefined>;
  upsertWeatherCache(data: InsertWeatherCache): Promise<WeatherCache>;
  // User Permissions (specialist role)
  getUserPermissions(userId: number): Promise<UserPermission[]>;
  setUserPermission(userId: number, section: string, perms: { canRead: boolean; canWrite: boolean; canApprove: boolean; canDelete: boolean }): Promise<UserPermission>;
  deleteUserPermission(userId: number, section: string): Promise<void>;
  checkUserPermission(userId: number, section: string, action: "canRead" | "canWrite" | "canApprove" | "canDelete"): Promise<boolean>;
  // Municipal Requests
  getMunicipalRequests(): Promise<MunicipalRequest[]>;
  getMunicipalRequestsByUser(userId: number): Promise<MunicipalRequest[]>;
  createMunicipalRequest(req: InsertMunicipalRequest): Promise<MunicipalRequest>;
  updateMunicipalRequest(id: number, data: Partial<MunicipalRequest>): Promise<MunicipalRequest | undefined>;
  deleteMunicipalRequest(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ---- SETTINGS ----
  async getSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(appSettings);
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }
  async setSetting(key: string, value: string, label: string, groupName: string) {
    await db.insert(appSettings)
      .values({ key, value, label, groupName })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  }
  async updateSetting(key: string, value: string) {
    await db.update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key));
  }

  // ---- USERS ----
  async getUsers() { return db.select().from(users).orderBy(users.name); }
  async getUserById(id: number) { const [u] = await db.select().from(users).where(eq(users.id, id)); return u; }
  async getUserByUsername(username: string) { const [u] = await db.select().from(users).where(eq(users.username, username)); return u; }
  async createUser(user: InsertUser) { const [u] = await db.insert(users).values(user).returning(); return u; }
  async updateUser(id: number, data: Partial<InsertUser>) {
    const [u] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return u;
  }
  async deleteUser(id: number) { await db.delete(users).where(eq(users.id, id)); }
  async addPoints(userId: number, pts: number) {
    await db.update(users)
      .set({ points: sql`COALESCE(${users.points}, 0) + ${pts}` })
      .where(eq(users.id, userId));
  }

  // ---- NOTIFICATIONS ----
  async getNotificationsForUser(userId: number) {
    return db.select().from(notifications)
      .where(or(eq(notifications.userId, userId), isNull(notifications.userId)))
      .orderBy(sql`${notifications.createdAt} DESC`)
      .limit(50);
  }
  async createNotification(n: InsertNotification) {
    const [notif] = await db.insert(notifications).values(n).returning();
    return notif;
  }
  async markNotificationRead(id: number) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }
  async markAllNotificationsRead(userId: number) {
    await db.update(notifications)
      .set({ read: true })
      .where(or(eq(notifications.userId, userId), isNull(notifications.userId)));
  }

  // ---- NOTIFICATION PREFERENCES ----
  async getNotificationPrefs(userId: number): Promise<Record<string, boolean>> {
    const [u] = await db.select({ notificationPrefs: users.notificationPrefs }).from(users).where(eq(users.id, userId));
    if (!u?.notificationPrefs) return {};
    try { return JSON.parse(u.notificationPrefs); } catch { return {}; }
  }
  async updateNotificationPrefs(userId: number, prefs: Record<string, boolean>): Promise<void> {
    await db.update(users).set({ notificationPrefs: JSON.stringify(prefs) } as any).where(eq(users.id, userId));
  }

  // ---- POSTS ----
  async getPosts() { return db.select().from(posts).orderBy(sql`${posts.createdAt} DESC`); }
  async getPostById(id: number) { const [p] = await db.select().from(posts).where(eq(posts.id, id)); return p; }
  async createPost(post: InsertPost) { const [p] = await db.insert(posts).values({ ...post, status: "approved" }).returning(); return p; }
  async createPostWithStatus(post: InsertPost, status: string) { const [p] = await db.insert(posts).values({ ...post, status }).returning(); return p; }
  async updatePost(id: number, data: Partial<Post>) {
    const [p] = await db.update(posts).set(data as any).where(eq(posts.id, id)).returning();
    return p;
  }
  async deletePost(id: number) { await db.delete(posts).where(eq(posts.id, id)); }
  async getExpiredPosts() {
    const now = new Date();
    return db.select().from(posts).where(sql`${posts.expiresAt} < ${now}`);
  }
  async deleteExpiredPosts() {
    const now = new Date();
    const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h after expiration
    await db.delete(posts).where(sql`${posts.expiresAt} < ${expiredDate}`);
  }

  // ---- EVENTS ----
  async getEvents() { return db.select().from(events).where(eq(events.status as any, "approved")).orderBy(sql`${events.date} ASC`); }
  async getEventById(id: number) { const [e] = await db.select().from(events).where(eq(events.id, id)); return e; }
  async createEvent(event: InsertEvent) { const [e] = await db.insert(events).values({ ...event, status: "approved" }).returning(); return e; }
  async createEventWithStatus(event: InsertEvent, status: string) { const [e] = await db.insert(events).values({ ...event, status }).returning(); return e; }
  async updateEvent(id: number, data: Partial<Event>) {
    const [e] = await db.update(events).set(data as any).where(eq(events.id, id)).returning();
    return e;
  }
  async deleteEvent(id: number) { await db.delete(events).where(eq(events.id, id)); }
  async getPendingEvents() {
    return db.select().from(events).where(eq(events.status as any, "pending")).orderBy(sql`${events.date} ASC`);
  }
  async approveEvent(id: number) {
    const [e] = await db.update(events).set({ status: "approved" }).where(eq(events.id, id)).returning();
    return e;
  }
  async rejectEvent(id: number) {
    const [e] = await db.update(events).set({ status: "rejected" }).where(eq(events.id, id)).returning();
    return e;
  }
  async joinEvent(id: number) {
    const [e] = await db.update(events)
      .set({ participantCount: sql`${events.participantCount} + 1` })
      .where(eq(events.id, id)).returning();
    return e;
  }

  // ---- REPORTS ----
  async getReports() {
    return db.select().from(reports).where(eq(reports.visibility as any, "public")).orderBy(sql`${reports.createdAt} DESC`);
  }
  async getAllReports() { return db.select().from(reports).orderBy(sql`${reports.createdAt} DESC`); }
  async getReportsByUser(userId: number) {
    return db.select().from(reports).where(eq(reports.userId as any, userId)).orderBy(sql`${reports.createdAt} DESC`);
  }
  async getReportById(id: number) { const [r] = await db.select().from(reports).where(eq(reports.id, id)); return r; }
  async createReport(report: InsertReport) { const [r] = await db.insert(reports).values(report).returning(); return r; }
  async updateReport(id: number, data: Partial<Report>) {
    const [r] = await db.update(reports).set(data as any).where(eq(reports.id, id)).returning();
    return r;
  }
  async deleteReport(id: number) { await db.delete(reports).where(eq(reports.id, id)); }

  // ---- BUSINESSES ----
  async getBusinesses() {
    return db.select().from(businesses).where(eq(businesses.status as any, "approved")).orderBy(sql`${businesses.verified} DESC`, sql`${businesses.name} ASC`);
  }
  async getBusinessById(id: number) { const [b] = await db.select().from(businesses).where(eq(businesses.id, id)); return b; }
  async createBusiness(business: InsertBusiness) { const [b] = await db.insert(businesses).values({ ...business, status: "approved" }).returning(); return b; }
  async createBusinessByUser(business: InsertBusiness, userId: number) {
    const [b] = await db.insert(businesses).values({ ...business, userId, status: "pending" }).returning();
    return b;
  }
  async getAllBusinesses() {
    return db.select().from(businesses).orderBy(sql`${businesses.status} ASC`, sql`${businesses.verified} DESC`, sql`${businesses.name} ASC`);
  }
  async updateBusiness(id: number, data: Partial<Business>) {
    const [b] = await db.update(businesses).set(data as any).where(eq(businesses.id, id)).returning();
    return b;
  }
  async deleteBusiness(id: number) { await db.delete(businesses).where(eq(businesses.id, id)); }
  async getPendingBusinesses() {
    return db.select().from(businesses).where(eq(businesses.status as any, "pending")).orderBy(sql`${businesses.createdAt} DESC`);
  }
  async approveBusiness(id: number) {
    const [b] = await db.update(businesses).set({ status: "approved" }).where(eq(businesses.id, id)).returning();
    return b;
  }
  async rejectBusiness(id: number) {
    const [b] = await db.update(businesses).set({ status: "rejected" }).where(eq(businesses.id, id)).returning();
    return b;
  }

  // ---- SERVICES ----
  async getServices() { return db.select().from(services).orderBy(sql`${services.category} ASC`, sql`${services.name} ASC`); }
  async getServiceById(id: number) { const [s] = await db.select().from(services).where(eq(services.id, id)); return s; }
  async createService(service: InsertService) { const [s] = await db.insert(services).values(service).returning(); return s; }
  async updateService(id: number, data: Partial<Service>) {
    const [s] = await db.update(services).set(data as any).where(eq(services.id, id)).returning();
    return s;
  }
  async deleteService(id: number) { await db.delete(services).where(eq(services.id, id)); }

  // ---- PUSH SUBSCRIPTIONS ----
  async savePushSubscription(sub: InsertPushSubscription) {
    const [s] = await db.insert(pushSubscriptions)
      .values(sub)
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { p256dh: sub.p256dh, auth: sub.auth, userId: sub.userId } })
      .returning();
    return s;
  }
  async deletePushSubscription(endpoint: string) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }
  async getPushSubscriptionsForUser(userId: number) {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }
  async getAllPushSubscriptions() {
    return db.select().from(pushSubscriptions);
  }

  // ---- MARKETPLACE ----
  async getMarketplaceItems() {
    return db.select().from(marketplaceItems)
      .where(eq(marketplaceItems.status, "active"))
      .orderBy(sql`${marketplaceItems.createdAt} DESC`);
  }
  async getMarketplaceItemById(id: number) {
    const [m] = await db.select().from(marketplaceItems).where(eq(marketplaceItems.id, id));
    return m;
  }
  async createMarketplaceItem(item: InsertMarketplaceItem) {
    const [m] = await db.insert(marketplaceItems).values(item).returning();
    return m;
  }
  async updateMarketplaceItem(id: number, data: Partial<MarketplaceItem>) {
    const [m] = await db.update(marketplaceItems).set(data as any).where(eq(marketplaceItems.id, id)).returning();
    return m;
  }
  async deleteMarketplaceItem(id: number) { await db.delete(marketplaceItems).where(eq(marketplaceItems.id, id)); }

  // ---- ANNOUNCEMENTS ----
  async getAnnouncements() {
    return db.select().from(announcements)
      .where(eq(announcements.status, "active"))
      .orderBy(sql`${announcements.createdAt} DESC`);
  }
  async getAnnouncementById(id: number) {
    const [a] = await db.select().from(announcements).where(eq(announcements.id, id));
    return a;
  }
  async createAnnouncement(ann: InsertAnnouncement) {
    const [a] = await db.insert(announcements).values(ann).returning();
    return a;
  }
  async updateAnnouncement(id: number, data: Partial<Announcement>) {
    const [a] = await db.update(announcements).set(data as any).where(eq(announcements.id, id)).returning();
    return a;
  }
  async deleteAnnouncement(id: number) { await db.delete(announcements).where(eq(announcements.id, id)); }

  // ---- JOB LISTINGS ----
  async getJobListings() {
    return db.select().from(jobListings)
      .where(eq(jobListings.status, "active"))
      .orderBy(sql`${jobListings.createdAt} DESC`);
  }
  async getJobListingById(id: number) {
    const [j] = await db.select().from(jobListings).where(eq(jobListings.id, id));
    return j;
  }
  async createJobListing(job: InsertJobListing) {
    const [j] = await db.insert(jobListings).values(job).returning();
    return j;
  }
  async updateJobListing(id: number, data: Partial<JobListing>) {
    const [j] = await db.update(jobListings).set(data as any).where(eq(jobListings.id, id)).returning();
    return j;
  }
  async deleteJobListing(id: number) { await db.delete(jobListings).where(eq(jobListings.id, id)); }

  // ---- HEALTH CAMPAIGNS ----
  async getHealthCampaigns() {
    return db.select().from(healthCampaigns).orderBy(sql`${healthCampaigns.createdAt} DESC`);
  }
  async getHealthCampaignById(id: number) {
    const [c] = await db.select().from(healthCampaigns).where(eq(healthCampaigns.id, id));
    return c;
  }
  async createHealthCampaign(c: InsertHealthCampaign) {
    const [row] = await db.insert(healthCampaigns).values(c).returning();
    return row;
  }
  async updateHealthCampaign(id: number, data: Partial<HealthCampaign>) {
    const [row] = await db.update(healthCampaigns).set(data as any).where(eq(healthCampaigns.id, id)).returning();
    return row;
  }
  async deleteHealthCampaign(id: number) { await db.delete(healthCampaigns).where(eq(healthCampaigns.id, id)); }

  // ---- HEALTH ALERTS ----
  async getHealthAlerts() {
    return db.select().from(healthAlerts)
      .where(eq(healthAlerts.status, "activa"))
      .orderBy(sql`${healthAlerts.createdAt} DESC`);
  }
  async getHealthAlertById(id: number) {
    const [a] = await db.select().from(healthAlerts).where(eq(healthAlerts.id, id));
    return a;
  }
  async createHealthAlert(a: InsertHealthAlert) {
    const [row] = await db.insert(healthAlerts).values(a).returning();
    return row;
  }
  async updateHealthAlert(id: number, data: Partial<HealthAlert>) {
    const [row] = await db.update(healthAlerts).set(data as any).where(eq(healthAlerts.id, id)).returning();
    return row;
  }
  async deleteHealthAlert(id: number) { await db.delete(healthAlerts).where(eq(healthAlerts.id, id)); }

  // ---- DOCTOR PROFILES ----
  async getDoctorProfiles() {
    return db.select().from(doctorProfiles).orderBy(sql`${doctorProfiles.name} ASC`);
  }
  async getDoctorProfileById(id: number) {
    const [d] = await db.select().from(doctorProfiles).where(eq(doctorProfiles.id, id));
    return d;
  }
  async createDoctorProfile(d: InsertDoctorProfile) {
    const [row] = await db.insert(doctorProfiles).values(d).returning();
    return row;
  }
  async updateDoctorProfile(id: number, data: Partial<DoctorProfile>) {
    const [row] = await db.update(doctorProfiles).set(data as any).where(eq(doctorProfiles.id, id)).returning();
    return row;
  }
  async deleteDoctorProfile(id: number) { await db.delete(doctorProfiles).where(eq(doctorProfiles.id, id)); }

  // ---- APPOINTMENT REQUESTS ----
  async getAppointmentRequests() {
    return db.select().from(appointmentRequests).orderBy(sql`${appointmentRequests.createdAt} DESC`);
  }
  async getAppointmentRequestsByDoctor(doctorId: number) {
    return db.select().from(appointmentRequests)
      .where(eq(appointmentRequests.doctorId, doctorId))
      .orderBy(sql`${appointmentRequests.createdAt} DESC`);
  }
  async getAppointmentRequestsByUser(userId: number) {
    return db.select().from(appointmentRequests)
      .where(eq(appointmentRequests.userId as any, userId))
      .orderBy(sql`${appointmentRequests.createdAt} DESC`);
  }
  async createAppointmentRequest(r: InsertAppointmentRequest) {
    const [row] = await db.insert(appointmentRequests).values(r).returning();
    return row;
  }
  async updateAppointmentRequest(id: number, data: Partial<AppointmentRequest>) {
    const [row] = await db.update(appointmentRequests).set(data as any).where(eq(appointmentRequests.id, id)).returning();
    return row;
  }

  // ---- BADGES & GAMIFICATION ----
  async getUserBadges(userId: number) {
    return db.select().from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(sql`${userBadges.awardedAt} ASC`);
  }
  async awardBadge(userId: number, badgeType: string): Promise<UserBadge | null> {
    const existing = await db.select().from(userBadges)
      .where(eq(userBadges.userId, userId));
    if (existing.some(b => b.badgeType === badgeType)) return null;
    const [badge] = await db.insert(userBadges)
      .values({ userId, badgeType })
      .returning();
    return badge;
  }
  async getLeaderboard(limit = 10) {
    const topUsers = await db.select().from(users)
      .orderBy(desc(users.points))
      .limit(limit);
    const badgeCounts = await Promise.all(
      topUsers.map(u => db.select({ count: sql<number>`count(*)` }).from(userBadges).where(eq(userBadges.userId, u.id)))
    );
    return topUsers.map((u, i) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      points: u.points ?? 0,
      badgeCount: Number(badgeCounts[i][0]?.count ?? 0),
    }));
  }
  async getUserActivityCounts(userId: number) {
    const [rCount, pCount, mCount, jCount, aCount, apCount] = await Promise.all([
      db.select({ c: sql<number>`count(*)` }).from(reports).where(eq(reports.userId as any, userId)),
      db.select({ c: sql<number>`count(*)` }).from(posts).where(eq(posts.author as any, sql`(SELECT name FROM users WHERE id = ${userId})`)),
      db.select({ c: sql<number>`count(*)` }).from(marketplaceItems).where(eq(marketplaceItems.userId as any, userId)),
      db.select({ c: sql<number>`count(*)` }).from(jobListings).where(eq(jobListings.userId as any, userId)),
      db.select({ c: sql<number>`count(*)` }).from(announcements).where(eq(announcements.userId as any, userId)),
      db.select({ c: sql<number>`count(*)` }).from(appointmentRequests).where(eq(appointmentRequests.userId as any, userId)),
    ]);
    return {
      reports: Number(rCount[0]?.c ?? 0),
      posts: Number(pCount[0]?.c ?? 0),
      marketplace: Number(mCount[0]?.c ?? 0),
      jobs: Number(jCount[0]?.c ?? 0),
      announcements: Number(aCount[0]?.c ?? 0),
      appointments: Number(apCount[0]?.c ?? 0),
      eventJoins: 0, // tracked via points only
    };
  }

  // ---- CHAT ----
  async getChatMessages(channel: string, limit = 50) {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.channel, channel))
      .orderBy(sql`${chatMessages.createdAt} DESC`)
      .limit(limit)
      .then(msgs => msgs.reverse());
  }
  async createChatMessage(msg: InsertChatMessage) {
    const [created] = await db.insert(chatMessages).values(msg).returning();
    return created;
  }

  // ---- WEATHER ----
  async getWeatherCache(location: string) {
    const [cached] = await db.select().from(weatherCache).where(eq(weatherCache.location, location));
    return cached;
  }
  async upsertWeatherCache(data: InsertWeatherCache) {
    const existing = await db.select().from(weatherCache).where(eq(weatherCache.location, data.location));
    if (existing.length > 0) {
      const [updated] = await db.update(weatherCache).set(data).where(eq(weatherCache.location, data.location)).returning();
      return updated;
    } else {
      const [created] = await db.insert(weatherCache).values(data).returning();
      return created;
    }
  }

  // ---- SOCIAL PROGRAMS ----
  async getSocialPrograms() {
    return db.select().from(socialPrograms).orderBy(sql`${socialPrograms.createdAt} DESC`);
  }
  async getSocialProgramById(id: number) {
    const [p] = await db.select().from(socialPrograms).where(eq(socialPrograms.id, id));
    return p;
  }
  async createSocialProgram(p: InsertSocialProgram) {
    const [row] = await db.insert(socialPrograms).values(p).returning();
    return row;
  }
  async updateSocialProgram(id: number, data: Partial<SocialProgram>) {
    const [row] = await db.update(socialPrograms).set(data as any).where(eq(socialPrograms.id, id)).returning();
    return row;
  }
  async deleteSocialProgram(id: number) { await db.delete(socialPrograms).where(eq(socialPrograms.id, id)); }

  // ---- RECOMMENDATIONS ----
  async getRecommendations(userId: number): Promise<RecommendationItem[]> {
    // 1. Gather user's activity signals
    const [userRow, userReports, userMarketplace, userJobs] = await Promise.all([
      db.select({ notificationPrefs: users.notificationPrefs, points: users.points }).from(users).where(eq(users.id, userId)).then(r => r[0]),
      db.select({ category: reports.category }).from(reports).where(eq(reports.userId as any, userId)),
      db.select({ category: marketplaceItems.category }).from(marketplaceItems).where(eq(marketplaceItems.userId as any, userId)),
      db.select({ type: jobListings.type }).from(jobListings).where(eq(jobListings.userId as any, userId)),
    ]);

    // 2. Build category affinity scores from signals
    const affinity: Record<string, number> = {};
    const bump = (cat: string, w: number) => { affinity[cat] = (affinity[cat] ?? 0) + w; };

    // From reports submitted: user cares about these categories
    for (const r of userReports) if (r.category) bump(r.category, 3);

    // From notification prefs
    let prefs: Record<string, boolean> = {};
    try { if (userRow?.notificationPrefs) prefs = JSON.parse(userRow.notificationPrefs); } catch {}
    if (prefs["evenimente"]) bump("general", 2), bump("voluntariat", 2), bump("cultural", 2), bump("sport", 2);
    if (prefs["comunitate"]) bump("community", 2), bump("produse", 1), bump("servicii", 1);
    if (prefs["sesizari"]) bump("drum", 2), bump("iluminat", 2), bump("curatenie", 2);

    // From marketplace activity
    for (const m of userMarketplace) if (m.category) bump(m.category, 2);

    // From job activity
    for (const j of userJobs) if (j.type) bump(j.type, 2);

    // High-engagement users get variety bonus
    const isActive = (userRow?.points ?? 0) >= 25;

    // 3. Fetch candidate content
    const [allEvents, allBusinesses, allPosts, allMarketplace, allJobs] = await Promise.all([
      db.select().from(events).where(eq(events.status as any, "approved")).orderBy(sql`${events.date} ASC`).limit(20),
      db.select().from(businesses).where(eq(businesses.status as any, "approved")).orderBy(sql`${businesses.verified} DESC`).limit(20),
      db.select().from(posts).where(eq(posts.status as any, "approved")).orderBy(sql`${posts.createdAt} DESC`).limit(20),
      db.select().from(marketplaceItems).where(eq(marketplaceItems.status as any, "active")).orderBy(sql`${marketplaceItems.createdAt} DESC`).limit(10),
      db.select().from(jobListings).where(eq(jobListings.status as any, "active")).orderBy(sql`${jobListings.createdAt} DESC`).limit(10),
    ]);

    const scored: RecommendationItem[] = [];
    const now = new Date();

    // Score events
    for (const e of allEvents) {
      const daysUntil = (e.date.getTime() - now.getTime()) / 86400000;
      if (daysUntil < 0) continue; // past events
      let score = (affinity[e.category ?? "general"] ?? 0) * 2;
      score += Math.max(0, 10 - daysUntil); // urgency: closer = higher score
      score += Math.min(5, (e.participantCount ?? 0) / 5); // popularity bonus
      if (isActive && e.category === "voluntariat") score += 3;
      scored.push({ id: e.id, kind: "event", title: e.title, subtitle: `${e.location} · ${Math.round(daysUntil) === 0 ? "Azi" : `în ${Math.round(daysUntil)} zile`}`, category: e.category ?? "general", score, href: "/evenimente", imageUrl: e.imageUrl });
    }

    // Score businesses
    for (const b of allBusinesses) {
      let score = (affinity[b.category] ?? 0) * 1.5;
      if (b.verified) score += 4;
      scored.push({ id: b.id, kind: "business", title: b.name, subtitle: b.category + (b.address ? ` · ${b.address}` : ""), category: b.category, score, href: "/afaceri", imageUrl: b.imageUrl });
    }

    // Score posts (only recent, max 7 days)
    for (const p of allPosts) {
      const ageDays = (now.getTime() - (p.createdAt ?? now).getTime()) / 86400000;
      if (ageDays > 7) continue;
      let score = (affinity[p.category ?? p.type] ?? 0) * 1.5;
      score += Math.max(0, 5 - ageDays); // recency bonus
      if (p.type === "alert") score += 8; // alerts always surface
      if (p.type === "announcement") score += 3;
      scored.push({ id: p.id, kind: "post", title: p.title, subtitle: `${p.author} · ${p.type === "alert" ? "Alertă" : p.type === "announcement" ? "Anunț" : "Comunitate"}`, category: p.category ?? p.type, score, href: "/", imageUrl: p.imageUrl });
    }

    // Score marketplace items (if user has marketplace activity or comunitate pref)
    if (userMarketplace.length > 0 || prefs["comunitate"]) {
      for (const m of allMarketplace) {
        const score = (affinity[m.category] ?? 0) * 1.5 + 1;
        scored.push({ id: m.id, kind: "marketplace", title: m.title, subtitle: `${m.category} · ${m.price ?? "Preț negociabil"}`, category: m.category, score, href: "/comunitate", imageUrl: m.imageUrl });
      }
    }

    // Score jobs (if user has job activity)
    if (userJobs.length > 0 || isActive) {
      for (const j of allJobs) {
        const score = (affinity[j.type] ?? 0) * 1.5 + 2;
        scored.push({ id: j.id, kind: "job", title: j.title, subtitle: `${j.company} · ${j.type === "full_time" ? "Full-time" : j.type === "part_time" ? "Part-time" : "Sezonier"}`, category: j.type, score, href: "/comunitate", imageUrl: null });
      }
    }

    // 4. Sort by score, deduplicate by kind+id, return top 6
    scored.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const result: RecommendationItem[] = [];
    for (const item of scored) {
      const key = `${item.kind}-${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
      if (result.length >= 6) break;
    }

    // 5. If no affinity signals (new user), return fallback: upcoming events + recent posts
    if (result.length < 3) {
      const fallback: RecommendationItem[] = [];
      for (const e of allEvents.slice(0, 3)) {
        const daysUntil = (e.date.getTime() - now.getTime()) / 86400000;
        if (daysUntil < 0) continue;
        fallback.push({ id: e.id, kind: "event", title: e.title, subtitle: `${e.location} · în ${Math.round(daysUntil)} zile`, category: e.category ?? "general", score: 5, href: "/evenimente", imageUrl: e.imageUrl });
      }
      for (const p of allPosts.slice(0, 3)) {
        fallback.push({ id: p.id, kind: "post", title: p.title, subtitle: `${p.author} · Anunț`, category: p.category ?? p.type, score: 3, href: "/", imageUrl: p.imageUrl });
      }
      return fallback.slice(0, 6);
    }

    return result;
  }

  // ---- EVENT PARTICIPANTS ----
  async getEventParticipants(eventId: number): Promise<EventParticipant[]> {
    return db.select().from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId))
      .orderBy(desc(eventParticipants.joinedAt));
  }
  async addEventParticipant(eventId: number, userId: number, userName: string): Promise<EventParticipant> {
    const [p] = await db.insert(eventParticipants).values({ eventId, userId, userName }).returning();
    return p;
  }
  async hasUserJoinedEvent(eventId: number, userId: number): Promise<boolean> {
    const [p] = await db.select().from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)));
    return !!p;
  }

  // ---- MUNICIPAL REQUESTS ----
  async getMunicipalRequests(): Promise<MunicipalRequest[]> {
    return db.select().from(municipalRequests).orderBy(sql`${municipalRequests.createdAt} DESC`);
  }
  async getMunicipalRequestsByUser(userId: number): Promise<MunicipalRequest[]> {
    return db.select().from(municipalRequests)
      .where(eq(municipalRequests.userId as any, userId))
      .orderBy(sql`${municipalRequests.createdAt} DESC`);
  }
  async createMunicipalRequest(req: InsertMunicipalRequest): Promise<MunicipalRequest> {
    const [r] = await db.insert(municipalRequests).values(req).returning();
    return r;
  }
  async updateMunicipalRequest(id: number, data: Partial<MunicipalRequest>): Promise<MunicipalRequest | undefined> {
    const [r] = await db.update(municipalRequests).set(data as any).where(eq(municipalRequests.id, id)).returning();
    return r;
  }
  async deleteMunicipalRequest(id: number): Promise<void> {
    await db.delete(municipalRequests).where(eq(municipalRequests.id, id));
  }

  // ---- USER PERMISSIONS ----
  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    return db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
  }
  async setUserPermission(userId: number, section: string, perms: { canRead: boolean; canWrite: boolean; canApprove: boolean; canDelete: boolean }): Promise<UserPermission> {
    const existing = await db.select().from(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.section, section)));
    if (existing.length > 0) {
      const [updated] = await db.update(userPermissions)
        .set(perms)
        .where(and(eq(userPermissions.userId, userId), eq(userPermissions.section, section)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPermissions)
        .values({ userId, section, ...perms })
        .returning();
      return created;
    }
  }
  async deleteUserPermission(userId: number, section: string): Promise<void> {
    await db.delete(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.section, section)));
  }
  async checkUserPermission(userId: number, section: string, action: "canRead" | "canWrite" | "canApprove" | "canDelete"): Promise<boolean> {
    const [perm] = await db.select().from(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.section, section)));
    if (!perm) return false;
    return perm[action] === true;
  }
}

export const storage = new DatabaseStorage();
