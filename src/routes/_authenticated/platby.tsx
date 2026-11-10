import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  ArrowLeft, 
  Search, 
  BarChart2, 
  Plus, 
  FileEdit, 
  CreditCard, 
  QrCode, 
  Copy, 
  X,
  RefreshCw,
  Landmark,
  FileText,
  Zap,
  ClipboardCheck,
  Smartphone,
  PiggyBank,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/bank/AppShell";
import { SlspLogo } from "@/components/bank/SlspLogo";
import { balance, formatDate, MONTHS, useBank, type Txn } from "@/lib/bank-store";

export const Route = createFileRoute("/_authenticated/platby")({
  head: () => ({
    meta: [
      { title: "Účet a transakcie | George" },
      { name: "description", content: "História transakcií a správa účtu George" },
    ],
  }),
  component: UcetDetail,
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

// Spoľahlivé vygenerovanie iniciál pre akýkoľvek názov/meno
function getInitials(name?: string | null): string {
  if (!name) return "??";
  
  const cleaned = name
    .replace(/[·•\-–—_/\\()[\],.:;!?@#$%^&*+='"`]/g, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  
  if (words.length === 0) return "??";
  
  if (words.length === 1) {
    const single = words[0]!;
    return single.length >= 2 
      ? single.slice(0, 2).toUpperCase() 
      : single.toUpperCase();
  }
  
  const first = words[0]![0] || "";
  const last = words[words.length - 1]![0] || "";
  const result = (first + last).toUpperCase();
  
  return result.length > 0 ? result : "??";
}

// Deterministická farba pozadia kruhu podľa reťazca
function getAvatarColor(name?: string | null): string {
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-200",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
    "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200",
  ];
  
  const str = name || "unknown";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index]!;
}

// Komponent loga obchodníka s rozšíreným zoznamom slovenských značiek
function MerchantLogo({ counterparty, category }: { counterparty: string; category?: string }) {
  const name = (counterparty || "").toLowerCase();

  // 1. Slovenská sporiteľňa / Poplatok banky
  if (
    name.includes("sporiteľňa") || 
    name.includes("sporitelna") || 
    name.includes("slsp") || 
    name.includes("poplatok za vedenie") || 
    category === "Poplatky"
  ) {
    return <SlspLogo />;
  }

  // 2. Kaufland
  if (name.includes("kaufland")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#d61e2b] flex items-center justify-center shrink-0 shadow-sm p-1">
        <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-[#d61e2b] text-[16px] tracking-tighter">
          K
        </div>
      </div>
    );
  }

  // 3. Tesco
  if (name.includes("tesco")) {
    return (
      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center shrink-0 shadow-sm px-1">
        <span className="text-[#00539f] font-black text-[9px] tracking-tight leading-none">TESCO</span>
        <div className="flex gap-0.5 mt-0.5">
          <span className="w-1.5 h-[2px] bg-[#ee1c25] rounded-full"></span>
          <span className="w-1.5 h-[2px] bg-[#00539f] rounded-full"></span>
          <span className="w-1.5 h-[2px] bg-[#ee1c25] rounded-full"></span>
        </div>
      </div>
    );
  }

  // 4. Lidl
  if (name.includes("lidl")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#0050aa] flex items-center justify-center shrink-0 shadow-sm p-0.5">
        <div className="w-full h-full bg-[#fff000] rounded-full flex items-center justify-center border border-[#d00010]">
          <span className="text-[#0050aa] font-black text-[9px] tracking-tight">LiDL</span>
        </div>
      </div>
    );
  }

  // 5. Billa
  if (name.includes("billa")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#ffcc00] flex items-center justify-center shrink-0 shadow-sm border border-amber-300">
        <span className="text-[#d81e05] font-black text-[11px] tracking-tight">BILLA</span>
      </div>
    );
  }

  // 6. Coop Jednota
  if (name.includes("coop") || name.includes("jednota")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#e30613] flex flex-col items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[8px] uppercase tracking-tighter leading-none">COOP</span>
        <span className="text-[7px] font-semibold tracking-tighter leading-none mt-0.5">JEDNOTA</span>
      </div>
    );
  }

  // 7. McDonald's
  if (name.includes("mcdonald") || name.includes("mc donald")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#da291c] flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#ffc72c]">
          <path d="M4.5 19.5c0-4.8 1.8-9 4-9 1.6 0 2.9 2.2 3.5 5.5.6-3.3 1.9-5.5 3.5-5.5 2.2 0 4 4.2 4 9h2c0-6-2.5-11-5.5-11-1.9 0-3.3 1.8-4 4.5-.7-2.7-2.1-4.5-4-4.5C5 8.5 2.5 13.5 2.5 19.5h2z" />
        </svg>
      </div>
    );
  }

  // 8. Shell
  if (name.includes("shell")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#fbce07] flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#dd1d21]">
          <path d="M12 3.5c-4 0-6.5 3.5-6.5 7.5 0 2.8 1.2 5 2.5 6.5l.5.5h7l.5-.5c1.3-1.5 2.5-3.7 2.5-6.5 0-4-2.5-7.5-6.5-7.5zm0 2.2c1.8 0 3.2 1.5 3.8 3.3-.8-.3-1.8-.5-3.8-.5s-3 .2-3.8.5c.6-1.8 2-3.3 3.8-3.3zm-4.7 4.8c.8-.3 2-.6 4.7-.6s3.9.3 4.7.6c.1.6.3 1.3.3 2-.9-.2-2.3-.4-5-.4s-4.1.2-5 .4c0-.7.2-1.4.3-2zm.4 4c1-.2 2.4-.4 4.3-.4s3.3.2 4.3.4c-.4 1.5-1.4 3-2.3 4H10c-.9-1-1.9-2.5-2.3-4z"/>
        </svg>
      </div>
    );
  }

  // 9. Slovnaft
  if (name.includes("slovnaft")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#ffcc00] flex items-center justify-center shrink-0 shadow-sm border border-amber-300">
        <span className="text-black font-black text-[8px] tracking-tighter uppercase">SLOVNAFT</span>
      </div>
    );
  }

  // 10. OMV
  if (name.includes("omv")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#008bd2] flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-white font-black text-[11px] tracking-wider">OMV</span>
      </div>
    );
  }

  // 11. Orlen
  if (name.includes("orlen") || name.includes("benzina")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#d81e05] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[9px] tracking-tight uppercase">ORLEN</span>
      </div>
    );
  }

  // 12. Netflix
  if (name.includes("netflix")) {
    return (
      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 shadow-sm border border-white/10">
        <span className="text-[#e50914] font-black text-[18px] font-sans leading-none">N</span>
      </div>
    );
  }

  // 13. Spotify
  if (name.includes("spotify")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#1ed760] flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.75.75 0 0 1-1.033.247c-2.827-1.728-6.386-2.118-10.578-1.16a.75.75 0 1 1-.334-1.462c4.588-1.048 8.528-.606 11.7 1.342a.75.75 0 0 1 .245 1.033zm1.226-2.723a.937.937 0 0 1-1.291.309c-3.236-1.99-8.169-2.565-11.997-1.402a.938.938 0 0 1-.548-1.794c4.375-1.328 9.815-.688 13.527 1.596a.938.938 0 0 1 .309 1.291zm.106-2.835C14.04 8.583 7.64 8.37 3.935 9.495a1.125 1.125 0 1 1-.652-2.154c4.254-1.291 11.318-1.047 15.776 1.597a1.125 1.125 0 1 1-1.141 1.928z"/>
        </svg>
      </div>
    );
  }

  // 14. dm drogerie markt
  if (name.includes("dm drogerie") || name.includes("dm markt") || name === "dm") {
    return (
      <div className="w-10 h-10 rounded-full bg-[#fbd100] flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-[#10245a] font-black text-[13px] tracking-tight">dm</span>
      </div>
    );
  }

  // 15. Dr. Max
  if (name.includes("dr.max") || name.includes("dr max") || name.includes("drmax")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#6db33f] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[9px] tracking-tight">Dr.Max</span>
      </div>
    );
  }

  // 16. Benu Lekáreň
  if (name.includes("benu")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#00a651] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[9px] tracking-tight uppercase">BENU</span>
      </div>
    );
  }

  // 17. Alza
  if (name.includes("alza")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#189438] flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-white font-black text-[11px] lowercase tracking-tight">alza</span>
      </div>
    );
  }

  // 18. NAY Elektrodom
  if (name.includes("nay")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#004f9e] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[12px] tracking-wider">NAY</span>
      </div>
    );
  }

  // 19. Datart
  if (name.includes("datart")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#ffcc00] flex items-center justify-center shrink-0 shadow-sm text-black">
        <span className="font-black text-[8px] uppercase tracking-tighter">DATART</span>
      </div>
    );
  }

  // 20. Bolt
  if (name.includes("bolt")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#34d186] flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-white font-black text-[11px] font-bold tracking-tight">bolt</span>
      </div>
    );
  }

  // 21. Wolt
  if (name.includes("wolt")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#00c2e8] flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-white font-black text-[10px] tracking-tight">Wolt</span>
      </div>
    );
  }

  // 22. Foodora
  if (name.includes("foodora")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#d70f64] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[9px] tracking-tight">foodora</span>
      </div>
    );
  }

  // 23. Slovak Telekom
  if (name.includes("telekom") || name.includes("t-mobile")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#e20074] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-bold text-[18px] leading-none">T</span>
      </div>
    );
  }

  // 24. Orange
  if (name.includes("orange")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#ff6600] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-bold text-[9px] tracking-tight">orange</span>
      </div>
    );
  }

  // 25. O2
  if (name.includes("o2 ") || name === "o2" || name.includes("o2 slovakia")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#002b66] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[13px] tracking-tight">O<sub className="text-[9px]">2</sub></span>
      </div>
    );
  }

  // 26. Martinus
  if (name.includes("martinus")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#ea580c] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[15px] font-serif">M</span>
      </div>
    );
  }

  // 27. Panta Rhei
  if (name.includes("panta rhei") || name.includes("pantarhei")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#6a1b9a] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-serif italic font-bold text-[11px]">PR</span>
      </div>
    );
  }

  // 28. IKEA
  if (name.includes("ikea")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#0051ba] flex items-center justify-center shrink-0 shadow-sm p-0.5">
        <div className="w-full h-full bg-[#ffda1a] rounded-full flex items-center justify-center">
          <span className="text-[#0051ba] font-black text-[9px] tracking-tight">IKEA</span>
        </div>
      </div>
    );
  }

  // 29. Decathlon
  if (name.includes("decathlon")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#0082c3] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[7px] uppercase tracking-tight">DECATHLON</span>
      </div>
    );
  }

  // 30. ZSSK (Železnice)
  if (name.includes("zssk") || name.includes("železničn") || name.includes("zeleznicn")) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#c01823] flex items-center justify-center shrink-0 shadow-sm text-white">
        <span className="font-black text-[9px] tracking-tight">ZSSK</span>
      </div>
    );
  }

  // 31. Apple
  if (name.includes("apple") || name.includes("itunes")) {
    return (
      <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center shrink-0 shadow-sm text-white dark:text-black">
        <svg viewBox="0 0 170 170" className="w-4 h-4 fill-current">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.85-11.94-14.42-6-9.16-10.74-19.78-14.22-31.86-3.48-12.08-5.22-23.72-5.22-34.92 0-14.36 3.69-26.24 11.08-35.65 7.38-9.4 16.53-14.23 27.44-14.48 4.58 0 9.87 1.25 15.86 3.76 6 2.5 10.12 3.81 12.38 3.92 1.63 0 5.88-1.37 12.74-4.11 6.87-2.75 12.87-3.93 18.02-3.55 13.93 1.08 24.87 6.43 32.82 16.06-12.41 7.5-18.49 17.84-18.23 31.02.22 10.22 4.15 18.8 11.79 25.75 7.64 6.95 16.65 11.08 27.02 12.39-2.39 7.39-5.34 14.56-8.86 21.51zM119.22 33.58c0-7.72 2.76-14.99 8.28-21.81 5.52-6.82 12.38-11.08 20.58-12.77.22 1.3.33 2.5.33 3.6 0 7.83-2.93 15.22-8.8 22.18-5.87 6.96-13 11.3-21.39 13.02-.44-1.52-.7-2.92-1-4.22z"/>
        </svg>
      </div>
    );
  }

  // 32. Google / YouTube
  if (name.includes("google") || name.includes("youtube")) {
    return (
      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
          <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9c-.2-.7-.4-1.5-.4-2.4z"/>
          <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
        </svg>
      </div>
    );
  }

  // SPOĽAHLIVÝ FALLBACK: Vždy zobrazí okrúhly farebný kruh s iniciálami
  return <SlspLogo size={40} />;
}

