import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Txn = {
  id: string;
  type: "in" | "out";
  counterparty: string;
  iban?: string | undefined;
  amount: number;
  date: string; // ISO
  category: string;
  note?: string | undefined;
  vs?: string | undefined;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
};

export type BudgetLimit = { category: string; limit: number };

export type BankState = {
  owner: string;
  iban: string;
  transactions: Txn[];
  goals: Goal[];
  budgets: BudgetLimit[];
  loading: boolean;
  error: string | null;
};

export const CATEGORIES = [
  "Potraviny",
  "Bývanie",
  "Doprava",
  "Zábava",
  "Zdravie",
  "Poplatky",
  "Mzda",
  "Ostatné príjmy",
  "Sporenie",
  "Prevod",
];

const empty: BankState = {
  owner: "",
  iban: "",
  transactions: [],
  goals: [],
  budgets: [],
  loading: true,
  error: null,
};

let state: BankState = empty;
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let storeGeneration = 0;

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

function num(v: unknown) {
  return typeof v === "number" ? v : Number(v ?? 0);
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export async function loadAll() {
  const generation = storeGeneration;
  const userId = await currentUserId();
  if (generation !== storeGeneration) return;
  if (!userId) {
    state = { ...empty, loading: false, error: null };
    emit();
    return;
  }

  // Načítame iba existujúci profil a záznamy. Pri prihlásení sa nevytvárajú
  // žiadne automatické demo transakcie, ciele, rozpočty ani fiktívny IBAN.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("owner, iban")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (generation !== storeGeneration) return;

  const [txns, goals, budgets] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  if (generation !== storeGeneration) return;
  const queryError = txns.error ?? goals.error ?? budgets.error;
  if (queryError) throw queryError;

  state = {
    owner: profile?.owner ?? "",
    iban: profile?.iban ?? "",
    transactions: sortTransactionsNewestFirst((txns.data ?? [])
      .map((r) => ({
        id: r.id,
        type: (r.type === "in" ? "in" : "out") as "in" | "out",
        counterparty: r.counterparty,
        iban: r.iban ?? undefined,
        amount: num(r.amount),
        date: r.date,
        category: r.category,
        note: r.note ?? undefined,
        vs: r.vs ?? undefined,
      }))
      )),
    goals: (goals.data ?? []).map((g) => ({ id: g.id, name: g.name, target: num(g.target), saved: num(g.saved) })),
    budgets: (budgets.data ?? []).map((b) => ({ category: b.category, limit: num(b.limit_amount) })),
    loading: false,
    error: null,
  };
  emit();
}

export function hydrate() {
  if (!loadPromise) {
    const generation = storeGeneration;
    state = { ...state, loading: true, error: null };
    emit();
    const pending = loadAll()
      .catch((error: unknown) => {
        if (generation !== storeGeneration) return;
        console.error(error);
        state = {
          ...empty,
          loading: false,
          error: "Údaje účtu sa nepodarilo načítať. Skontrolujte pripojenie a skúste to znova.",
        };
        emit();
      })
      .finally(() => {
        if (loadPromise === pending) loadPromise = null;
      });
    loadPromise = pending;
  }
  return loadPromise;
}

export function resetStore() {
  storeGeneration += 1;
  loadPromise = null;
  state = empty;
  emit();
}

export function useBank() {
  const [snap, setSnap] = useState<BankState>(state);
  useEffect(() => {
    const l = () => setSnap(state);
    listeners.add(l);
    if (snap.loading) void hydrate();
    l();
    return () => {
      listeners.delete(l);
    };
  }, [snap.loading]);
  return snap;
}

