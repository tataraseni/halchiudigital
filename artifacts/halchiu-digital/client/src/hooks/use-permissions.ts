import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserPermission } from "@shared/schema";

export function useMyPermissions() {
  return useQuery<UserPermission[]>({
    queryKey: ["/api/users/me/permissions"],
    queryFn: async () => {
      const res = await fetch("/api/users/me/permissions");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });
}

export function useUserPermissions(userId: number) {
  return useQuery<UserPermission[]>({
    queryKey: ["/api/admin/users", userId, "permissions"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/permissions`);
      if (!res.ok) throw new Error("Eroare la încărcarea permisiunilor");
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useSetPermission(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { section: string; canRead: boolean; canWrite: boolean; canApprove: boolean; canDelete: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "permissions"] });
      qc.invalidateQueries({ queryKey: ["/api/users/me/permissions"] });
    },
  });
}

/** Check if current user has a specific permission */
export function useHasPermission(section: string, action: "canRead" | "canWrite" | "canApprove" | "canDelete"): boolean {
  const { data: perms = [] } = useMyPermissions();
  const perm = perms.find(p => p.section === section);
  if (!perm) return false;
  return perm[action] === true;
}
