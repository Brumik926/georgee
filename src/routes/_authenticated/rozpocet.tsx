import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, PieChart as PieChartIcon, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { CATEGORIES, formatEur, inMonth, setBudget, useBank } from "@/lib/bank-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/rozpocet")({
  head: () => ({
    meta: [
      { title: "Rozpočet a analýza výdavkov | Demo" },
      { name: "description", content: "Prehľad výdavkov a rozpočtových limitov v testovacej bankovej simulácii." },
      { property: "og:title", content: "Rozpočet a analýza výdavkov | Demo" },
      { property: "og:description", content: "Mesačné štatistiky a rozpočtové limity v simulácii." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RozpocetPage,
});

const SPENDING_CATEGORIES = CATEGORIES.filter(
  (category) => category !== "Mzda" && category !== "Ostatné príjmy",
);

export default function RozpocetPage() {
  const bank = useBank();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Potraviny");
  const [limitValue, setLimitValue] = useState("400");
  const [saving, setSaving] = useState(false);

  const expenses = bank.transactions.filter((t) => t.type === "out" && inMonth(t));
  const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalBudget = bank.budgets.reduce((sum, item) => sum + item.limit, 0);
  const usedPercent = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const categories = SPENDING_CATEGORIES.map((category) => {
    const amount = expenses
      .filter((transaction) => transaction.category === category)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const limit = bank.budgets.find((item) => item.category === category)?.limit ?? null;
    return { category, amount, limit };
  }).filter((item) => item.amount > 0 || item.limit !== null);

  async function handleSaveLimit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(limitValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Zadajte platný limit vyšší ako 0 €.");
      return;
    }

    setSaving(true);
    try {
      await setBudget(selectedCategory, amount);
      toast.success(`Limit pre kategóriu „${selectedCategory}“ bol uložený.`);
      setDialogOpen(false);
    } catch {
      toast.error("Limit sa nepodarilo uložiť. Skúste to znova.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <BrandHeader title="Rozpočet" subtitle="Mesačná analýza a kontrola výdavkov" back />

      <main className="space-y-4 px-4 pb-24">
        <section aria-labelledby="heading-overview" className="rounded-3xl bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 id="heading-overview" className="text-sm font-semibold text-muted-foreground">Tento mesiac</h2>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <PieChartIcon className="size-3.5" />
              {totalBudget > 0 ? "Aktívne limity" : "Bez nastaveného limitu"}
            </span>
          </div>

          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Celkové výdavky za aktuálny mesiac</span>
            <p className="text-3xl font-extrabold text-foreground">{formatEur(totalSpent)}</p>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalBudget > 0 ? "Využitie súčtu nastavených limitov" : "Nastavte si limit pre sledovanie rozpočtu"}</span>
              {totalBudget > 0 ? <span className="font-semibold text-foreground">{usedPercent} %</span> : null}
            </div>
            {totalBudget > 0 ? (
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${usedPercent}%` }} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Celkový limit sa zobrazí po nastavení aspoň jednej kategórie.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="heading-categories" className="space-y-3 rounded-3xl bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 id="heading-categories" className="text-base font-bold text-foreground">Výdavky podľa kategórií</h2>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="size-3.5" />
              Pridať limit
            </button>
          </div>

          {categories.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Za tento mesiac zatiaľ nemáte výdavky ani nastavené limity.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {categories.map((item) => {
                const isOver = item.limit !== null && item.amount > item.limit;
                const percent = item.limit && item.limit > 0 ? Math.min(100, Math.round((item.amount / item.limit) * 100)) : 0;
                return (
                  <div key={item.category} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">{item.category}</span>
                      <span className="font-bold text-foreground">{formatEur(item.amount)}</span>
                    </div>

                    {item.limit !== null ? (
                      <>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className={`h-full rounded-full ${isOver ? "bg-destructive" : "bg-primary"}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">z {formatEur(item.limit)}</span>
                        </div>
                        {isOver ? (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-destructive">
                            <AlertTriangle className="size-3" />
                            Prekročený limit o {formatEur(item.amount - item.limit)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Limit nie je nastavený.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex items-start gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Tip k rozpočtu</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Nastavte si limity podľa vlastných výdavkov. Prehľad sa počíta z transakcií aktuálneho mesiaca.
            </p>
          </div>
        </section>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nastaviť rozpočtový limit</DialogTitle>
            <DialogDescription>Limit sa uloží do existujúcej tabuľky rozpočtov a použije sa v mesačnom prehľade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLimit} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              Kategória
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-foreground"
              >
                {SPENDING_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Mesačný limit (€)
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={limitValue}
                onChange={(event) => setLimitValue(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-foreground"
              />
            </label>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="h-10 rounded-xl border border-input px-4 text-sm"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Ukladám…" : "Uložiť limit"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
