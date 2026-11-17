import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Gift, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/odmeny")({
  head: () => ({ meta: [
      { property: "og:title", content: "Ponuky a odmeny · George" },
      { property: "og:description", content: "Prehľad dostupných ponúk a odmien." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    { title: "Ponuky a odmeny · George" },
    { name: "description", content: "Prehľad dostupných ponúk a odmien." },
  ] }),
  component: OdmenyPage,
});

function OdmenyPage() {
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
            <p className="mt-1 text-sm text-muted-foreground">Prehľad dostupných odmien</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Info className="size-5 shrink-0 text-primary" />
          <h2 className="font-semibold">Žiadne dostupné ponuky</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          V aktuálnej verzii nie je databáza partnerských ponúk a odmien pripojená.
          Preto sa nezobrazujú vymyslené zľavy, percentá ani aktivácie. Táto obrazovka
          zobrazí ponuky až vtedy, keď budú skutočne dostupné v databáze.
        </p>
      </section>

      <p className="mt-5 rounded-2xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground">
        George neposkytuje skutočné cashback odmeny ani výplaty peňazí.
      </p>
    </main>
  );
}
