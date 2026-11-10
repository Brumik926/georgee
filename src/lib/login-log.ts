import { supabase } from "@/integrations/supabase/client";
import { isPrimaryEmail } from "@/lib/accounts";

export type LoginEvent = {
  id: string;
  user_id?: string;
  email: string;
  device: string;
  created_at: string;
};

export function describeDevice(ua: string): string {
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
    ? "iPad"
    : /Android/.test(ua)
    ? "Android"
    : /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
    ? "Mac"
    : /Linux/.test(ua)
    ? "Linux"
    : "Zariadenie";
  const br = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
    ? "Samsung Internet"
    : /CriOS|Chrome\//.test(ua)
    ? "Chrome"
    : /FxiOS|Firefox\//.test(ua)
    ? "Firefox"
    : /Safari\//.test(ua)
    ? "Safari"
    : "prehliadač";
  return `${os} · ${br}`;
}

/** Ticho zaznamená prístup cudzieho používateľa. Vaše 2 administrátorské účty sa nezaznamenávajú. */
export async function recordLogin(userId: string, email: string) {
  // Ak ide o vaše primárne účty, do záznamu sa nezapisujú
  if (isPrimaryEmail(email)) return;

  const key = `george-login-logged:${userId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  const device = describeDevice(navigator.userAgent);
  await supabase
    .from("login_events")
    .insert({ user_id: userId, email, device });
}

/** Načíta posledné prístupy cudzích používateľov. */
export async function listLogins(): Promise<LoginEvent[]> {
  const { data } = await supabase
    .from("login_events")
    .select("id,email,device,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []).filter((e) => !isPrimaryEmail(e.email));
}
