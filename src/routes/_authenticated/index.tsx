import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, BarChart3 } from "lucide-react";
import {
  Search,
  CreditCard,
  MoreVertical,
  TrendingUp,
  ArrowLeft,
  Plane,
  ShoppingBag,
  Medal,
  Calculator,
  User,
  Smartphone,
  Contact,
  FileText,
  Bell,
  Users,
  Layout,
  Globe,
  AppWindow,
  Type,
  Camera,
  Info,
  ShieldCheck,
  UserX,
  LogOut,
  ChevronRight,
  Landmark,
  MapPin,
  Plus,
  type LucideIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  balance,
  formatDate,
  formatEur,
  hydrate,
  monthTotals,
  MONTHS,
  resetStore,
  sortTransactionsNewestFirst,
  useBank,
  type Txn
} from "@/lib/bank-store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Prehľad účtu · George" },
      { name: "description", content: "Prehľad účtu, zostatku, príjmov a výdavkov." },
      { property: "og:title", content: "Prehľad účtu · George" },
      { property: "og:description", content: "Prehľad účtu, zostatku, príjmov a výdavkov." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GeorgePrehladModern,
});

function splitAmount(val: number) {
  const abs = Math.abs(val);
  const [w, d] = abs.toFixed(2).split(".");
  return {
    whole: Number(w).toLocaleString("sk-SK"),
    cents: d,
    isNegative: val < 0,
  };
}

function formatIbanDisplay(rawIban?: string | null): string {
  if (!rawIban) return "IBAN nie je nastavený";
  const cleaned = rawIban.replace(/\s+/g, "");
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(" ") : rawIban;
}

function getInitials(name?: string | null): string {
  if (!name) return "??";
  const cleaned = name.replace(/[·•\-–—_/\\()[\],.:;!?@#$%^&*+='"`]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "??";
  if (words.length === 1) {
    const single = words[0]!;
    return single.length >= 2 ? single.slice(0, 2).toUpperCase() : single.toUpperCase();
  }
  return ((words[0]![0] ?? "") + (words[words.length - 1]![0] ?? "")).toUpperCase();
}

function getAvatarColor(name?: string | null): string {
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
  ];
  const str = name || "unknown";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length]!;
}

