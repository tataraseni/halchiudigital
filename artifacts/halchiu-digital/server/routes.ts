import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import webpush from "web-push";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertPostSchema, insertReportSchema, insertEventSchema, insertBusinessSchema, insertUserSchema, insertServiceSchema, insertMarketplaceItemSchema, insertAnnouncementSchema, insertJobListingSchema, ROLES, OFFICIAL_ROLES, insertTransportRouteSchema } from "@shared/schema";
import { requireAuth, requireRole, requireSectionPermission, permissions } from "./auth";
import { z } from "zod";
import type { Role } from "@shared/schema";

const OFFICIAL_ROLE_SET = new Set<string>(OFFICIAL_ROLES);

// ── Web Push helpers ──────────────────────────────────────────────────────────
async function initVapid() {
  const settings = await storage.getSettings();
  let publicKey  = settings["vapid_public_key"];
  let privateKey = settings["vapid_private_key"];

  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey  = keys.publicKey;
    privateKey = keys.privateKey;
    await Promise.all([
      storage.setSetting("vapid_public_key",  publicKey,  "VAPID Public Key",  "sistema"),
      storage.setSetting("vapid_private_key", privateKey, "VAPID Private Key", "sistema"),
    ]);
  }

  webpush.setVapidDetails(
    "mailto:admin@halchiu.ro",
    publicKey,
    privateKey,
  );

  return publicKey;
}

