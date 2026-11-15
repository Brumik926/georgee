import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Gift, BadgePercent, Coffee, ShoppingBasket, Dumbbell, CheckCircle2, CirclePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/odmeny")({
  component: OdmenyPage,
});

const initialOffers = [
  { id: "coffee", title: "Káva a občerstvenie", category: "Gastro", discount: "5 % späť", description: "Ukážková odmena pri nákupe v partnerskej prevádzke.", icon: Coffee },
  { id: "groceries", title: "Každodenný nákup", category: "Potraviny", discount: "3 % späť", description: "Modelová ponuka na bežné nákupy.", icon: ShoppingBasket },
  { id: "sport", title: "Šport a voľný čas", category: "Voľný čas", discount: "10 % späť", description: "Ukážková odmena na športové aktivity.", icon: Dumbbell },
];

function OdmenyPage() {
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const offers = useMemo(
    () => initialOffers.filter((offer) => !showActiveOnly || activeIds.includes(offer.id)),
    [activeIds, showActiveOnly],
  );

  function toggleOffer(id: string) {
    setActiveIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 pb-28 text-foreground">
      <header className="pt-6 pb-5">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" />
          Späť na prehľad
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Gift className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ponuky a odmeny</h1>
            <p className="mt-1 text-sm text-muted-foreground">Prehľad ukážkových benefitov</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Aktivované demo ponuky</span>
          <BadgePercent className="size-5 text-primary" />
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums">{activeIds.length}</div>
        <p className="mt-1 text-xs text-muted-foreground">Aktivácia sa ukladá iba počas tejto relácie.</p>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-bold">Dostupné ponuky</h2>
        <button
          type="button"
          onClick={() => setShowActiveOnly((value) => !value)}
          className="text-xs font-semibold text-primary"
          aria-pressed={showActiveOnly}
        >
          {showActiveOnly ? "Zobraziť všetky" : "Iba aktivované"}
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {offers.map((offer) => {
          const Icon = offer.icon;
          const active = activeIds.includes(offer.id);
          return (
            <article key={offer.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{offer.title}</h3>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{offer.discount}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{offer.category}</p>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{offer.description}</p>
                  <button
                    type="button"
                    onClick={() => toggleOffer(offer.id)}
                    className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "border border-border bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}
                  >
                    {active ? <CheckCircle2 className="size-4" /> : <CirclePlus className="size-4" />}
                    {active ? "Demo ponuka aktivovaná" : "Aktivovať demo ponuku"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {offers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Zatiaľ nemáš aktivovanú žiadnu ponuku.
          </div>
        )}
      </div>

      <p className="mt-5 rounded-2xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground">
        Toto je finančná simulácia. Ponuky, percentá aj aktivácie sú vymyslené ukážkové údaje.
        Nevzniká nárok na skutočnú odmenu ani výplatu peňazí.
      </p>
    </main>
  );
}
