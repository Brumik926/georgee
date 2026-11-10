import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, CreditCard, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { Button } from "@/components/ui/button";
import { formatEur, useBank } from "@/lib/bank-store";
import { supabase } from "@/integrations/supabase/client";
import cardBg from "@/assets/card_pohoda.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/karty")({
  head: () => ({
    meta: [
      { title: "Moje karty | George" },
      { name: "description", content: "Prehľad platobných kariet, blokovanie karty a nastavenie limitov v George." },
      { property: "og:title", content: "Moje karty | George" },
      { property: "og:description", content: "Prehľad platobných kariet, blokovanie karty a nastavenie limitov v George." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardsPage,
});

type CardSettings = { blocked: boolean; payLimit: number; atmLimit: number };
const DEFAULTS: CardSettings = { blocked: false, payLimit: 1500, atmLimit: 500 };

const CARDS = [
  {
    id: "mc-3302",
    label: "Virtuálna karta Visa",
    last4: "3302",                        // sem zadajte posledné 4 číslice
    number: "4123 4567 8901 3302",        // sem zadajte celé 16-miestne číslo
    cvv: "945",                           // sem zadajte CVV kód
    expiry: "10/31",                      // sem zadajte platnosť (napr. 08/28)
  },
  {
    id: "mc-5739",
    label: "Virtuálna karta Visa",
    last4: "5739",
    number: "4123 4567 2050 5739",
    cvv: "081",
    expiry: "10/31",
  },
];

function CardsPage() {
  const s = useBank();
  const [userId, setUserId] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const copy = async (v: string, what: string) => {
    try {
      await navigator.clipboard.writeText(v.replace(/ /g, ""));
      toast.success(`${what} skopírované`);
    } catch {
      toast.error("Kopírovanie sa nepodarilo");
    }
  };
  const [all, setAll] = useState<Record<string, CardSettings>>({});

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      const raw = id ? localStorage.getItem(`george-cards:${id}`) : null;
      if (raw) setAll(JSON.parse(raw));
    });
  }, []);

  const save = (cardId: string, next: CardSettings) => {
    const merged = { ...all, [cardId]: next };
    setAll(merged);
    if (userId) localStorage.setItem(`george-cards:${userId}`, JSON.stringify(merged));
  };

  const holder = s.owner || "Majiteľ účtu";

  return (
    <AppShell>
      <BrandHeader title="Moje karty" subtitle="Platobné karty k vášmu účtu" back />
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
                <div className="mb-8 flex items-center justify-end">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1f1f1f]">
                    {st.blocked ? "Blokovaná" : "Virtuálna"}
                  </span>
                </div>
                <p className="text-xs opacity-70">Číslo karty</p>
                <div className="mb-4 flex items-center gap-3 text-lg tracking-widest font-mono">
                  {open ? c.number : `•••• •••• •••• ${c.last4}`}
                  {open ? (
                    <button
                      type="button"
                      aria-label="Kopírovať číslo karty"
                      className="grid size-9 place-items-center rounded-full hover:bg-white/15"
                      onClick={() => copy(c.number, "Číslo karty")}
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
                    <p className="opacity-70 uppercase text-[9px] tracking-wider">Dátum platnosti</p>
                    <p className="text-sm font-semibold font-mono mt-0.5">{c.expiry}</p>
                  </div>
                  <div>
                    <p className="opacity-70 uppercase text-[9px] tracking-wider">CVV</p>
                    <p className="flex items-center gap-2 text-sm font-semibold font-mono mt-0.5">
                      {open ? c.cvv : "•••"}
                      {open ? (
                        <button
                          type="button"
                          aria-label="Kopírovať CVV"
                          className="grid size-7 place-items-center rounded-full hover:bg-white/15"
                          onClick={() => copy(c.cvv, "CVV")}
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
                    toast.success(st.blocked ? "Karta odblokovaná" : "Karta dočasne zablokovaná");
                  }}
                >
                  {st.blocked ? <Unlock /> : <Lock />} {st.blocked ? "Odblokovať" : "Zablokovať"}
                </Button>
              </div>
              <section className="space-y-6 rounded-3xl bg-surface p-5" data-no-swipe>
                <LimitRow
                  label="Denný limit platieb"
                  value={st.payLimit}
                  max={5000}
                  onChange={(v) => save(c.id, { ...st, payLimit: v })}
                />
                <LimitRow
                  label="Denný limit výberov z bankomatu"
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
