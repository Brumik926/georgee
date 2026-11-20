import { X, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MTokenModal({ 
  open, 
  onConfirm, 
  onCancel, 
  amount, 
  recipient 
}: { 
  open: boolean; 
  onConfirm: () => void; 
  onCancel: () => void;
  amount: string;
  recipient: string;
}) {
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (!open) {
      setSeconds(30);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[360px] animate-in fade-in zoom-in-95 duration-200 rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-bold">mToken</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> 0:{seconds.toString().padStart(2, "0")}
          </div>
        </div>

        <div className="mb-6 space-y-2 text-center">
          <p className="text-[14px] text-muted-foreground">Potvrdenie platby</p>
          <p className="text-[24px] font-bold text-foreground">{amount} €</p>
          <p className="text-[15px] font-medium text-foreground truncate">{recipient}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-primary-foreground transition active:scale-95"
          >
            <CheckCircle2 className="h-5 w-5" /> Potvrdiť platbu
          </button>
          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 py-4 font-bold text-foreground transition active:scale-95"
          >
            <X className="h-5 w-5" /> Zrušiť
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
