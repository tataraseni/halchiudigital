import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@shared/schema";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: Role;
  points: number;
}

async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return res.json();
}

export function useAuth() {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Eroare la autentificare");
      }
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: (data) => {
      qc.setQueryData(["/api/auth/me"], data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; username: string; phone?: string; password: string }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Eroare la înregistrare");
      }
      return res.json();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      qc.setQueryData(["/api/auth/me"], null);
      qc.invalidateQueries();
    },
  });

  return {
    user: user ?? null,
    isLoading,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}

// ─── PERMISSION HELPERS (mirrors server/auth.ts) ─────────────────────────────
// Administrator always has full access — check happens first.

export function isAdmin(role: Role)           { return role === "administrator"; }

export function canViewAdmin(role: Role)        { return isAdmin(role) || ["primar","viceprimar","functionar_public"].includes(role); }
export function canManagePosts(role: Role)      { return isAdmin(role) || ["primar","viceprimar"].includes(role); }
export function canDeleteAnyPost(role: Role)    { return isAdmin(role) || ["primar","viceprimar","moderator"].includes(role); }
export function canManageEvents(role: Role)     { return isAdmin(role) || ["primar","viceprimar"].includes(role); }
export function canDeleteEvents(role: Role)     { return isAdmin(role) || ["primar"].includes(role); }
export function canManageReports(role: Role)    { return isAdmin(role) || ["primar","viceprimar","functionar_public"].includes(role); }
export function canDeleteReports(role: Role)    { return isAdmin(role) || ["primar","viceprimar"].includes(role); }
export function canApproveReports(role: Role)   { return isAdmin(role) || role === "moderator"; }
export function canManageBusinesses(role: Role) { return isAdmin(role) || ["primar","viceprimar"].includes(role); }
export function canManageSettings(role: Role)   { return isAdmin(role); }
export function canManageUsers(role: Role)      { return isAdmin(role); }

// ─── ROLE MATRIX (for UI display) ─────────────────────────────────────────────
export const ROLE_LABELS: Record<Role, string> = {
  administrator:    "Administrator",
  primar:           "Primar",
  viceprimar:       "Viceprimar",
  functionar_public:"Funcționar Public",
  moderator:        "Moderator",
  specialist:       "Specialist",
  cetatean:         "Cetățean",
};

export const ROLE_COLORS: Record<Role, string> = {
  administrator:    "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  primar:           "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  viceprimar:       "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
  functionar_public:"bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  moderator:        "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  specialist:       "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  cetatean:         "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
};

export const ROLE_PERMISSIONS: Record<Role, { label: string; allowed: boolean }[]> = {
  administrator: [
    { label: "Acces deplin la toate funcțiile", allowed: true },
    { label: "Gestionare utilizatori și roluri", allowed: true },
    { label: "Editare setări aplicație (CMS)", allowed: true },
    { label: "Creare/editare/ștergere postări", allowed: true },
    { label: "Creare/editare/ștergere evenimente", allowed: true },
    { label: "Gestionare completă sesizări", allowed: true },
    { label: "Gestionare afaceri locale", allowed: true },
    { label: "Dashboard și rapoarte", allowed: true },
  ],
  primar: [
    { label: "Acces deplin la toate funcțiile", allowed: false },
    { label: "Gestionare utilizatori și roluri", allowed: false },
    { label: "Editare setări aplicație (CMS)", allowed: false },
    { label: "Creare/editare/ștergere postări", allowed: true },
    { label: "Creare/editare/ștergere evenimente", allowed: true },
    { label: "Gestionare completă sesizări", allowed: true },
    { label: "Gestionare afaceri locale", allowed: true },
    { label: "Dashboard și rapoarte", allowed: true },
  ],
  viceprimar: [
    { label: "Acces deplin la toate funcțiile", allowed: false },
    { label: "Gestionare utilizatori și roluri", allowed: false },
    { label: "Editare setări aplicație (CMS)", allowed: false },
    { label: "Creare/editare postări (fără ștergere)", allowed: true },
    { label: "Creare/editare evenimente (fără ștergere)", allowed: true },
    { label: "Actualizare status sesizări", allowed: true },
    { label: "Gestionare afaceri locale", allowed: true },
    { label: "Dashboard și rapoarte", allowed: true },
  ],
  functionar_public: [
    { label: "Acces deplin la toate funcțiile", allowed: false },
    { label: "Gestionare utilizatori și roluri", allowed: false },
    { label: "Editare setări aplicație (CMS)", allowed: false },
    { label: "Creare/editare/ștergere postări", allowed: false },
    { label: "Creare/editare/ștergere evenimente", allowed: false },
    { label: "Actualizare status sesizări", allowed: true },
    { label: "Gestionare afaceri locale", allowed: false },
    { label: "Dashboard și rapoarte", allowed: true },
  ],
  moderator: [
    { label: "Acces deplin la toate funcțiile", allowed: false },
    { label: "Gestionare utilizatori și roluri", allowed: false },
    { label: "Editare setări aplicație (CMS)", allowed: false },
    { label: "Creare/editare/ștergere postări", allowed: false },
    { label: "Ștergere postări inadecvate", allowed: true },
    { label: "Actualizare status sesizări", allowed: false },
    { label: "Gestionare afaceri locale", allowed: false },
    { label: "Dashboard și rapoarte", allowed: false },
  ],
  specialist: [
    { label: "Acces deplin la toate funcțiile", allowed: false },
    { label: "Gestionare utilizatori și roluri", allowed: false },
    { label: "Editare setări aplicație (CMS)", allowed: false },
    { label: "Permisiuni granulare configurate de administrator", allowed: true },
    { label: "Acces la secțiunile alocate (citire/scriere/aprobare/ștergere)", allowed: true },
    { label: "Exemplu: medic gestionează campanii și programări", allowed: true },
    { label: "Dashboard și rapoarte", allowed: false },
  ],
  cetatean: [
    { label: "Acces deplin la toate funcțiile", allowed: false },
    { label: "Gestionare utilizatori și roluri", allowed: false },
    { label: "Editare setări aplicație (CMS)", allowed: false },
    { label: "Postare mesaje în comunitate", allowed: true },
    { label: "Trimitere sesizări", allowed: true },
    { label: "Participare la evenimente (RSVP)", allowed: true },
    { label: "Vizualizare feed, evenimente, afaceri", allowed: true },
    { label: "Dashboard și rapoarte", allowed: false },
  ],
};
