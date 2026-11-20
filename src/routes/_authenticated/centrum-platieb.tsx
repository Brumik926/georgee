import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Repeat, Star, Trash2, Plus, User, Clock } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { formatEur, hydrate, useBank } from "@/lib/bank-store";
import { validateIban } from "@/lib/iban-validator";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/centrum-platieb")({
  head: () => ({
    meta: [
      { title: "Centrum platieb · George" },
      { name: "description", content: "Uložení príjemcovia, trvalé príkazy a šablóny platieb." },
      { property: "og:title", content: "Centrum platieb · George" },
      { property: "og:description", content: "Uložení príjemcovia, trvalé príkazy a šablóny platieb." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CentrumPlatieb,
});

type Template = { id: string; title: string; name: string; iban: string; amount: string; vs?: string | undefined };
type SavedRecipient = { name: string; iban: string; category?: string };
const favoritesKey = (userId: string) => `george-fav-recipients:${userId}`;

const field =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:border-primary";

function CentrumPlatieb() {
  const s = useBank();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"templates" | "trvale" | "recipients">("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState(false);
  const [templatesReload, setTemplatesReload] = useState(0);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [form, setForm] = useState({ title: "", name: "", iban: "", amount: "", vs: "" });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<SavedRecipient[]>([]);

  const match = (x: { name: string; iban: string; title?: string }) => {
    const n = q.trim().toLowerCase().replace(/\s/g, "");
    if (!n) return true;
    return [x.name, x.iban, x.title ?? ""].some((v) => v.toLowerCase().replace(/\s/g, "").includes(n));
  };

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!active) return;
        const id = data.user?.id ?? null;
        setUserId(id);
        if (!id) return;
        try {
          const parsed = JSON.parse(localStorage.getItem(favoritesKey(id)) ?? "[]") as unknown;
          if (Array.isArray(parsed)) {
            setFavorites(parsed.filter((item): item is SavedRecipient =>
              !!item && typeof item === "object" &&
              typeof (item as SavedRecipient).name === "string" &&
              typeof (item as SavedRecipient).iban === "string"
            ));
          }
        } catch {
          setFavorites([]);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          console.error("Načítanie obľúbených príjemcov zlyhalo:", error);
          setFavorites([]);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setTemplatesLoading(true);
    setTemplatesError(false);
    void supabase.auth.getUser()
      .then(async ({ data, error: authError }) => {
        if (authError) throw authError;
        const id = data.user?.id;
        if (!id) return [];
        const { data: rows, error } = await supabase
          .from("payment_templates")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return rows ?? [];
      })
      .then((rows) => {
        if (!active) return;
        setTemplates(rows.map((r) => ({
          id: r.id,
          title: r.title,
          name: r.name,
          iban: r.iban,
          amount: Number(r.amount).toFixed(2),
          vs: r.vs ?? undefined,
        })));
      })
      .catch((error: unknown) => {
        console.error("Nepodarilo sa načítať šablóny platieb:", error);
        if (active) {
          setTemplates([]);
          setTemplatesError(true);
        }
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });
    return () => { active = false; };
  }, [templatesReload]);

  const save = async (list: Template[]) => {
    if (savingTemplates) return false;
    if (templatesLoading || templatesError || !userId) return false;
    setSavingTemplates(true);
    const removed = templates.filter((t) => !list.some((l) => l.id === t.id));
    const added = list.filter((l) => !templates.some((t) => t.id === l.id));
    try {
      for (const r of removed) {
        await supabase.from("payment_templates").delete().eq("id", r.id).eq("user_id", userId);
      }
      for (const a of added) {
        await supabase.from("payment_templates").insert({ user_id: userId, id: a.id, title: a.title, name: a.name, iban: a.iban, amount: Number(a.amount), vs: a.vs ?? null });
      }
      setTemplates(list);
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Zmeny šablón sa nepodarilo uložiť.");
      setTemplatesReload((value) => value + 1);
      return false;
    } finally {
      setSavingTemplates(false);
    }
  };

  const recipients = useMemo(() => {
    const map = new Map<string, { name: string; iban: string; amount: number; count: number }>();
    for (const t of s.transactions) {
      if (t.type !== "out" || !t.iban) continue;
      const k = t.iban.replace(/\s/g, "");
      const r = map.get(k);
      if (r) r.count++;
      else map.set(k, { name: t.counterparty, iban: t.iban, amount: t.amount, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 20);
  }, [s.transactions]);

  const pay = (p: { name: string; iban: string; amount?: string | undefined; vs?: string | undefined }) =>
    navigate({ to: "/nova-platba", search: { name: p.name, iban: p.iban, amount: p.amount, vs: p.vs } });

  const removeFavorite = (iban: string) => {
    if (!userId) return;
    const normalized = iban.replace(/\s/g, "").toUpperCase();
    const next = favorites.filter((item) => item.iban.replace(/\s/g, "").toUpperCase() !== normalized);
    try {
      localStorage.setItem(favoritesKey(userId), JSON.stringify(next));
      setFavorites(next);
      toast.success("Príjemca bol odstránený z obľúbených.");
    } catch {
      toast.error("Prispievateľa sa nepodarilo odstrániť.");
    }
  };

  const addTemplate = async () => {
    const normalizedAmount = form.amount.trim().replace(",", ".");
    const amount = Number(normalizedAmount);
    if (!form.name.trim() || !form.iban.trim() || !amountValid(amount)) {
      toast.error("Zadajte platné údaje šablóny.");
      return;
    }
    const ibanCheck = validateIban(form.iban);
    if (!ibanCheck.valid) {
      toast.error(ibanCheck.error ?? "Zadajte platný IBAN.");
      return;
    }
    const saved = await save([
      ...templates,
      {
        id: crypto.randomUUID(),
        title: form.title.trim() || form.name.trim(),
        name: form.name.trim(),
        iban: form.iban.replace(/\s/g, "").toUpperCase(),
        amount: amount.toFixed(2),
        vs: form.vs || undefined,
      },
    ]);
    if (!saved) return;
    setForm({ title: "", name: "", iban: "", amount: "", vs: "" });
    setOpen(false);
    toast.success("Šablóna uložená");
  };

  function amountValid(n: number) {
    return Number.isFinite(n) && n > 0 && n <= 1_000_000;
  }

  return (
    <AppShell>
      <BrandHeader title="Centrum platieb" subtitle="Spravujte príjemcov, trvalé príkazy a šablóny" />

      <div className="space-y-4 px-4 pb-24">
        <input
          aria-label="Hľadať v šablónach a príjemcoch"
          className={field + " bg-surface"}
          placeholder="Hľadať podľa mena alebo IBAN"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {/* Záložky */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("templates")}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${activeTab === "templates" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
          >
            Šablóny a obľúbené
          </button>
          <button
            onClick={() => setActiveTab("trvale")}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${activeTab === "trvale" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
          >
            Trvalé príkazy
          </button>
          <button
            onClick={() => setActiveTab("recipients")}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${activeTab === "recipients" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
          >
            Príjemcovia
          </button>
        </div>

        {activeTab === "templates" && (
          <div className="space-y-4">
            <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[16px] font-bold">
                  <Star className="h-4 w-4 text-primary" /> Šablóny platieb
                </h2>
                <button
                  onClick={() => setOpen((v) => !v)}
                  disabled={templatesLoading || templatesError || savingTemplates || !userId}
                  className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Nová
                </button>
              </div>

              {open && (
                <div className="mb-3 space-y-2">
                  <input className={field} maxLength={60} placeholder="Názov šablóny" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <input className={field} maxLength={100} placeholder="Príjemca" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input className={field} maxLength={42} placeholder="IBAN" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} />
                  <div className="flex gap-2">
                    <input className={field} inputMode="decimal" maxLength={14} placeholder="Suma €" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                    <input className={field} inputMode="numeric" maxLength={10} placeholder="VS" value={form.vs} onChange={(e) => setForm({ ...form, vs: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
                  </div>
                  <button onClick={() => void addTemplate()} disabled={savingTemplates} className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">
                    {savingTemplates ? "Ukladám…" : "Uložiť šablónu"}
                  </button>
                </div>
              )}

              {templatesLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Načítavam šablóny…</p>
              ) : templatesError ? (
                <p className="py-4 text-center text-sm text-destructive">Šablóny sa nepodarilo načítať.</p>
              ) : templates.length === 0 && !open ? (
                <p className="py-3 text-[14px] text-muted-foreground">Zatiaľ nemáte uložené žiadne šablóny.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {templates.filter(match).map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <button onClick={() => pay(t)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                          <Repeat className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold">{t.title}</span>
                          <span className="block truncate text-[12px] text-muted-foreground">{t.name} · {t.iban}</span>
                        </span>
                        <span className="ml-auto shrink-0 text-[15px] font-bold">{formatEur(Number(t.amount))}</span>
                      </button>
                      <button aria-label="Odstrániť šablónu" onClick={() => void save(templates.filter((x) => x.id !== t.id))} className="p-2 text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[16px] font-bold">
                  <Star className="h-4 w-4 text-primary" /> Obľúbení príjemcovia
                </h2>
                <span className="text-xs text-muted-foreground">{favorites.length}</span>
              </div>
              {favorites.filter(match).length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Zatiaľ nemáte uložených obľúbených príjemcov.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {favorites.filter(match).map((recipient) => (
                    <li key={recipient.iban} className="flex items-center gap-2 py-3">
                      <button onClick={() => pay(recipient)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {recipient.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{recipient.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{recipient.iban}</span>
                        </span>
                        <span className="ml-auto shrink-0 text-xs font-semibold text-primary">platba</span>
                      </button>
                      <button onClick={() => removeFavorite(recipient.iban)} className="p-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {activeTab === "trvale" && (
          <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[16px] font-bold">
                <Clock className="h-5 w-5 text-primary" /> Trvalé príkazy a inkasá
              </h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Aktívne (2)</span>
            </div>
            
            <div className="space-y-3">
              <div className="rounded-2xl bg-surface-2 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">Nájomné byt</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Každých 25. v mesiaci · SK84 0200 0000 0012 3456 7890</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-foreground">450,00 €</p>
                  <span className="text-[11px] text-emerald-600 font-medium">Prebieha</span>
                </div>
              </div>

              <div className="rounded-2xl bg-surface-2 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">Internet a TV</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Každých 15. v mesiaci · SK11 0900 0000 0098 7654 3210</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-foreground">25,00 €</p>
                  <span className="text-[11px] text-emerald-600 font-medium">Prebieha</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Trvalé príkazy sú spravované automaticky bankou.</p>
          </section>
        )}

        {activeTab === "recipients" && (
          <section className="rounded-3xl bg-surface p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold">
              <User className="h-4 w-4 text-primary" /> História príjemcov
            </h2>
            {recipients.length === 0 ? (
              <p className="py-3 text-[14px] text-muted-foreground">Zatiaľ nie sú v histórii uložení žiadni príjemcovia.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recipients.filter(match).map((r) => (
                  <li key={r.iban}>
                    <button onClick={() => pay({ name: r.name, iban: r.iban, amount: r.amount.toFixed(2) })} className="flex w-full items-center gap-3 py-3 text-left">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-[14px] font-bold">
                        {r.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">{r.name}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">{r.iban} · {r.count}×</span>
                      </span>
                      <span className="ml-auto shrink-0 text-[13px] font-semibold text-primary">Použiť</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
