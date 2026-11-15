import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { Button } from "@/components/ui/button";
import { formatEur, useBank } from "@/lib/bank-store";
import { supabase } from "@/integrations/supabase/client";
import cardBg from "@/assets/card_pohoda.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/karty")({
  head: () => ({
    meta: [
      { title: "Moje karty | Demo" },
      { name: "description", content: "Simulácia platobných kariet, blokovania a nastavenia limitov." },
      { property: "og:title", content: "Moje karty | Demo" },
      { property: "og:description", content: "Simulácia platobných kariet, blokovania a nastavenia limitov." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardsPage,
});

type CardSettings = { blocked: boolean; payLimit: number; atmLimit: number };
const DEFAULTS: CardSettings = { blocked: false, payLimit: 1500, atmLimit: 500 };

// Výhradne testovacie údaje. Nie sú prepojené so žiadnou platobnou kartou.
const CARDS = [
  {
    id: "demo-4242",
    label: "Virtuálna karta · DEMO",
    last4: "4242",
    number: "4242 4242 4242 4242",
    cvv: "123",
    expiry: "12/30",
  },
  {
    id: "demo-4444",
    label: "Virtuálna karta · DEMO",
    last4: "4444",
    number: "5555 5555 5555 4444",
    cvv: "456",
    expiry: "12/30",
  },
];

function CardsPage() {
  const s = useBank();
  const [userId, setUserId] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [all, setAll] = useState<Record<string, CardSettings>>({});

  const copy = async (v: string, what: string) => {
    try {
      await navigator.clipboard.writeText(v.replace(/ /g, ""));
      toast.success(`${what} skopírované`);
    } catch {
      toast.error("Kopírovanie sa nepodarilo");
    }
  };

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      const raw = id ? localStorage.getItem(`george-cards:${id}`) : null;
      if (raw) {
        try {
          setAll(JSON.parse(raw) as Record<string, CardSettings>);
        } catch {
          localStorage.removeItem(`george-cards:${id}`);
        }
      }
    });
  }, []);

  const save = (cardId: string, next: CardSettings) => {
    const merged = { ...all, [cardId]: next };
    setAll(merged);
    if (userId) localStorage.setItem(`george-cards:${userId}`, JSON.stringify(merged));
  };

  const holder = s.owner || "Demo používateľ";

  return (
    <AppShell>
      <BrandHeader title="Moje karty" subtitle="Testovacie platobné karty" back />
      <div className="mx-4 mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
        <p className="font-bold text-amber-700 dark:text-amber-300">DEMO / SIMULÁCIA</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Zobrazené čísla, CVV a platnosť sú testovacie údaje. Karty nie sú skutočné a nemožno nimi platiť.
        </p>
      </div>
      <div className="space-y-6 px-4">
        {CARDS.map((c) => {
          const st = { ...DEFAULTS, ...all[c.id] };
          const open = !!shown[c.id];
          return (
            <div key={c.id} className="space-y-3">
              <div
                style={{
                  backgroundImage: `url(${cardBg.url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                className={`relative aspect-[909/566] rounded-2xl p-5 text-white shadow-lg transition [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] ${
                  st.blocked ? "opacity-50 grayscale" : ""
                }`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold tracking-wider">DEMO</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1f1f1f]">
                    {st.blocked ? "Blokovaná" : "Virtuálna"}
                  </span>
                </div>
                <p className="text-xs opacity-70">Číslo testovacej karty</p>
                <div className="mb-4 flex items-center gap-3 text-lg tracking-widest font-mono">
                  {open ? c.number : `•••• •••• •••• ${c.last4}`}
                  {open ? (
                    <button
                      type="button"
                      aria-label="Kopírovať testovacie číslo karty"
                      className="grid size-9 place-items-center rounded-full hover:bg-white/15"
                      onClick={() => copy(c.number, "Testovacie číslo karty")}
                    >
                      <Copy className="size-4" />
                    </button>
                  ) : null}
                </div>
                <div className="flex items-end justify-between text-xs">
                  <div>
                    <p className="opacity-70 uppercase text-[9px] tracking-wider">Držiteľ karty</p>
                    <p className="text-sm font-semibold tracking-wide uppercase mt-0.5">{holder}</p>
                  </div>
                  <div>
                    <p className="opacity-70 uppercase text-[9px] tracking-wider">Platnosť</p>
                    <p className="text-sm font-semibold font-mono mt-0.5">{c.expiry}</p>
                  </div>
                  <div>
                    <p className="opacity-70 uppercase text-[9px] tracking-wider">CVV</p>
                    <p className="flex items-center gap-2 text-sm font-semibold font-mono mt-0.5">
                      {open ? c.cvv : "•••"}
                      {open ? (
                        <button
                          type="button"
                          aria-label="Kopírovať testovacie CVV"
                          className="grid size-7 place-items-center rounded-full hover:bg-white/15"
                          onClick={() => copy(c.cvv, "Testovacie CVV")}
                        >
                          <Copy className="size-3.5" />
                        </button>
                      ) : null}
                    </p>
                  </div>
                  <span className="w-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  className="h-12 rounded-2xl"
                  onClick={() => setShown({ ...shown, [c.id]: !open })}
                >
                  {open ? <EyeOff /> : <Eye />} {open ? "Skryť údaje" : "Zobraziť údaje"}
                </Button>
                <Button
                  variant={st.blocked ? "default" : "secondary"}
                  className="h-12 rounded-2xl"
                  onClick={() => {
                    save(c.id, { ...st, blocked: !st.blocked });
                    toast.success(st.blocked ? "Demo karta odblokovaná" : "Demo karta dočasne zablokovaná");
                  }}
                >
                  {st.blocked ? <Unlock /> : <Lock />} {st.blocked ? "Odblokovať" : "Zablokovať"}
                </Button>
              </div>
              <section className="space-y-6 rounded-3xl bg-surface p-5" data-no-swipe>
                <LimitRow
                  label="Denný limit platieb (simulácia)"
                  value={st.payLimit}
                  max={5000}
                  onChange={(v) => save(c.id, { ...st, payLimit: v })}
                />
                <LimitRow
                  label="Denný limit výberov z bankomatu (simulácia)"
                  value={st.atmLimit}
                  max={2000}
                  onChange={(v) => save(c.id, { ...st, atmLimit: v })}
                />
              </section>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function LimitRow({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex justify-between text-[14px]">
        <span>{label}</span>
        <span className="font-bold">{formatEur(value)}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        className="h-11 w-full cursor-pointer accent-primary"
        value={value}
        min={0}
        max={max}
        step={50}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
