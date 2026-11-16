import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Target, Plus, PiggyBank, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { addGoal, balance, depositToGoal, formatEur, hydrate, removeGoal, useBank } from "@/lib/bank-store";

export const Route = createFileRoute("/_authenticated/sporenie")({
  head: () => ({
    meta: [
      { title: "Sporenie | Aplikácia" },
      { name: "description", content: "Prehľad sporiacich cieľov a ich napĺňania." },
      { property: "og:title", content: "Sporenie | Aplikácia" },
      { property: "og:description", content: "Prehľad sporiacich cieľov a ich napĺňania." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Sporenie,
});

const field =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

function Sporenie() {
  const s = useBank();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deposit, setDeposit] = useState<Record<string, string>>({});
  const [savingGoal, setSavingGoal] = useState(false);
  const [depositingGoal, setDepositingGoal] = useState<string | null>(null);
  const [removingGoal, setRemovingGoal] = useState<string | null>(null);
  const availableBalance = balance(s);
  const saved = useMemo(() => s.goals.reduce((sum, goal) => sum + goal.saved, 0), [s.goals]);
  const targetTotal = useMemo(() => s.goals.reduce((sum, goal) => sum + goal.target, 0), [s.goals]);
  const overallProgress = targetTotal > 0 ? Math.min(100, (saved / targetTotal) * 100) : 0;

  async function createGoal() {
    const normalized = target.replace(/\s/g, "").replace(",", ".");
    const value = Number(normalized);
    if (!name.trim()) {
      toast.error("Zadajte názov sporiaceho cieľa.");
      return;
    }
    if (name.trim().length > 60) {
      toast.error("Názov cieľa môže mať najviac 60 znakov.");
      return;
    }
    if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(normalized) || !Number.isFinite(value) || value <= 0 || value > 1000000) {
      toast.error("Zadajte platnú cieľovú sumu do 1 000 000 € s najviac dvoma desatinnými miestami.");
      return;
    }
    setSavingGoal(true);
    try {
      await addGoal(name.trim(), Math.round(value * 100) / 100);
      setName("");
      setTarget("");
      toast.success("Sporiaci cieľ bol vytvorený.");
    } catch (error) {
      console.error("Vytvorenie sporiaceho cieľa zlyhalo:", error);
      toast.error("Sporiaci cieľ sa nepodarilo uložiť.");
    } finally {
      setSavingGoal(false);
    }
  }

  async function addDeposit(goalId: string) {
    const normalized = (deposit[goalId] ?? "").replace(/\s/g, "").replace(",", ".");
    const value = Number(normalized);
    if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(normalized) || !Number.isFinite(value) || value <= 0) {
      toast.error("Zadajte kladný vklad s najviac dvoma desatinnými miestami.");
      return;
    }
    if (value > availableBalance) {
      toast.error("Vklad je vyšší ako dostupný zostatok.");
      return;
    }
    const selectedGoal = s.goals.find((goal) => goal.id === goalId);
    if (selectedGoal && value > selectedGoal.target - selectedGoal.saved) {
      toast.error("Vklad nemôže byť vyšší ako zostávajúca suma do cieľa.");
      return;
    }
    setDepositingGoal(goalId);
    try {
      await depositToGoal(goalId, Math.round(value * 100) / 100);
      setDeposit((current) => ({ ...current, [goalId]: "" }));
      toast.success("Vklad bol pridaný do cieľa.");
    } catch (error) {
      console.error("Vklad do sporiaceho cieľa zlyhal:", error);
      toast.error(error instanceof Error ? error.message : "Vklad sa nepodarilo uložiť.");
    } finally {
      setDepositingGoal(null);
    }
  }

  return (
    <AppShell>
      <BrandHeader title="Sporenie" subtitle="Plánujte si ciele a sledujte svoj pokrok" />
      <div className="space-y-4 px-4 pb-24">
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Nasporené spolu</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-income">{s.loading || s.error ? "—" : formatEur(saved)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.loading ? "Načítavam ciele…" : s.error ? "Údaje nie sú dostupné" : `z plánovaných ${formatEur(targetTotal)}`}</p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-income/10 text-income">
              <PiggyBank className="size-6" />
            </span>
          </div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-income transition-[width] duration-500" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="mt-2 text-right text-xs font-semibold text-muted-foreground">{s.loading || s.error ? "—" : `${Math.round(overallProgress)} % splnené`}</p>
        </section>

        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold">Moje ciele</h2>
            <p className="text-xs text-muted-foreground">{s.goals.length} aktívnych cieľov</p>
          </div>
          <Target className="size-5 text-primary" />
        </div>

        {s.loading ? (
          <p className="rounded-2xl bg-muted/50 p-5 text-center text-sm text-muted-foreground">Načítavam sporiace ciele…</p>
        ) : s.error ? (
          <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <p role="alert" className="text-sm text-destructive">{s.error}</p>
            <button type="button" onClick={() => void hydrate()} className="mt-3 text-sm font-semibold text-primary underline">
              Skúsiť znova
            </button>
          </section>
        ) : s.goals.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Target className="size-6" /></span>
            <h3 className="mt-3 font-semibold">Zatiaľ nemáte žiadny cieľ</h3>
            <p className="mt-1 text-sm text-muted-foreground">Vytvorte si prvý cieľ a postupne ho napĺňajte.</p>
          </section>
        ) : s.goals.map((goal) => {
          const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
          return (
            <section key={goal.id} className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold">{goal.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{formatEur(goal.saved)} z {formatEur(goal.target)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-income/10 px-2.5 py-1 text-xs font-bold text-income">{Math.round(pct)} %</span>
                  <button
                    type="button"
                    aria-label={`Odstrániť cieľ ${goal.name}`}
                    title="Odstrániť cieľ"
                    disabled={removingGoal === goal.id || depositingGoal === goal.id}
                    onClick={async () => {
                      if (!window.confirm(`Naozaj odstrániť cieľ „${goal.name}“? Už zaznamenané pohyby v histórii zostanú zachované.`)) return;
                      setRemovingGoal(goal.id);
                      try {
                        await removeGoal(goal.id);
                        toast.success("Sporiaci cieľ bol odstránený.");
                      } catch (error) {
                        console.error("Odstránenie sporiaceho cieľa zlyhalo:", error);
                        toast.error(error instanceof Error ? error.message : "Cieľ sa nepodarilo odstrániť.");
                      } finally {
                        setRemovingGoal(null);
                      }
                    }}
                    className="grid size-9 place-items-center rounded-full text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-income transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              {pct >= 100 ? (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-income"><Target className="size-4" /> Cieľ splnený</p>
              ) : (
                <div className="mt-4 flex gap-2">
                  <input
                    className={field}
                    inputMode="decimal"
                    aria-label={`Vklad do cieľa ${goal.name}`}
                    placeholder="Vklad (€)"
                    max={availableBalance}
                    value={deposit[goal.id] ?? ""}
                    onChange={(event) => setDeposit((current) => ({ ...current, [goal.id]: event.target.value }))}
                  />
                  <button type="button" disabled={depositingGoal !== null} onClick={() => void addDeposit(goal.id)} className="inline-flex shrink-0 items-center gap-1 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                    <ArrowUpRight className="size-4" /> Vložiť
                  </button>
                </div>
              )}
            </section>
          );
        })}

        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Plus className="size-5" /></span>
            <div><h2 className="font-bold">Nový sporiaci cieľ</h2><p className="text-xs text-muted-foreground">Nastavte si sumu, ktorú chcete dosiahnuť.</p></div>
          </div>
          <div className="space-y-3">
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Názov cieľa</span><input className={field} value={name} onChange={(event) => setName(event.target.value)} placeholder="Napr. Dovolenka" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Cieľová suma (€)</span><input className={field} inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Zadajte sumu" /></label>
            <button type="button" disabled={savingGoal || s.loading || !!s.error} onClick={createGoal} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="size-4" /> {savingGoal ? "Ukladám…" : "Vytvoriť cieľ"}</button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
