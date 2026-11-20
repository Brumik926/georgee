
import { createPortal } from "react-dom";
import { ShieldCheck, Fingerprint, X, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MTokenModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  amount, 
  recipient 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  amount: string;
  recipient: string;
}) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[400px] bg-background rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <h2 className="text-xl font-bold text-foreground mb-1">Potvrďte platbu</h2>
        <p className="text-sm text-muted-foreground mb-6">George mToken</p>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between py-3 border-b border-border">
            <span className="text-muted-foreground">Príjemca</span>
            <span className="font-semibold">{recipient}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border">
            <span className="text-muted-foreground">Suma</span>
            <span className="font-bold text-lg">{amount}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={onClose}>Zamietnuť</Button>
          <Button className="flex-1 rounded-2xl bg-primary" onClick={onConfirm}>Potvrdiť</Button>
        </div>
        
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
          <Timer className="w-3 h-3" />
          <span>Platnosť požiadavky: 00:28</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
