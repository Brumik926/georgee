import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Info } from "lucide-react";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";

export const Route = createFileRoute("/_authenticated/karty")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Moje karty | George" },
      { property: "og:description", content: "Prehľad dostupných kariet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Moje karty | George" },
      { name: "description", content: "Prehľad dostupných kariet." },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  return (
    <AppShell>
      <BrandHeader title="Moje karty" subtitle="Karty evidované v aplikácii" back />
      <div className="space-y-4 px-4 pb-28">
        <section className="rounded-3xl border border-border bg-surface p-6 text-center shadow-sm">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CreditCard className="size-8" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Žiadne karty nie sú načítané</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            V aktuálnej verzii nie je pripojený zdroj kariet z existujúcej databázy.
            Preto nezobrazujeme vymyslené čísla kariet, CVV, dátumy platnosti ani limity.
          </p>
        </section>

        <section className="flex gap-3 rounded-2xl bg-muted/50 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-xs leading-5 text-muted-foreground">
            Po pripojení existujúcich údajov sa tu zobrazia iba karty, ktoré sú skutočne
            uložené v databáze. Žiadne kartové údaje sa nevytvárajú automaticky.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