export async function addTransaction(t: Omit<Txn, "id">, expectedUserId?: string) {
  if (!t.counterparty.trim() || !t.category.trim()) {
    throw new Error("Príjemca a kategória transakcie sú povinné.");
  }
  if (
    !Number.isFinite(t.amount) ||
    t.amount <= 0 ||
    t.amount > 1_000_000 ||
    Math.abs(t.amount * 100 - Math.round(t.amount * 100)) > 0.000001
  ) {
    throw new Error("Suma transakcie musí byť kladná, najviac 1 000 000 € a s najviac dvoma desatinnými miestami.");
  }
  if (!Number.isFinite(Date.parse(t.date))) {
    throw new Error("Transakcia musí mať platný dátum.");
  }

  const generation = storeGeneration;
  const userId = await currentUserId();
  if (!userId || (expectedUserId && userId !== expectedUserId)) {
    throw new Error("Používateľ nie je prihlásený. Platbu nie je možné uložiť.");
  }

  // 1. Zápis do databázy s kontrolou chyby
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      type: t.type,
      counterparty: t.counterparty,
      iban: t.iban ?? null,
      amount: t.amount,
      date: t.date,
      category: t.category,
      note: t.note ?? null,
      vs: t.vs ?? null,
    })
    .select("id")
    .single();

  // Ak databáza odmietne zápis, vyvoláme chybu – platba sa NEULOŽÍ iba do pamäte
  if (error || !data) {
    console.error("Chyba pri ukladaní transakcie do databázy:", error);
    throw new Error(error?.message || "Nepodarilo sa uložiť platbu do databázy.");
  }

  // 2. Priradíme skutočné ID z databázy
  const newTxn: Txn = { ...t, id: data.id };
  if (generation === storeGeneration) {
    state.transactions = sortTransactionsNewestFirst([newTxn, ...state.transactions]);
    emit();

    // Uloženie transakcie je hlavná operácia; zlyhanie vedľajšieho upozornenia
    // nesmie vytvoriť neobslúžené odmietnutie ani zneplatniť uložený záznam.
    void announceTransaction(newTxn, generation, userId).catch((error: unknown) => {
      console.error("Oznámenie o uloženej transakcii sa nepodarilo spracovať:", error);
    });
  }
  return newTxn;
}

async function announceTransaction(t: Txn, generation: number, userId: string) {
  const { notify } = await import("@/lib/notifications");
  if (generation !== storeGeneration || (await currentUserId()) !== userId) return;

  if (t.type === "in") {
    await notify(
      "in",
      "Prijatý prevod",
      `${formatEur(t.amount)} od ${t.counterparty}. Nový zostatok ${formatEur(balance(state))}.`,
      userId,
    );
  } else {
    await notify(
      "out",
      "Platba odoslaná",
      `${formatEur(t.amount)} pre ${t.counterparty}. Nový zostatok ${formatEur(balance(state))}.`,
      userId,
    );

    const budget = state.budgets.find((b) => b.category === t.category);
    if (budget && budget.limit > 0) {
      const spent = state.transactions
        .filter((x) => x.type === "out" && x.category === t.category && inMonth(x))
        .reduce((a, x) => a + x.amount, 0);
      if (spent > budget.limit) {
        await notify(
          "budget",
          `Prekročený rozpočet · ${t.category}`,
          `Tento mesiac ste utratili ${formatEur(spent)} z limitu ${formatEur(budget.limit)}.`,
          userId,
        );
      }
    }
  }
}

export async function addGoal(name: string, target: number) {
  const generation = storeGeneration;
  const userId = await currentUserId();
  if (!userId) throw new Error("Používateľ nie je prihlásený.");
  const { data, error } = await supabase
    .from("goals")
    .insert({ user_id: userId, name, target, saved: 0 })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Sporiaci cieľ sa nepodarilo vytvoriť.");
  if (generation !== storeGeneration) return;
  state.goals = [...state.goals, { id: data.id, name, target, saved: 0 }];
  emit();
}

export async function removeGoal(id: string) {
  const generation = storeGeneration;
  const userId = await currentUserId();
  if (!userId) throw new Error("Používateľ nie je prihlásený.");
  const { data, error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Sporiaci cieľ sa nenašiel alebo ho nie je možné odstrániť.");
  if (generation !== storeGeneration) return;
  state.goals = state.goals.filter((goal) => goal.id !== id);
  emit();
}

export async function depositToGoal(id: string, amount: number) {
  const generation = storeGeneration;
  const userId = await currentUserId();
  if (!userId) throw new Error("Používateľ nie je prihlásený.");
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
    throw new Error("Vklad musí byť kladná suma s najviac dvoma desatinnými miestami.");
  }
  if (amount > balance(state)) {
    throw new Error("Na tento vklad nemáte dostatočný dostupný zostatok.");
  }
  const goal = state.goals.find((g) => g.id === id);
  if (!goal) throw new Error("Sporiaci cieľ sa nenašiel.");
  if (amount > Math.max(0, goal.target - goal.saved)) {
    throw new Error("Vklad nemôže byť vyšší ako zostávajúca suma do cieľa.");
  }
  const previousSaved = goal.saved;
  const saved = Math.round((goal.saved + amount) * 100) / 100;
  const { data, error } = await supabase
    .from("goals")
    .update({ saved })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Vklad sa nepodarilo uložiť.");

  if (generation === storeGeneration) {
    state.goals = state.goals.map((g) => (g.id === id ? { ...g, saved } : g));
    emit();
  }
  try {
    await addTransaction({
      type: "out",
      counterparty: `Sporenie · ${goal.name}`,
      amount,
      date: new Date().toISOString(),
      category: "Sporenie",
    }, userId);
  } catch (transactionError) {
    const rollback = await supabase
      .from("goals")
      .update({ saved: previousSaved })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (!rollback.error && rollback.data) {
      if (generation === storeGeneration) {
        state.goals = state.goals.map((g) => (g.id === id ? { ...g, saved: previousSaved } : g));
        emit();
      }
    } else {
      console.error("Vrátenie neúspešného vkladu do pôvodného stavu zlyhalo:", rollback.error);
      await loadAll();
      throw new Error("Transakcia vkladu zlyhala a stav cieľa sa nepodarilo bezpečne obnoviť. Údaje boli znovu načítané.");
    }
    throw transactionError;
  }
}

