import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert, Clock, LogOut, RefreshCw } from "lucide-react";

// Doba nečinnosti: 5 minút (300 sekúnd), varovanie sa zobrazí 60 sekúnd pred koncom
const INACTIVITY_TIMEOUT_SEC = 300;
const WARNING_BEFORE_SEC = 60;

export function SessionTimeoutWarning() {
  const navigate = useNavigate();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(INACTIVITY_TIMEOUT_SEC);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());

  // Zaznamenanie aktivity používateľa
  const recordActivity = useCallback(() => {
    if (isExpired) return;
    lastActivityRef.current = Date.now();
  }, [isExpired, navigate]);

  // Sledovanie interakcií používateľa
  useEffect(() => {
    const events = ["mousedown", "touchstart", "keydown", "scroll"];
    const handleUserAction = () => recordActivity();

    events.forEach((evt) => window.addEventListener(evt, handleUserAction, { passive: true }));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserAction));
    };
  }, [recordActivity]);

  // Hlavný interval odpočítavania
  useEffect(() => {
    if (isExpired) return;

    const interval = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_SEC - elapsedSec);

      setSecondsRemaining(remaining);

      if (remaining <= WARNING_BEFORE_SEC && remaining > 0) {
        setShowWarning(true);
      } else if (remaining > WARNING_BEFORE_SEC) {
        setShowWarning(false);
      } else if (remaining === 0) {
        // Relácia vypršala
        setIsExpired(true);
        setShowWarning(false);
        void supabase.auth.signOut({ scope: "local" }).then(({ error }) => {
          if (error) {
            console.error("Automatické odhlásenie zlyhalo:", error);
            setSessionError("Reláciu sa nepodarilo bezpečne ukončiť. Skúste sa odhlásiť znova.");
          } else {
            void navigate({ to: "/auth" });
          }
        }).catch((error: unknown) => {
          console.error("Automatické odhlásenie zlyhalo:", error);
          setSessionError("Reláciu sa nepodarilo bezpečne ukončiť. Skúste sa odhlásiť znova.");
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired]);

  // Predĺženie relácie
  const handleStaySignedIn = async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) throw error ?? new Error("Reláciu sa nepodarilo obnoviť.");
      lastActivityRef.current = Date.now();
      setSessionError(null);
      setSecondsRemaining(INACTIVITY_TIMEOUT_SEC);
      setShowWarning(false);
    } catch (error) {
      console.error("Obnovenie relácie zlyhalo:", error);
      setSessionError("Reláciu sa nepodarilo obnoviť. Prihláste sa znova.");
      setIsExpired(true);
      setShowWarning(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Okamžité odhlásenie
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setSessionError(null);
      await navigate({ to: "/auth" });
    } catch (error) {
      console.error("Odhlásenie zlyhalo:", error);
      setSessionError("Odhlásenie sa nepodarilo. Skúste to znova.");
      toast.error("Odhlásenie sa nepodarilo.");
    }
  };

  // Ak nevyskočilo varovanie ani vypršanie, nič nerenderovať
  if (!showWarning && !isExpired) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-detail-surface p-6 shadow-2xl border border-detail-action-surface text-detail-ink">
        {isExpired ? (
          // Dialóg po vypršaní relácie
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
              <Clock className="h-8 w-8 stroke-[2.2]" />
            </div>
            <h2 className="text-[19px] font-bold">Relácia vypršala</h2>
            <p className="mt-2 text-[14px] text-detail-muted leading-relaxed">
              {sessionError ?? "Relácia vypršala z dôvodu nečinnosti. Prihláste sa prosím znova."}
            </p>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-6 w-full rounded-2xl bg-[#196ee6] py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#196ee6]/25 transition active:scale-95"
            >
              Prihlásiť sa znova
            </button>
          </div>
        ) : (
          // Upozornenie pred vypršaním
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#196ee6]/15 text-[#196ee6]">
              <ShieldAlert className="h-8 w-8 stroke-[2.2]" />
            </div>
            <h2 className="text-[19px] font-bold">Relácia čoskoro vyprší</h2>
            <p className="mt-2 text-[14px] text-detail-muted leading-relaxed">
              Z dôvodu nečinnosti budete o chvíľu automaticky odhlásený.
            </p>

            <div className="my-5 flex items-center justify-center gap-2 rounded-2xl bg-detail-action-surface py-3 text-[16px] font-bold text-[#196ee6]">
              <Clock className="h-5 w-5" />
              <span>Odhlásenie o {secondsRemaining} s</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleStaySignedIn}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#196ee6] py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#196ee6]/25 transition active:scale-95 disabled:opacity-60"
              >
                {isRefreshing ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <span>Zostať prihlásený</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full rounded-2xl bg-detail-action-surface py-3 text-[14px] font-semibold text-detail-muted transition hover:text-detail-ink active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span>Odhlásiť sa teraz</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
