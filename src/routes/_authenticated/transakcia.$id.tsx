import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Tag, EyeOff, Pencil, Paperclip, Copy, Download, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/bank/AppShell";
import { formatEur, removeTransaction, useBank } from "@/lib/bank-store";
import { exportReceipt } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/transakcia/$id")({
  head: () => ({
    meta: [
      { title: "Detail transakcie | George" },
      { name: "description", content: "Podrobnosti platby: suma, dátum, príjemca, IBAN a priebežný zostatok." },
      { property: "og:title", content: "Detail transakcie | George" },
      { property: "og:description", content: "Podrobnosti platby: suma, dátum, príjemca, IBAN a priebežný zostatok." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Detail,
});

type Extra = { exclude?: boolean | undefined; note?: string | undefined; attachment?: string | undefined };
const extraKey = (id: string) => `george-txn-extra:${id}`;

function formatIban(iban: string) {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
function formatDay(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[15px] text-detail-muted">{label}</dt>
      <dd className="mt-1 break-words text-[19px] font-semibold leading-snug text-detail-ink">{children}</dd>
    </div>
  );
}

function Detail() {
  const { id } = Route.useParams();
  const s = useBank();
  const t = s.transactions.find((x) => x.id === id);
  const navigate = useNavigate();
  const [extra, setExtra] = useState<Extra>({});
  const [shareOpen, setShareOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setExtra(JSON.parse(localStorage.getItem(extraKey(id)) || "{}")); } catch { setExtra({}); }
  }, [id]);

  const save = (next: Extra) => {
    setExtra(next);
    localStorage.setItem(extraKey(id), JSON.stringify(next));
  };

  if (!t) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center">
          <p className="text-sm text-muted-foreground">Transakcia sa nenašla.</p>
          <Link to="/platby" className="mt-4 inline-block text-[13px] font-semibold text-primary">Späť na platby</Link>
        </div>
      </AppShell>
    );
  }

  const income = t.type === "in";
  const ordered = [...s.transactions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const index = ordered.findIndex((x) => x.id === t.id);
  const runningBalance = ordered.slice(0, index + 1).reduce((sum, x) => sum + (x.type === "in" ? x.amount : -x.amount), 0);
  const [whole, cents] = t.amount.toFixed(2).split(".");
  const note = extra.note ?? t.note;
  const pill = "h-10 rounded-full bg-detail-action-surface px-5 text-[15px] font-semibold text-detail-action active:opacity-80";
  const rowBtn = "flex w-full items-center gap-5 bg-detail-surface px-5 py-5 text-left";

  const copy = async () => {
    const text = [
      `${income ? "Odosielateľ" : "Príjemca"}: ${t.counterparty}`,
      t.iban ? `IBAN: ${formatIban(t.iban)}` : "",
      `Suma: ${income ? "+" : "-"}${formatEur(t.amount)}`,
      `Dátum: ${formatDay(t.date)}`,
      t.vs ? `VS: ${t.vs}` : "",
    ].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(text); toast.success("Údaje platby skopírované"); }
    catch { toast.error("Kopírovanie sa nepodarilo"); }
    setShareOpen(false);
  };

  return (
    <AppShell>
      <div className="transaction-detail min-h-screen bg-detail-background px-4 pb-10 pt-5 font-sans text-foreground">
        <Link
          to="/platby"
          aria-label="Späť"
          onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); window.history.back(); } }}
          className="mb-4 inline-grid size-10 place-items-center text-detail-action"
        >
          <ArrowLeft className="size-7" />
        </Link>

        <div className="space-y-4">
          <section className="rounded-3xl bg-detail-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="break-words text-[18px] font-semibold leading-snug text-detail-ink">{t.counterparty}</h1>
                <p className="mt-1 text-[30px] font-bold leading-tight text-detail-ink" aria-label={`${income ? "+" : "-"}${formatEur(t.amount)}`}>
                  {income ? "+" : "-"}{Number(whole).toLocaleString("sk-SK")},<sup className="text-[16px] font-semibold">{cents}</sup> €
                </p>
              </div>
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-detail-direction">
                {income ? <ArrowDownLeft className="size-8" /> : <ArrowUpRight className="size-8" />}
              </span>
            </div>
            <div className="mt-5 flex gap-3">
              {!income && (
                <button
                  className={pill}
                  onClick={() => navigate({ to: "/nova-platba", search: { name: t.counterparty, iban: t.iban, amount: t.amount.toFixed(2), vs: t.vs } })}
                >
                  Zopakovať
                </button>
              )}
              <button className={pill} onClick={() => setShareOpen(true)}>Zdieľať</button>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl">
            <div className="flex items-center gap-5 bg-detail-surface px-5 py-5">
              <Tag className="size-7 shrink-0 text-detail-action" />
              <span className="rounded-full border border-detail-muted px-3 py-1 text-[15px] font-medium">{t.category}</span>
            </div>
            <div className="mt-1 flex items-center gap-5 bg-detail-surface px-5 py-5">
              <EyeOff className="size-7 shrink-0 text-detail-action" />
              <span className="flex-1 text-[17px] leading-snug text-detail-ink">Nezahrnúť do prehľadu príjmov a výdavkov</span>
              <button
                role="switch"
                aria-checked={!!extra.exclude}
                aria-label="Nezahrnúť do prehľadu"
                onClick={() => save({ ...extra, exclude: !extra.exclude })}
                className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors ${extra.exclude ? "border-detail-action bg-detail-action" : "border-detail-muted bg-detail-action-surface"}`}
              >
                <span className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full transition-all ${extra.exclude ? "left-7 bg-background" : "left-1 bg-detail-muted"}`} />
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl">
            {editingNote ? (
              <div className="flex items-center gap-3 bg-detail-surface px-5 py-4">
                <Pencil className="size-7 shrink-0 text-detail-action" />
                <input
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Poznámka alebo #hashtag"
                  className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
                />
                <button className="font-semibold text-detail-action" onClick={() => { save({ ...extra, note: noteDraft.trim() }); setEditingNote(false); }}>Uložiť</button>
              </div>
            ) : (
              <button className={rowBtn} onClick={() => { setNoteDraft(note ?? ""); setEditingNote(true); }}>
                <Pencil className="size-7 shrink-0 text-detail-action" />
                <span className={`text-[17px] ${note ? "text-detail-ink" : "text-detail-muted"}`}>{note || "Pridať poznámku alebo #hashtag"}</span>
              </button>
            )}
            <button className={`${rowBtn} mt-1`} onClick={() => fileRef.current?.click()}>
              <Paperclip className="size-7 shrink-0 text-detail-action" />
              <span className={`min-w-0 flex-1 truncate text-[17px] ${extra.attachment ? "text-detail-ink" : "text-detail-muted"}`}>{extra.attachment || "Nahrať prílohu"}</span>
              {extra.attachment && (
                <span role="button" aria-label="Odstrániť prílohu" onClick={(e) => { e.stopPropagation(); save({ ...extra, attachment: undefined }); }}>
                  <X className="size-5 text-detail-muted" />
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { save({ ...extra, attachment: f.name }); toast.success("Príloha pridaná"); } e.target.value = ""; }}
            />
          </section>

          <dl className="space-y-7 rounded-3xl bg-detail-surface p-5">
            <Row label={income ? "Odosielateľ" : "Príjemca"}>
              {t.counterparty}
              {t.iban ? <><br />IBAN: {formatIban(t.iban)}</> : null}
            </Row>
            <Row label="Dátum spracovania">{formatDay(t.date)}</Row>
            <Row label="Typ transakcie">{income ? "Prijatý prevod / SEPA" : "Platobný príkaz na úhradu / FIT 2.0 (EB)"}</Row>
            {t.vs ? <Row label="Variabilný symbol">{t.vs}</Row> : null}
            <Row label="Priebežný zostatok">{formatEur(runningBalance)}</Row>
          </dl>

          <button
            className="flex w-full items-center justify-center gap-2 py-3 text-[15px] font-semibold text-destructive"
            onClick={async () => {
              if (!window.confirm("Naozaj odstrániť túto transakciu?")) return;
              try { await removeTransaction(t.id); toast.success("Transakcia odstránená"); navigate({ to: "/platby" }); }
              catch (e) { console.error(e); toast.error("Transakciu sa nepodarilo odstrániť"); }
            }}
          >
            <Trash2 className="size-5" /> Odstrániť transakciu
          </button>
        </div>

        {shareOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-foreground/40" onClick={() => setShareOpen(false)}>
            <div className="w-full space-y-2 rounded-t-3xl bg-detail-surface p-5 pb-8" onClick={(e) => e.stopPropagation()}>
              <p className="mb-2 text-[17px] font-semibold">Zdieľať platbu</p>
              <button className="flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-[16px]" onClick={copy}>
                <Copy className="size-6 text-detail-action" /> Kopírovať údaje platby
              </button>
              <button
                className="flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-[16px]"
                onClick={async () => {
                  try { await exportReceipt(s, t); toast.success("Potvrdenie o platbe bolo stiahnuté"); }
                  catch (e) { console.error(e); toast.error("Potvrdenie sa nepodarilo vytvoriť"); }
                  setShareOpen(false);
                }}
              >
                <Download className="size-6 text-detail-action" /> Stiahnuť potvrdenie (PDF)
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
