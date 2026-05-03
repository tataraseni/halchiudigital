import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export type NotificationCategory =
  | "anunturi_oficiale"
  | "comunitate"
  | "evenimente"
  | "sesizari"
  | "moderare"
  | "sistem";

export type NotificationPrefs = Record<NotificationCategory, boolean>;

export const DEFAULT_PREFS: NotificationPrefs = {
  anunturi_oficiale: true,
  comunitate: true,
  evenimente: true,
  sesizari: true,
  moderare: true,
  sistem: true,
};

export const PREF_LABELS: Record<NotificationCategory, { label: string; desc: string }> = {
  anunturi_oficiale: {
    label: "Anunțuri oficiale",
    desc: "Anunțuri, alerte și comunicări de la primărie",
  },
  comunitate: {
    label: "Postări comunitate",
    desc: "Postări noi aprobate în spațiul comunitar",
  },
  evenimente: {
    label: "Evenimente",
    desc: "Evenimente noi sau modificări de program",
  },
  sesizari: {
    label: "Sesizări",
    desc: "Actualizări de status pentru sesizările trimise",
  },
  moderare: {
    label: "Moderare conținut",
    desc: "Aprobări sau respingeri ale postărilor tale",
  },
  sistem: {
    label: "Sistem",
    desc: "Notificări tehnice și administrative",
  },
};

export function useNotificationPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery<NotificationPrefs>({
    queryKey: ["/api/auth/me/preferences"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/auth/me/preferences");
      if (!res.ok) return DEFAULT_PREFS;
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (newPrefs: NotificationPrefs) =>
      apiRequest("PUT", "/api/auth/me/preferences", newPrefs),
    onMutate: async (newPrefs) => {
      await qc.cancelQueries({ queryKey: ["/api/auth/me/preferences"] });
      const prev = qc.getQueryData<NotificationPrefs>(["/api/auth/me/preferences"]);
      qc.setQueryData(["/api/auth/me/preferences"], newPrefs);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["/api/auth/me/preferences"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["/api/auth/me/preferences"] }),
  });

  const toggle = (category: NotificationCategory) => {
    const current = prefs ?? DEFAULT_PREFS;
    updateMutation.mutate({ ...current, [category]: !current[category] });
  };

  const effectivePrefs: NotificationPrefs = prefs ?? DEFAULT_PREFS;

  return { prefs: effectivePrefs, isLoading, toggle, updateMutation };
}

/** Filter a list of notifications keeping only those whose category is enabled in prefs */
export function filterByPrefs<T extends { category?: string | null }>(
  notifs: T[],
  prefs: NotificationPrefs
): T[] {
  return notifs.filter(n => {
    const cat = (n.category ?? "sistem") as NotificationCategory;
    return prefs[cat] !== false;
  });
}
