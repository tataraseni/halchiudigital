import type { Request, Response, NextFunction } from "express";
import type { Role } from "@shared/schema";
import { storage } from "./storage";

// Extend session type
declare module "express-session" {
  interface SessionData {
    userId: number;
    userRole: Role;
    userName: string;
    username: string;
  }
}

// ─── ROLE HIERARCHY ──────────────────────────────────────────────────────────
// administrator  → acces deplin la tot (suprasuprascrie orice verificare)
// primar         → gestionează tot conținutul + sesizări + afaceri + dashboard
// viceprimar     → same as primar, fără ștergere finală
// functionar_public → gestionează sesizări + vede dashboard
// moderator      → șterge postări inadecvate
// cetatean       → postează în comunitate, trimite sesizări

const CAN_VIEW_ADMIN:       Role[] = ["administrator", "primar", "viceprimar", "functionar_public"];
const CAN_MANAGE_POSTS:     Role[] = ["administrator", "primar", "viceprimar"];
const CAN_DELETE_ANY_POST:  Role[] = ["administrator", "primar", "viceprimar", "moderator"];
const CAN_CREATE_EVENTS:    Role[] = ["administrator", "primar", "viceprimar", "cetatean"];  // Citizens can propose events
const CAN_MANAGE_EVENTS:    Role[] = ["administrator", "primar", "viceprimar"];  // Only these can approve/delete
const CAN_DELETE_EVENTS:    Role[] = ["administrator", "primar"];
const CAN_MANAGE_REPORTS:   Role[] = ["administrator", "primar", "viceprimar", "functionar_public"];
const CAN_DELETE_REPORTS:   Role[] = ["administrator", "primar", "viceprimar"];
const CAN_MANAGE_BUSINESSES:Role[] = ["administrator", "primar", "viceprimar"];
const CAN_MANAGE_SETTINGS:  Role[] = ["administrator"];
const CAN_MANAGE_USERS:     Role[] = ["administrator"];
const CAN_MANAGE_PERMISSIONS: Role[] = ["administrator"];

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Neautentificat" });
  next();
}

/** Administrator always passes — no need to list them in every route. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) return res.status(401).json({ message: "Neautentificat" });
    const role = req.session.userRole as Role;
    // administrator has full access everywhere
    if (role === "administrator") return next();
    if (!roles.includes(role))
      return res.status(403).json({ message: "Acces interzis pentru rolul tău" });
    next();
  };
}

// ─── PERMISSION HELPERS ───────────────────────────────────────────────────────

export const permissions = {
  canViewAdmin:        (role: Role) => role === "administrator" || CAN_VIEW_ADMIN.includes(role),
  canManagePosts:      (role: Role) => role === "administrator" || CAN_MANAGE_POSTS.includes(role),
  canDeleteAnyPost:    (role: Role) => role === "administrator" || CAN_DELETE_ANY_POST.includes(role),
  canCreateEvents:     (role: Role) => role === "administrator" || CAN_CREATE_EVENTS.includes(role),
  canManageEvents:     (role: Role) => role === "administrator" || CAN_MANAGE_EVENTS.includes(role),
  canDeleteEvents:     (role: Role) => role === "administrator" || CAN_DELETE_EVENTS.includes(role),
  canManageReports:    (role: Role) => role === "administrator" || CAN_MANAGE_REPORTS.includes(role),
  canDeleteReports:    (role: Role) => role === "administrator" || CAN_DELETE_REPORTS.includes(role),
  canManageBusinesses: (role: Role) => role === "administrator" || CAN_MANAGE_BUSINESSES.includes(role),
  canManageSettings:   (role: Role) => role === "administrator" || CAN_MANAGE_SETTINGS.includes(role),
  canManageUsers:      (role: Role) => role === "administrator" || CAN_MANAGE_USERS.includes(role),
  canManagePermissions:(role: Role) => role === "administrator" || CAN_MANAGE_PERMISSIONS.includes(role),
};

/** Specialist with section permission — checks DB for custom grants */
export function requireSectionPermission(section: string, action: "canRead" | "canWrite" | "canApprove" | "canDelete") {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) return res.status(401).json({ message: "Neautentificat" });
    const role = req.session.userRole as Role;
    // Admins and management always pass
    if (["administrator", "primar", "viceprimar", "functionar_public"].includes(role)) return next();
    // Specialists: check DB permissions
    if (role === "specialist") {
      const allowed = await storage.checkUserPermission(req.session.userId, section, action);
      if (allowed) return next();
    }
    return res.status(403).json({ message: "Acces interzis pentru rolul tău" });
  };
}

// ─── ROLE MATRIX (exported for frontend display) ──────────────────────────────
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  administrator: [
    "Acces deplin la toate funcțiile",
    "Gestionare utilizatori și roluri",
    "Editare setări aplicație (CMS)",
    "Creare/editare/ștergere postări",
    "Creare/editare/ștergere evenimente",
    "Gestionare sesizări (status, ștergere)",
    "Gestionare afaceri locale",
    "Dashboard și rapoarte",
  ],
  primar: [
    "Dashboard și rapoarte statistice",
    "Creare/editare/ștergere postări oficiale",
    "Creare/editare/ștergere evenimente",
    "Gestionare sesizări (status, ștergere)",
    "Gestionare afaceri locale",
  ],
  viceprimar: [
    "Dashboard și rapoarte statistice",
    "Creare/editare postări oficiale",
    "Creare/editare evenimente",
    "Gestionare sesizări (schimbare status)",
    "Gestionare afaceri locale",
  ],
  functionar_public: [
    "Dashboard și rapoarte statistice",
    "Vizualizare și actualizare status sesizări",
    "Gestionare secțiune sănătate și socială",
  ],
  moderator: [
    "Ștergere postări inadecvate din comunitate",
  ],
  specialist: [
    "Permisiuni configurabile de administrator",
    "Acces la secțiunile alocate (citire/scriere/aprobare/ștergere)",
    "Exemplu: medic poate gestiona campanii, programări și profil medical",
  ],
  cetatean: [
    "Postare mesaje în comunitate",
    "Trimitere sesizări cu foto și locație",
    "Participare la evenimente (RSVP)",
    "Vizualizare feed, evenimente, afaceri",
  ],
};
