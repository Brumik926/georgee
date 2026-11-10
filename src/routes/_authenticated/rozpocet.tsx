import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Plus,
} from "lucide-react";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import {
  CATEGORIES,
  formatEur,
  useBank,
} from "@/lib/bank-store";

export const Route = createFileRoute("/_authenticated/rozpocet")({
  head: () => ({
    meta: [
      { title: "Rozpočet a analýza výdavkov | George" },
      {
        name: "description",
        content: "Sledujte svoje príjmy, výdavky a limity kategórií v inteligentnom rozpočte George.",
      },
      { property: "og:title", content: "Rozpočet a analýza výdavkov | George" },
      {
        property: "og:description",
        content: "Mesačné štatistiky a rozpočtové limity pre vaše financie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RozpocetPage,
});

export default function RozpocetPage() {
  const bank = useBank();
  const [selectedMonth] = useState("Tento mesiac");

  // Výpočet výdavkov podľa kategórií
  const expenses = bank.transactions.filter((t) => t.type === "out");
  const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals = CATEGORIES.map((cat) => {
    const total = expenses
      .filter((t) => t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      category: cat,
      amount: total,
      percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
      limit: 300, // orientačný rozpočtový limit na ukážku
    };
  }).filter((c) => c.amount > 0 || c.category === "Nákupy");

  return (
    <AppShell>
      <BrandHeader
        title="Rozpočet"
        subtitle="Analýza a kontrola výdavkov"
        back
      />

      <main className="space-y-4 px-4 pb-24">
        {/* Hlavný súhrn */}
        <section
          aria-labelledby="heading-overview"
          className="rounded-3xl bg-surface p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h1 id="heading-overview" className="text-sm font-semibold text-muted-foreground">
              {selectedMonth}
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <PieChartIcon className="size-3.5" />
              Aktívny plán
            </span>
          </div>

          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Celkové výdavky</span>
            <p className="text-3xl font-extrabold text-foreground">
              {formatEur(totalSpent)}
            </p>
          </div>

          {/* Vizuálny progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Vyčerpané z plánovaného limitu</span>
              <span className="font-semibold text-foreground">68 %</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: "68%" }}
              />
            </div>
          </div>
        </section>

        {/* Rozpis kategórií */}
        <section
          aria-labelledby="heading-categories"
          className="space-y-3 rounded-3xl bg-surface p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 id="heading-categories" className="text-base font-bold text-foreground">
              Výdavky podľa kategórií
            </h2>
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="size-3.5" />
              Pridať limit
            </button>
          </div>

          <div className="divide-y divide-border/60">
            {categoryTotals.map((item) => {
              const isOver = item.amount > item.limit;
              return (
                <div key={item.category} className="py-3 first:pt-1 last:pb-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">
                      {item.category}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatEur(item.amount)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full ${
                          isOver ? "bg-destructive" : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((item.amount / item.limit) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      z {formatEur(item.limit)}
                    </span>
                  </div>

                  {isOver && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-destructive">
                      <AlertTriangle className="size-3" />
                      Prekročený stanovený limit o {formatEur(item.amount - item.limit)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Inteligentné tipy */}
        <section
          aria-labelledby="heading-tips"
          className="flex items-start gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-4"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 id="heading-tips" className="text-sm font-bold text-foreground">
              George radí k rozpočtu
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              V porovnaní s minulým mesiacom ste v kategórii potravín minuli o 12 % menej. Pri tomto tempe ušetríte do konca mesiaca odhadom 45 €.
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
