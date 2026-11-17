import { useEffect, useMemo, useState } from "react";
import { Star, Clock } from "lucide-react";
import { sortTransactionsNewestFirst, type Txn } from "@/lib/bank-store";
import { toast } from "sonner";

export type Recipient = { name: string; iban: string; category?: string };

const key = (uid: string) => `george-fav-recipients:${uid}`;

function normalizeIban(iban: string): string {
  return iban.replace(/\s/g, "").toUpperCase();
}

function loadFavs(uid: string): Recipient[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(uid)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.flatMap((item): Recipient[] => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      if (typeof value["name"] !== "string" || typeof value["iban"] !== "string") return [];
      const name = value["name"].trim();
      const iban = normalizeIban(value["iban"]);
      if (!name || iban.length < 15 || seen.has(iban)) return [];
      seen.add(iban);
      return [{ name, iban, ...(typeof value["category"] === "string" ? { category: value["category"] } : {}) }];
    });
  } catch {
    return [];
  }
}

export function RecipientPicker({
  userId,
  transactions,
  onPick,
  current,
}: {
  userId: string;
  transactions: Txn[];
  onPick: (r: Recipient) => void;
  current: Recipient;
}) {
  const [favs, setFavs] = useState<Recipient[]>([]);
  const [tab, setTab] = useState<"recent" | "fav">("recent");

  useEffect(() => setFavs(loadFavs(userId)), [userId]);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: Recipient[] = [];
    for (const t of sortTransactionsNewestFirst(transactions)) {
      if (t.type !== "out" || !t.iban) continue;
      const k = normalizeIban(t.iban);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ name: t.counterparty, iban: k, category: t.category });
      if (out.length >= 8) break;
    }
    return out;
  }, [transactions]);

  const isFav = (i: string) => favs.some((f) => normalizeIban(f.iban) === normalizeIban(i));

  function toggle(r: Recipient) {
    const normalized = normalizeIban(r.iban);
    const next = isFav(normalized)
      ? favs.filter((f) => normalizeIban(f.iban) !== normalized)
      : [...favs, { ...r, iban: normalized }];
    try {
      localStorage.setItem(key(userId), JSON.stringify(next));
      setFavs(next);
    } catch {
      toast.error("Zmenu obľúbených príjemcov sa nepodarilo uložiť v tomto zariadení.");
    }
  }

  const list = tab === "recent" ? recent : favs;
  const canSaveCurrent = current.name.trim() && current.iban.trim().length >= 15 && !isFav(current.iban);

  return (
    <div className="rounded-3xl bg-surface p-4 shadow-sm">
      <div className="mb-3 flex gap-2">
        {(["recent", "fav"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
            }`}
          >
            {t === "recent" ? <Clock className="size-3.5" /> : <Star className="size-3.5" />}
            {t === "recent" ? "Naposledy použité" : `Obľúbení (${favs.length})`}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-2 text-[13px] text-muted-foreground">
          {tab === "recent" ? "Zatiaľ ste neposlali žiadnu platbu na IBAN." : "Pridajte príjemcu hviezdičkou."}
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-1" data-no-swipe>
          {list.map((r) => (
            <li key={r.iban} className="flex shrink-0 items-center gap-1 rounded-2xl border border-border pl-3">
              <button type="button" onClick={() => onPick(r)} className="max-w-[160px] py-2 text-left">
                <p className="truncate text-[13px] font-semibold">{r.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{r.iban}</p>
              </button>
              <button
                type="button"
                aria-label={isFav(r.iban) ? "Odobrať z obľúbených" : "Pridať do obľúbených"}
                onClick={() => toggle(r)}
                className="p-2"
              >
                <Star className={`size-4 ${isFav(r.iban) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {canSaveCurrent && (
        <button
          type="button"
          onClick={() => toggle({ name: current.name.trim(), iban: current.iban.trim().toUpperCase() })}
          className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-primary"
        >
          <Star className="size-3.5" /> Uložiť aktuálneho príjemcu
        </button>
      )}
    </div>
  );
}