async function sendPushForNotif(notif: { userId: number | null; title: string; message: string }) {
  try {
    const subs = notif.userId
      ? await storage.getPushSubscriptionsForUser(notif.userId)
      : await storage.getAllPushSubscriptions();

    const payload = JSON.stringify({ title: notif.title, body: notif.message, icon: "/favicon.png" });
    await Promise.allSettled(
      subs.map(s =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
          .catch(async (err: any) => {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await storage.deletePushSubscription(s.endpoint);
            }
          })
      )
    );
  } catch { /* non-critical, ignore */ }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ─── STARTUP MIGRATION ───────────────────────────────────────────────────
  try {
    const { pool } = await import("./db");
    await pool.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE events ALTER COLUMN status SET DEFAULT 'approved';
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
      ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
      ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    `);
  } catch (_) {}

  // ─── TRANSPORT ROUTES TABLE ───────────────────────────────────────────────
  try {
    const { pool: _pool } = await import("./db");
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS transport_routes (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'autobuz',
        line TEXT NOT NULL,
        direction TEXT NOT NULL,
        operator TEXT NOT NULL DEFAULT '',
        departures TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'activ',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (_) {}

  // ─── CLEANUP JOBS ────────────────────────────────────────────────────────
  const runCleanup = async () => {
    try { await storage.deleteExpiredPosts(); } catch (_) {}
    try { await storage.deleteExpiredMarketplaceItems(); } catch (_) {}
    try { await storage.deleteExpiredJobListings(); } catch (_) {}
    try { await storage.deleteOldChatChannels(); } catch (_) {}
  };
  runCleanup();
  setInterval(runCleanup, 60 * 60 * 1000); // run hourly

  // ─── VAPID init ───────────────────────────────────────────────────────────
  const vapidPublicKey = await initVapid();

  // ─── WEB PUSH ROUTES ─────────────────────────────────────────────────────
  app.get("/api/push/public-key", (_req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Date de abonament invalide" });
    }
    await storage.savePushSubscription({
      userId: req.session.userId!,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    res.json({ ok: true });
  });

  app.delete("/api/push/unsubscribe", requireAuth, async (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) await storage.deletePushSubscription(endpoint);
    res.json({ ok: true });
  });

  // ─── AUTH ────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Completează toate câmpurile" });
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ message: "Utilizator sau parolă incorectă" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Utilizator sau parolă incorectă" });
    req.session.userId = user.id;
    req.session.userRole = user.role as Role;
    req.session.userName = user.name;
    req.session.username = user.username;
    res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Neautentificat" });
    const user = await storage.getUserById(req.session.userId);
    res.json({
      id: req.session.userId,
      username: req.session.username,
      name: req.session.userName,
      role: req.session.userRole,
      points: user?.points ?? 0,
    });
  });

  // ─── RECOMMENDATIONS ────────────────────────────────────────────────────
  app.get("/api/recommendations", requireAuth, async (req, res) => {
    try {
      const items = await storage.getRecommendations(req.session.userId!);
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── NOTIFICATION PREFERENCES ────────────────────────────────────────────
  app.get("/api/auth/me/preferences", requireAuth, async (req, res) => {
    const prefs = await storage.getNotificationPrefs(req.session.userId!);
    const defaults = { anunturi_oficiale: true, comunitate: true, evenimente: true, sesizari: true, moderare: true, sistem: true };
    res.json({ ...defaults, ...prefs });
  });

  app.put("/api/auth/me/preferences", requireAuth, async (req, res) => {
    const allowed = ["anunturi_oficiale", "comunitate", "evenimente", "sesizari", "moderare", "sistem"];
    const prefs: Record<string, boolean> = {};
    for (const key of allowed) {
      if (typeof req.body[key] === "boolean") prefs[key] = req.body[key];
    }
    await storage.updateNotificationPrefs(req.session.userId!, prefs);
    const defaults = { anunturi_oficiale: true, comunitate: true, evenimente: true, sesizari: true, moderare: true, sistem: true };
    const existing = await storage.getNotificationPrefs(req.session.userId!);
    res.json({ ...defaults, ...existing });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, username, phone, password } = req.body;
      if (!name || !username || !password) return res.status(400).json({ message: "Completează câmpurile obligatorii" });
      if (password.length < 6) return res.status(400).json({ message: "Parola trebuie să aibă cel puțin 6 caractere" });
      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(409).json({ message: "Utilizatorul există deja" });
      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ name, username, password: hashed, phone: phone || null, role: "cetatean" });
      const welcomeNotif = await storage.createNotification({ userId: user.id, type: "success", category: "sistem", title: "Bun venit în Hălchiu Digital!", message: `Salut ${name}! Contul tău de cetățean a fost creat. Poți trimite sesizări și posta în comunitate.` });
      sendPushForNotif(welcomeNotif).catch(() => {});
      res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── USER PERMISSIONS ────────────────────────────────────────────────────
  // Current user's own permissions (for frontend to know what to show)
  app.get("/api/users/me/permissions", requireAuth, async (req, res) => {
    const perms = await storage.getUserPermissions(req.session.userId!);
    res.json(perms);
  });

  // Admin: get/set permissions for a specific user
  app.get("/api/admin/users/:id/permissions", requireRole("administrator"), async (req, res) => {
    const perms = await storage.getUserPermissions(Number(req.params.id));
    res.json(perms);
  });

  app.put("/api/admin/users/:id/permissions", requireRole("administrator"), async (req, res) => {
    const userId = Number(req.params.id);
    const { section, canRead = false, canWrite = false, canApprove = false, canDelete = false } = req.body;
    if (!section) return res.status(400).json({ message: "Secțiunea este obligatorie" });
    const perm = await storage.setUserPermission(userId, section, { canRead, canWrite, canApprove, canDelete });
    res.json(perm);
  });

  app.delete("/api/admin/users/:id/permissions/:section", requireRole("administrator"), async (req, res) => {
    await storage.deleteUserPermission(Number(req.params.id), req.params.section);
    res.json({ ok: true });
  });

  // ─── USERS (admin only) ──────────────────────────────────────────────────
  app.get("/api/admin/users", requireRole("administrator"), async (_req, res) => {
    const all = await storage.getUsers();
    res.json(all.map(u => ({ ...u, password: undefined })));
  });

  app.post("/api/admin/users", requireRole("administrator"), async (req, res) => {
    try {
      const { username, password, name, role } = req.body;
      if (!username || !password || !name || !role) return res.status(400).json({ message: "Completează toate câmpurile" });
      if (!ROLES.includes(role)) return res.status(400).json({ message: "Rol invalid" });
      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(409).json({ message: "Utilizatorul există deja" });
      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashed, name, role });
      res.status(201).json({ ...user, password: undefined });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/users/:id", requireRole("administrator"), async (req, res) => {
    const id = Number(req.params.id);
    const { name, role, password } = req.body;
    // Prevent admin from accidentally removing their own admin role
    if (id === req.session.userId && role && role !== "administrator") {
      return res.status(400).json({ message: "Nu îți poți schimba propriul rol. Cere altui administrator să facă asta." });
    }
    const update: any = {};
    if (name) update.name = name;
    if (role) { if (!ROLES.includes(role)) return res.status(400).json({ message: "Rol invalid" }); update.role = role; }
    if (password) update.password = await bcrypt.hash(password, 10);
    const user = await storage.updateUser(id, update);
    if (!user) return res.status(404).json({ message: "Utilizatorul nu există" });
    res.json({ ...user, password: undefined });
  });

  app.delete("/api/admin/users/:id", requireRole("administrator"), async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.session.userId) return res.status(400).json({ message: "Nu poți șterge propriul cont" });
    await storage.deleteUser(id);
    res.json({ ok: true });
  });

  // ─── ADMIN POSTS ─────────────────────────────────────────────────────────
  app.get("/api/admin/posts", requireRole("administrator", "primar", "viceprimar", "moderator"), async (_req, res) => {
    res.json(await storage.getPosts());
  });

  // ─── POSTS ───────────────────────────────────────────────────────────────
  app.get(api.posts.list.path, async (_req, res) => {
    const all = await storage.getPosts();
    res.json(all.filter(p => p.status === "approved"));
  });

  app.post(api.posts.create.path, requireAuth, async (req, res) => {
    try {
      const role = req.session.userRole as Role;
      if (!permissions.canManagePosts(role) && role !== "cetatean" && role !== "moderator")
        return res.status(403).json({ message: "Acces interzis" });
      const body = { ...req.body };
      if (role === "cetatean" || role === "moderator") body.type = "community";
      const input = insertPostSchema.parse(body);
      const status = OFFICIAL_ROLE_SET.has(role) ? "approved" : "pending";
      const post = await storage.createPostWithStatus(input, status);
      if (req.session.userId) {
        await storage.addPoints(req.session.userId, 5);
        checkAndAwardBadges(req.session.userId, "post").catch(() => {});
      }
      res.status(201).json(post);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/posts/:id", requireRole("administrator", "primar", "viceprimar", "moderator"), async (req, res) => {
    const id = Number(req.params.id);
    const post = await storage.updatePost(id, req.body);
    if (!post) return res.status(404).json({ message: "Postarea nu există" });
    if (req.body.status === "approved" || req.body.status === "rejected") {
      const label = req.body.status === "approved" ? "aprobată ✓" : "respinsă ✗";
      await storage.createNotification({ userId: null, type: req.body.status === "approved" ? "success" : "info", category: "moderare", title: "Postare moderată", message: `„${post.title}" — ${label}` });
    }
    res.json(post);
  });

  app.delete("/api/posts/:id", requireAuth, async (req, res) => {
    const role = req.session.userRole as Role;
    if (!permissions.canDeleteAnyPost(role)) return res.status(403).json({ message: "Acces interzis" });
    await storage.deletePost(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── EVENTS ──────────────────────────────────────────────────────────────
  app.get(api.events.list.path, async (_req, res) => {
    res.json(await storage.getEvents()); // storage.getEvents already filters approved
  });

  app.get("/api/admin/events", requireRole("administrator", "primar", "viceprimar"), async (_req, res) => {
    // Admin gets ALL events (approved + pending + rejected)
    const approved = await storage.getEvents();
    const pending = await storage.getPendingEvents();
    res.json([...pending, ...approved]);
  });

  // ─── Event auto-image helper ──────────────────────────────────────────────
  function getEventAutoImage(category: string, title: string): string {
    const catMap: Record<string, string> = {
      cultural: "concert,festival,art,performance",
      voluntariat: "volunteer,community,nature,environment",
      sport: "sport,competition,fitness,athletic",
      general: "community,meeting,town,village",
    };
    const keywords = catMap[category] ?? "community,village,event";
    const seed = encodeURIComponent((title + category).slice(0, 20));
    return `https://picsum.photos/seed/${seed}/800/450`;
  }

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const role = req.session.userRole as Role;
      if (!permissions.canCreateEvents(role)) return res.status(403).json({ message: "Acces interzis" });
      const input = insertEventSchema.parse(req.body);
      // Auto-generate image if none provided
      if (!input.imageUrl && input.title) {
        (input as any).imageUrl = getEventAutoImage(input.category ?? "general", input.title);
      }
      const isAdmin = permissions.canManageEvents(role);
      const status = isAdmin ? "approved" : "pending";
      const event = await storage.createEventWithStatus({ ...input, userId: req.session.userId } as any, status);
      if (!isAdmin && req.session.userId) {
        await storage.addPoints(req.session.userId, 5);
        const n = await storage.createNotification({
          userId: req.session.userId,
          type: "info",
          category: "evenimente",
          title: "Eveniment propus!",
          message: `„${event.title}" a fost trimis spre aprobare. Vei fi notificat la aprobare.`,
        });
        sendPushForNotif(n).catch(() => {});
      }
      res.status(201).json(event);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/events/:id/approve", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    const event = await storage.approveEvent(Number(req.params.id));
    if (!event) return res.status(404).json({ message: "Evenimentul nu există" });
    // Notify the submitter if known
    if ((event as any).userId) {
      const n = await storage.createNotification({
        userId: (event as any).userId,
        type: "success",
        category: "evenimente",
        title: "Eveniment aprobat! ✓",
        message: `„${event.title}" a fost aprobat și este acum public.`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(event);
  });

  app.post("/api/events/:id/reject", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    const event = await storage.rejectEvent(Number(req.params.id));
    if (!event) return res.status(404).json({ message: "Evenimentul nu există" });
    if ((event as any).userId) {
      const n = await storage.createNotification({
        userId: (event as any).userId,
        type: "info",
        category: "evenimente",
        title: "Eveniment respins",
        message: `„${event.title}" nu a putut fi aprobat. Contactați primăria pentru detalii.`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(event);
  });

  app.put("/api/events/:id", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    const event = await storage.updateEvent(Number(req.params.id), req.body);
    if (!event) return res.status(404).json({ message: "Evenimentul nu există" });
    res.json(event);
  });

  app.delete("/api/events/:id", requireRole("administrator", "primar"), async (req, res) => {
    await storage.deleteEvent(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/events/:id/join", async (req, res) => {
    const eventId = Number(req.params.id);
    // Prevent duplicate joins if user is logged in
    if (req.session.userId) {
      const alreadyJoined = await storage.hasUserJoinedEvent(eventId, req.session.userId);
      if (alreadyJoined) return res.status(400).json({ message: "Ești deja înscris la acest eveniment." });
    }
    const event = await storage.joinEvent(eventId);
    if (!event) return res.status(404).json({ message: "Evenimentul nu există" });
    if (req.session.userId) {
      const user = await storage.getUserById(req.session.userId);
      if (user) {
        await storage.addEventParticipant(eventId, req.session.userId, user.name).catch(() => {});
      }
      const pts = event.category === "voluntariat" ? 5 : 3;
      await storage.addPoints(req.session.userId, pts);
      const trigger = event.category === "voluntariat" ? "volunteer" : "event_join";
      checkAndAwardBadges(req.session.userId, trigger).catch(() => {});
    }
    res.json(event);
  });

  app.get("/api/events/:id/participants", async (req, res) => {
    const participants = await storage.getEventParticipants(Number(req.params.id));
    res.json(participants);
  });

  // ─── REPORTS ─────────────────────────────────────────────────────────────
  app.get(api.reports.list.path, async (_req, res) => {
    res.json(await storage.getReports());
  });

  app.get("/api/reports/mine", requireAuth, async (req, res) => {
    res.json(await storage.getReportsByUser(req.session.userId!));
  });

  app.get("/api/reports/all", requireRole("administrator", "moderator", "primar", "viceprimar", "functionar_public"), async (_req, res) => {
    res.json(await storage.getAllReports());
  });

  app.post(api.reports.create.path, async (req, res) => {
    try {
      const input = insertReportSchema.parse(req.body);
      const reportData: any = { ...input, visibility: "pending" };
      if (req.session.userId) reportData.userId = req.session.userId;
      const report = await storage.createReport(reportData);
      if (req.session.userId) {
        await storage.addPoints(req.session.userId, 10);
        checkAndAwardBadges(req.session.userId, "report").catch(() => {});
        const reportNotif = await storage.createNotification({ userId: req.session.userId, type: "success", category: "sesizari", title: "Sesizare înregistrată! +10 puncte", message: `Sesizarea „${report.title}" a fost înregistrată și va fi analizată.` });
        sendPushForNotif(reportNotif).catch(() => {});
      }
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/reports/:id/approve", requireRole("administrator", "moderator"), async (req, res) => {
    const report = await storage.updateReport(Number(req.params.id), { visibility: "public" } as any);
    if (!report) return res.status(404).json({ message: "Sesizarea nu există" });
    res.json(report);
  });

  app.put("/api/reports/:id", requireRole("administrator", "moderator", "primar", "viceprimar", "functionar_public"), async (req, res) => {
    const { adminReply, visibility, ...rest } = req.body;
    if ((rest.status === "rezolvat" || rest.status === "respins") && !adminReply) {
      return res.status(400).json({ message: "Răspunsul este obligatoriu pentru a închide sau respinge o sesizare." });
    }
    const updateData: any = { ...rest };
    if (adminReply !== undefined) updateData.adminReply = adminReply;
    const role = req.session.userRole as string;
    if (visibility && (role === "administrator" || role === "moderator")) {
      updateData.visibility = visibility;
    }
    const report = await storage.updateReport(Number(req.params.id), updateData);
    if (!report) return res.status(404).json({ message: "Sesizarea nu există" });
    if (rest.status) {
      const statusLabel: Record<string, string> = {
        in_lucru: "în lucru", rezolvat: "rezolvată", in_asteptare: "în așteptare", respins: "respinsă",
      };
      const type = rest.status === "rezolvat" ? "success" : "info";
      const statusNotif = await storage.createNotification({ userId: null, type, category: "sesizari", title: "Sesizare actualizată", message: `„${report.title}" — status: ${statusLabel[rest.status] ?? rest.status}${adminReply ? ` — „${adminReply}"` : ""}` });
      sendPushForNotif(statusNotif).catch(() => {});
    }
    res.json(report);
  });

  app.delete("/api/reports/:id", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    await storage.deleteReport(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── BUSINESSES ──────────────────────────────────────────────────────────
  app.get(api.businesses.list.path, async (_req, res) => {
    res.json(await storage.getBusinesses()); // only approved
  });

  app.get("/api/admin/businesses", requireRole("administrator", "primar", "viceprimar"), async (_req, res) => {
    res.json(await storage.getAllBusinesses()); // all statuses
  });

  app.post("/api/businesses", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    try {
      const input = insertBusinessSchema.parse(req.body);
      res.status(201).json(await storage.createBusiness(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Citizens submit their own business for approval
  app.post("/api/businesses/submit", requireAuth, async (req, res) => {
    try {
      const input = insertBusinessSchema.parse(req.body);
      const biz = await storage.createBusinessByUser(input, req.session.userId!);
      if (req.session.userId) {
        await storage.addPoints(req.session.userId, 5);
        const n = await storage.createNotification({
          userId: req.session.userId,
          type: "info",
          category: "comunitate",
          title: "Afacere trimisă spre aprobare!",
          message: `„${biz.name}" a fost trimisă spre aprobare. Vei fi notificat la aprobare.`,
        });
        sendPushForNotif(n).catch(() => {});
      }
      res.status(201).json(biz);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/businesses/:id/approve", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    const biz = await storage.approveBusiness(Number(req.params.id));
    if (!biz) return res.status(404).json({ message: "Afacerea nu există" });
    if ((biz as any).userId) {
      const n = await storage.createNotification({
        userId: (biz as any).userId,
        type: "success",
        category: "comunitate",
        title: "Afacere aprobată! ✓",
        message: `„${biz.name}" a fost aprobată și este acum vizibilă în directorul local.`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(biz);
  });

  app.post("/api/businesses/:id/reject", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    const biz = await storage.rejectBusiness(Number(req.params.id));
    if (!biz) return res.status(404).json({ message: "Afacerea nu există" });
    if ((biz as any).userId) {
      const n = await storage.createNotification({
        userId: (biz as any).userId,
        type: "info",
        category: "comunitate",
        title: "Afacere respinsă",
        message: `„${biz.name}" nu a putut fi aprobată. Contactați primăria pentru detalii.`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(biz);
  });

  app.put("/api/businesses/:id", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    const biz = await storage.updateBusiness(Number(req.params.id), req.body);
    if (!biz) return res.status(404).json({ message: "Afacerea nu există" });
    res.json(biz);
  });

  app.post("/api/businesses/:id/verify", requireRole("administrator", "primar"), async (req, res) => {
    const id = Number(req.params.id);
    const biz = await storage.getBusinessById(id);
    if (!biz) return res.status(404).json({ message: "Afacerea nu există" });
    const updated = await storage.updateBusiness(id, { verified: !biz.verified } as any);
    res.json(updated);
  });

  app.delete("/api/businesses/:id", requireRole("administrator", "primar"), async (req, res) => {
    await storage.deleteBusiness(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── MUNICIPAL REQUESTS (cereri) ──────────────────────────────────────────
  app.get("/api/municipal-requests/mine", requireAuth, async (req, res) => {
    res.json(await storage.getMunicipalRequestsByUser(req.session.userId!));
  });

  app.get("/api/municipal-requests", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (_req, res) => {
    res.json(await storage.getMunicipalRequests());
  });

  app.post("/api/municipal-requests", requireAuth, async (req, res) => {
    try {
      const { insertMunicipalRequestSchema } = await import("@shared/schema");
      const input = insertMunicipalRequestSchema.parse(req.body);
      const user = await storage.getUserById(req.session.userId!);
      const reqData: any = { ...input, userId: req.session.userId, userName: user?.name ?? "Cetățean" };
      const created = await storage.createMunicipalRequest(reqData);
      await storage.addPoints(req.session.userId!, 5);
      const n = await storage.createNotification({
        userId: req.session.userId!,
        type: "info",
        category: "sesizari",
        title: "Cerere înregistrată! ✓",
        message: `Cererea „${created.title}" a fost înregistrată și va fi procesată de ${created.department}.`,
      });
      sendPushForNotif(n).catch(() => {});
      res.status(201).json(created);
    } catch (err) {
      const { ZodError } = await import("zod/v4");
      if (err instanceof ZodError) return res.status(400).json({ message: (err.issues?.[0]?.message ?? "Eroare de validare") });
      throw err;
    }
  });

  app.put("/api/municipal-requests/:id", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (req, res) => {
    const updated = await storage.updateMunicipalRequest(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Cererea nu există" });
    if ((updated as any).userId && req.body.adminReply) {
      const n = await storage.createNotification({
        userId: (updated as any).userId,
        type: "info",
        category: "sesizari",
        title: "Răspuns la cererea ta",
        message: `Primăria a răspuns cererii „${updated.title}": ${req.body.adminReply}`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(updated);
  });

  app.delete("/api/municipal-requests/:id", requireRole("administrator", "primar"), async (req, res) => {
    await storage.deleteMunicipalRequest(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── SERVICES ────────────────────────────────────────────────────────────
  app.get("/api/services", async (_req, res) => {
    const all = await storage.getServices();
    res.json(all.filter(s => s.status === "activ"));
  });

  app.get("/api/admin/services", requireRole("administrator", "primar", "viceprimar"), async (_req, res) => {
    res.json(await storage.getServices());
  });

  app.post("/api/services", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (req, res) => {
    try {
      const input = insertServiceSchema.parse(req.body);
      res.status(201).json(await storage.createService(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/services/:id", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (req, res) => {
    const svc = await storage.updateService(Number(req.params.id), req.body);
    if (!svc) return res.status(404).json({ message: "Serviciul nu există" });
    res.json(svc);
  });

  app.delete("/api/services/:id", requireRole("administrator", "primar"), async (req, res) => {
    await storage.deleteService(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── TRANSPORT ROUTES ─────────────────────────────────────────────────────
  app.get("/api/transport", async (_req, res) => {
    res.json(await storage.getTransportRoutes());
  });

  app.get("/api/admin/transport", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (_req, res) => {
    const all = await db.select().from((await import("@shared/schema")).transportRoutes).orderBy((await import("@shared/schema")).transportRoutes.createdAt);
    res.json(all);
  });

  app.post("/api/transport", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (req, res) => {
    try {
      const input = insertTransportRouteSchema.parse(req.body);
      res.status(201).json(await storage.createTransportRoute(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/transport/:id", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (req, res) => {
    const route = await storage.updateTransportRoute(Number(req.params.id), req.body);
    if (!route) return res.status(404).json({ message: "Ruta nu există" });
    res.json(route);
  });

  app.delete("/api/transport/:id", requireRole("administrator", "primar"), async (req, res) => {
    await storage.deleteTransportRoute(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── ADMIN: RESET CONTENT ─────────────────────────────────────────────────
  app.post("/api/admin/reset-content", requireRole("administrator"), async (req, res) => {
    const adminId = req.session.userId!;
    const { pool } = await import("./db");
    await pool.query(`
      TRUNCATE TABLE
        posts, events, reports, businesses, marketplace_items, job_listings,
        community_announcements, notifications, services, transport_routes,
        chat_messages, health_campaigns, health_alerts, doctor_profiles,
        appointment_requests, social_programs, user_badges, event_participants,
        municipal_requests, push_subscriptions, user_permissions,
        weather_cache
      RESTART IDENTITY CASCADE
    `);
    await pool.query(`DELETE FROM users WHERE id != $1`, [adminId]);
    res.json({ ok: true, message: "Conținut resetat cu succes. Contul tău a fost păstrat." });
  });

  // ─── MARKETPLACE ─────────────────────────────────────────────────────────
  app.get("/api/marketplace", async (_req, res) => {
    res.json(await storage.getMarketplaceItems());
  });

  app.post("/api/marketplace", requireAuth, async (req, res) => {
    try {
      const input = insertMarketplaceItemSchema.parse(req.body);
      const item = await storage.createMarketplaceItem({
        ...input,
        userId: req.session.userId ?? null,
        status: "pending",
      } as any);
      if (req.session.userId) {
        await storage.addPoints(req.session.userId, 3);
        checkAndAwardBadges(req.session.userId, "marketplace").catch(() => {});
        const n = await storage.createNotification({
          userId: req.session.userId,
          type: "info",
          category: "comunitate",
          title: "Anunț trimis spre aprobare!",
          message: `„${item.title}" a fost trimis și va fi aprobat în curând.`,
        });
        sendPushForNotif(n).catch(() => {});
      }
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/marketplace/:id/approve", requireRole("administrator", "primar", "viceprimar", "moderator"), async (req, res) => {
    const item = await storage.approveMarketplaceItem(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Anunțul nu există" });
    if ((item as any).userId) {
      const n = await storage.createNotification({
        userId: (item as any).userId,
        type: "success",
        category: "comunitate",
        title: "Anunț aprobat! ✓",
        message: `„${item.title}" este acum vizibil în marketplace.`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(item);
  });

  app.post("/api/marketplace/:id/reject", requireRole("administrator", "primar", "viceprimar", "moderator"), async (req, res) => {
    const item = await storage.rejectMarketplaceItem(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Anunțul nu există" });
    if ((item as any).userId) {
      const n = await storage.createNotification({
        userId: (item as any).userId,
        type: "info",
        category: "comunitate",
        title: "Anunț respins",
        message: `„${item.title}" nu a putut fi aprobat. Contactați administrația pentru detalii.`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(item);
  });

  app.put("/api/marketplace/:id", requireAuth, async (req, res) => {
    const item = await storage.updateMarketplaceItem(Number(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Anunțul nu există" });
    res.json(item);
  });

  app.delete("/api/marketplace/:id", requireAuth, async (req, res) => {
    await storage.deleteMarketplaceItem(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────
  app.get("/api/announcements", async (_req, res) => {
    res.json(await storage.getAnnouncements());
  });

  app.post("/api/announcements", requireAuth, async (req, res) => {
    try {
      const input = insertAnnouncementSchema.parse(req.body);
      const ann = await storage.createAnnouncement({
        ...input,
        userId: req.session.userId ?? null,
      });
      if (req.session.userId) {
        await storage.addPoints(req.session.userId, 2);
        checkAndAwardBadges(req.session.userId, "announcement").catch(() => {});
      }
      res.status(201).json(ann);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/announcements/:id", requireAuth, async (req, res) => {
    const ann = await storage.updateAnnouncement(Number(req.params.id), req.body);
    if (!ann) return res.status(404).json({ message: "Anunțul nu există" });
    res.json(ann);
  });

  app.delete("/api/announcements/:id", requireAuth, async (req, res) => {
    await storage.deleteAnnouncement(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── JOB LISTINGS ────────────────────────────────────────────────────────
  app.get("/api/jobs", async (_req, res) => {
    res.json(await storage.getJobListings());
  });

  app.post("/api/jobs", requireAuth, async (req, res) => {
    try {
      const input = insertJobListingSchema.parse(req.body);
      const job = await storage.createJobListing({
        ...input,
        userId: req.session.userId ?? null,
        status: "pending",
      } as any);
      if (req.session.userId) {
        await storage.addPoints(req.session.userId, 5);
        checkAndAwardBadges(req.session.userId, "job").catch(() => {});
        const n = await storage.createNotification({
          userId: req.session.userId,
          type: "info",
          category: "comunitate",
          title: "Job trimis spre aprobare!",
          message: `„${job.title}" a fost trimis și va fi aprobat în curând.`,
        });
        sendPushForNotif(n).catch(() => {});
      }
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/jobs/:id/approve", requireRole("administrator", "primar", "viceprimar", "moderator"), async (req, res) => {
    const job = await storage.approveJobListing(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Jobul nu există" });
    if ((job as any).userId) {
      const n = await storage.createNotification({
        userId: (job as any).userId,
        type: "success",
        category: "comunitate",
        title: "Job aprobat! ✓",
        message: `„${job.title}" la ${job.company} este acum vizibil în secțiunea Joburi.`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(job);
  });

  app.post("/api/jobs/:id/reject", requireRole("administrator", "primar", "viceprimar", "moderator"), async (req, res) => {
    const job = await storage.rejectJobListing(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Jobul nu există" });
    if ((job as any).userId) {
      const n = await storage.createNotification({
        userId: (job as any).userId,
        type: "info",
        category: "comunitate",
        title: "Job respins",
        message: `„${job.title}" nu a putut fi aprobat. Contactați administrația pentru detalii.`,
      });
      sendPushForNotif(n).catch(() => {});
    }
    res.json(job);
  });

  app.put("/api/jobs/:id", requireAuth, async (req, res) => {
    const job = await storage.updateJobListing(Number(req.params.id), req.body);
    if (!job) return res.status(404).json({ message: "Jobul nu există" });
    res.json(job);
  });

  app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
    await storage.deleteJobListing(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── ADMIN STATS DASHBOARD ───────────────────────────────────────────────
  app.get("/api/admin/stats", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (_req, res) => {
    const [allReports, allPosts, allEvents, allUsers] = await Promise.all([
      storage.getReports(), storage.getPosts(), storage.getEvents(), storage.getUsers(),
    ]);

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const byStatus = { in_asteptare: 0, in_lucru: 0, rezolvat: 0 };
    const byCategory: Record<string, number> = {};
    const byLocation: Record<string, number> = {};

    for (const r of allReports) {
      const s = (r.status ?? "in_asteptare") as keyof typeof byStatus;
      if (s in byStatus) byStatus[s]++;
      if (r.category) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      if (r.location) byLocation[r.location] = (byLocation[r.location] ?? 0) + 1;
    }

    const totalReports = allReports.length;
    const resolutionRate = totalReports > 0 ? Math.round((byStatus.rezolvat / totalReports) * 100) : 0;
    const zoneCritice = Object.entries(byLocation).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([location, count]) => ({ location, count }));
    const categoryBreakdown = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([category, count]) => ({ category, count }));
    const recentUnresolved = allReports.filter(r => r.status !== "rezolvat").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, 6).map(r => ({ id: r.id, title: r.title, category: r.category, status: r.status, createdAt: r.createdAt, location: r.location }));

    res.json({
      reports: { total: totalReports, by_status: byStatus, by_category: categoryBreakdown, zone_critice: zoneCritice, resolution_rate: resolutionRate, recent_unresolved: recentUnresolved },
      posts: { total: allPosts.length, this_week: allPosts.filter(p => new Date(p.createdAt).getTime() > weekAgo).length },
      events: { total: allEvents.length, upcoming: allEvents.filter(e => new Date(e.date) >= new Date()).length, total_participants: allEvents.reduce((s, e) => s + (e.participantCount ?? 0), 0) },
      users: { total: allUsers.length },
    });
  });

  // ─── ADMIN CONTENT LISTS ─────────────────────────────────────────────────
  app.get("/api/admin/marketplace", requireRole("administrator", "primar", "viceprimar", "moderator"), async (_req, res) => {
    res.json(await storage.getAllMarketplaceItems());
  });

  app.get("/api/admin/announcements", requireRole("administrator", "primar", "viceprimar", "moderator"), async (_req, res) => {
    res.json(await storage.getAnnouncements());
  });

  app.get("/api/admin/jobs", requireRole("administrator", "primar", "viceprimar", "moderator"), async (_req, res) => {
    res.json(await storage.getAllJobListings());
  });

  // ─── ADMIN BROADCAST NOTIFICATION ────────────────────────────────────────
  app.post("/api/admin/notifications", requireRole("administrator", "primar", "viceprimar"), async (req, res) => {
    try {
      const { title, message, type = "info", category = "anunturi_oficiale", targetUserId } = req.body;
      if (!title || !message) return res.status(400).json({ message: "Titlu și mesaj obligatorii" });
      if (targetUserId) {
        const notif = await storage.createNotification({ userId: targetUserId, type, category, title, message });
        sendPushForNotif(notif).catch(() => {});
        return res.json({ ok: true, sent: 1 });
      }
      // broadcast to all
      const allUsers = await storage.getUsers();
      await Promise.all(
        allUsers.filter(u => u.id).map(u =>
          storage.createNotification({ userId: u.id, type, category, title, message })
        )
      );
      const broadcastNotif = { userId: null, title, message };
      sendPushForNotif(broadcastNotif).catch(() => {});
      res.json({ ok: true, sent: allUsers.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifs = await storage.getNotificationsForUser(req.session.userId!);
    res.json(notifs);
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead(req.session.userId!);
    res.json({ ok: true });
  });

  // ─── SETTINGS ────────────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    res.json(await storage.getSettings());
  });

  app.put("/api/settings/:key", requireRole("administrator"), async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    if (typeof value !== "string") return res.status(400).json({ message: "Valoare invalidă" });
    await storage.updateSetting(key, value);
    res.json({ key, value });
  });

  // ─── DEMO MODE MIDDLEWARE ─────────────────────────────────────────────────
  // Block all write operations when demo_mode is enabled (except admin overrides)
  app.use(async (req, res, next) => {
    if (!["POST","PUT","PATCH","DELETE"].includes(req.method)) return next();
    // Always allow auth, settings changes, and the reset endpoint
    const bypass = ["/api/auth/", "/api/settings/", "/api/admin/reset-content", "/api/push/"];
    if (bypass.some(p => req.path.startsWith(p))) return next();
    try {
      const settings = await storage.getSettings();
      if (settings["demo_mode"] === "true") {
        return res.status(423).json({ message: "Aplicația este în modul demonstrativ (read-only). Modificările nu sunt permise." });
      }
    } catch (_) {}
    next();
  });

  // ─── GAMIFICATION ────────────────────────────────────────────────────────
  // Helper: check & award badges after any action
  async function checkAndAwardBadges(userId: number, trigger: string) {
    try {
      const [badges, user, activity] = await Promise.all([
        storage.getUserBadges(userId),
        storage.getUserById(userId),
        storage.getUserActivityCounts(userId),
      ]);
      const earned = new Set(badges.map(b => b.badgeType));
      const pts = user?.points ?? 0;
      const newBadges: string[] = [];

      const award = async (type: string) => {
        if (!earned.has(type)) {
          await storage.awardBadge(userId, type);
          newBadges.push(type);
          earned.add(type);
        }
      };

      // Report badges
      if (activity.reports >= 1) await award("primul_pas");
      if (activity.reports >= 3) await award("reporter");
      // Post badges
      if (trigger === "post" || activity.posts >= 1) await award("voz_locala");
      if (activity.posts >= 5) await award("ambasador");
      // Action badges
      if (trigger === "volunteer") await award("voluntar");
      if (trigger === "event_join") await award("organizator");
      if (trigger === "marketplace") await award("comerciant");
      if (trigger === "job") await award("angajator");
      if (trigger === "appointment") await award("investigator");
      // Points badges
      if (pts >= 100) await award("campion");
      if (pts >= 500) await award("super_campion");
      // Citizen model: active in 5+ different modules
      const modulesDone = [
        activity.reports > 0,
        activity.posts > 0,
        activity.marketplace > 0,
        activity.jobs > 0,
        activity.announcements > 0,
      ].filter(Boolean).length;
      if (modulesDone >= 5) await award("cetatean_model");

      // Send notification for each new badge
      for (const bType of newBadges) {
        const { BADGE_META } = await import("@shared/schema");
        const meta = BADGE_META[bType as keyof typeof BADGE_META];
        if (meta) {
          await storage.createNotification({
            userId,
            type: "success",
            category: "sistem",
            title: `🏅 Insignă nouă: ${meta.label}`,
            message: meta.desc,
          });
        }
      }
    } catch (e) {
      // Non-critical — never break the main request
      console.error("Badge check failed:", e);
    }
  }

  app.get("/api/gamification/badges", requireAuth, async (req, res) => {
    const badges = await storage.getUserBadges(req.session.userId!);
    res.json(badges);
  });

  app.get("/api/gamification/stats", requireAuth, async (req, res) => {
    const [badges, user, activity] = await Promise.all([
      storage.getUserBadges(req.session.userId!),
      storage.getUserById(req.session.userId!),
      storage.getUserActivityCounts(req.session.userId!),
    ]);
    res.json({
      points: user?.points ?? 0,
      badges,
      activity,
    });
  });

  app.get("/api/gamification/leaderboard", async (_req, res) => {
    const board = await storage.getLeaderboard(10);
    res.json(board);
  });

  // ─── HEALTH CAMPAIGNS ────────────────────────────────────────────────────
  app.get("/api/health/campaigns", async (_req, res) => {
    const items = await storage.getHealthCampaigns();
    res.json(items);
  });
  app.post("/api/health/campaigns", requireSectionPermission("health_campaigns", "canWrite"), async (req, res) => {
    try {
      const item = await storage.createHealthCampaign(req.body);
      res.status(201).json(item);
    } catch { res.status(400).json({ message: "Date invalide" }); }
  });
  app.put("/api/health/campaigns/:id", requireSectionPermission("health_campaigns", "canWrite"), async (req, res) => {
    const item = await storage.updateHealthCampaign(parseInt(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Campanie negăsită" });
    res.json(item);
  });
  app.delete("/api/health/campaigns/:id", requireSectionPermission("health_campaigns", "canDelete"), async (req, res) => {
    await storage.deleteHealthCampaign(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── HEALTH ALERTS ───────────────────────────────────────────────────────
  app.get("/api/health/alerts", async (_req, res) => {
    const items = await storage.getHealthAlerts();
    res.json(items);
  });
  app.post("/api/health/alerts", requireSectionPermission("health_alerts", "canWrite"), async (req, res) => {
    try {
      const item = await storage.createHealthAlert(req.body);
      res.status(201).json(item);
    } catch { res.status(400).json({ message: "Date invalide" }); }
  });
  app.put("/api/health/alerts/:id", requireSectionPermission("health_alerts", "canWrite"), async (req, res) => {
    const item = await storage.updateHealthAlert(parseInt(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Alertă negăsită" });
    res.json(item);
  });
  app.delete("/api/health/alerts/:id", requireSectionPermission("health_alerts", "canDelete"), async (req, res) => {
    await storage.deleteHealthAlert(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── DOCTOR PROFILES ─────────────────────────────────────────────────────
  app.get("/api/health/doctors", async (_req, res) => {
    const items = await storage.getDoctorProfiles();
    res.json(items);
  });
  app.post("/api/health/doctors", requireSectionPermission("health_doctors", "canWrite"), async (req, res) => {
    try {
      const item = await storage.createDoctorProfile(req.body);
      res.status(201).json(item);
    } catch { res.status(400).json({ message: "Date invalide" }); }
  });
  app.put("/api/health/doctors/:id", requireSectionPermission("health_doctors", "canWrite"), async (req, res) => {
    const item = await storage.updateDoctorProfile(parseInt(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Medic negăsit" });
    res.json(item);
  });
  app.delete("/api/health/doctors/:id", requireSectionPermission("health_doctors", "canDelete"), async (req, res) => {
    await storage.deleteDoctorProfile(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── APPOINTMENT REQUESTS ─────────────────────────────────────────────────
  app.get("/api/health/appointments", requireSectionPermission("health_appointments", "canRead"), async (req, res) => {
    const items = await storage.getAppointmentRequests();
    res.json(items);
  });
  // My own appointments (for users/patients)
  app.get("/api/health/appointments/mine", requireAuth, async (req, res) => {
    const items = await storage.getAppointmentRequestsByUser(req.session.userId!);
    res.json(items);
  });
  app.post("/api/health/appointments", requireAuth, async (req, res) => {
    try {
      const uid = req.session?.userId;
      const item = await storage.createAppointmentRequest({ ...req.body, userId: uid });
      if (uid) {
        await storage.addPoints(uid, 2);
        checkAndAwardBadges(uid, "appointment").catch(() => {});
      }
      res.status(201).json(item);
    } catch { res.status(400).json({ message: "Date invalide" }); }
  });
  app.put("/api/health/appointments/:id", requireSectionPermission("health_appointments", "canApprove"), async (req, res) => {
    const item = await storage.updateAppointmentRequest(parseInt(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Programare negăsită" });
    res.json(item);
  });

  // ─── SOCIAL PROGRAMS ─────────────────────────────────────────────────────
  app.get("/api/social/programs", async (_req, res) => {
    const items = await storage.getSocialPrograms();
    res.json(items);
  });
  app.post("/api/social/programs", requireSectionPermission("social_programs", "canWrite"), async (req, res) => {
    try {
      const item = await storage.createSocialProgram(req.body);
      res.status(201).json(item);
    } catch { res.status(400).json({ message: "Date invalide" }); }
  });
  app.put("/api/social/programs/:id", requireSectionPermission("social_programs", "canWrite"), async (req, res) => {
    const item = await storage.updateSocialProgram(parseInt(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Program negăsit" });
    res.json(item);
  });
  app.delete("/api/social/programs/:id", requireSectionPermission("social_programs", "canDelete"), async (req, res) => {
    await storage.deleteSocialProgram(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // ─── CHAT ────────────────────────────────────────────────────────────────
  app.get("/api/chat/:channel", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.channel, 100);
      res.json(messages);
    } catch (e) {
      res.status(400).json({ message: "Canalul nu există" });
    }
  });

  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { channel, content } = req.body;
      if (!content || !channel || content.trim().length === 0) {
        return res.status(400).json({ message: "Mesaj și canal necesare" });
      }
      const user = await storage.getUserById(req.session.userId!);
      const msg = await storage.createChatMessage({
        userId: req.session.userId!,
        userName: user?.name ?? "Utilizator",
        channel,
        content: content.trim(),
      });
      res.status(201).json(msg);
    } catch (e) {
      res.status(400).json({ message: "Eroare la trimiterea mesajului" });
    }
  });

  // ─── WEATHER ──────────────────────────────────────────────────────────────
  app.get("/api/weather", async (_req, res) => {
    try {
      const cached = await storage.getWeatherCache("Halchiu");
      if (cached && cached.lastUpdated && (Date.now() - new Date(cached.lastUpdated).getTime()) < 3600000) {
        return res.json({
          temperature: cached.temperature,
          condition: cached.condition,
          humidity: cached.humidity,
          windSpeed: cached.windSpeed,
          feelsLike: cached.feelsLike,
          forecast: cached.forecast ? JSON.parse(cached.forecast) : [],
        });
      }
      // Simulate weather data (in production, call OpenWeatherMap API)
      const weather = {
        temperature: 22 + Math.random() * 8,
        condition: ["Parțial noros", "Însorit", "Ploaie ușoară"][Math.floor(Math.random() * 3)],
        humidity: 60 + Math.floor(Math.random() * 30),
        windSpeed: 5 + Math.random() * 15,
        feelsLike: 20 + Math.random() * 10,
        forecast: [
          { day: "Azi", high: 25, low: 15, condition: "Însorit" },
          { day: "Mâine", high: 23, low: 14, condition: "Parțial noros" },
          { day: "Poimâine", high: 20, low: 12, condition: "Ploaie" },
        ],
      };
      await storage.upsertWeatherCache({
        location: "Halchiu",
        temperature: weather.temperature,
        condition: weather.condition,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        feelsLike: weather.feelsLike,
        forecast: JSON.stringify(weather.forecast),
      });
      res.json(weather);
    } catch (e) {
      res.status(500).json({ message: "Eroare la preluarea meteo" });
    }
  });

  // ─── CRITICAL ALERT NOTIFICATIONS ─────────────────────────────────────────
  app.post("/api/alerts/critical", requireRole("administrator", "primar", "viceprimar", "functionar_public"), async (req, res) => {
    try {
      const { title, message, type = "warning" } = req.body;
      if (!title || !message) return res.status(400).json({ message: "Titlu și mesaj necesare" });
      
      // Broadcast to all users
      const allUsers = await storage.getUsers();
      const notifPromises = allUsers
        .filter(u => u.id && u.id > 0)
        .map(u => 
          storage.createNotification({
            userId: u.id,
            type,
            category: "sistem",
            title: `🚨 ${title}`,
            message,
          })
        );
      
      await Promise.all(notifPromises);
      
      // TODO: Send push notifications via service worker
      res.json({ ok: true, usersNotified: allUsers.length });
    } catch (e) {
      res.status(400).json({ message: "Eroare la trimiterea alertei" });
    }
  });

  // ─── SEED ────────────────────────────────────────────────────────────────
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const { db } = await import("./db");

  // Ensure push_subscriptions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Migrate reports table
  await db.execute(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id INTEGER`);
  await db.execute(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS lat REAL`);
  await db.execute(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS lng REAL`);
  await db.execute(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'pending'`);
  await db.execute(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS image_urls TEXT`);
  await db.execute(`UPDATE reports SET visibility = 'public' WHERE visibility = 'pending' AND user_id IS NULL`);

  // Migrate events table — add category column
  await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general'`);

  // New tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS marketplace_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price TEXT,
      contact TEXT NOT NULL,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS community_announcements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      contact TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS job_listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'full_time',
      contact TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const [existingPosts, existingEvents, existingReports, existingBusinesses, existingUsers, existingSettings, existingServices] = await Promise.all([
    storage.getPosts(), storage.getEvents(), storage.getReports(), storage.getBusinesses(), storage.getUsers(), storage.getSettings(), storage.getServices(),
  ]);

  const [existingMarketplace, existingAnnouncements, existingJobs] = await Promise.all([
    storage.getMarketplaceItems(), storage.getAnnouncements(), storage.getJobListings(),
  ]);

  if (existingUsers.length === 0) {
    const hash = (pw: string) => bcrypt.hash(pw, 10);
    await Promise.all([
      storage.createUser({ username: "admin", password: await hash("admin123"), name: "Administrator", role: "administrator" }),
      storage.createUser({ username: "primar", password: await hash("primar123"), name: "Ion Popescu", role: "primar" }),
      storage.createUser({ username: "viceprimar", password: await hash("vice123"), name: "Maria Ionescu", role: "viceprimar" }),
      storage.createUser({ username: "functionar", password: await hash("func123"), name: "Gheorghe Marin", role: "functionar_public" }),
      storage.createUser({ username: "moderator", password: await hash("mod123"), name: "Ana Popa", role: "moderator" }),
      storage.createUser({ username: "cetatean", password: await hash("cet123"), name: "Vasile Lungu", role: "cetatean" }),
    ]);
  }

  if (existingPosts.length === 0) {
    await Promise.all([
      storage.createPost({ type: "announcement", title: "Reabilitare DC 115 – Lucrări finalizate", content: "Lucrările de reabilitare a drumului comunal DC 115 au fost finalizate. Mulțumim cetățenilor pentru răbdare.", author: "Primăria Hălchiu", category: "Infrastructură", imageUrl: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&q=80" }),
      storage.createPost({ type: "alert", title: "ALERTĂ: Întrerupere apă curentă", content: "Vineri, 09.05, între orele 08:00 – 14:00, va fi întreruptă furnizarea apei în zona Centru și Str. Florilor din cauza lucrărilor de reparații.", author: "Primăria Hălchiu", category: "Utilități", imageUrl: null }),
      storage.createPost({ type: "community", title: "Caut colegă de drum spre Brașov", content: "Merg zilnic spre Brașov în jurul orei 7:30. Caut pe cineva cu care să împart deplasarea. Contactați-mă la numărul de mai jos.", author: "Maria P.", category: "Comunitate", imageUrl: null }),
      storage.createPost({ type: "announcement", title: "Program Stare Civilă – mai 2025", content: "Biroul Stare Civilă va funcționa în luna mai cu program extins: Luni–Vineri 08:00–17:00. Programările se fac telefonic.", author: "Primăria Hălchiu", category: "Administrație", imageUrl: null }),
    ]);
  }

  if (existingEvents.length === 0) {
    const future = (days: number) => new Date(Date.now() + days * 86400000);
    await Promise.all([
      storage.createEvent({ title: "Ziua Comunei Hălchiu", description: "Sărbătorim împreună ziua comunei cu spectacole folclorice, expoziție foto și foc de artificii.", date: future(12), location: "Piața Centrală Hălchiu", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80", category: "cultural" }),
      storage.createEvent({ title: "Ședință Consiliu Local – Mai", description: "Ședința ordinară a Consiliului Local Hălchiu. Ordinea de zi disponibilă la sediul primăriei.", date: future(3), location: "Sala de ședințe, Primăria Hălchiu", imageUrl: null, category: "general" }),
    ]);
  }

  // Ensure voluntariat events exist (run independently of general events seed)
  const voluntariatCount = existingEvents.filter(e => e.category === "voluntariat").length;
  if (voluntariatCount === 0) {
    const future = (days: number) => new Date(Date.now() + days * 86400000);
    await Promise.all([
      storage.createEvent({ title: "Acțiune de ecologizare – Pădure", description: "Curățăm împreună zona forestieră din nordul comunei. Echipament asigurat. Toți cetățenii sunt invitați!", date: future(5), location: "Pădure Nordică, punct de întâlnire: intrare pădure", imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", category: "voluntariat" }),
      storage.createEvent({ title: "Plantare arbori – Voluntariat civic", description: "Plantăm 200 de arbori în zona de recreere a comunei. Vino cu familia și contribuie la un mediu mai verde!", date: future(18), location: "Parc Central Hălchiu", imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80", category: "voluntariat" }),
    ]);
  }

  if (existingReports.length === 0) {
    await Promise.all([
      storage.createReport({ title: "Groapă adâncă pe Strada Principală", description: "La intersecția cu Str. Florilor există o groapă periculoasă care poate afecta vehiculele.", category: "Drum", location: "Str. Principală, intersecție cu Str. Florilor" } as any),
      storage.createReport({ title: "Gunoi abandonat la marginea pădurii", description: "Au fost abandonate mai multe pungi de gunoi la intrarea în pădure. Vă rog să interveniti.", category: "Salubrizare", location: "Intrare pădure, lângă cimitir" } as any),
      storage.createReport({ title: "Stâlp de iluminat defect", description: "Stâlpul de la nr. 42 nu funcționează de 2 săptămâni. Zona este periculoasă noaptea.", category: "Iluminat", location: "Str. Nouă nr. 42" } as any),
    ]);
    await db.execute(`UPDATE reports SET visibility = 'public' WHERE visibility = 'pending' AND user_id IS NULL`);
  }

  if (existingBusinesses.length === 0) {
    await Promise.all([
      storage.createBusiness({ name: "Magazin Alimentar Popescu", category: "Alimentație", description: "Produse alimentare proaspete, lactate locale și legume de sezon. Livrare la domiciliu disponibilă.", address: "Str. Principală nr. 12, Hălchiu", phone: "0722 123 456", website: null, imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80" }),
      storage.createBusiness({ name: "Pensiunea Casa Hălchiului", category: "Turism", description: "Cazare de 3 stele cu vedere la munți. Mic dejun inclus, grădină și terasă.", address: "Str. Livezilor nr. 5, Hălchiu", phone: "0744 987 654", website: "https://casahalchiului.ro", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80" }),
      storage.createBusiness({ name: "Atelier Auto Ionescu", category: "Servicii Auto", description: "Reparații auto, ITP, vulcanizare. Experiență de 20 de ani. Prețuri corecte.", address: "DN13 km 7, Hălchiu", phone: "0733 456 789", website: null, imageUrl: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&q=80" }),
      storage.createBusiness({ name: "Ferma Văcaru – Lactate Naturale", category: "Agricultură", description: "Lapte, brânzeturi și smântână de la vaci crescute la pășune. Comenzi directe.", address: "Sat Hălchiu, nr. 78", phone: "0755 321 987", website: null, imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80" }),
      storage.createBusiness({ name: "Cabinet Medical Dr. Moldovan", category: "Sănătate", description: "Medicină de familie. Consultații, recomandări, eliberare rețete compensate.", address: "Str. Școlii nr. 3, Hălchiu", phone: "0266 234 567", website: null, imageUrl: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80" }),
    ]);
  }

  if (existingSettings && Object.keys(existingSettings).length === 0) {
    const settingsList = [
      ["app_name", "Hălchiu Digital", "Numele aplicației", "general"],
      ["app_tagline", "Platforma digitală a comunei", "Subtitlu aplicație", "general"],
      ["app_county", "Brașov", "Județul", "general"],
      ["app_logo_text", "HD", "Text logo", "general"],
      ["home_hero_title", "Hălchiu Digital", "Titlu hero", "home"],
      ["home_hero_subtitle", "construit cu grijă pentru comunitate", "Subtitlu hero", "home"],
      ["home_hero_county", "Județul Brașov", "Județ hero", "home"],
      ["home_feed_title", "Ultimele știri", "Titlu feed", "home"],
      ["nav_home", "Acasă", "Nav: Acasă", "nav"],
      ["nav_primaria", "Primăria", "Nav: Primăria", "nav"],
      ["nav_events", "Evenimente", "Nav: Evenimente", "nav"],
      ["nav_community", "Comunitate", "Nav: Comunitate", "nav"],
      ["nav_businesses", "Afaceri", "Nav: Afaceri", "nav"],
      ["primaria_name", "Primăria Hălchiu", "Nume primărie", "primaria"],
      ["primaria_subtitle", "Sesizări, probleme și solicitări", "Subtitlu primărie", "primaria"],
      ["primaria_address", "Str. Principală nr. 1, Hălchiu, BV", "Adresă primărie", "primaria"],
      ["primaria_phone", "0266 XXX XXX", "Telefon primărie", "primaria"],
      ["primaria_email", "primaria@halchiu.ro", "Email primărie", "primaria"],
      ["primaria_schedule", "Luni–Joi 08:00–16:30, Vineri 08:00–14:00", "Program primărie", "primaria"],
      ["events_title", "Evenimente", "Titlu evenimente", "events"],
      ["events_subtitle", "Ce se întâmplă în Hălchiu", "Subtitlu evenimente", "events"],
      ["community_title", "Comunitate", "Titlu comunitate", "community"],
      ["community_subtitle", "Discuții și anunțuri locale", "Subtitlu comunitate", "community"],
      ["businesses_title", "Afaceri locale", "Titlu afaceri", "businesses"],
      ["businesses_subtitle", "Firme și servicii din Hălchiu", "Subtitlu afaceri", "businesses"],
      ["geo_gate_title", "Verificare geolocație", "Titlu gate geo", "geo"],
      ["geo_gate_description", "Această aplicație este destinată exclusiv comunității comunei Hălchiu, județul Brașov. Accesul este permis doar dacă te afli în zonă.", "Descriere gate", "geo"],
      ["geo_radius_km", "15", "Raza în km", "geo"],
      ["geo_outside_title", "Acces restricționat", "Titlu acces refuzat", "geo"],
      ["geo_outside_message", "Aplicația este disponibilă exclusiv pentru cetățenii și vizitatorii comunei Hălchiu.", "Mesaj acces refuzat", "geo"],
      ["geo_denied_title", "Locație refuzată", "Titlu locație refuzată", "geo"],
      ["geo_denied_message", "Accesul la locație este necesar pentru a folosi aplicația. Activează permisiunea în setările browserului, apoi încearcă din nou.", "Mesaj locație refuzată", "geo"],
    ];
    for (const [key, value, label, group] of settingsList) {
      await storage.setSetting(key, value, label, group);
    }
  }
  // Always ensure demo_mode setting exists (don't overwrite if already set)
  await storage.setSetting("demo_mode", "false", "Mod demonstrativ (read-only)", "sistem");

  // Seed transport routes from hardcoded timetable if table is empty
  const existingTransport = await storage.getTransportRoutes();
  if (existingTransport.length === 0) {
    await Promise.all([
      storage.createTransportRoute({ type: "autobuz", line: "Linia 19", direction: "Hălchiu → Brașov (Gara CFR)", operator: "RAT Brașov", departures: JSON.stringify(["06:05","06:45","07:20","08:00","08:35","09:15","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"]), notes: "Program L–V, cu unele curse în weekend.", status: "activ" }),
      storage.createTransportRoute({ type: "autobuz", line: "Linia 19", direction: "Brașov (Gara CFR) → Hălchiu", operator: "RAT Brașov", departures: JSON.stringify(["06:30","07:15","07:50","08:30","09:10","09:50","10:45","11:45","12:45","13:45","14:45","15:45","16:45","17:45","18:45","19:45","20:45"]), notes: "Program L–V, cu unele curse în weekend.", status: "activ" }),
      storage.createTransportRoute({ type: "maxitaxi", line: "Maxitaxi", direction: "Hălchiu ↔ Brașov (frecvent)", operator: "Operator privat", departures: JSON.stringify(["06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30"]), notes: "Frecvență ridicată în orele de vârf.", status: "activ" }),
      storage.createTransportRoute({ type: "taxi", line: "Taxi Hălchiu", direction: "Hălchiu – oriunde", operator: "Taxi local", departures: JSON.stringify([]), notes: "Contact: 0266 XXX XXX. Disponibil 24/7.", status: "activ" }),
    ]);
  }

  if (existingServices.length === 0) {
    await Promise.all([
      storage.createService({ name: "Farmacie Sănătatea", category: "medical", type: "farmacie", phone: "0766 112 233", address: "Str. Principală nr. 8, Hălchiu", lat: 45.7695, lng: 25.5928, schedule: JSON.stringify({ lv: "08:00-20:00", s: "09:00-15:00", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Primăria Comunei Hălchiu", category: "administratie", type: "primarie", phone: "0266 XXX XXX", address: "Str. Principală nr. 1, Hălchiu", lat: 45.77, lng: 25.592, schedule: JSON.stringify({ lv: "08:00-16:30", s: "inchis", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Oficiul Poștal Hălchiu", category: "posta", type: "posta", phone: "0266 XXX XXX", address: "Str. Nouă nr. 5, Hălchiu", lat: 45.7685, lng: 25.594, schedule: JSON.stringify({ lv: "08:00-15:00", s: "09:00-12:00", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Școala Generală Hălchiu", category: "educatie", type: "scoala", phone: "0266 XXX XXX", address: "Str. Școlii nr. 1, Hălchiu", lat: 45.7692, lng: 25.5935, schedule: JSON.stringify({ lv: "08:00-14:00", s: "inchis", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Poliția Locală Hălchiu", category: "administratie", type: "politie_locala", phone: "0266 XXX XXX", address: "Str. Principală nr. 1, Hălchiu", lat: 45.77, lng: 25.592, schedule: JSON.stringify({ lv: "08:00-16:00", s: "inchis", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Grădinița Hălchiu", category: "educatie", type: "gradinita", phone: "0266 XXX XXX", address: "Str. Școlii nr. 2, Hălchiu", lat: 45.769, lng: 25.5936, schedule: JSON.stringify({ lv: "07:00-17:00", s: "inchis", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Cabinet Medical Dr. Moldovan", category: "medical", type: "medic_familie", phone: "0266 234 567", address: "Str. Școlii nr. 3, Hălchiu", lat: 45.7689, lng: 25.5932, schedule: JSON.stringify({ lv: "08:00-16:00", s: "09:00-13:00", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Salubritate – Colectare Deșeuri", category: "utilitati", type: "salubritate", phone: "0266 XXX XXX", address: "Str. Principală nr. 1, Hălchiu", lat: null, lng: null, schedule: JSON.stringify({ lv: "08:00-16:00", s: "inchis", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Apă Canal Hălchiu", category: "utilitati", type: "apa", phone: "0800 100 500", address: "Str. Industrială nr. 3, Hălchiu", lat: null, lng: null, schedule: JSON.stringify({ lv: "08:00-16:00", s: "inchis", d: "inchis" }), status: "activ" }),
      storage.createService({ name: "Distribuție Electricitate (CEZ)", category: "utilitati", type: "electricitate", phone: "0800 800 800", address: null, lat: null, lng: null, schedule: JSON.stringify({ lv: "08:00-16:30", s: "inchis", d: "inchis" }), status: "activ" }),
    ]);
  }

  // Seed marketplace (admin-seeded items are pre-approved as "active")
  if (existingMarketplace.length === 0) {
    const { db: dbInst } = await import("./db");
    await Promise.all([
      storage.createMarketplaceItem({ title: "Miere naturală de salcâm – 1kg", description: "Miere pură de salcâm din stupina proprie. Fără aditivi. Disponibil în borcane de 1kg.", category: "produse", price: "35 RON/kg", contact: "0722 111 222", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80", userId: null }),
      storage.createMarketplaceItem({ title: "Legume proaspete din grădina mea", description: "Tomate, castraveți, ardei, dovlecel – recoltate zilnic. Fără pesticide.", category: "produse", price: "Negociabil", contact: "0733 444 555", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80", userId: null }),
      storage.createMarketplaceItem({ title: "Servicii de grădinărit", description: "Tuns gazon, aranjat grădini, plantat copaci. Tarif orar sau per proiect.", category: "servicii", price: "50 RON/oră", contact: "0744 777 888", imageUrl: null, userId: null }),
      storage.createMarketplaceItem({ title: "Ouă de țară – găini crescute liber", description: "Ouă proaspete, disponibile zilnic. Minimum 10 bucăți per comandă.", category: "produse", price: "1.5 RON/buc", contact: "0755 666 999", imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&q=80", userId: null }),
    ]);
    // Mark seeded items as active (bypassing user moderation flow)
    await dbInst.execute(`UPDATE marketplace_items SET status = 'active' WHERE user_id IS NULL`);
  }

  // Seed announcements
  if (existingAnnouncements.length === 0) {
    await Promise.all([
      storage.createAnnouncement({ type: "pierdut", title: "Câine pierdut – Labrador auriu", description: "Am pierdut câinele în zona parcului pe 28 aprilie. Răspunde la numele Rex. Recompensă oferită.", contact: "0722 333 444", userId: null }),
      storage.createAnnouncement({ type: "donatie", title: "Donez mobilier din lemn", description: "Donez masă cu 4 scaune din lemn masiv, în stare bună. Ridicare de la domiciliu.", contact: "0733 555 666", userId: null }),
      storage.createAnnouncement({ type: "meserias", title: "Zugrav disponibil – lucrări interioare", description: "Execut lucrări de zugrăvit, vopsit, faianță și gresie. Prețuri corecte, lucru îngrijit.", contact: "0744 888 111", userId: null }),
      storage.createAnnouncement({ type: "gasit", title: "Chei găsite lângă magazine", description: "Am găsit un set de chei cu breloc alb în fața magazinului Popescu pe 30 aprilie.", contact: "0755 222 333", userId: null }),
    ]);
  }

  // Seed jobs (admin-seeded items are pre-approved as "active")
  if (existingJobs.length === 0) {
    const { db: dbInst2 } = await import("./db");
    await Promise.all([
      storage.createJobListing({ company: "Atelier Auto Ionescu", title: "Mecanic Auto", description: "Căutăm mecanic auto cu experiență de minim 3 ani. Se oferă salariu atractiv și program fix.", type: "full_time", contact: "0733 456 789", userId: null }),
      storage.createJobListing({ company: "Ferma Văcaru", title: "Muncitor agricol sezonier", description: "Angajăm pentru sezonul de vară. Lucrări agricole generale. Cazare asigurată.", type: "sezonier", contact: "0755 321 987", userId: null }),
      storage.createJobListing({ company: "Pensiunea Casa Hălchiului", title: "Cameristă / Operator recepție", description: "Angajăm pentru sezonul turistic. Experiența nu este obligatorie – se oferă training.", type: "part_time", contact: "0744 987 654", userId: null }),
    ]);
    await dbInst2.execute(`UPDATE job_listings SET status = 'active' WHERE user_id IS NULL`);
  }

  // ─── USER BADGES MIGRATION ───────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      badge_type TEXT NOT NULL,
      awarded_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS user_badges_unique ON user_badges (user_id, badge_type)
  `);

  // ─── CHAT MESSAGES MIGRATION ──────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'general',
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS chat_channel_idx ON chat_messages (channel, created_at DESC)
  `);

  // ─── WEATHER CACHE MIGRATION ──────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS weather_cache (
      id SERIAL PRIMARY KEY,
      location TEXT NOT NULL UNIQUE,
      temperature REAL,
      condition TEXT,
      humidity INTEGER,
      wind_speed REAL,
      feels_like REAL,
      forecast TEXT,
      last_updated TIMESTAMP DEFAULT NOW()
    )
  `);

  // ─── HEALTH & SOCIAL MIGRATIONS ─────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS health_campaigns (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target_group TEXT,
      start_date TIMESTAMP,
      end_date TIMESTAMP,
      location TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'activa',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS health_alerts (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      start_date TIMESTAMP,
      end_date TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'activa',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS doctor_profiles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      specialization TEXT NOT NULL,
      cabinet_name TEXT,
      address TEXT,
      phone TEXT,
      schedule TEXT,
      status TEXT NOT NULL DEFAULT 'activ',
      substitute_name TEXT,
      substitute_phone TEXT,
      notes TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS appointment_requests (
      id SERIAL PRIMARY KEY,
      doctor_id INTEGER NOT NULL,
      user_id INTEGER,
      patient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      requested_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_asteptare',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS social_programs (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      eligibility TEXT,
      period TEXT,
      documents_needed TEXT,
      contact_info TEXT,
      status TEXT NOT NULL DEFAULT 'activ',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Seed health alerts
  const [existingHealthAlerts] = await Promise.all([storage.getHealthAlerts()]);
  if (existingHealthAlerts.length === 0) {
    await Promise.all([
      storage.createHealthAlert({
        type: "canicula",
        title: "COD GALBEN caniculă – Avertizare meteorologică",
        description: "Temperaturi de peste 37°C sunt prognozate pentru 3–5 mai. Evitați expunerea la soare între 11:00–18:00. Consumați apă frecvent. Persoanele vârstnice și copiii sunt cei mai vulnerabili.",
        severity: "warning",
        startDate: new Date("2026-05-03"),
        endDate: new Date("2026-05-05"),
        status: "activa",
      }),
      storage.createHealthAlert({
        type: "epidemie",
        title: "Gripă sezonieră – Recomandări DSP Brașov",
        description: "Direcția de Sănătate Publică Brașov recomandă vaccinarea antigripală la dispensarul local. Programul de vaccinare continuă până la epuizarea stocului. Vaccinarea este gratuită pentru persoanele din grupele de risc.",
        severity: "info",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-05-31"),
        status: "activa",
      }),
      storage.createHealthAlert({
        type: "apa",
        title: "Calitate apă potabilă – Analiză favorabilă",
        description: "Ultima analiză a calității apei potabile distribuite în rețeaua comunei Hălchiu indică parametri în limite normale. Apa este sigură pentru consum uman. Urmând analizele periodice lunare.",
        severity: "info",
        startDate: new Date("2026-05-01"),
        endDate: null,
        status: "activa",
      }),
    ]);
  }

  // Seed health campaigns
  const existingCampaigns = await storage.getHealthCampaigns();
  if (existingCampaigns.length === 0) {
    await Promise.all([
      storage.createHealthCampaign({
        type: "vaccinare",
        title: "Campanie vaccinare antigripală 2026",
        description: "Vaccinul antigripal este disponibil gratuit la dispensarul comunal pentru grupele de risc: vârstnici peste 65 ani, copii 6 luni–8 ani, femei însărcinate, persoane cu boli cronice.",
        targetGroup: "Vârstnici, copii, gravide, bolnavi cronici",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-06-30"),
        location: "Dispensarul Medical Hălchiu, Str. Școlii nr. 3",
        imageUrl: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&q=80",
        status: "activa",
      }),
      storage.createHealthCampaign({
        type: "screening",
        title: "Screening diabet și hipertensiune",
        description: "Caravana medicală mobilă vine în Hălchiu cu analize gratuite pentru detectarea timpurie a diabetului și hipertensiunii arteriale. Fără programare prealabilă. Durata consultației: ~20 minute.",
        targetGroup: "Adulți peste 40 ani",
        startDate: new Date("2026-05-15"),
        endDate: new Date("2026-05-15"),
        location: "Sala Polivalentă Hălchiu",
        imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80",
        status: "viitoare",
      }),
      storage.createHealthCampaign({
        type: "preventie",
        title: "Campanie educație sanitară – Igiena mâinilor",
        description: "Medicii de familie derulează sesiuni de educație sanitară în școlile din comună. Copiii învață tehnicile corecte de spălare a mâinilor și prevenție a infecțiilor respiratorii.",
        targetGroup: "Copii 6–14 ani, părinți",
        startDate: new Date("2026-05-05"),
        endDate: new Date("2026-05-20"),
        location: "Școala Generală Hălchiu",
        imageUrl: null,
        status: "activa",
      }),
      storage.createHealthCampaign({
        type: "caravana",
        title: "Caravană stomatologică gratuită",
        description: "Medicii stomatologi voluntari din Brașov oferă consultații și tratamente stomatologice gratuite copiilor din comună cu vârste între 4 și 14 ani. Locuri limitate – înregistrare la dispensarul comunal.",
        targetGroup: "Copii 4–14 ani",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-03"),
        location: "Dispensarul Medical Hălchiu",
        imageUrl: null,
        status: "viitoare",
      }),
    ]);
  }

  // Seed doctor profiles
  const existingDoctors = await storage.getDoctorProfiles();
  if (existingDoctors.length === 0) {
    await Promise.all([
      storage.createDoctorProfile({
        name: "Dr. Elena Moldovan",
        specialization: "Medic de Familie",
        cabinetName: "Cabinet Medical Dr. Moldovan",
        address: "Str. Școlii nr. 3, Hălchiu",
        phone: "0266 234 567",
        schedule: JSON.stringify({ lv: "08:00–16:00", s: "09:00–13:00 (urgențe)", d: "Închis" }),
        status: "activ",
        substituteName: null,
        substitutePhone: null,
        notes: "Programări telefonice sau direct la cabinet. Lista de așteptare mică.",
        imageUrl: null,
      }),
      storage.createDoctorProfile({
        name: "Dr. Mihai Petrescu",
        specialization: "Medic de Familie",
        cabinetName: "Cabinet Medical Petrescu",
        address: "Str. Principală nr. 18, Hălchiu",
        phone: "0266 345 678",
        schedule: JSON.stringify({ lv: "09:00–17:00", s: "Închis", d: "Închis" }),
        status: "concediu",
        substituteName: "Dr. Elena Moldovan",
        substitutePhone: "0266 234 567",
        notes: "Concediu medical 3–17 mai. Pacienții sunt redirecționați către Dr. Moldovan.",
        imageUrl: null,
      }),
      storage.createDoctorProfile({
        name: "Dr. Ioana Nistor",
        specialization: "Pediatru",
        cabinetName: "Dispensarul Pediatric – Hălchiu",
        address: "Str. Școlii nr. 3, Hălchiu (etaj 1)",
        phone: "0266 456 789",
        schedule: JSON.stringify({ lv: "08:00–14:00", s: "09:00–12:00", d: "Închis" }),
        status: "activ",
        substituteName: null,
        substitutePhone: null,
        notes: "Specialistă în copii 0–18 ani. Vaccinări în calendar la cabinet.",
        imageUrl: null,
      }),
    ]);
  }

  // Seed social programs
  const existingSocial = await storage.getSocialPrograms();
  if (existingSocial.length === 0) {
    await Promise.all([
      storage.createSocialProgram({
        type: "incalzire",
        title: "Ajutor pentru încălzire – Sezon 2025/2026",
        description: "Primăria Hălchiu acordă ajutoare financiare pentru încălzire familiilor cu venituri reduse. Ajutorul se acordă lunar pe perioada sezonului rece, conform legislației în vigoare (OUG 70/2011).",
        eligibility: "Familii cu venit net lunar sub 1.386 lei/persoană. Proprietari sau chiriași de locuință în comună.",
        period: "Noiembrie 2025 – Martie 2026",
        documentsNeeded: "CI, adeverință venituri, factură utilitare, certificat căsătorie/naștere copii (dacă e cazul)",
        contactInfo: "Compartiment Asistență Socială, Primăria Hălchiu – Tel: 0266 200 100",
        status: "inactiv",
      }),
      storage.createSocialProgram({
        type: "lemne",
        title: "Cote de lemne pentru foc – 2026",
        description: "Cetățenii comunei Hălchiu beneficiază de lemne de foc la prețuri subvenționate din fondul forestier comunal. Cotele se acordă anual conform Legii 46/2008 și HCL Hălchiu.",
        eligibility: "Gospodării care se înclzesc cu lemne. Prioritate: familii cu membri cu dizabilități, vârstnici singuri, familii monoparentale.",
        period: "Iulie – Septembrie 2026 (comenzi)",
        documentsNeeded: "Cerere tip (disponibilă la primărie), CI, dovada domiciliului în comună",
        contactInfo: "Primăria Hălchiu, cam. 3 – Program: Luni–Vineri 08:00–16:00",
        status: "activ",
      }),
      storage.createSocialProgram({
        type: "vouchere",
        title: "Vouchere sociale pentru alimente",
        description: "Programul național \"Ajutor alimentar\" distribuie lunar vouchere electronice pentru produse alimentare de bază. Voucherele se utilizează la rețeaua de magazine partenere.",
        eligibility: "Persoane cu venituri sub pragul de sărăcie. Beneficiari de VMG, alocații suplimentare, pensii sub 1.000 lei.",
        period: "Program permanent – verificare anuală eligibilitate",
        documentsNeeded: "CI, adeverință de venituri sau decizie beneficiu social",
        contactInfo: "AJPIS Brașov sau direct la Primăria Hălchiu – Asistență Socială",
        status: "activ",
      }),
      storage.createSocialProgram({
        type: "sprijin",
        title: "Sprijin pentru persoane vârstnice singure",
        description: "Servicii de îngrijire la domiciliu pentru persoanele vârstnice singure sau cu mobilitate redusă din comună: asistență igienă personală, preparare masă, însoțire la medic, ajutor la efectuarea actelor.",
        eligibility: "Persoane peste 65 ani fără rude în localitate sau cu mobilitate redusă",
        period: "Program permanent",
        documentsNeeded: "Cerere tip, fișă medicală, anchetă socială efectuată de asistentul social",
        contactInfo: "Asistent social comunitar: 0744 100 200 – Program: Luni–Joi 09:00–15:00",
        status: "activ",
      }),
      storage.createSocialProgram({
        type: "informare",
        title: "Alocație de stat – Actualizare cuantumuri 2026",
        description: "Alocația de stat pentru copii a fost majorată începând cu ianuarie 2026. Cuantumul actual: 700 lei/lună pentru copii 0–2 ani, 243 lei pentru copii 2–18 ani. Plata se face direct în contul bancar al beneficiarului.",
        eligibility: "Toți copiii cu vârsta 0–18 ani cu domiciliu sau reședință în România",
        period: "Permanent",
        documentsNeeded: "Certificat naștere, CI părinți, cont bancar",
        contactInfo: "AJPIS Brașov sau online: www.mmuncii.ro",
        status: "activ",
      }),
    ]);
  }
}
