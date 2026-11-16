import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import soundAsset from "@/assets/notification.mp3.asset.json";

export type NotifKind = "in" | "out" | "budget" | "access";

export type NotifSettings = {
  onIncoming: boolean;
  onOutgoing: boolean;
  onBudget: boolean;
  soundEnabled: boolean;
};

export type NotifItem = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type NotifState = {
  settings: NotifSettings;
  items: NotifItem[];
  loading: boolean;
  error: string | null;
};

const defaultSettings: NotifSettings = {
  onIncoming: true,
  onOutgoing: true,
  onBudget: true,
  soundEnabled: true,
};

const empty: NotifState = { settings: defaultSettings, items: [], loading: true, error: null };

let state: NotifState = empty;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useNotifications(): NotifState {
  const [snap, setSnap] = useState<NotifState>(state);
  useEffect(() => {
    const l = () => setSnap({ ...state });
    listeners.add(l);
    if (state.loading) void hydrateNotifications();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return snap;
}

export async function hydrateNotifications() {
  try {
    const userId = await currentUserId();
    if (!userId) {
      state = { ...empty, loading: false };
      emit();
      return;
    }

    const [settingsRes, itemsRes] = await Promise.all([
      supabase.from("notification_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (settingsRes.error) throw settingsRes.error;
    if (itemsRes.error) throw itemsRes.error;

    let settings = defaultSettings;
    if (settingsRes.data) {
      settings = {
        onIncoming: settingsRes.data.on_incoming,
        onOutgoing: settingsRes.data.on_outgoing,
        onBudget: settingsRes.data.on_budget,
        soundEnabled: settingsRes.data.sound_enabled,
      };
    } else {
      const { error } = await supabase.from("notification_settings").insert({ user_id: userId });
      if (error) throw error;
    }

    const items: NotifItem[] = (itemsRes.data ?? []).map((n) => ({
      id: n.id,
      kind: (n.kind as NotifKind) ?? "in",
      title: n.title,
      body: n.body,
      read: n.read,
      createdAt: n.created_at,
    }));

    state = { settings, items, loading: false, error: null };
    emit();
  } catch (e) {
    console.error("hydrateNotifications failed", e);
    state = { ...state, loading: false, error: "Upozornenia sa nepodarilo načítať. Skúste to znova." };
    emit();
  }
}

export function resetNotifications() {
  state = empty;
  emit();
}

export async function updateNotifSettings(patch: Partial<NotifSettings>) {
  const previous = state.settings;
  const next = { ...previous, ...patch };
  state = { ...state, settings: next };
  emit();

  try {
    const userId = await currentUserId();
    if (!userId) throw new Error("Používateľ nie je prihlásený.");
    const { error } = await supabase.from("notification_settings").upsert({
      user_id: userId,
      on_incoming: next.onIncoming,
      on_outgoing: next.onOutgoing,
      on_budget: next.onBudget,
      sound_enabled: next.soundEnabled,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Uloženie nastavení upozornení zlyhalo:", error);
    if (state.settings === next) {
      state = { ...state, settings: previous };
      emit();
    }
    toast.error("Nastavenie upozornení sa nepodarilo uložiť.");
  }
}

export function playNotificationSound() {
  try {
    const audio = new Audio(soundAsset.url);
    void audio.play().catch(() => undefined);
  } catch {
    // prehratie zlyhalo — ignorujeme
  }
}

export async function notify(kind: NotifKind, title: string, body: string) {
  const enabled =
    kind === "in"
      ? state.settings.onIncoming
      : kind === "out"
      ? state.settings.onOutgoing
      : kind === "access"
      ? true
      : state.settings.onBudget;
  if (!enabled) return;

  if (state.settings.soundEnabled) playNotificationSound();
  toast(title, { description: body });

  const userId = await currentUserId();
  if (!userId) return;
  const { data, error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, kind, title, body })
    .select("id, created_at")
    .maybeSingle();

  if (error) {
    console.error("Uloženie upozornenia zlyhalo:", error);
    toast.error("Upozornenie sa nepodarilo uložiť do histórie.");
    return;
  }

  state = {
    ...state,
    items: [
      {
        id: data?.id ?? crypto.randomUUID(),
        kind,
        title,
        body,
        read: false,
        createdAt: data?.created_at ?? new Date().toISOString(),
      },
      ...state.items,
    ].slice(0, 50),
  };
  emit();
}

export async function markAllRead() {
  const previous = state.items;
  state = { ...state, items: previous.map((n) => ({ ...n, read: true })) };
  emit();
  try {
    const userId = await currentUserId();
    if (!userId) throw new Error("Používateľ nie je prihlásený.");
    const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    if (error) throw error;
  } catch (error) {
    console.error("Označenie upozornení ako prečítaných zlyhalo:", error);
    state = { ...state, items: previous };
    emit();
    toast.error("Upozornenia sa nepodarilo označiť ako prečítané.");
  }
}

export async function clearNotifications() {
  const previous = state.items;
  state = { ...state, items: [] };
  emit();
  try {
    const userId = await currentUserId();
    if (!userId) throw new Error("Používateľ nie je prihlásený.");
    const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
    if (error) throw error;
  } catch (error) {
    console.error("Vymazanie upozornení zlyhalo:", error);
    state = { ...state, items: previous };
    emit();
    toast.error("Upozornenia sa nepodarilo vymazať.");
  }
}

export function unreadCount(s: NotifState): number {
  return s.items.filter((n) => !n.read).length;
}
