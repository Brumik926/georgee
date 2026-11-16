import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  CreditCard, 
  PiggyBank, 
  PieChart, 
  Bell, 
  ArrowDownLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Fingerprint, 
  LogOut,
  ShieldCheck,
  Smartphone,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resetStore, saveProfile, useBank } from "@/lib/bank-store";
import { isPrimaryEmail } from "@/lib/accounts";
import { resetNotifications, unreadCount, useNotifications } from "@/lib/notifications";
import { useTheme } from "@/lib/theme";
import { validateIban } from "@/lib/iban-validator";
import { listLogins, type LoginEvent } from "@/lib/login-log";
import {
  clearUnlocked,
  disableBiometric,
  enableBiometric,
  isBiometricEnabled,
  isBiometricSupported,
} from "@/lib/biometric";

export const Route = createFileRoute("/_authenticated/nastavenia")({
  head: () => ({
    meta: [
      { title: "Nastavenia | Aplikácia" },
      { name: "description", content: "Nastavenia účtu, zabezpečenia a vzhľadu aplikácie." },
      { property: "og:title", content: "Nastavenia | Aplikácia" },
      { property: "og:description", content: "Nastavenia účtu, zabezpečenia a vzhľadu aplikácie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Nastavenia,
});

function Nastavenia() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const s = useBank();
  const notifs = useNotifications();
  const unread = unreadCount(notifs);
  const [isPrimary, setIsPrimary] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsPrimary(isPrimaryEmail(data.user?.email));
    });
  }, []);

  // Profilové údaje
  const [owner, setOwner] = useState("");
  const [iban, setIban] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setOwner(s.owner || "Používateľ");
    setIban(s.iban || "");
  }, [s.owner, s.iban]);

  // Téma (Denný / Nočný režim) — spravuje ThemeProvider v koreni
  const { isLight: light, toggleTheme } = useTheme();

  // Biometria
  const [userId, setUserId] = useState<string | null>(null);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioUnlockOn, setBioUnlockOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const uid = data.user?.id ?? null;
        if (!active) return;
        setUserId(uid);

        const supported = await isBiometricSupported();
        if (!active) return;
        setBioSupported(supported);

        if (uid) setBioUnlockOn(isBiometricEnabled(uid));
      } catch (error) {
        console.error("Načítanie nastavenia biometrie zlyhalo:", error);
        if (active) {
          setBioSupported(false);
          toast.error("Nastavenie biometrie sa nepodarilo načítať.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function toggleBioUnlock() {
    if (!userId || bioBusy) return;
    setBioBusy(true);
    try {
      if (bioUnlockOn) {
        disableBiometric(userId);
        clearUnlocked(userId);
        setBioUnlockOn(false);
        toast.success("Odomknutie biometriou bolo vypnuté");
      } else {
        await enableBiometric(userId, "George Demo");
        setBioUnlockOn(true);
        toast.success("Odomknutie biometriou bolo aktivované");
      }
    } catch (error) {
      console.error("Zmena nastavenia biometrie zlyhala:", error);
      toast.error("Nastavenie biometrie sa nepodarilo zmeniť.");
    } finally {
      setBioBusy(false);
    }
  }


  async function handleSaveProfile() {
    if (profileSaving) return;
    if (!owner.trim()) {
      toast.error("Zadajte meno majiteľa účtu.");
      return;
    }
    if (iban.trim()) {
      const validation = validateIban(iban);
      if (!validation.valid) {
        toast.error(validation.error ?? "Zadajte platný IBAN.");
        return;
      }
    }
    setProfileSaving(true);
    try {
      await saveProfile(owner.trim(), iban.trim());
      setIsEditing(false);
      toast.success("Údaje účtu boli uložené.");
    } catch (error) {
      console.error("Uloženie profilu zlyhalo:", error);
      toast.error(error instanceof Error ? error.message : "Údaje účtu sa nepodarilo uložiť.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearUnlocked();
      resetStore();
      resetNotifications();
      queryClient.clear();
      toast.success("Boli ste úspešne odhlásený.");
      await navigate({ to: "/auth" });
    } catch (error) {
      console.error("Odhlásenie zlyhalo:", error);
      toast.error("Odhlásenie sa nepodarilo. Skúste to znova.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] pb-24 transition-colors">
      
      {/* Modrá hlavička */}
      <div className="brand-header px-5 pt-5 pb-14 text-brand-foreground transition-colors">
        <Link 
          to="/" 
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <h1 className="text-[32px] font-extrabold tracking-tight text-white mt-4 leading-tight">
          Nastavenia
        </h1>
        <p className="text-[14px] text-white/80 font-medium">
          {owner || "Používateľ"}
        </p>
        
      </div>

      {/* Telo nastavení */}
      <div className="px-4 -mt-8 space-y-5">
        
        {/* Navigačné položky */}
        <div className="rounded-3xl bg-surface shadow-sm border border-border divide-y divide-border overflow-hidden">
          <Link to="/karty" className="flex items-center justify-between p-4 hover:bg-surface-2 transition">
            <div className="flex items-center gap-3.5">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="text-[15px] font-semibold">Karty</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>

          <Link to="/sporenie" className="flex items-center justify-between p-4 hover:bg-surface-2 transition">
            <div className="flex items-center gap-3.5">
              <PiggyBank className="w-5 h-5 text-primary" />
              <span className="text-[15px] font-semibold">Sporenie a ciele</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>

          <Link to="/rozpocet" className="flex items-center justify-between p-4 hover:bg-surface-2 transition">
            <div className="flex items-center gap-3.5">
              <PieChart className="w-5 h-5 text-primary" />
              <span className="text-[15px] font-semibold">Rozpočet</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>

          <Link to="/upozornenia" className="flex items-center justify-between p-4 hover:bg-surface-2 transition">
            <div className="flex items-center gap-3.5">
              <Bell className="w-5 h-5 text-primary" />
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">Upozornenia</span>
                {unread > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[11px] font-bold">
                    {unread}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>

          <Link to="/prijat" className="flex items-center justify-between p-4 hover:bg-surface-2 transition">
            <div className="flex items-center gap-3.5">
              <ArrowDownLeft className="w-5 h-5 text-primary" />
              <span className="text-[15px] font-semibold">Prijať peniaze</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>

          <Link to="/centrum-platieb" className="flex items-center justify-between p-4 hover:bg-surface-2 transition">
            <div className="flex items-center gap-3.5">
              <ArrowDownLeft className="w-5 h-5 rotate-180 text-primary" />
              <span className="text-[15px] font-semibold">Centrum platieb</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>

          {isPrimary && (
            <Link to="/protokol-pristupov" className="flex items-center justify-between p-4 hover:bg-surface-2 transition">
              <div className="flex items-center gap-3.5">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="text-[15px] font-semibold">Protokol prístupov</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>
          )}
        </div>

        {/* VZHĽAD */}
        <div>
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase px-1 mb-2">
            Vzhľad
          </p>
          <div className="rounded-3xl bg-surface p-4 shadow-sm border border-border flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-slate-700 dark:text-zinc-200">
                {light ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-[15px] font-semibold">Denný režim</p>
                <p className="text-[12px] text-muted-foreground">Prepnite kedykoľvek</p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className={`w-12 h-7 rounded-full p-1 transition-colors ${
                light ? "bg-primary" : "bg-surface-2"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                light ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
        </div>

        {/* ZABEZPEČENIE */}
        <div>
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase px-1 mb-2">
            Zabezpečenie
          </p>
          <div className="rounded-3xl bg-surface shadow-sm border border-border divide-y divide-border overflow-hidden">
            
            {/* Odomknutie biometriou */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-primary">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold">Odomknutie biometriou</p>
                  <p className="text-[12px] text-muted-foreground">Lokálne odomknutie zariadenia. Nenahrádza bankovú autorizáciu ani nepotvrdzuje skutočnú platbu.</p>
                </div>
              </div>

              <button
                type="button"
                type="button"
                role="switch"
                aria-checked={bioUnlockOn}
                aria-label="Odomknutie biometriou"
                onClick={toggleBioUnlock}
                disabled={bioBusy || !userId || !bioSupported}
                className={`w-12 h-7 rounded-full p-1 transition-colors ${
                  bioUnlockOn ? "bg-primary" : "bg-surface-2"
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  bioUnlockOn ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>



          </div>
        </div>

        {/* POSLEDNÉ PRÍSTUPY (viditeľné len pre primárny účet) */}
        {isPrimary && <LoginHistory />}

        {/* MÔJ ÚČET */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Môj účet
            </p>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              {isEditing ? "Zrušiť" : "Upraviť"}
            </button>
          </div>

          <div className="rounded-3xl bg-surface p-5 shadow-sm border border-border space-y-4">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="profile-owner" className="text-xs text-muted-foreground font-medium">Meno majiteľa</label>
                  <input
                    id="profile-owner"
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    maxLength={100}
                    autoComplete="name"
                    className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="profile-iban" className="text-xs text-muted-foreground font-medium">IBAN</label>
                  <input
                    id="profile-iban"
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    maxLength={42}
                    autoComplete="off"
                    className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-[#196ee6]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm active:scale-98 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {profileSaving ? "Ukladám…" : "Uložiť zmeny"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vlastník</span>
                  <span className="font-semibold text-foreground">{owner}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">IBAN</span>
                  <span className="font-mono font-medium text-foreground">{iban || "IBAN nie je nastavený"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Typ účtu</span>
                  <span className="font-semibold text-foreground">Bežný účet</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tlačidlo Odhlásiť sa */}
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="w-full py-4 rounded-2xl bg-surface text-destructive font-semibold text-[15px] flex items-center justify-center gap-2 border border-border shadow-sm active:scale-[0.99] transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          <span>{signingOut ? "Odhlasujem…" : "Odhlásiť sa"}</span>
        </button>

      </div>
    </div>
  );
}

function LoginHistory() {
  const [items, setItems] = useState<LoginEvent[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    setItems(null);
    void listLogins()
      .then(setItems)
      .catch((error: unknown) => {
        console.error("Načítanie posledných prístupov zlyhalo:", error);
        setItems([]);
        setLoadError(true);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const fmt = (d: string) => {
    const date = new Date(d);
    if (!Number.isFinite(date.getTime())) return "Neznámy dátum";
    return date.toLocaleString("sk-SK", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Posledné prístupy
        </h2>
        <Link
          to="/protokol-pristupov"
          className="text-[12px] font-semibold text-primary flex items-center gap-1 hover:underline"
        >
          <span>Celý protokol</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="rounded-3xl bg-surface shadow-sm border border-border divide-y divide-border overflow-hidden">
        {items === null ? (
          <p className="p-4 text-sm text-slate-400">Načítavam prístupy…</p>
        ) : loadError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-destructive">Posledné prístupy sa nepodarilo načítať.</p>
            <button type="button" onClick={load} className="text-sm font-semibold text-primary">Skúsiť znova</button>
          </div>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">Zatiaľ žiadne cudzie prístupy.</p>
        ) : (
          items.slice(0, 5).map((e, i) => (
            <div key={e.id} className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-primary shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold truncate text-foreground">
                  {e.email || "Neznámy e-mail"}
                </p>
                <p className="text-[12px] text-muted-foreground truncate">
                  {e.device || "Zariadenie"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[12px] font-medium text-muted-foreground">
                  {fmt(e.created_at)}
                </p>
                {i === 0 && (
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-income/10 text-income text-[11px] font-semibold">
                    Najnovší
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
