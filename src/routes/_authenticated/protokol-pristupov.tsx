import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isPrimaryEmail } from "@/lib/accounts";

export const Route = createFileRoute("/_authenticated/protokol-pristupov")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!isPrimaryEmail(data.user?.email)) {
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["login_events"],
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
      <div className="bg-[#196ee6] dark:bg-[#111e33] px-5 pt-4 pb-14 text-white">
        <Link
          to="/nastavenia"
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <h1 className="text-[32px] font-extrabold tracking-tight mt-4 leading-tight">Protokol prístupov</h1>
        <p className="text-[16px] text-white/80 font-medium">Kto a kedy sa prihlásil</p>
      </div>

      <div className="px-4 -mt-8">
        <div className="rounded-3xl bg-white dark:bg-[#161a23] shadow-sm border border-slate-100 dark:border-zinc-800/60 divide-y divide-slate-100 dark:divide-zinc-800/60 overflow-hidden">
          {isLoading && <p className="p-5 text-[15px] text-slate-500">Načítavam…</p>}
          {error && <p className="p-5 text-[15px] text-red-600">Protokol sa nepodarilo načítať.</p>}
          {data && data.length === 0 && (
            <p className="p-5 text-[15px] text-slate-500">Žiadne cudzie prístupy.</p>
          )}
          {data?.map((e) => (
            <div key={e.id} className="flex items-start gap-3.5 p-4">
              <Monitor className="w-5 h-5 mt-0.5 shrink-0 text-[#196ee6] dark:text-[#38bdf8]" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold truncate">{e.email || "Neznámy e-mail"}</p>
                <p className="text-[13px] text-slate-500 truncate">{e.device || "Neznáme zariadenie"}</p>
              </div>
              <span className="text-[12px] text-slate-500 whitespace-nowrap tabular-nums">
                {fmt.format(new Date(e.created_at))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
