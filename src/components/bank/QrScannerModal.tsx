import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Upload, X, AlertCircle } from "lucide-react";
import { parsePaymentQr, type ParsedPaymentData } from "@/lib/qr-parser";
import { toast } from "sonner";

type DemoBarcodeDetector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};
type DemoBarcodeDetectorConstructor = new (options: { formats: string[] }) => DemoBarcodeDetector;

function createBarcodeDetector(): DemoBarcodeDetector | null {
  if (typeof window === "undefined") return null;
  const Detector = (window as Window & { BarcodeDetector?: DemoBarcodeDetectorConstructor }).BarcodeDetector;
  return Detector ? new Detector({ formats: ["qr_code"] }) : null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (data: ParsedPaymentData) => void;
}

export function QrScannerModal({ open, onClose, onScanSuccess }: Props) {
  const [mode, setMode] = useState<"camera" | "file">("camera");
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startDetection = useCallback(() => {
    const detector = createBarcodeDetector();
    if (!detector) {
      setErrorMsg("Kamera v tomto prehliadači nepodporuje skener QR kódov. Použite nahranie obrázka.");
      return;
    }

    intervalRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || !streamRef.current) {
        stopCamera();
        return;
      }
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          const parsed = parsePaymentQr(barcodes[0].rawValue);
          if (parsed && (parsed.iban || parsed.amount)) {
            stopCamera();
            navigator.vibrate?.(50);
            toast.success("Údaje z QR kódu boli načítané");
            onScanSuccess(parsed);
            onClose();
          }
        }
      } catch {
        // Nepodarené dekódovanie jednej snímky neukončí skenovanie.
      }
    }, 300);
  }, [onClose, onScanSuccess, stopCamera]);

  useEffect(() => {
    if (!open || mode !== "camera") {
      stopCamera();
      return;
    }

    let active = true;
    async function initCamera() {
      setErrorMsg("");
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera nie je dostupná.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          if (active) startDetection();
        }
      } catch (error) {
        console.error("Spustenie QR kamery zlyhalo:", error);
        if (active) setErrorMsg("Kamera nie je dostupná alebo nebol udelený prístup. Skúste nahrať obrázok.");
      }
    }

    void initCamera();
    return () => {
      active = false;
      stopCamera();
    };
  }, [open, mode, startDetection, stopCamera]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Vyberte obrázok obsahujúci QR kód.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Obrázok môže mať najviac 20 MB.");
      return;
    }

    const detector = createBarcodeDetector();
    if (!detector) {
      setErrorMsg("Čítanie QR kódu zo súboru nie je podporované týmto prehliadačom.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = objectUrl;
      await img.decode();
      const barcodes = await detector.detect(img);
      if (barcodes.length > 0) {
        const parsed = parsePaymentQr(barcodes[0].rawValue);
        if (parsed && (parsed.iban || parsed.amount)) {
          toast.success("Údaje z QR kódu boli načítané");
          onScanSuccess(parsed);
          onClose();
          return;
        }
      }
      setErrorMsg("V obrázku sa nepodarilo nájsť platný QR kód.");
    } catch (error) {
      console.error("Spracovanie QR obrázka zlyhalo:", error);
      setErrorMsg("Chyba pri spracovaní obrázka.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      e.target.value = "";
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3">
          <h3 className="font-bold text-foreground">Skenovať faktúru / QR</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Prepínač režimu */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
              mode === "camera" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Camera className="size-4" /> Kamera
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setMode("file");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
              mode === "file" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Upload className="size-4" /> Nahrať fotku
          </button>
        </div>

        {/* Zobrazenie kamery */}
        {mode === "camera" && (
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} playsInline muted className="size-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-48 rounded-2xl border-2 border-dashed border-primary/90" />
            </div>
          </div>
        )}

        {/* Nahrávanie súboru */}
        {mode === "file" && (
          <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 text-center hover:bg-muted/50">
            <Upload className="mb-2 size-8 text-primary" />
            <span className="text-sm font-semibold">Vyberte fotografiu faktúry</span>
            <span className="mt-1 text-xs text-muted-foreground">PNG, JPG alebo screenshot QR kódu</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        )}

        {errorMsg && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