export default function UcetDetail() {
  const s = useBank();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"transakcie" | "funkcie" | "karty" | "info">("transakcie");
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reálny zostatok
  const currentBalance = balance(s);
  const balanceParts = splitAmount(currentBalance);
  const formattedOwnResources = `${balanceParts.isNegative ? "-" : ""}${balanceParts.whole},${balanceParts.cents} € vlastné zdroje`;

  // Dynamické zoskupenie transakcií podľa mesiaca a roka s voliteľným vyhľadávaním
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: { label: string; items: Txn[] } } = {};

    let sorted = [...(s.transactions ?? [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      sorted = sorted.filter((t) => 
        (t.counterparty || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q) ||
        (t.vs || "").toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }

    sorted.forEach((txn) => {
      const d = new Date(txn.date);
      const monthIdx = d.getUTCMonth();
      const year = d.getUTCFullYear();
      const monthName = MONTHS[monthIdx] || "Neznámy";
      const key = `${year}-${String(monthIdx).padStart(2, "0")}`;
      const label = `${monthName} ${year}`;

      if (!groups[key]) {
        groups[key] = { label, items: [] };
      }
      groups[key].items.push(txn);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((k) => groups[k])
      .filter((g): g is { label: string; items: Txn[] } => Boolean(g));
  }, [s.transactions, searchQuery]);

  const copyIban = () => {
    if (s.iban) {
      navigator.clipboard.writeText(s.iban);
      toast.success("IBAN skopírovaný do schránky");
    }
  };

  return (
    <AppShell>
      <div className="min-h-screen transaction-detail bg-detail-background text-foreground pb-32 font-sans transition-colors duration-300">
        
        {/* Modrá hlavička účtu ako na hlavnej stránke s bielou šípkou späť */}
        <div className="bg-gradient-to-br from-[#2b2a9e] via-[#2f3ab0] to-[#2a2a8f] dark:from-[#16164f] dark:to-[#0e0e12] px-4 pt-6 pb-24 text-white transition-colors">
          <div className="flex items-center py-2">
            <Link 
              to="/" 
              className="p-1 -ml-1 text-white hover:opacity-80 active:scale-95 transition"
              aria-label="Späť na prehľad"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
            </Link>
          </div>
        </div>

        <div className="px-4 -mt-14 space-y-3">
          {/* Karta účtu so zostatkom */}
          <div className="rounded-3xl bg-detail-surface p-5 py-6 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[17px] font-medium text-foreground">Účet</h1>
                
                <div className={`mt-1 flex items-baseline tracking-tight ${balanceParts.isNegative ? "text-[#c8302f] dark:text-[#ff5a70]" : "text-foreground"}`}>
                  <span className="text-[30px] font-bold leading-none">
                    {balanceParts.isNegative ? "-" : ""}{balanceParts.whole},
                  </span>
                  <sup className="text-[15px] font-bold leading-none top-[-0.6em] ml-0.5 select-none">
                    {balanceParts.cents}
                  </sup>
                  <span className="text-[28px] font-bold leading-none ml-1 select-none">
                    €
                  </span>
                </div>

                <p className="mt-1.5 text-[14px] text-detail-muted">
                  {formattedOwnResources}
                </p>
              </div>
              <SlspLogo size={56} />
            </div>
          </div>

          {/* Záložky: Transakcie, Funkcie, Karty, Info */}
          <div className="flex items-center justify-between gap-1 pt-1 pb-1 text-[14px]">
            <button
              type="button"
              onClick={() => setActiveTab("transakcie")}
              className={`rounded-full px-4 py-2 font-semibold transition ${
                activeTab === "transakcie"
                  ? "bg-[#eef3ff] dark:bg-[#242b3b] text-[#196ee6] dark:text-[#4f95ff]"
                  : "text-[#196ee6] dark:text-[#4f95ff] hover:opacity-80"
              }`}
            >
              Transakcie
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("funkcie")}
              className={`rounded-full px-4 py-2 font-medium transition ${
                activeTab === "funkcie"
                  ? "bg-[#eef3ff] dark:bg-[#242b3b] text-[#196ee6] dark:text-[#4f95ff]"
                  : "text-[#196ee6] dark:text-[#4f95ff] hover:opacity-80"
              }`}
            >
              Funkcie
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("karty")}
              className={`rounded-full px-4 py-2 font-medium transition ${
                activeTab === "karty"
                  ? "bg-[#eef3ff] dark:bg-[#242b3b] text-[#196ee6] dark:text-[#4f95ff]"
                  : "text-[#196ee6] dark:text-[#4f95ff] hover:opacity-80"
              }`}
            >
              Karty
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`rounded-full px-4 py-2 font-medium transition ${
                activeTab === "info"
                  ? "bg-[#eef3ff] dark:bg-[#242b3b] text-[#196ee6] dark:text-[#4f95ff]"
                  : "text-[#196ee6] dark:text-[#4f95ff] hover:opacity-80"
              }`}
            >
              Info
            </button>
          </div>

          {/* Obsah záložky Transakcie */}
          {activeTab === "transakcie" && (
            <div className="space-y-4">
              {/* Vyhľadávacie pole rozbalené cez Lupu */}
              {isSearching && (
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-detail-muted" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Hľadať obchodníka, sumu, kategóriu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-detail-surface border border-detail-action-surface text-[14px] text-foreground placeholder:text-detail-muted focus:outline-none focus:ring-2 focus:ring-detail-action"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-detail-muted hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Platobné príkazy a rezervácie */}
              <div className="flex items-center gap-4 rounded-3xl bg-detail-surface px-5 py-5 transition-colors">
                <div className="text-[#196ee6] dark:text-[#4f95ff] shrink-0">
                  <FileEdit className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-foreground">
                    Platobné príkazy a rezervácie
                  </h3>
                  <p className="text-[13px] text-detail-muted mt-0.5">
                    0 nevykonaných platieb & 0 rezervácií
                  </p>
                </div>
              </div>

              {/* Transakcie zoskupené po mesiacoch */}
              {groupedTransactions.length === 0 ? (
                <div className="rounded-3xl bg-detail-surface p-8 text-center text-detail-muted">
                  {searchQuery ? "Nenašli sa žiadne vyhovujúce transakcie." : "Zatiaľ žiadne zaznamenané transakcie."}
                </div>
              ) : (
                groupedTransactions.map((group) => (
                  <div key={group.label} className="space-y-2 pt-1">
                    <h2 className="text-[14px] font-semibold text-detail-muted px-1">
                      {group.label}
                    </h2>
                    <div className="space-y-2">
                      {group.items.map((t) => {
                        const isIn = t.type === "in";
                        const txParts = splitAmount(t.amount);

                        return (
                          <div
                            key={t.id}
                            onClick={() => navigate({ to: "/transakcia/$id", params: { id: t.id } })}
                            className="cursor-pointer flex items-center justify-between rounded-3xl bg-detail-surface p-4 active:opacity-80 transition"
                          >
                            {/* Vľavo: Logo obchodníka alebo iniciály */}
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <MerchantLogo counterparty={t.counterparty} category={t.category} />
                              
                              <div className="min-w-0">
                                <p className="text-[15px] font-semibold text-foreground truncate">
                                  {t.counterparty}
                                </p>
                                <p className="text-[12px] text-detail-muted">
                                  {formatDate(t.date)}
                                </p>
                                {t.vs ? (
                                  <p className="text-[12px] text-detail-muted">
                                    VS: {t.vs}
                                  </p>
                                ) : t.category === "Poplatky" ? (
                                  <p className="text-[12px] text-detail-muted">KS: 0898</p>
                                ) : null}
                                <div className="mt-1">
                                  <span className="inline-block rounded-md border border-detail-muted/60 px-1.5 py-0 text-[11px] font-medium text-detail-muted">
                                    {t.category}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Vpravo: Zelený príjem (+) alebo neutrálny výdavok (-) */}
                            <div className="text-right shrink-0">
                              <span
                                className={`text-[15px] font-bold flex items-baseline justify-end tracking-tight ${
                                  isIn 
                                    ? "text-[#16a34a] dark:text-[#30d158]" 
                                    : "text-foreground"
                                }`}
                              >
                                <span>{isIn ? "+" : "-"}</span>
                                <span>{txParts.whole}</span>
                                <span>,</span>
                                <sup className="text-[10px] font-semibold top-[-0.4em] ml-0.5 leading-none select-none">
                                  {txParts.cents}
                                </sup>
                                <span className="ml-1 text-[13px] font-normal select-none">€</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Obsah záložky Funkcie */}
          {activeTab === "funkcie" && (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-3xl bg-detail-surface divide-y divide-detail-action-surface">
                {[
                  { title: "Trvalé príkazy", icon: RefreshCw, to: "/centrum-platieb" },
                  { title: "Výber z bankomatu mobilom", icon: Landmark },
                  { title: "Výpisy z účtu", icon: FileText, to: "/upozornenia" },
                  { title: "Limit pre okamžité platby (SEPA)", desc: "Bez limitu", icon: Zap },
                  { title: "Súhlasy s inkasom", icon: ClipboardCheck },
                  { title: "Vytvoriť payme link / QR kód", icon: QrCode, to: "/prijat" },
                  { title: "Dobiť kredit", icon: Smartphone },
                ].map((f) => (
                  <button
                    key={f.title}
                    type="button"
                    onClick={() => (f.to ? navigate({ to: f.to as "/" }) : toast.info(`${f.title} – pripravujeme`))}
                    className="flex w-full items-center gap-4 px-5 py-5 text-left active:opacity-80"
                  >
                    <f.icon className="w-6 h-6 shrink-0 text-[#196ee6] dark:text-[#4f95ff]" strokeWidth={1.8} />
                    <div>
                      <p className="text-[16px] text-foreground">{f.title}</p>
                      {f.desc && <p className="text-[13px] text-detail-muted">{f.desc}</p>}
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <h3 className="px-1 pb-2 text-[15px] font-medium text-foreground">Automatické sporenie</h3>
                <button type="button" onClick={() => navigate({ to: "/sporenie" })} className="flex w-full items-center gap-4 rounded-3xl bg-detail-surface px-5 py-5 text-left">
                  <PiggyBank className="w-6 h-6 text-[#196ee6] dark:text-[#4f95ff]" strokeWidth={1.8} />
                  <span className="flex-1 text-[16px] text-foreground">Drobné bokom</span>
                  <span className="rounded-full bg-[#5b6493] px-3 py-1 text-[12px] font-semibold text-white">Nové</span>
                </button>
              </div>

              <div>
                <h3 className="px-1 pb-2 text-[15px] font-medium text-foreground">Zrušenia</h3>
                <button type="button" onClick={() => toast.info("Zrušenie účtu je možné len na pobočke")} className="flex w-full items-center gap-4 rounded-3xl bg-detail-surface px-5 py-5 text-left">
                  <X className="w-6 h-6 text-[#196ee6] dark:text-[#4f95ff]" strokeWidth={1.8} />
                  <span className="text-[16px] text-foreground">Zrušiť účet</span>
                </button>
              </div>

              <button type="button" onClick={() => navigate({ to: "/nastavenia" })} className="flex w-full items-center gap-4 rounded-3xl bg-detail-surface px-5 py-5 text-left">
                <Palette className="w-6 h-6 text-[#196ee6] dark:text-[#4f95ff]" strokeWidth={1.8} />
                <span className="text-[16px] text-foreground">Prispôsobiť</span>
              </button>
            </div>
          )}

          {/* Obsah záložky Karty */}
          {activeTab === "karty" && (
            <div className="rounded-3xl bg-detail-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-detail-muted">Virtuálna karta</p>
                  <p className="text-[16px] font-bold text-foreground mt-0.5">VISA Debit ···· 2269</p>
                </div>
                <CreditCard className="w-8 h-8 text-[#196ee6] dark:text-[#4f95ff]" />
              </div>
            </div>
          )}

          {/* Obsah záložky Info */}
          {activeTab === "info" && (
            <div className="rounded-3xl bg-detail-surface p-5 space-y-4">
              <div>
                <p className="text-[12px] text-detail-muted">Majiteľ účtu</p>
                <p className="text-[15px] font-medium text-foreground">{s.owner}</p>
              </div>
              <div>
                <p className="text-[12px] text-detail-muted">Názov účtu</p>
                <p className="text-[15px] font-medium text-foreground">SPACE účet</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-detail-muted">IBAN</p>
                  <p className="text-[14px] font-mono font-medium text-foreground">{s.iban || "SK83 0900 0000 0052 0892 1207"}</p>
                </div>
                <button
                  type="button"
                  onClick={copyIban}
                  className="p-2 text-[#196ee6] dark:text-[#4f95ff] hover:opacity-80 transition"
                  aria-label="Kopírovať IBAN"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Plávajúci oválny panel (Floating Bottom Action Bar pripnutý priamo do body cez Portal) */}
        {typeof document !== "undefined" &&
          createPortal(
            <div className="fixed inset-x-0 bottom-5 z-50 mx-auto w-full max-w-[420px] px-4 pointer-events-none">
              <div className="pointer-events-auto flex items-center justify-between gap-2.5 rounded-full bg-detail-surface/95 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)] border border-detail-action-surface backdrop-blur-xl">
                {/* Dve kruhové tlačidlá: Lupa/Vyhľadávanie a Štatistiky/Grafy */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearching((prev) => !prev);
                      if (searchQuery) setSearchQuery("");
                    }}
                    className={`flex w-12 h-12 items-center justify-center rounded-full transition active:scale-95 ${
                      isSearching
                        ? "bg-[#196ee6] text-white shadow-md shadow-[#196ee6]/30"
                        : "bg-detail-action-surface text-detail-action hover:opacity-85"
                    }`}
                    aria-label="Vyhľadať v transakciách"
                    title="Vyhľadať transakcie"
                  >
                    <Search className="w-5 h-5 stroke-[2.2]" />
                  </button>

                  <Link
                    to="/rozpocet"
                    className="flex w-12 h-12 items-center justify-center rounded-full bg-detail-action-surface text-detail-action hover:opacity-85 transition active:scale-95"
                    aria-label="Prehľad výdavkov a štatistika"
                    title="Štatistiky a grafy výdavkov"
                  >
                    <BarChart2 className="w-5 h-5 stroke-[2.2]" />
                  </Link>
                </div>

                {/* Veľké modré tlačidlo "Nová platba" s ikonou + */}
                <Link
                  to="/nova-platba"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#196ee6] hover:bg-[#155fc7] dark:bg-[#2a5ee8] dark:hover:bg-[#196ee6] px-5 py-3 text-[15px] font-bold text-white shadow-md shadow-[#196ee6]/25 transition active:scale-95 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </div>
                  <span>Nová platba</span>
                </Link>
              </div>
            </div>,
            document.body,
          )}

      </div>
    </AppShell>
  );
}
