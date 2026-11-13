import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Monitor, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isPrimaryEmail } from "@/lib/accounts";

export const Route = createFileRoute("/_authenticated/protokol-pristupov")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    const role = await supabase.rpc("has_role", { _user_id: data.user?.id ?? "00000000-0000-0000-0000-000000000000", _role: "admin" });
    if (!data.user || role.error || !role.data) {
      throw redirect({ to: "/nastavenia", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Protokol prístupov · George" },
      { name: "description", content: "Súkromný prehľad všetkých prihlásení do internetbankingu George." },
      { property: "og:title", content: "Protokol prístupov · George" },
      { property: "og:description", content: "Súkromný prehľad všetkých prihlásení do internetbankingu George." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProtokolPristupov,
});

type LoginEvent = { id: string; email: string; device: string; created_at: string };

const fmt = new Intl.DateTimeFormat("sk-SK", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function ProtokolPristupov() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const blocks = useQuery({
    queryKey: ["user-access-blocks"],
    queryFn: async () => {
      const result = await supabase.from("user_access_blocks").select("email,is_blocked");
      if (result.error) throw result.error;
      return result.data;
    },
    refetchInterval: 5000,
  });
  async function toggleBlock(event: LoginEvent) {
    const email = event.email.trim().toLowerCase();
    const blocked = blocks.data?.some(b => b.email === email && b.is_blocked) ?? false;
    if (!blocked && !window.confirm(`Zablokovať prístup používateľovi ${event.email}?`)) return;
    setPending(email);
    try {
      const result = await supabase.rpc("set_login_user_block", { _event_id: event.id, _blocked: !blocked });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["user-access-blocks"] });
      toast.success(blocked ? "Používateľ bol odblokovaný." : "Používateľ bol zablokovaný.");
    } catch { toast.error("Prístup sa nepodarilo zmeniť."); }
    finally { setPending(null); }
  }
  useEffect(() => {
    const ch = supabase
      .channel(`login-events-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "login_events" }, () => {
        void qc.invalidateQueries({ queryKey: ["login_events"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_access_blocks" }, () => {
        void qc.invalidateQueries({ queryKey: ["user-access-blocks"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["login_events"],
    refetchInterval: 5000,
    queryFn: async (): Promise<LoginEvent[]> => {
      const { data, error } = await supabase
        .from("login_events")
        .select("id,email,device,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      // Zabezpečí, že vaše 2 e-maily neuvidíte v zozname ani zo starších záznamov
      return (data ?? []).filter((e) => !isPrimaryEmail(e.email));
    },
  });

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-primary px-5 pt-4 pb-14 text-primary-foreground">
        <Link
          to="/nastavenia"
          className="w-10 h-10 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 flex items-center justify-center transition active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <h1 className="text-[32px] font-extrabold tracking-tight mt-4 leading-tight">Protokol prístupov</h1>
        <p className="text-[16px] text-primary-foreground/80 font-medium">Kto a kedy sa prihlásil</p>
      </div>

      <div className="px-4 -mt-8">
        <div className="rounded-3xl bg-card shadow-sm border border-border divide-y divide-border overflow-hidden">
          {isLoading && <p className="p-5 text-[15px] text-muted-foreground">Načítavam…</p>}
          {error && <p className="p-5 text-[15px] text-destructive">Protokol sa nepodarilo načítať.</p>}
          {blocks.isError && <p className="p-5 text-destructive">Stav blokovania sa nepodarilo načítať.</p>}
          {data && data.length === 0 && (
            <p className="p-5 text-[15px] text-muted-foreground">Žiadne cudzie prístupy.</p>
          )}
          {data?.map((e) => (
            <div key={e.id} className="flex flex-wrap items-start gap-3.5 p-4">
              <Monitor className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold break-all">{e.email || "Neznámy e-mail"}</p>
                <p className="text-[13px] text-muted-foreground">{e.device || "Neznáme zariadenie"}</p>
                <p className="text-[12px] text-muted-foreground tabular-nums">{fmt.format(new Date(e.created_at))}</p>
              </div>
              <Button size="sm" variant={blocks.data?.some(b => b.email === e.email.trim().toLowerCase() && b.is_blocked) ? "outline" : "destructive"}
                disabled={pending !== null || !blocks.data || blocks.isError || !e.email}
                onClick={() => void toggleBlock(e)} aria-label={`${blocks.data?.some(b => b.email === e.email.trim().toLowerCase() && b.is_blocked) ? "Odblokovať" : "Zablokovať"} ${e.email}`}>
                {blocks.data?.some(b => b.email === e.email.trim().toLowerCase() && b.is_blocked) ? <><UserCheck />Odblokovať</> : <><UserX />Zablokovať</>}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
