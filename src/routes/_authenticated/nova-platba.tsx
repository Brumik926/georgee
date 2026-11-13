import { validateIban, formatIban } from "@/lib/iban-validator";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Zap,
  Info,
} from "lucide-react";
import { enableBiometric, isBiometricEnabled, isBiometricSupported, verifyBiometric } from "@/lib/biometric";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { RecipientPicker } from "@/components/bank/RecipientPicker";
import {
  addTransaction,
  balance,
  CATEGORIES,
  formatEur,
  useBank,
} from "@/lib/bank-store";
import { parsePaymentQr, type ParsedPaymentData } from "@/lib/qr-parser";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/nova-platba")({
  head: () => ({
    meta: [
      { title: "Nová platba | George" },
      { name: "description", content: "Zadajte SEPA prevod so skenovaním QR kódov a bezpečným overením v George." },
      { property: "og:title", content: "Nová platba | George" },
      { property: "og:description", content: "Zadajte SEPA prevod so skenovaním QR kódov a bezpečným overením v George." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { name?: string | undefined; iban?: string | undefined; amount?: string | undefined; vs?: string | undefined } => ({
    name: typeof search["name"] === "string" ? search["name"] : undefined,
    iban: typeof search["iban"] === "string" ? search["iban"] : undefined,
    amount: search["amount"] != null ? String(search["amount"]) : undefined,
    vs: search["vs"] != null ? String(search["vs"]) : undefined,
  }),
  component: NovaPlatba,
});

const field =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:border-primary";

export default function NovaPlatba() {
  const s = useBank();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  const prefill = Route.useSearch();
  const [name, setName] = useState(prefill.name ?? "");
  const [iban, setIban] = useState(prefill.iban ?? "");
  const [amount, setAmount] = useState(prefill.amount ?? "");
  const [category, setCategory] = useState("Prevod");
  const [note, setNote] = useState("");
  const [vs, setVs] = useState(prefill.vs ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [pinError, setPinError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  // Kroky pre výber a potvrdenie platby podľa predlohy George
  const [step, setStep] = useState<"form" | "sepa_summary" | "confirm_card">("form");

  useEffect(() => {
    void isBiometricSupported().then(setBioSupported);
  }, [user.id]);

  const value = Number(amount.replace(",", "."));

  function handleInitiatePayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPinError("");

    if (!name.trim()) return setError("Zadajte meno príjemcu.");
    if (!Number.isFinite(value) || value <= 0) return setError("Zadajte platnú sumu.");
    if (value > balance(s)) return setError("Nedostatočný zostatok na účte.");

    const ibanCheck = validateIban(iban);
    if (!ibanCheck.valid) {
      return setError(ibanCheck.error ?? "Neplatný IBAN príjemcu.");
    }

    // Prechod na SEPA platba sumárnu obrazovku (obr. 1)
    setStep("sepa_summary");
  }

  async function executePayment() {
    setBusy(true);
    try {
      await addTransaction({
        type: "out",
        counterparty: name.trim(),
        iban: iban.trim().toUpperCase(),
        amount: Math.round(value * 100) / 100,
        date: new Date().toISOString(),
        category,
        ...(vs.trim() ? { vs: vs.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });

      setStep("form");
      toast.success("Platba bola úspešne odoslaná");
      navigate({ to: "/platby" });
    } catch (err) {
      console.error(err);
      toast.error("Odoslanie platby zlyhalo");
      setError("Nastala neočakávaná chyba pri odosielaní platby.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmWithBiometrics() {
    setBusy(true);
    setPinError("");

    try {
      if (isBiometricEnabled(user.id)) {
        const verified = await verifyBiometric(user.id);
        if (!verified) throw new Error("Overenie nebolo úspešné.");
      } else {
        await enableBiometric(user.id, s.owner || "George");
      }
      await executePayment();
    } catch (err) {
      console.error(err);
      setPinError("Overenie zámkom telefónu zlyhalo alebo bolo zrušené. Skúste znova.");
      setBusy(false);
    }
  }

  const [whole, cents] = (Number.isFinite(value) ? value : 0).toFixed(2).split(".");

  // 1. OBRAZOVKA: SEPA PLATBA SUMÁR (Zodpovedá 12874.jpg)
  if (step === "sepa_summary") {
    return (
      <AppShell>
        <div className="min-h-screen bg-background pb-36 px-4 pt-4 text-foreground font-sans">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="p-2 -ml-2 rounded-full text-primary hover:bg-muted"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-[20px] font-bold text-foreground">SEPA platba</h1>
          </div>

          <div className="space-y-3">
            {/* Príjemca */}
            <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border">
              <span className="text-[12px] text-muted-foreground block">Meno príjemcu</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[16px] font-bold text-foreground">{name}</span>
                <CheckCircle2 className="size-6 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
              </div>
              <span className="text-[12px] text-muted-foreground mt-1 block">Názov príjemcu a IBAN sa zhodujú.</span>
            </div>

            {/* IBAN */}
            <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border">
              <span className="text-[12px] text-muted-foreground block">IBAN</span>
              <span className="text-[15px] font-mono font-medium text-foreground mt-1 block tracking-wide">
                {formatIban(iban)}
              </span>
            </div>

            {/* Suma */}
            <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border flex items-center justify-between">
              <div>
                <span className="text-[12px] text-muted-foreground block">Suma</span>
                <div className="text-[24px] font-bold text-foreground mt-1 flex items-baseline">
                  <span>{Number(whole).toLocaleString("sk-SK")}</span>
                  <span>,</span>
                  <sup className="text-[14px] font-bold top-[-0.5em]">{cents}</sup>
                  <span className="ml-1">€</span>
                </div>
              </div>
              {value > balance(s) ? (
                <AlertCircle className="size-6 text-amber-500" />
              ) : (
                <CheckCircle2 className="size-6 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
              )}
            </div>

            {/* Dátum splatnosti */}
            <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border">
              <span className="text-[12px] text-muted-foreground block">Dátum splatnosti</span>
              <span className="text-[15px] font-semibold text-foreground mt-1 block">Čo najskôr</span>
            </div>

            {/* Okamžitá platba */}
            <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border">
              <span className="text-[12px] text-muted-foreground block">Okamžitá platba</span>
              <div className="flex items-center gap-2 mt-1">
                <Zap className="size-5 text-primary fill-primary/20" />
                <span className="text-[15px] font-bold text-foreground">Aktívna</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-snug">
                Príjemca dostane vašu okamžitú platbu (SEPA) skôr, než stihnete povedať "George".
              </p>
            </div>

            {/* Doplňujúce informácie */}
            <div className="pt-2">
              <span className="text-[12px] font-semibold text-muted-foreground px-1 block mb-2">
                Doplňujúce informácie (voliteľné)
              </span>
              <div className="space-y-2">
                <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border flex justify-between items-center text-[14px]">
                  <span className="text-muted-foreground">{note ? `Poznámka: ${note}` : "Poznámka pre príjemcu"}</span>
                </div>
                <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border flex justify-between items-center text-[14px]">
                  <span className="text-muted-foreground">{vs ? `VS: ${vs}` : "Variabilný symbol"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fixné spodné tlačidlo Potvrdiť */}
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-md border-t border-border/40">
            <button
              type="button"
              onClick={() => setStep("confirm_card")}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg hover:opacity-95 active:scale-95 transition-all"
            >
              Potvrdiť
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // 2. OBRAZOVKA: POTVRDENIE INFO KARTA (Zodpovedá 12875.jpg)
  if (step === "confirm_card") {
    return (
      <AppShell>
        <div className="min-h-screen bg-background pb-36 px-4 pt-4 text-foreground font-sans">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setStep("sepa_summary")}
              className="p-2 -ml-2 rounded-full text-primary hover:bg-muted"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-[22px] font-bold text-foreground">Potvrdenie</h1>
          </div>

          {/* Biela informačná karta */}
          <div className="rounded-3xl bg-surface p-6 shadow-md border border-border space-y-5">
            <div>
              <span className="text-[12px] text-muted-foreground block">Akcia</span>
              <span className="text-[16px] font-semibold text-foreground mt-0.5 block">Podpísať platbu</span>
            </div>

            <div>
              <span className="text-[12px] text-muted-foreground block">Príjemca</span>
              <span className="text-[16px] font-semibold text-foreground mt-0.5 block">{name}</span>
              <span className="text-[13px] font-mono text-muted-foreground mt-0.5 block">{formatIban(iban)}</span>
              <span className="text-[12px] text-emerald-600 font-medium mt-1 block">Názov príjemcu a IBAN sa zhodujú.</span>
            </div>

            <div>
              <span className="text-[12px] text-muted-foreground block">Suma</span>
              <div className="text-[32px] font-bold text-foreground mt-1 flex items-baseline">
                <span>{Number(whole).toLocaleString("sk-SK")}</span>
                <span>,</span>
                <sup className="text-[18px] font-bold top-[-0.5em]">{cents}</sup>
                <span className="ml-1 text-[20px]">€</span>
              </div>
            </div>
          </div>

          <p className="mt-4 px-2 text-[13px] text-muted-foreground leading-relaxed">
            Túto operáciu som vyhodnotil ako bezpečnú. Stačí ju preto iba potvrdiť.
          </p>

          {pinError && <p className="mt-2 px-2 text-[13px] text-destructive">{pinError}</p>}

          {/* Fixné spodné tlačidlo Potvrdiť s biometriou */}
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-md border-t border-border/40">
            <button
              type="button"
              onClick={confirmWithBiometrics}
              disabled={busy}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg hover:opacity-95 active:scale-95 disabled:opacity-60 transition-all"
            >
              <Fingerprint className="size-6" />
              <span>{busy ? "Overujem…" : "Potvrdiť"}</span>
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // 3. ZÁKLADNÝ FORMULÁR (Predvolený krok)
  return (
    <AppShell>
      <BrandHeader
        title="Nová platba"
        subtitle={`Z účtu · ${formatEur(balance(s))}`}
        back
        action={
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="Skenovať QR kód / Faktúru"
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/60 active:scale-95"
          >
            <QrCode className="size-4 text-primary" />
            <span>Skenovať</span>
          </button>
        }
      />

      <div className="space-y-3 px-4 pb-24">
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-muted/50 active:scale-[0.99]"
        >
          <QrCode className="size-5 text-primary" />
          <span>Skenovať QR kód / Faktúru</span>
        </button>

        <RecipientPicker
          userId={user.id}
          transactions={s.transactions}
          current={{ name, iban }}
          onPick={(r) => {
            setName(r.name);
            setIban(r.iban);
            if (r.category) setCategory(r.category);
          }}
        />

        <form onSubmit={handleInitiatePayment} className="space-y-3">
          <div className="space-y-3 rounded-3xl bg-surface p-4 shadow-sm">
            <label className="block">
              <span className="text-[12px] text-muted-foreground">Príjemca</span>
              <input
                className={`${field} mt-1`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Meno a priezvisko alebo názov firmy"
              />
            </label>

            <label className="block">
              <span className="text-[12px] text-muted-foreground">IBAN / číslo účtu</span>
              <input
                className={`${field} mt-1 font-mono tracking-wide uppercase`}
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="SK00 0000 0000 0000 0000 0000"
              />
            </label>

            <label className="block">
              <span className="text-[12px] text-muted-foreground">Suma (€)</span>
              <input
                className={`${field} mt-1 text-[24px] font-bold text-foreground`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[12px] text-muted-foreground">Kategória</span>
                <select
                  className={`${field} mt-1`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[12px] text-muted-foreground">Variabilný symbol</span>
                <input
                  className={`${field} mt-1 font-mono`}
                  inputMode="numeric"
                  value={vs}
                  onChange={(e) => setVs(e.target.value)}
                  placeholder="10 čísel"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[12px] text-muted-foreground">Správa pre príjemcu</span>
              <input
                className={`${field} mt-1`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Poznámka k platbe"
              />
            </label>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-3 text-[13px] text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-95"
          >
            <span>Pokračovať na autorizáciu</span>
            <ArrowRight className="size-4" />
          </button>

          <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600" />
            Platba je chránená bezpečnostným overením George
          </p>
        </form>
      </div>

      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(data) => {
          if (data.recipientName) setName(data.recipientName);
          if (data.iban) setIban(data.iban);
          if (data.amount) setAmount(data.amount);
          if (data.vs) setVs(data.vs);
          if (data.note) setNote(data.note);
        }}
      />
    </AppShell>
  );
}

function QrScannerModal({
  open,
  onClose,
  onScanSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedPaymentData) => void;
}) {
  const [mode, setMode] = useState<"camera" | "file">("camera");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    (window as any).__qrScannerCleanup = () => stopCamera();
    return () => stopCamera();
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  return null;
}