// Komponent loga obchodníka
function DemoMark({ size = 40 }: { size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full border border-primary/15 bg-primary/10 text-primary" style={{ width: size, height: size }}><Landmark size={Math.round(size * 0.48)} /></span>;
}

function MerchantLogo({ counterparty, category }: { counterparty: string; category?: string }) {
  const name = (counterparty || "").toLowerCase();

  const isBankFee =
    name.includes("poplatok") ||
    name.includes("vedenie účtu") ||
    name.includes("vedenie uctu") ||
    name.includes("správa účtu") ||
    name.includes("sprava uctu") ||
    name.includes("slsp") ||
    name.includes("sporiteľňa") ||
    name.includes("sporitelna") ||
    (category || "").toLowerCase().includes("poplatk");

  if (isBankFee) {
    return <DemoMark size={40} />;
  }

  if (name.includes("kaufland")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#d61e2b] flex items-center justify-center shrink-0 shadow-sm p-1">
        <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-[#d61e2b] text-[16px]">
          K
        </div>
      </div>
    );
  }

  if (name.includes("tesco")) {
    return (
      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center shrink-0 shadow-sm px-1">
        <span className="text-[#00539f] font-black text-[9px] tracking-tight leading-none">TESCO</span>
        <div className="flex gap-0.5 mt-0.5">
          
          
          
        </div>
      </div>
    );
  }

  if (name.includes("mcdonald") || name.includes("mc donald")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#da291c] flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#ffc72c]">
          <path d="M4.5 19.5c0-4.8 1.8-9 4-9 1.6 0 2.9 2.2 3.5 5.5.6-3.3 1.9-5.5 3.5-5.5 2.2 0 4 4.2 4 9h2c0-6-2.5-11-5.5-11-1.9 0-3.3 1.8-4 4.5-.7-2.7-2.1-4.5-4-4.5C5 8.5 2.5 13.5 2.5 19.5h2z" />
        </svg>
      </div>
    );
  }

  if (name.includes("shell")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#fbce07] flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#dd1d21]">
          <path d="M12 3.5c-4 0-6.5 3.5-6.5 7.5 0 2.8 1.2 5 2.5 6.5l.5.5h7l.5-.5c1.3-1.5 2.5-3.7 2.5-6.5 0-4-2.5-7.5-6.5-7.5zm0 2.2c1.8 0 3.2 1.5 3.8 3.3-.8-.3-1.8-.5-3.8-.5s-3 .2-3.8.5c.6-1.8 2-3.3 3.8-3.3zm-4.7 4.8c.8-.3 2-.6 4.7-.6s3.9.3 4.7.6c.1.6.3 1.3.3 2-.9-.2-2.3-.4-5-.4s-4.1.2-5 .4c0-.7.2-1.4.3-2zm.4 4c1-.2 2.4-.4 4.3-.4s3.3.2 4.3.4c-.4 1.5-1.4 3-2.3 4H10c-.9-1-1.9-2.5-2.3-4z"/>
        </svg>
      </div>
    );
  }

  if (name.includes("netflix")) {
    return (
      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 shadow-sm border border-white/10">
        <span className="text-[#e50914] font-black text-[18px] font-sans leading-none">N</span>
      </div>
    );
  }

  if (name.includes("spotify")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#1ed760] flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.75.75 0 0 1-1.033.247c-2.827-1.728-6.386-2.118-10.578-1.16a.75.75 0 1 1-.334-1.462c4.588-1.048 8.528-.606 11.7 1.342a.75.75 0 0 1 .245 1.033zm1.226-2.723a.937.937 0 0 1-1.291.309c-3.236-1.99-8.169-2.565-11.997-1.402a.938.938 0 0 1-.548-1.794c4.375-1.328 9.815-.688 13.527 1.596a.938.938 0 0 1 .309 1.291zm.106-2.835C14.04 8.583 7.64 8.37 3.935 9.495a1.125 1.125 0 1 1-.652-2.154c4.254-1.291 11.318-1.047 15.776 1.597a1.125 1.125 0 1 1-1.141 1.928z"/>
        </svg>
      </div>
    );
  }

  if (name.includes("billa")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#ffcc00] flex items-center justify-center shrink-0 shadow-sm border border-amber-300">
        <span className="text-[#d81e05] font-black text-[11px] tracking-tight">BILLA</span>
      </div>
    );
  }

  if (name.includes("lidl")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#0050aa] flex items-center justify-center shrink-0 shadow-sm p-0.5">
        <div className="w-full h-full bg-[#fff000] rounded-full flex items-center justify-center border border-[#d00010]">
          <span className="text-[#0050aa] font-black text-[9px] tracking-tight">LiDL</span>
        </div>
      </div>
    );
  }

  if (name.includes("slovnaft")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#ffcc00] flex items-center justify-center shrink-0 shadow-sm border border-amber-300">
        <span className="text-black font-black text-[8px] tracking-tighter uppercase">SLOVNAFT</span>
      </div>
    );
  }

  return <DemoMark size={40} />;
}

interface ListItemProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
  isLast?: boolean;
  onClick?: () => void;
}

