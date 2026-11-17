import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import {
  PieChart as PieChartIcon,
  AlertTriangle,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import {
  CATEGORIES,
  formatEur,
  hydrate,
  useBank,
  setBudget,
  removeBudget,
  isExcludedFromOverview,
} from "@/lib/bank-store";

export const Route = createFileRoute("/_authenticated/rozpocet")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Rozpočet a analýza výdavkov · George" },
      { property: "og:description", content: "Sledujte svoje príjmy, výdavky a rozpočtové limity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Rozpočet a analýza výdavkov · George" },
      {
        name: "description",
        content: "Sledujte svoje príjmy, výdavky a rozpočtové limity.",
      },
    ],
  }),
  component: RozpocetPage,
});

const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (category) => !["Mzda", "Ostatné príjmy"].includes(category),
);

function RozpocetPage() {
  const bank = useBank();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0] ?? "Potraviny");
  const [limitValue, setLimitValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [yearPart = "", monthPart = ""] = selectedMonth.split("-");
  const now = new Date();
  const parsedYear = Number(yearPart);
  const parsedMonth = Number(monthPart);
  const year = Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : now.getFullYear();
  const month = Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
    ? parsedMonth
    : now.getMonth() + 1;
  const monthLabel = new Intl.DateTimeFormat("sk-SK", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  const expenses = useMemo(
    () =>
      bank.transactions.filter((transaction) => {
        if (transaction.type !== "out" || isExcludedFromOverview(transaction)) return false;
        const date = new Date(transaction.date);
        return date.getFullYear() === year && date.getMonth() === month - 1;
      }),
    [bank.transactions, year, month],
  );

  const totalSpent = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthlyIncome = bank.transactions
    .filter((transaction) => {
      if (transaction.type !== "in" || isExcludedFromOverview(transaction)) return false;
      const date = new Date(transaction.date);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    })
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthlyDifference = monthlyIncome - totalSpent;
  const totalLimit = bank.budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const budgetedSpent = expenses
    .filter((transaction) => bank.budgets.some((budget) => budget.category === transaction.category))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const overallProgress =
    totalLimit > 0 ? Math.min(100, Math.round((budgetedSpent / totalLimit) * 100)) : 0;

  const categoryNames = [...new Set([
    ...EXPENSE_CATEGORIES,
    ...bank.budgets.map((budget) => budget.category),
    ...expenses.map((transaction) => transaction.category),
  ])].filter((name) => !["Mzda", "Ostatné príjmy"].includes(name));
  const categoryTotals = categoryNames.map((name) => {
    const amount = expenses
      .filter((transaction) => transaction.category === name)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const budget = bank.budgets.find((item) => item.category === name);
    return { category: name, amount, limit: budget?.limit ?? 0 };
  }).filter((item) => item.amount > 0 || item.limit > 0);

  const openAddForm = () => {
    if (bank.loading || bank.error) {
      toast.error("Údaje rozpočtu ešte nie sú dostupné.");
      return;
    }
    const firstWithoutLimit = EXPENSE_CATEGORIES.find(
      (item) => !bank.budgets.some((budget) => budget.category === item),
    );
    if (!firstWithoutLimit) {
      toast.error("Všetky dostupné kategórie už majú nastavený limit.");
      return;
    }
    setEditingCategory(null);
    setCategory(firstWithoutLimit);
    setLimitValue("");
    setFormOpen(true);
  };

  const openEditForm = (name: string, limit: number) => {
    setEditingCategory(name);
    setCategory(name);
    setLimitValue(String(limit));
    setFormOpen(true);
  };

  const saveLimit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedLimit = limitValue.trim().replace(",", ".");
    const parsed = Number(normalizedLimit);
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedLimit) || !Number.isFinite(parsed) || parsed <= 0 || parsed > 1000000 || Math.abs(parsed * 100 - Math.round(parsed * 100)) > 0.000001) {
      toast.error("Zadajte platný limit do 1 000 000 € s najviac dvoma desatinnými miestami.");
      return;
    }
    if (!editingCategory && bank.budgets.some((budget) => budget.category === category)) {
      toast.error("Táto kategória už má nastavený limit. Upravte existujúci limit.");
      return;
    }
    setSaving(true);
    try {
      await setBudget(category, Math.round(parsed * 100) / 100);
      toast.success(editingCategory ? "Limit bol upravený." : "Limit bol pridaný.");
      setFormOpen(false);
    } catch {
      toast.error("Limit sa nepodarilo uložiť.");
    } finally {
      setSaving(false);
    }
  };

  const deleteLimit = async (name: string) => {
    try {
      await removeBudget(name);
      toast.success("Rozpočtový limit bol odstránený.");
    } catch {
      toast.error("Limit sa nepodarilo odstrániť.");
    }
  };

  return (
    <AppShell>
      <BrandHeader title="Rozpočet" subtitle="Analýza a kontrola výdavkov" back />
      <main className="space-y-4 px-4 pb-24">
        <section
          aria-labelledby="heading-overview"
          className="rounded-3xl bg-surface p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="heading-overview" className="text-sm font-semibold capitalize text-muted-foreground">
              {monthLabel}
            </h2>
            <input
              aria-label="Vybrať mesiac"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="max-w-[150px] rounded-xl border border-border bg-background px-2 py-2 text-xs text-foreground"
            />
          </div>
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Celkové výdavky</span>
            <p className="text-3xl font-extrabold text-foreground">{bank.loading || bank.error ? "—" : formatEur(totalSpent)}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-background p-3">
              <span className="text-xs text-muted-foreground">Mesačné príjmy</span>
              <p className="mt-1 text-lg font-bold text-income">
                {bank.loading || bank.error ? "—" : formatEur(monthlyIncome)}
              </p>
            </div>
            <div className="rounded-2xl bg-background p-3">
              <span className="text-xs text-muted-foreground">Rozdiel príjmy − výdavky</span>
              <p className={`mt-1 text-lg font-bold ${monthlyDifference >= 0 ? "text-income" : "text-expense"}`}>
                {bank.loading || bank.error ? "—" : formatEur(monthlyDifference)}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>Čerpanie kategórií s nastaveným limitom</span>
              <span className="font-semibold text-foreground">
                {bank.loading || bank.error ? "—" : totalLimit > 0 ? `${overallProgress} %` : "Bez limitov"}
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuenow={overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Čerpanie celkového rozpočtu"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {bank.loading
                ? "Načítavam rozpočtové údaje…"
                : bank.error
                  ? "Rozpočtové údaje nie sú dostupné."
                  : totalLimit > 0
                    ? `Z celkového limitu ${formatEur(totalLimit)} · výdavky bez limitu nie sú započítané`
                    : "Pridajte limit aspoň jednej kategórii, aby sa zobrazilo čerpanie rozpočtu."}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="heading-categories"
          className="space-y-3 rounded-3xl bg-surface p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="heading-categories" className="text-base font-bold text-foreground">
              Výdavky podľa kategórií
            </h2>
            <button
              type="button"
              onClick={openAddForm}
              disabled={bank.loading || !!bank.error}
              className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" />
              Pridať limit
            </button>
          </div>

          {formOpen && (
            <form onSubmit={saveLimit} className="space-y-3 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  {editingCategory ? "Upraviť limit" : "Nový rozpočtový limit"}
                </h3>
                <button
                  type="button"
                  aria-label="Zavrieť formulár"
                  onClick={() => setFormOpen(false)}
                  className="grid size-9 place-items-center rounded-full hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                Kategória
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={!!editingCategory}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                >
                  {editingCategory && !EXPENSE_CATEGORIES.includes(editingCategory) && (
                    <option value={editingCategory}>{editingCategory}</option>
                  )}
                  {EXPENSE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                Mesačný limit v €
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  value={limitValue}
                  onChange={(event) => setLimitValue(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                />
              </label>
              <button
                type="submit"
                disabled={saving || bank.loading || !!bank.error}
                className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? "Ukladám…" : "Uložiť limit"}
              </button>
            </form>
          )}

          {bank.loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Načítavam rozpočet…</p>
          ) : bank.error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <p role="alert" className="text-sm text-destructive">{bank.error}</p>
              <button type="button" onClick={() => void hydrate()} className="mt-3 text-sm font-semibold text-primary underline">
                Skúsiť znova
              </button>
            </div>
          ) : categoryTotals.length === 0 ? (
            <div className="rounded-2xl bg-background px-4 py-6 text-center">
              <PieChartIcon className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-foreground">Zatiaľ bez výdavkov a limitov</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Po pridaní transakcií alebo limitov sa tu zobrazí prehľad kategórií.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {categoryTotals.map((item) => {
                const isOver = item.limit > 0 && item.amount > item.limit;
                const progress = item.limit > 0
                  ? Math.min(100, Math.round((item.amount / item.limit) * 100))
                  : 0;
                return (
                  <div key={item.category} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-foreground">{item.category}</span>
                      <span className="font-bold text-foreground">{formatEur(item.amount)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full ${isOver ? "bg-destructive" : "bg-primary"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="min-w-[88px] text-right text-xs text-muted-foreground">
                        {item.limit > 0 ? `z ${formatEur(item.limit)}` : "Bez limitu"}
                      </span>
                    </div>
                    {isOver && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-destructive">
                        <AlertTriangle className="size-3" />
                        Prekročený limit o {formatEur(item.amount - item.limit)}
                      </p>
                    )}
                    {item.limit > 0 && (
                      <div className="mt-1 flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(item.category, item.limit)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                        >
                          <Pencil className="size-3" /> Upraviť
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteLimit(item.category)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3" /> Odstrániť
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          aria-labelledby="heading-tips"
          className="flex items-start gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-4"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 id="heading-tips" className="text-sm font-bold text-foreground">
              Tip k rozpočtu
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Sledujte priebežne výdavky v jednotlivých kategóriách. Nastavený limit vám pomôže
              včas zachytiť prekročenie plánovanej sumy.
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
