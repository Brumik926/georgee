import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { Button } from "@/components/ui/button";
import { formatEur, useBank } from "@/lib/bank-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/karty")({
  head: () => ({
    meta: [
      { title: "Moje karty | Aplikácia" },
      { name: "description", content: "Prehľad kariet, blokovanie a nastavenie limitov." },
      { property: "og:title", content: "Moje karty | Aplikácia" },
      { property: "og:description", content: "Prehľad kariet, blokovanie a nastavenie limitov." },
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
    id: "demo-card-01",
    label: "Demo virtuálna karta",
    last4: "0001",
    number: "0000 0000 0000 0001",
    cvv: "000",
    expiry: "12/30",
  },
  {
    id: "demo-card-02",
    label: "Demo virtuálna karta",
    last4: "0002",
    number: "0000 0000 0000 0002",
    cvv: "000",
    expiry: "12/30",
  },
];

function normalizeLimit(value: unknown, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(0, Math.round(value / 50) * 50));
}

function CardsPage() {
  const s = useBank();
  const [userId, setUserId] = useState<string | null>(null);
  const [settingsReady, setSettingsReady] = useState(false);
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
    let active = true;
    void supabase.auth.getUser()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        const id = data.user?.id ?? null;
        setUserId(id);
        if (!id) return;
        try {
          const raw = localStorage.getItem(`george-cards:${id}`);
          if (!raw) return;
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
          const stored = parsed as Record<string, unknown>;
          const valid: Record<string, CardSettings> = {};
          for (const card of CARDS) {
            const value = stored[card.id];
            if (!value || typeof value !== "object" || Array.isArray(value)) continue;
            const settings = value as Record<string, unknown>;
            valid[card.id] = {
              blocked: typeof settings.blocked === "boolean" ? settings.blocked : DEFAULTS.blocked,
              payLimit: normalizeLimit(settings.payLimit, 5000, DEFAULTS.payLimit),
              atmLimit: normalizeLimit(settings.atmLimit, 2000, DEFAULTS.atmLimit),
            };
          }
          setAll(valid);
        } catch {
          // Poškodené alebo nedostupné lokálne nastavenia nesmú zablokovať obrazovku kariet.
          setAll({});
        }
      })
      .catch(() => {
        if (active) toast.error("Nastavenia kariet sa nepodarilo načítať.");
      })
      .finally(() => {
        if (active) setSettingsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = (cardId: string, next: CardSettings) => {
    if (!userId || !settingsReady) {
      toast.error("Nastavenia karty ešte nie sú pripravené.");
      return false;
    }
    const merged = { ...all, [cardId]: next };
    try {
      localStorage.setItem(`george-cards:${userId}`, JSON.stringify(merged));
      setAll(merged);
      return true;
    } catch {
      toast.error("Nastavenia sa nepodarilo uložiť do tohto zariadenia.");
      return false;
    }
  };

  const holder = s.owner || "Majiteľ účtu";

  return (
    <AppShell>
      <BrandHeader title="Moje karty" subtitle="Prehľad kariet" back />
      <div className="space-y-6 px-4">
        {CARDS.map((c) => {
          const st = { ...DEFAULTS, ...all[c.id] };
          const open = !!shown[c.id];
          return (
            <div key={c.id} className="space-y-3">
              <div
                className={`relative aspect-[909/566] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 p-5 text-white shadow-lg transition [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] ${
                  st.blocked ? "opacity-50 grayscale" : ""
                }`}
              >
                <div className="pointer-events-none absolute -right-8 -top-10 size-48 rounded-full border border-white/10 bg-white/5" />
                <div className="pointer-events-none absolute -bottom-16 left-1/3 size-56 rounded-full border border-white/10" />
                <div className="relative mb-8 flex items-center justify-end">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1f1f1f]">
                    {st.blocked ? "Blokovaná" : "DEMO"}
                  </span>
                </div>
                <p className="relative text-xs opacity-70">Číslo demo karty</p>
                <div className="relative mb-4 flex items-center gap-3 text-lg tracking-widest font-mono">
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
                <div className="relative flex items-end justify-between text-xs">
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
                  disabled={!settingsReady || !userId}
                  onClick={() => {
                    if (save(c.id, { ...st, blocked: !st.blocked })) {
                      toast.success(st.blocked ? "Karta odblokovaná" : "Karta dočasne zablokovaná");
                    }
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
                  disabled={!settingsReady || !userId}
                  onChange={(v) => save(c.id, { ...st, payLimit: v })}
                />
                <LimitRow
                  label="Denný limit výberov z bankomatu"
                  value={st.atmLimit}
                  max={2000}
                  disabled={!settingsReady || !userId}
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
  disabled = false,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
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
        disabled={disabled}
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