function ListItem({ icon: Icon, title, subtitle, badge, isLast, onClick }: ListItemProps) {
  const content = (
    <>
      <div className="flex items-center gap-3.5">
        <div className="text-muted-foreground">
          <Icon size={22} strokeWidth={1.8} />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">
            {title}
          </div>
          {(subtitle || !onClick) && (
            <div className="text-[12px] text-gray-400 dark:text-muted-foreground mt-0.5">{subtitle || "Zatiaľ nedostupné"}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#196ee6] text-white">
            {badge}
          </span>
        )}
        {onClick && <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />}
      </div>
    </>
  );
  const className = `flex items-center justify-between py-3.5 transition-opacity ${
    !isLast ? "border-b border-border" : ""
  }`;

  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} w-full text-left active:opacity-60`}>
      {content}
    </button>
  ) : (
    <div aria-disabled="true" className={`${className} cursor-default`}>
      {content}
    </div>
  );
}

export function GeorgePrehladModern() {
  const s = useBank();
  const navigate = useNavigate();

  const [currentViewMode, setCurrentViewMode] = useState<"dashboard" | "profile">("dashboard");
  const [loggingOut, setLoggingOut] = useState(false);
  const userName = s.owner;

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem("george-hide-balance") === "1");
    } catch {
      // Pri vypnutom úložisku ponecháme predvolený stav zobrazenia zostatku.
    }
  }, []);

  function toggleHidden() {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("george-hide-balance", next ? "1" : "0");
      } catch {
        // Úložisko môže byť v prehliadači vypnuté; zobrazenie zostatku zostane dostupné.
      }
      return next;
    });
  }

  const currentMonth = new Date();
  const totals = monthTotals(s, currentMonth);
  const total = balance(s);
  const totalParts = splitAmount(total);
  const expParts = splitAmount(totals.expense);
  const incParts = splitAmount(totals.income);
  const savParts = splitAmount(s.goals.reduce((sum, goal) => sum + goal.saved, 0));

  const recentTransactions = sortTransactionsNewestFirst(s.transactions ?? []).slice(0, 4);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      resetStore();
      await navigate({ to: "/auth" });
    } catch (error) {
      console.error("Odhlásenie z prehľadu zlyhalo:", error);
      toast.error("Odhlásenie sa nepodarilo. Skúste to znova.");
    } finally {
      setLoggingOut(false);
    }
  }

  // --- OBSAH PROFILU ---
  const profileContent = (
    <div
      className="min-h-screen pb-16 transition-colors duration-300 bg-[#f4f6f9] dark:bg-[#0e0e12] text-gray-900 dark:text-white"
      style={{ fontFamily: "'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <main className="px-4 max-w-md mx-auto pt-6">
        <div className="flex justify-between items-center gap-3 pb-4 mb-2">
          <button
            type="button"
            onClick={() => setCurrentViewMode("dashboard")}
            className="p-2 -ml-2 rounded-full transition-colors text-primary hover:bg-blue-50 dark:hover:bg-white/10"
            aria-label="Späť na prehľad"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="font-bold text-[14px] hover:underline flex items-center gap-1.5 text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={18} />
              {loggingOut ? "Odhlasujem…" : "Odhlásiť"}
            </button>
          </div>
        </div>

        <h1 className="text-[26px] font-bold mb-6 text-[#111827] dark:text-white">Profil</h1>

        {/* Karta používateľa */}
        <div className="rounded-3xl p-5 mb-8 shadow-sm border flex justify-between items-center bg-surface border-border">
          <div>
            <span className="text-[17px] font-bold block text-gray-900 dark:text-white">
              {userName}
            </span>
            <span className="text-[12px] font-mono text-gray-400 mt-1 block">
              {formatIbanDisplay(s.iban)}
            </span>
          </div>
          <div className="w-14 h-14 bg-black rounded-full overflow-hidden flex items-center justify-center border border-gray-700 shadow-sm">
            <span className="text-3xl">🐻</span>
          </div>
        </div>

        {/* Sekcia: Doplnky */}
        <div className="mb-8">
          <h2 className="text-[13px] font-bold mb-3 px-1 text-gray-900 dark:text-gray-400">
            Doplnky
          </h2>
          <div className="rounded-3xl px-5 py-1 shadow-sm border bg-surface border-border">
            <ListItem icon={Plane} title="Travel Hub" />
            <ListItem
              icon={ShoppingBag}
              title="Ponuky a odmeny"
              subtitle="Dostupné ponuky"
              
              onClick={() => toast.info("Odmeny zatiaľ nie sú dostupné.")}
            />
            <ListItem
              icon={Medal}
              title="Moja odmena"
              onClick={() => toast.info("Odmeny zatiaľ nie sú dostupné.")}
            />
            <ListItem icon={Calculator} title="Menová kalkulačka" />
            <ListItem
              icon={MapPin}
              title="Pobočky a bankomaty"
              subtitle="Vyhľadať v externých mapách"
              onClick={() => void navigate({ to: "/lokality" })}
            />
            <ListItem
              icon={TrendingUp}
              title="Ponuka investícií"
              subtitle="Portfóliá"
              isLast={true}
              onClick={() => toast.info("Investície zatiaľ nie sú dostupné.")}
            />
          </div>
        </div>

        {/* Sekcia: Profil nastavenia */}
        <div className="mb-8">
          <h2 className="text-[13px] font-bold mb-3 px-1 text-gray-900 dark:text-gray-400">
            Profil
          </h2>
          <div className="rounded-3xl px-5 py-1 shadow-sm border bg-surface border-border">
            <ListItem
              icon={User}
              title="Prihlásenie a podpisovanie"
              onClick={() => navigate({ to: "/nastavenia" })}
            />
            <ListItem icon={Smartphone} title="Správa zariadení" />
            <ListItem
              icon={Contact}
              title="Vaše kontaktné údaje"
              onClick={() => navigate({ to: "/nastavenia" })}
            />
            <ListItem icon={FileText} title="Doklady totožnosti" />
            <ListItem icon={Bell} title="Notifikácie" />
            <ListItem icon={Users} title="Vaše klientske údaje" isLast={true} />
          </div>
        </div>

        {/* Sekcia: Aplikácia */}
        <div className="mb-8">
          <h2 className="text-[13px] font-bold mb-3 px-1 text-gray-900 dark:text-gray-400">
            Aplikácia
          </h2>
          <div className="rounded-3xl px-5 py-1 shadow-sm border bg-surface border-border">
            <ListItem icon={Layout} title="Prispôsobiť prehľad" />
            <ListItem icon={Globe} title="Zmeniť jazyk" />
            <ListItem icon={AppWindow} title="Ikona aplikácie" />
            <ListItem
              icon={Type}
              title="Prispôsobenie vzhľadu"
              onClick={() => navigate({ to: "/nastavenia" })}
            />
            <ListItem icon={Camera} title="Snímky obrazovky" isLast={true} />
          </div>
        </div>

        {/* Sekcia: O aplikácii */}
        <div className="mb-8">
          <h2 className="text-[13px] font-bold mb-3 px-1 text-gray-900 dark:text-gray-400">
            O aplikácii
          </h2>
          <div className="rounded-3xl px-5 py-1 shadow-sm border bg-surface border-border">
            <ListItem icon={Info} title="Informácie" />
            <ListItem icon={ShieldCheck} title="Kontrola zabezpečenia" />
            <ListItem icon={UserX} title="Zrušiť elektronické služby" isLast={true} />
          </div>
        </div>

        {/* Sekcia: Ďalšie aplikácie */}
        <div className="mb-10">
          <h2 className="text-[13px] font-bold mb-3 px-1 text-gray-900 dark:text-gray-400">
            Ďalšie aplikácie
          </h2>
          <div className="rounded-3xl px-5 py-1 shadow-sm border bg-surface border-border">
            <ListItem
              icon={CreditCard}
              title="Digitálna peňaženka"
              subtitle="Zatiaľ nedostupná"
              isLast={true}
            />
          </div>
        </div>

        {/* Pätička */}
        <div className="text-center pb-8 flex flex-col items-center">
          <div className="flex items-center justify-center mb-4">
            <span className="font-bold text-[15px] tracking-tight text-[#111827] dark:text-white">
              George
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Prehľad účtu a financií</p>
          
          
        </div>
      </main>
    </div>
  );

  // --- SHELL: DASHBOARD ---
  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[430px] bg-background pb-28 text-foreground transition-colors duration-300"
      style={{ fontFamily: "'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {currentViewMode === "profile" ? profileContent : (
        <>
          {/* Modrá hlavička */}
          <div className="pt-6 pb-20 px-4 transition-colors duration-300 bg-[#196ee6] dark:bg-[#0e0e12] text-white rounded-b-3xl dark:rounded-none">
            <header className="flex items-center justify-between gap-2">
              
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  to="/platby"
                  className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                  title="Hľadať platby"
                >
                  <Search size={22} />
                </Link>

                <Link
                  to="/karty"
                  className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                  title="Karty"
                >
                  <CreditCard size={22} />
                </Link>

                <button
                  type="button"
                  onClick={() => setCurrentViewMode("profile")}
                  className="relative block cursor-pointer transition-transform hover:scale-105 active:scale-95 ml-1"
                  title="Profil"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 shadow-sm flex items-center justify-center font-bold text-sm bg-white/20 border-white text-white dark:bg-gray-700 dark:border-gray-600">
                    🐻
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 border-2 rounded-full bg-[#e63946] border-[#196ee6] dark:bg-[#ff5252] dark:border-[#0e0e12]" />
                </button>
              </div>
            </header>

            <h1 className="text-[26px] font-bold mt-4 tracking-tight">
              Prehľad
            </h1>
          </div>

          {/* Hlavný obsah */}
          <main className="px-4 -mt-12 relative z-10">
            {/* Rýchle akcie – samostatná navigačná skupina pre najčastejšie úlohy */}
            <section aria-label="Rýchle akcie" className="mb-5 grid grid-cols-4 gap-2">
              <Link
                to="/nova-platba"
                className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-2 py-3 text-center shadow-sm transition hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Plus size={20} strokeWidth={2.2} /></span>
                <span className="text-[11px] font-semibold leading-tight text-foreground">Nová platba</span>
              </Link>
              <Link
                to="/platby"
                className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-2 py-3 text-center shadow-sm transition hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Search size={19} /></span>
                <span className="text-[11px] font-semibold leading-tight text-foreground">História</span>
              </Link>
              <Link
                to="/karty"
                className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-2 py-3 text-center shadow-sm transition hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><CreditCard size={19} /></span>
                <span className="text-[11px] font-semibold leading-tight text-foreground">Karty</span>
              </Link>
              <button
                type="button"
                onClick={() => toast.info("Vyhľadávanie pobočiek a bankomatov zatiaľ nie je dostupné.")}
                className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-2 py-3 text-center shadow-sm transition hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><MapPin size={19} /></span>
                <span className="text-[11px] font-semibold leading-tight text-foreground">Pobočky</span>
              </button>
            </section>

            {/* Sekcia: Výdavky a Príjmy za aktuálny mesiac */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Link
                to="/rozpocet"
                className="rounded-3xl p-4 block active:scale-[0.98] bg-surface shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[13px] font-medium text-foreground leading-snug">
                    Výdavky za {MONTHS[currentMonth.getMonth()]?.toLowerCase()}
                  </span>
                  <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                    <BarChart3 size={15} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="mt-1.5 flex min-h-7 items-baseline text-[19px] font-bold tracking-tight text-foreground" aria-live="polite">
                  {s.loading ? (
                    <span className="text-sm font-medium text-muted-foreground">Načítavam…</span>
                  ) : s.error ? (
                    <span className="text-sm font-medium text-muted-foreground">Nedostupné</span>
                  ) : (
                    <>
                      <span>{expParts.whole}</span>
                      <span>,</span>
                      <sup className="text-[11px] font-bold top-[-0.55em] ml-0.5">{expParts.cents}</sup>
                      <span className="ml-1">€</span>
                    </>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {s.loading ? "Načítavam rozpočty…" : s.error ? "Rozpočet nie je dostupný" : s.budgets.length === 0 ? "Rozpočet nie je nastavený" : `${s.budgets.length} ${s.budgets.length === 1 ? "nastavený limit" : "nastavené limity"}`}
                </div>
              </Link>

              <div className="rounded-3xl p-4 bg-surface shadow-sm">
                <span className="text-[13px] font-medium text-foreground leading-snug block min-h-8">
                  Príjmy za {MONTHS[currentMonth.getMonth()]?.toLowerCase()}
                </span>
                <div className="mt-1.5 flex min-h-7 items-baseline text-[19px] font-bold tracking-tight text-foreground" aria-live="polite">
                  {s.loading ? (
                    <span className="text-sm font-medium text-muted-foreground">Načítavam…</span>
                  ) : s.error ? (
                    <span className="text-sm font-medium text-muted-foreground">Nedostupné</span>
                  ) : (
                    <>
                      <span>{incParts.whole}</span>
                      <span>,</span>
                      <sup className="text-[11px] font-bold top-[-0.55em] ml-0.5">{incParts.cents}</sup>
                      <span className="ml-1">€</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Nadpis: Vaše produkty */}
            <h2 className="text-[13px] font-medium mb-2.5 px-1 text-muted-foreground">
              Vaše produkty
            </h2>

            {/* KARTA: ÚČET */}
            <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-surface shadow-sm" aria-busy={s.loading}>
              <div className="absolute top-0 left-0 w-full h-1 bg-[#2d2a8f]" />

              <div className="mt-0.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link to="/platby" className="block">
                    <h3 className="text-[16px] font-semibold text-foreground">Účet</h3>
                  </Link>
                  <div className="mt-1 flex items-baseline gap-1">
                    <Link
                      to="/platby"
                      aria-label={`Otvoriť detail účtu. ${s.loading ? "Zostatok sa načítava" : s.error ? "Zostatok nie je dostupný" : hidden ? "Zostatok je skrytý" : `Zostatok ${formatEur(total)}`}`}
                      className={`min-w-0 text-[25px] font-bold tracking-tight ${
                        totalParts.isNegative ? "text-expense" : "text-foreground"
                      }`}
                    >
                      {!hidden && totalParts.isNegative ? "-" : ""}
                      <span>{hidden ? "••••" : s.loading || s.error ? "—" : totalParts.whole}</span>
                      <span>,</span>
                      <sup className="top-[-0.55em] ml-0.5 text-[13px] font-bold leading-none select-none">
                        {hidden ? "••" : s.loading || s.error ? "—" : totalParts.cents}
                      </sup>
                      <span className="ml-1 select-none">€</span>
                    </Link>
                    <button
                      type="button"
                      aria-label={hidden ? "Zobraziť zostatok" : "Skryť zostatok"}
                      aria-pressed={hidden}
                      onClick={toggleHidden}
                      className="shrink-0 self-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <Link to="/platby" className="mt-1 block text-[13px] text-muted-foreground">
                    {hidden
                      ? "•••• € zostatok podľa dostupnej histórie"
                      : s.loading
                        ? "Načítavam zostatok…"
                        : s.error
                          ? "Zostatok nie je dostupný"
                          : `${formatEur(total)} zostatok podľa dostupnej histórie`}
                  </Link>
                  {s.error && (
                    <button
                      type="button"
                      onClick={() => void hydrate()}
                      className="mt-2 text-xs font-semibold text-primary underline"
                    >
                      Skúsiť znova načítať údaje
                    </button>
                  )}
                </div>
                <DemoMark size={52} />
              </div>

              <div className="flex justify-between items-center mt-4">
                <Link
                  to="/nova-platba"
                  className="px-5 py-2 rounded-full font-medium text-[13px] bg-primary/10 text-primary active:scale-95"
                >
                  Nová platba
                </Link>
                <Link to="/platby" className="p-2 rounded-full text-primary" title="Detail účtu">
                  <MoreVertical size={20} />
                </Link>
              </div>
            </div>

            {/* SEKCIA: KARTY A ÚVERY */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2.5 px-2">
                <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Karty a úvery
                </h2>
                <Link
                  to="/karty"
                  className="text-[12px] font-semibold text-primary hover:underline"
                >
                  Správa kariet
                </Link>
              </div>

              {/* Prehľad kariet bez vymyslených údajov */}
              <Link
                to="/karty"
                aria-label="Otvoriť prehľad kariet"
                className="group relative block min-h-44 w-full overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-950 p-5 text-left text-white shadow-lg transition duration-300 hover:shadow-xl active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-white/10 bg-white/[0.03]" />
                <div className="relative z-10 flex h-full min-h-32 flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/65">Platobné karty</p>
                      <p className="mt-1 text-[13px] font-semibold tracking-[0.12em] text-white">Prehľad kariet</p>
                    </div>
                    <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[9px] font-bold tracking-[0.2em] text-white">BEZ ÚDAJOV</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="size-8 text-white/80" />
                    <div>
                      <p className="text-sm font-semibold text-white">Karty nie sú načítané</p>
                      <p className="mt-1 text-xs text-white/65">Otvoriť prehľad kariet</p>
                    </div>
                    <ChevronRight className="ml-auto size-5 text-white/70" />
                  </div>
                </div>
              </Link>
            </div>
              {/* Karta: Investície a sporenie */}
            <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-surface shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#2d2a8f]" />
              <div className="flex justify-between items-start mt-0.5">
                <div>
                  <h3 className="text-[16px] font-semibold text-foreground">Sporenie</h3>
                  <div className="text-[25px] font-bold flex items-baseline tracking-tight text-foreground mt-1">
                    <span>{hidden ? "••••" : s.loading || s.error ? "—" : savParts.whole}</span>
                    <span>,</span>
                    <sup className="text-[13px] font-bold top-[-0.55em] ml-0.5 leading-none">{hidden ? "••" : s.loading || s.error ? "—" : savParts.cents}</sup>
                    <span className="ml-1">€</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Nasporené v cieľoch</p>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=160&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-13 h-13 rounded-full object-cover"
                />
              </div>
              <Link
                to="/sporenie"
                className="mt-4 inline-flex min-h-10 items-center rounded-full bg-primary/10 px-5 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Zobraziť ciele
              </Link>
            </div>

            {/* Karta: Ponuky a odmeny */}
            <div className="rounded-3xl p-5 mb-4 relative overflow-hidden bg-surface shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#a94fb5]" />
              <div className="flex justify-between items-start mt-0.5">
                <div className="pr-3">
                  <h3 className="text-[16px] font-semibold text-foreground">Ponuky a odmeny</h3>
                  <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    Nedostupné
                  </span>
                  <p className="mt-2 text-[13px] text-muted-foreground leading-normal">
                    Databáza odmien nie je v tejto verzii pripojená. Nezobrazujeme vymyslené zľavy.
                  </p>
                </div>
                <div className="w-13 h-13 shrink-0 rounded-full flex items-center justify-center bg-[#fbeefc] dark:bg-[#3a2340] text-[#a94fb5]">
                  <ShoppingBag size={22} />
                </div>
              </div>
              <Link
                to="/odmeny"
                className="mt-4 inline-flex min-h-10 items-center rounded-full bg-primary/10 px-5 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Zobraziť stav odmien
              </Link>
            </div>

            {/* Sekcia: Posledné pohyby */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">
                  Posledné pohyby
                </h2>
                <Link
                  to="/platby"
                  className="text-[12px] font-semibold hover:underline text-primary"
                >
                  Zobraziť všetky
                </Link>
              </div>

              <div className="rounded-3xl divide-y overflow-hidden bg-surface shadow-sm border border-border divide-gray-100 dark:divide-white/5 text-gray-900 dark:text-white">
                {recentTransactions.length === 0 ? (
                  <p className="p-4 text-center text-[13px] text-muted-foreground" role="status">
                    {s.loading ? "Načítavam transakcie…" : s.error ? "Transakcie nie sú dostupné." : "Žiadne nedávne transakcie"}
                  </p>
                ) : (
                  recentTransactions.map((tx) => {
                    const isIncome = tx.type === "in";
                    const txParts = splitAmount(tx.amount);
                    return (
                      <Link
                        key={tx.id}
                        to="/transakcia/$id"
                        params={{ id: tx.id }}
                        aria-label={`${isIncome ? "Prijatá platba" : "Odoslaná platba"}: ${tx.counterparty || "Platba"}, ${formatEur(tx.amount)}, ${formatDate(tx.date)}, kategória ${tx.category}`}
                        className="flex items-center justify-between p-3.5 transition hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-white/5 dark:active:bg-white/10"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <MerchantLogo counterparty={tx.counterparty} category={tx.category} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold truncate text-gray-900 dark:text-white">
                              {tx.counterparty || "Platba"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDate(tx.date)} • {tx.category}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[14px] font-bold flex items-baseline shrink-0 tracking-tight ${
                            isIncome
                              ? "text-[#16a34a] dark:text-[#30d158]"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          <span>{isIncome ? "+" : "-"}</span>
                          <span>{txParts.whole}</span>
                          <span>,</span>
                          <sup className="text-[10px] font-semibold top-[-0.4em] ml-0.5 leading-none select-none">
                            {txParts.cents}
                          </sup>
                          <span className="ml-1 text-[12px] font-normal select-none">€</span>
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