export async function setBudget(category: string, limit: number) {
  const generation = storeGeneration;
  const userId = await currentUserId();
  if (!userId) throw new Error("Používateľ nie je prihlásený.");
  if (!category.trim() || !Number.isFinite(limit) || limit <= 0 || Math.abs(limit * 100 - Math.round(limit * 100)) > 0.000001) {
    throw new Error("Kategória a kladný limit s najviac dvoma desatinnými miestami sú povinné.");
  }
  const { error } = await supabase
    .from("budgets")
    .upsert({ user_id: userId, category, limit_amount: limit }, { onConflict: "user_id,category" });
  if (error) throw error;
  if (generation !== storeGeneration) return;
  const exists = state.budgets.some((b) => b.category === category);
  state.budgets = exists
    ? state.budgets.map((b) => (b.category === category ? { category, limit } : b))
    : [...state.budgets, { category, limit }];
  emit();
}

export async function removeBudget(category: string) {
  const generation = storeGeneration;
  const userId = await currentUserId();
  if (!userId) throw new Error("Používateľ nie je prihlásený.");
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", userId)
    .eq("category", category);
  if (error) throw error;
  if (generation !== storeGeneration) return;
  state.budgets = state.budgets.filter((b) => b.category !== category);
  emit();
}

export async function saveProfile(owner: string, iban: string) {
  const generation = storeGeneration;
  const userId = await currentUserId();
  if (!userId) throw new Error("Pre uloženie údajov sa prihláste.");
  const { data, error } = await supabase.from("profiles")
    .upsert({ id: userId, owner: owner.trim(), iban: iban.trim(), seeded: true })
    .select("owner, iban")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Údaje účtu sa nepodarilo uložiť.");
  if (generation !== storeGeneration) return;
  state.owner = data.owner;
  state.iban = data.iban;
  emit();
}

/* selectors */
export function balance(s: BankState) {
  return s.transactions.reduce((acc, t) => acc + (t.type === "in" ? t.amount : -t.amount), 0);
}

export function inMonth(t: Txn, d = new Date()) {
  const x = new Date(t.date);
  return Number.isFinite(x.getTime()) && x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
}

export function isExcludedFromOverview(transaction: Pick<Txn, "id">) {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(`george-txn-extra:${transaction.id}`);
    if (!raw) return false;
    return (JSON.parse(raw) as { exclude?: unknown }).exclude === true;
  } catch {
    return false;
  }
}

export function monthTotals(s: BankState, d = new Date()) {
  let income = 0;
  let expense = 0;
  for (const t of s.transactions) {
    if (!inMonth(t, d) || isExcludedFromOverview(t)) continue;
    if (t.type === "in") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense };
}

export const MONTHS = [
  "Január",
  "Február",
  "Marec",
  "Apríl",
  "Máj",
  "Jún",
  "Júl",
  "August",
  "September",
  "Október",
  "November",
  "December",
];

export function formatEur(n: number) {
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(n);
}

function transactionTimestamp(date: string): number | null {
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function sortTransactionsNewestFirst<T extends Pick<Txn, "date">>(transactions: T[]): T[] {
  return [...transactions].sort((a, b) => {
    const aTime = transactionTimestamp(a.date);
    const bTime = transactionTimestamp(b.date);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  });
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "Neznámy dátum";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function groupByMonth(txns: Txn[]) {
  const map = new Map<string, Txn[]>();
  const sorted = sortTransactionsNewestFirst(txns);
  for (const t of sorted) {
    const d = new Date(t.date);
    const key = Number.isFinite(d.getTime())
      ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      : "Neznámy dátum";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()];
}

export async function removeTransaction(id: string) {
  const generation = storeGeneration;
  const userId = await currentUserId();
  if (!userId) throw new Error("Používateľ nie je prihlásený.");
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  if (generation !== storeGeneration) return;
  state.transactions = state.transactions.filter((t) => t.id !== id);
  emit();
}
