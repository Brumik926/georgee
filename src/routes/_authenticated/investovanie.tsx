import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, TrendingUp, ShieldCheck, PlusCircle, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/investovanie")({
  component: InvestovaniePage,
});

const funds = [
  { id: "steady", name: "Stabilný mix", risk: "Nižšie", description: "Vzdelávací príklad portfólia s nižšou mierou kolísania." },
  { id: "balanced", name: "Vyvážený mix", risk: "Stredné", description: "Vzdelávací príklad kombinujúci konzervatívnejšie a dynamickejšie triedy aktív." },
  { id: "growth", name: "Rastový mix", risk: "Vyššie", description: "Vzdelávací príklad portfólia s vyššou mierou kolísania." },
];

function InvestovaniePage() {
  const [selectedId, setSelectedId] = useState("balanced");
  const [amount, setAmount] = useState("");
  const [simulatedTotal, setSimulatedTotal] = useState(0);
  const [message, setMessage] = useState("");

  const selected = useMemo(() => funds.find((fund) => fund.id === selectedId) ?? funds[1]!, [selectedId]);
  const normalizedAmount = amount.trim().replace(",", ".");
  const numericAmount = Number(normalizedAmount);
  const canAdd =
    /^\d+(?:\.\d{1,2})?$/.test(normalizedAmount) &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= 10000 &&
    Math.abs(numericAmount * 100 - Math.round(numericAmount * 100)) <= 0.000001 &&
    simulatedTotal + numericAmount <= 1_000_000;

  function addSimulation() {
    if (!canAdd) return;
    setSimulatedTotal((current) => current + numericAmount);
    setMessage(`Do demo portfólia bolo pridaných ${numericAmount.toLocaleString("sk-SK", { style: "currency", currency: "EUR" })}.`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 pb-28 text-foreground">
      <header className="pt-6 pb-5">
        <span className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-primary">
          DEMO · BANKOVÁ SIMULÁCIA
        </span>
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" />
          Späť na prehľad
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <TrendingUp className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Investičná simulácia</h1>
            <p className="mt-1 text-sm text-muted-foreground">Uč sa na modelových portfóliách</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Modelová hodnota portfólia</span>
          <Sparkles className="size-4 text-primary" />
        </div>
        <div className="mt-2 text-3xl font-bold tabular-nums">
          {simulatedTotal.toLocaleString("sk-SK", { style: "currency", currency: "EUR" })}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Modelová suma zadaná v tejto relácii · bez reálnych peňazí</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-bold">Vyber modelové portfólio</h2>
        <div className="space-y-2">
          {funds.map((fund) => (
            <button
              key={fund.id}
              type="button"
              onClick={() => { setSelectedId(fund.id); setMessage(""); }}
              aria-pressed={selectedId === fund.id}
              className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === fund.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{fund.name}</span>
                <ShieldCheck className="size-4 text-primary" />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Modelové riziko: {fund.risk}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">{selected.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{selected.description}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{selected.risk} riziko</span>
        </div>
        <div className="mt-4 rounded-2xl bg-muted/50 p-4">
          <p className="text-sm font-medium">Bez výkonnostných údajov</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Simulácia neobsahuje historické trhové dáta, odhadované výnosy ani skutočné investičné produkty.
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-bold">Pridať do simulácie</h2>
        <p className="mt-1 text-xs text-muted-foreground">Zadaj sumu, ktorú chceš modelovo pridať. Po obnovení stránky sa simulácia vynuluje.</p>
        <label htmlFor="simulation-amount" className="mt-4 block text-xs font-semibold">Suma v EUR</label>
        <input
          id="simulation-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => { setAmount(event.target.value); setMessage(""); }}
          className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:border-primary"
          placeholder="Zadajte sumu"
          maxLength={12}
          aria-describedby="simulation-amount-hint"
        />
        <p id="simulation-amount-hint" className="mt-1 text-xs text-muted-foreground">
          Najviac dve desatinné miesta, jeden prírastok do 10 000 € a celkový limit simulácie 1 000 000 €.
        </p>
        <button
          type="button"
          disabled={!canAdd}
          onClick={addSimulation}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusCircle className="size-4" />
          Pridať do demo portfólia
        </button>
        {message && <p role="status" className="mt-3 text-sm font-medium text-primary">{message}</p>}
      </section>

      <p className="mt-5 flex gap-2 rounded-2xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>Všetky portfóliá, výnosy aj zostatky sú vymyslené. Funkcia nevykonáva nákup cenných papierov, neprijíma vklady a neposkytuje investičné odporúčania.</span>
      </p>
    </main>
  );
}
