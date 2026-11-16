import { validateIban, formatIban } from "@/lib/iban-validator";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { isBiometricEnabled, isBiometricSupported, verifyBiometric } from "@/lib/biometric";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { RecipientPicker } from "@/components/bank/RecipientPicker";
import {
  addTransaction,
  balance,
  hydrate,
  CATEGORIES,
  formatEur,
  useBank,
} from "@/lib/bank-store";
import { parsePaymentQr, type ParsedPaymentData } from "@/lib/qr-parser";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/nova-platba")({
  head: () => ({
    meta: [
      { title: "Nová platba | Aplikácia" },
      { name: "description", content: "Vyskúšajte simulovaný prevod, QR formulár a lokálne potvrdenie." },
      { property: "og:title", content: "Nová platba | Aplikácia" },
      { property: "og:description", content: "Vyskúšajte simulovaný prevod, QR formulár a lokálne potvrdenie." },
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
  const submissionRef = useRef(false);

  // Kroky formulára a potvrdenia simulovanej platby
  const [step, setStep] = useState<"form" | "sepa_summary" | "confirm_card">("form");

  useEffect(() => {
    void isBiometricSupported().then(setBioSupported);
  }, [user.id]);

  const normalizedAmount = amount.trim().replace(",", ".");
  const value = Number(normalizedAmount);
  const amountValid = /^\d+(?:\.\d{1,2})?$/.test(normalizedAmount) && Number.isFinite(value) && value > 0;

  function handleInitiatePayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPinError("");
    if (s.loading) return setError("Údaje účtu sa ešte načítavajú.");
    if (s.error) return setError("Údaje účtu nie sú dostupné. Skúste ich načítať znova.");

    if (!name.trim() || name.trim().length > 100) return setError("Zadajte meno príjemcu do 100 znakov.");
    if (!amountValid) return setError("Zadajte kladnú sumu s najviac dvoma desatinnými miestami.");
    if (value > 1_000_000) return setError("Maximálna suma demo transakcie je 1 000 000 €.");
    if (value > balance(s)) return setError("Nedostatočný zostatok na účte.");
    if (vs.trim() && !/^\d{1,10}$/.test(vs.trim())) return setError("Variabilný symbol môže obsahovať najviac 10 číslic.");
    if (note.length > 140) return setError("Správa pre príjemcu môže mať najviac 140 znakov.");

    const ibanCheck = validateIban(iban);
    if (!ibanCheck.valid) {
      return setError(ibanCheck.error ?? "Neplatný IBAN príjemcu.");
    }

    // Prechod na SEPA platba sumárnu obrazovku (obr. 1)
    setStep("sepa_summary");
  }

  async function executePayment(alreadyProcessing = false) {
    if (submissionRef.current && !alreadyProcessing) return;
    if (!alreadyProcessing) submissionRef.current = true;
    if (s.loading || s.error) {
      submissionRef.current = false;
      setBusy(false);
      setStep("form");
      setError("Údaje účtu nie sú dostupné. Skúste ich načítať znova.");
      return;
    }
    if (!amountValid) {
      submissionRef.current = false;
      setBusy(false);
      setStep("form");
      setError("Zadajte kladnú sumu s najviac dvoma desatinnými miestami.");
      return;
    }
    if (Math.round(value * 100) / 100 > balance(s)) {
      submissionRef.current = false;
      setBusy(false);
      setStep("form");
      setError("Zostatok sa zmenil. Na účte už nie je dostatok prostriedkov.");
      return;
    }
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
      toast.success("Platba bola zaevidovaná v demo histórii.");
      navigate({ to: "/platby" });
    } catch (err) {
      console.error(err);
      toast.error("Zaevidovanie demo platby zlyhalo.");
      setPinError("Demo platbu sa nepodarilo zaevidovať. Skontrolujte pripojenie a skúste znova.");
    } finally {
      submissionRef.current = false;
      setBusy(false);
    }
  }

  async function confirmWithBiometrics() {
    if (submissionRef.current) return;
    submissionRef.current = true;
    setBusy(true);
    setPinError("");

    try {
      if (isBiometricEnabled(user.id)) {
        const verified = await verifyBiometric(user.id);
        if (!verified) throw new Error("Overenie nebolo úspešné.");
      }
      await executePayment(true);
    } catch (err) {
      console.error(err);
      submissionRef.current = false;
      setPinError("Overenie zámkom telefónu zlyhalo alebo bolo zrušené. Skúste znova.");
      setBusy(false);
    }
  }

  async function confirmDemoPayment() {
    setPinError("");
    try {
      if (bioSupported && isBiometricEnabled(user.id)) {
        await confirmWithBiometrics();
        return;
      }
      await executePayment();
    } catch (error) {
      console.error("Potvrdenie demo platby zlyhalo:", error);
      submissionRef.current = false;
      setBusy(false);
      setPinError("Potvrdenie sa nepodarilo. Skúste znova.");
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
            <h1 className="text-[20px] font-bold text-foreground">Súhrn demo SEPA platby</h1>
          </div>

          <div className="space-y-3">
            {/* Príjemca */}
            <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border">
              <span className="text-[12px] text-muted-foreground block">Meno príjemcu</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[16px] font-bold text-foreground">{name}</span>
                <CheckCircle2 className="size-6 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
              </div>
              <span className="text-[12px] text-muted-foreground mt-1 block">Údaje sú zobrazené iba v demo náhľade.</span>
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
              <span className="text-[12px] text-muted-foreground block">Modelovaný termín</span>
              <span className="text-[15px] font-semibold text-foreground mt-1 block">Iba v demo náhľade</span>
            </div>

            {/* Okamžitá platba */}
            <div className="rounded-2xl bg-surface p-4 shadow-sm border border-border">
              <span className="text-[12px] text-muted-foreground block">Okamžitá platba</span>
              <div className="flex items-center gap-2 mt-1">
                <Zap className="size-5 text-primary fill-primary/20" />
                <span className="text-[15px] font-bold text-foreground">Demo režim</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-snug">
                Toto je iba ukážka obrazovky. Žiadna SEPA platba sa nevykoná.
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

          {/* Pokračovanie na demo potvrdenie */}
          <div className="mt-8 mb-12">
            <button
              type="button"
              onClick={() => setStep("confirm_card")}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg hover:opacity-95 active:scale-95 transition-all"
            >
              Pokračovať na demo potvrdenie
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
        <div className="min-h-screen bg-background pb-20 px-4 pt-4 text-foreground font-sans">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setStep("sepa_summary")}
              className="p-2 -ml-2 rounded-full text-primary hover:bg-muted"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-[22px] font-bold text-foreground">Potvrdenie demo záznamu</h1>
          </div>

          {/* Biela informačná karta */}
          <div className="rounded-3xl bg-surface p-6 shadow-md border border-border space-y-5">
            <div>
              <span className="text-[12px] text-muted-foreground block">Akcia</span>
              <span className="text-[16px] font-semibold text-foreground mt-0.5 block">Zaevidovať demo platbu</span>
            </div>

            <div>
              <span className="text-[12px] text-muted-foreground block">Príjemca</span>
              <span className="text-[16px] font-semibold text-foreground mt-0.5 block">{name}</span>
              <span className="text-[13px] font-mono text-muted-foreground mt-0.5 block">{formatIban(iban)}</span>
              <span className="text-[12px] text-emerald-600 font-medium mt-1 block">Údaje príjemcu sú zobrazené v demo náhľade.</span>
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
            Potvrdením sa vytvorí iba demo záznam v histórii tejto aplikácie. Bankový prevod sa nevykoná.
          </p>

          {pinError && <p className="mt-2 px-2 text-[13px] text-destructive">{pinError}</p>}

          {/* Spodné tlačidlo Potvrdiť s biometriou */}
          <div className="mt-8 mb-12">
            <button
              type="button"
              onClick={confirmDemoPayment}
              disabled={busy || s.loading || !!s.error}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[16px] font-semibold text-primary-foreground shadow-lg hover:opacity-95 active:scale-95 disabled:opacity-60 transition-all"
            >
              {bioSupported && isBiometricEnabled(user.id) ? <Fingerprint className="size-6" /> : <CheckCircle2 className="size-6" />}
              <span>{busy ? "Spracúvam…" : "Potvrdiť demo platbu"}</span>
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
                maxLength={100}
                autoComplete="name"
                placeholder="Meno a priezvisko alebo názov firmy"
              />
            </label>

            <label className="block">
              <span className="text-[12px] text-muted-foreground">IBAN / číslo účtu</span>
              <input
                className={`${field} mt-1 font-mono tracking-wide uppercase`}
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                maxLength={42}
                autoComplete="off"
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
                maxLength={14}
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
                  onChange={(e) => setVs(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
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
                maxLength={140}
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
          {s.error && (
            <div className="rounded-2xl bg-destructive/5 p-3">
              <p className="text-sm text-destructive">{s.error}</p>
              <button type="button" onClick={() => void hydrate()} className="mt-2 text-xs font-semibold text-primary underline">
                Skúsiť znova načítať údaje
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || s.loading || !!s.error}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{s.loading ? "Načítavam údaje účtu…" : s.error ? "Údaje účtu nie sú dostupné" : "Pokračovať na demo súhrn"}</span>
            <ArrowRight className="size-4" />
          </button>

          <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600" />
            Simulácia · bez odoslania do banky
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
  type Detector = {
    detect: (source: HTMLVideoElement | ImageBitmap) => Promise<Array<{ rawValue?: string }>>;
  };
  type DetectorConstructor = new (options: { formats: string[] }) => Detector;

  const [mode, setMode] = useState<"camera" | "file">("camera");
  const [errorMsg, setErrorMsg] = useState("");
  const [scanningFile, setScanningFile] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onScanSuccessRef = useRef(onScanSuccess);

  onCloseRef.current = onClose;
  onScanSuccessRef.current = onScanSuccess;

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const getDetector = useCallback((): Detector | null => {
    const DetectorApi = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!DetectorApi) return null;
    return new DetectorApi({ formats: ["qr_code"] });
  }, []);

  const acceptRawValue = useCallback((raw: string): boolean => {
    const parsed = parsePaymentQr(raw);
    if (!parsed) {
      setErrorMsg("QR kód neobsahuje podporované platobné údaje.");
      return false;
    }
    onScanSuccessRef.current(parsed);
    onCloseRef.current();
    return true;
  }, []);

  useEffect(() => {
    if (!open || mode !== "camera") {
      stopCamera();
      return;
    }

    let cancelled = false;
    setErrorMsg("");
    const startCamera = async () => {
      const detector = getDetector();
      if (!detector) {
        setErrorMsg("Tento prehliadač nepodporuje skenovanie QR kamerou. Skúste nahrať obrázok QR kódu.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg("Kamera nie je dostupná. Povoľte prístup ku kamere alebo nahrajte obrázok QR kódu.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error("Náhľad kamery nie je dostupný.");
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;

        runningRef.current = true;
        const scan = async () => {
          if (cancelled || !runningRef.current) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              if (cancelled || !runningRef.current) return;
              const raw = codes.find((code) => typeof code.rawValue === "string" && code.rawValue.trim())?.rawValue;
              if (raw && acceptRawValue(raw)) {
                runningRef.current = false;
                return;
              }
            }
          } catch (error) {
            console.error("Skenovanie QR kódu zlyhalo:", error);
            setErrorMsg("QR kód sa nepodarilo prečítať. Skúste lepšie osvetlenie alebo obrázok.");
          }
          if (!cancelled && runningRef.current) {
            frameRef.current = requestAnimationFrame(() => { void scan(); });
          }
        };
        void scan();
      } catch (error) {
        console.error("Spustenie kamery zlyhalo:", error);
        setErrorMsg("Kameru sa nepodarilo spustiť. Skontrolujte jej povolenie alebo nahrajte obrázok QR kódu.");
        stopCamera();
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, mode, stopCamera, getDetector, acceptRawValue]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Vyberte obrázok obsahujúci QR kód.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Obrázok môže mať najviac 20 MB.");
      return;
    }
    const detector = getDetector();
    if (!detector) {
      setErrorMsg("Tento prehliadač nepodporuje čítanie QR kódov z obrázka.");
      return;
    }

    setScanningFile(true);
    setErrorMsg("");
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      const raw = codes.find((code) => typeof code.rawValue === "string" && code.rawValue.trim())?.rawValue;
      if (!raw || !acceptRawValue(raw)) {
        if (!raw) setErrorMsg("V obrázku sa nenašiel čitateľný QR kód.");
      }
    } catch (error) {
      console.error("Načítanie QR obrázka zlyhalo:", error);
      setErrorMsg("Obrázok QR kódu sa nepodarilo spracovať.");
    } finally {
      bitmap?.close();
      setScanningFile(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-scanner-title"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-surface p-5 text-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="qr-scanner-title" className="text-lg font-bold">Skenovať platobný QR kód</h2>
            <p className="mt-1 text-xs text-muted-foreground">Údaje sa iba predvyplnia do demo formulára.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Zavrieť skener" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-lg">×</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
          <button type="button" onClick={() => setMode("camera")} aria-pressed={mode === "camera"} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "camera" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Kamera</button>
          <button type="button" onClick={() => setMode("file")} aria-pressed={mode === "file"} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Obrázok</button>
        </div>

        {mode === "camera" ? (
          <div className="mt-4 overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full object-cover" />
            <p className="px-3 py-2 text-center text-xs text-white/80">Nasmerujte kameru na platobný QR kód.</p>
          </div>
        ) : (
          <label className="mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-2 p-5 text-center">
            <QrCode className="size-9 text-primary" />
            <span className="text-sm font-semibold">{scanningFile ? "Čítam QR kód…" : "Vybrať obrázok QR kódu"}</span>
            <span className="text-xs text-muted-foreground">Obrázky z galérie alebo súborov, maximálne 20 MB.</span>
            <input type="file" accept="image/*" className="sr-only" disabled={scanningFile} onChange={(event) => void handleFileChange(event)} />
          </label>
        )}

        {errorMsg && <p role="alert" className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{errorMsg}</p>}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Skenovanie nič neodosiela do banky. Po načítaní skontrolujte meno príjemcu, IBAN aj sumu pred pokračovaním.</p>
      </section>
    </div>
  );
}
