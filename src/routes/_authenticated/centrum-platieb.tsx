import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Repeat, Star, Trash2, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BrandHeader } from "@/components/bank/AppShell";
import { formatEur, hydrate, useBank } from "@/lib/bank-store";
import { validateIban } from "@/lib/iban-validator";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/centrum-platieb")({
  head: () => ({
    meta: [
      { title: "Centrum platieb · George" },
      { name: "description", content: "Uložení príjemcovia a šablóny platieb na opakovanie jedným ťuknutím." },
      { property: "og:title", content: "Centrum platieb · George" },
      { property: "og:description", content: "Uložení príjemcovia a šablóny platieb na opakovanie jedným ťuknutím." },
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
          toast.error("Obľúbených príjemcov sa nepodarilo načítať.");
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
          toast.error("Šablóny platieb sa nepodarilo načítať.");
        }
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });
    return () => { active = false; };
  }, [templatesReload]);

  const save = async (list: Template[]) => {
    if (savingTemplates) return false;
    if (templatesLoading || templatesError) {
      toast.error("Šablóny ešte nie sú načítané. Skúste to znova.");
      return false;
    }
    if (!userId) {
      toast.error("Používateľská relácia nie je pripravená.");
      return false;
    }
    setSavingTemplates(true);
    const removed = templates.filter((t) => !list.some((l) => l.id === t.id));
    const added = list.filter((l) => !templates.some((t) => t.id === l.id));
    try {
      for (const r of removed) {
        const { error } = await supabase.from("payment_templates").delete().eq("id", r.id).eq("user_id", userId);
        if (error) throw error;
      }
      for (const a of added) {
        const { error } = await supabase.from("payment_templates").insert({ user_id: userId, id: a.id, title: a.title, name: a.name, iban: a.iban, amount: Number(a.amount), vs: a.vs ?? null });
        if (error) throw error;
      }
      setTemplates(list);
      return true;
    } catch (error) {
      console.error("Nepodarilo sa uložiť šablónu platby:", error);
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
      toast.error("Príjemcu sa nepodarilo odstrániť z tohto zariadenia.");
    }
  };

  const addTemplate = async () => {
    if (templatesLoading || templatesError) {
      toast.error("Šablóny ešte nie sú načítané. Skúste to znova.");
      return;
    }
    const normalizedAmount = form.amount.trim().replace(",", ".");
    const amount = Number(normalizedAmount);
    if (
      !form.name.trim() ||
      form.name.trim().length > 100 ||
      form.title.trim().length > 60 ||
      !form.iban.trim() ||
      !/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1_000_000
    ) {
      toast.error("Zadajte príjemcu a platnú sumu s najviac dvoma desatinnými miestami.");
      return;
    }
    if (form.vs.trim() && !/^\d{1,10}$/.test(form.vs.trim())) {
      toast.error("Variabilný symbol môže obsahovať najviac 10 číslic.");
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

// ... (vo vnútri komponentu CentrumPlatieb)
  const [activeTab, setActiveTab] = useState<"templates" | "recipients" | "trvale">("templates");

  return (
    <AppShell>
      <BrandHeader title="Centrum platieb" subtitle="Spravujte príjemcov a platobné šablóny" />

      {/* Záložky */}
      <div className="flex gap-2 px-4 mb-4">
        <button onClick={() => setActiveTab("templates")} className={`px-4 py-2 rounded-full text-sm font-semibold ${activeTab === "templates" ? "bg-primary text-white" : "bg-surface"}`}>Šablóny</button>
        <button onClick={() => setActiveTab("trvale")} className={`px-4 py-2 rounded-full text-sm font-semibold ${activeTab === "trvale" ? "bg-primary text-white" : "bg-surface"}`}>Trvalé príkazy</button>
        <button onClick={() => setActiveTab("recipients")} className={`px-4 py-2 rounded-full text-sm font-semibold ${activeTab === "recipients" ? "bg-primary text-white" : "bg-surface"}`}>Príjemcovia</button>
      </div>

      <div className="space-y-4 px-4 pb-24">
        {activeTab === "trvale" && (
            <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
                <h2 className="text-[16px] font-bold mb-4">Trvalé príkazy</h2>
                <div className="text-center py-8 text-sm text-muted-foreground">
                    Zatiaľ nemáte vytvorené žiadne trvalé príkazy.
                </div>
            </section>
        )}
        {activeTab === "templates" && (
            // ... (zvyšok pôvodného obsahu templates)
        )}
        // ...
      </div>
    </AppShell>
  );

          {open && (
            <div className="mb-3 space-y-2">
              <input className={field} maxLength={60} placeholder="Názov šablóny" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input className={field} maxLength={100} autoComplete="name" placeholder="Príjemca" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className={field} maxLength={42} autoComplete="off" placeholder="IBAN" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} />
              <div className="flex gap-2">
                <input className={field} inputMode="decimal" maxLength={14} placeholder="Suma €" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <input className={field} inputMode="numeric" maxLength={10} placeholder="VS" value={form.vs} onChange={(e) => setForm({ ...form, vs: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
              </div>
              <button onClick={() => void addTemplate()} disabled={savingTemplates} className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
                {savingTemplates ? "Ukladám…" : "Uložiť šablónu"}
              </button>
            </div>
          )}

          {templatesLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Načítavam šablóny platieb…</p>
          ) : templatesError ? (
            <div className="rounded-xl bg-destructive/5 p-4">
              <p role="alert" className="text-sm text-destructive">Šablóny sa nepodarilo načítať.</p>
              <button type="button" onClick={() => setTemplatesReload((value) => value + 1)} className="mt-2 text-sm font-semibold text-primary underline">
                Skúsiť znova
              </button>
            </div>
          ) : templates.length === 0 && !open ? (
            <p className="py-3 text-[14px] text-muted-foreground">Zatiaľ nemáš uložené žiadne šablóny.</p>
          ) : null}
          {!templatesLoading && !templatesError && (
          <ul className="divide-y divide-border">
            {templates.filter(match).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <button onClick={() => pay(t)} disabled={savingTemplates} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Repeat className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{t.title}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{t.name} · {t.iban}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-[15px] font-bold">{formatEur(Number(t.amount))}</span>
                </button>
                <button aria-label="Odstrániť šablónu" disabled={savingTemplates} onClick={() => void save(templates.filter((x) => x.id !== t.id))} className="p-2 text-muted-foreground disabled:opacity-50">
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
            <p className="py-3 text-sm text-muted-foreground">
              {favorites.length === 0
                ? "Zatiaľ nemáte uložených obľúbených príjemcov. Pridajte si ich vo formulári platby."
                : "Žiadny obľúbený príjemca nezodpovedá vyhľadávaniu."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {favorites.filter(match).map((recipient) => (
                <li key={recipient.iban} className="flex items-center gap-2 py-3">
                  <button
                    type="button"
                    onClick={() => pay(recipient)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {recipient.name.trim().slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{recipient.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{recipient.iban}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-xs font-semibold text-primary">platba</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Odstrániť ${recipient.name} z obľúbených`}
                    onClick={() => removeFavorite(recipient.iban)}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-surface p-4">
          <h2 className="mb-2 flex items-center gap-2 text-[16px] font-bold">
            <User className="h-4 w-4 text-primary" /> Príjemcovia
          </h2>
          {s.loading ? (
            <p className="py-3 text-sm text-muted-foreground">Načítavam príjemcov…</p>
          ) : s.error ? (
            <div className="rounded-xl bg-destructive/5 p-3">
              <p role="alert" className="text-sm text-destructive">{s.error}</p>
              <button type="button" onClick={() => void hydrate()} className="mt-2 text-sm font-semibold text-primary underline">
                Skúsiť znova
              </button>
            </div>
          ) : recipients.length === 0 ? (
            <p className="py-3 text-[14px] text-muted-foreground">Zatiaľ nie sú v histórii uložené žiadni príjemcovia.</p>
          ) : recipients.filter(match).length === 0 ? (
            <p className="py-3 text-[14px] text-muted-foreground">Žiadny príjemca nezodpovedá vyhľadávaniu.</p>
          ) : null}
          {!s.loading && !s.error && (
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
                  <span className="ml-auto shrink-0 text-[13px] font-semibold text-primary">Použiť v platbe</span>
                </button>
              </li>
            ))}
          </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
