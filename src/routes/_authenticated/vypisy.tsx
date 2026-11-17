import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileText, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { TxnRow } from "@/components/bank/TxnRow";
import {
  balance,
  formatEur,
  hydrate,
  sortTransactionsNewestFirst,
  useBank,
} from "@/lib/bank-store";
import { exportStatement } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/vypisy")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Výpisy a prehľady · George" },
      { property: "og:description", content: "Prehľad uložených transakcií a export prehľadu do PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Výpisy a prehľady · George" },
      {
        name: "description",
        content: "Prehľad uložených transakcií a export prehľadu do PDF.",
      },
    ],
  }),
  component: VypisyPage,
});

function VypisyPage() {
  const s = useBank();
  const [exporting, setExporting] = useState(false);
  const transactions = useMemo(
    () => sortTransactionsNewestFirst(s.transactions),
    [s.transactions],
  );
  const totals = useMemo(
    () =>
      transactions.reduce(
        (result, transaction) => {
          if (transaction.type === "in") result.income += transaction.amount;
          else result.expense += transaction.amount;
          return result;
        },
        { income: 0, expense: 0 },
      ),
    [transactions],
  );

  async function handleExport() {
    if (exporting || !transactions.length) return;
    setExporting(true);
    try {
      await exportStatement(s, transactions);
      toast.success("prehľad bol exportovaný do PDF.");
    } catch (error) {
      console.error("Export prehľadu zlyhal:", error);
      toast.error("PDF sa nepodarilo vytvoriť. Skúste to znova.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <BrandHeader
        title="Výpisy a prehľady"
        subtitle="Uložené transakcie v účte"
        back
      />

      <div className="space-y-4 px-4 pb-28">
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Zostatok
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{s.loading || s.error ? "—" : formatEur(balance(s))}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Súčet evidovaných príjmov a výdavkov
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <section className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="size-4 text-income" />
              Príjmy spolu
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums text-income">{s.loading || s.error ? "—" : formatEur(totals.income)}</p>
          </section>
          <section className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingDown className="size-4 text-expense" />
              Výdavky spolu
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums">{s.loading || s.error ? "—" : formatEur(totals.expense)}</p>
          </section>
        </div>

        <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm" aria-busy={s.loading}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">História transakcií</h2>
              <p className="mt-1 text-xs text-muted-foreground">{s.loading || s.error ? "—" : transactions.length} záznamov</p>
            </div>
            <FileText className="size-5 text-primary" />
          </div>

          {s.loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Načítavam transakcie…</p>
          ) : s.error ? (
            <div className="rounded-xl bg-destructive/10 p-4">
              <p role="alert" className="text-sm text-destructive">{s.error}</p>
              <button
                type="button"
                onClick={() => void hydrate()}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
              >
                <RefreshCw className="size-4" /> Skúsiť znova
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Zatiaľ nemáš uložené žiadne transakcie.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <TxnRow key={transaction.id} txn={transaction} />
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={s.loading || !!s.error || !transactions.length || exporting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" />
          {exporting ? "Pripravujem PDF…" : "Exportovať prehľad (PDF)"}
        </button>

        <p className="rounded-2xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground">
          PDF obsahuje údaje evidované v aplikácii. Nie je bankovým výpisom ani potvrdením
          o skutočne vykonanej platbe.
        </p>
      </div>
    </AppShell>
  );
}
