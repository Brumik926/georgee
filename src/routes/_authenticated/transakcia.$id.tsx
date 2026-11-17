import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Tag, EyeOff, Pencil, Paperclip, Copy, Download, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/bank/AppShell";
import { formatEur, hydrate, removeTransaction, useBank } from "@/lib/bank-store";
import { exportReceipt } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/transakcia/$id")({
  validateSearch: z.object({
    q: z.string().optional(),
    filter: z.enum(["all", "in", "out"]).optional(),
    searchOpen: z.enum(["1"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Detail transakcie · George" },
      { name: "description", content: "Podrobnosti transakcie: suma, dátum, príjemca, IBAN a zostatok." },
      { property: "og:title", content: "Detail transakcie · George" },
      { property: "og:description", content: "Podrobnosti transakcie: suma, dátum, príjemca, IBAN a zostatok." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Detail,
});

type Extra = { exclude?: boolean | undefined; note?: string | undefined; attachment?: string | undefined };
const extraKey = (id: string) => `george-txn-extra:${id}`;

function parseExtra(raw: string | null): Extra {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const record = value as Record<string, unknown>;
    return {
      exclude: record["exclude"] === true,
      note: typeof record["note"] === "string" ? record["note"] : undefined,
      attachment: typeof record["attachment"] === "string" ? record["attachment"] : undefined,
    };
  } catch {
    return {};
  }
}
const attachmentDbName = "george-demo-attachments";

function openAttachmentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(attachmentDbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Databázu príloh sa nepodarilo otvoriť."));
  });
}

async function storeAttachment(transactionId: string, file: File) {
  const db = await openAttachmentDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction("files", "readwrite").objectStore("files").put(file, transactionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Prílohu sa nepodarilo uložiť."));
    });
  } finally {
    db.close();
  }
}

async function readAttachment(transactionId: string): Promise<Blob | undefined> {
  const db = await openAttachmentDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("files", "readonly").objectStore("files").get(transactionId);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error ?? new Error("Prílohu sa nepodarilo načítať."));
    });
  } finally {
    db.close();
  }
}

async function deleteAttachment(transactionId: string) {
  const db = await openAttachmentDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction("files", "readwrite").objectStore("files").delete(transactionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Prílohu sa nepodarilo odstrániť."));
    });
  } finally {
    db.close();
  }
}

function formatIban(iban: string) {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
function formatDay(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "Neznámy dátum";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-detail-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-[15px] font-semibold leading-snug text-detail-ink">{children}</dd>
    </div>
  );
}

function Detail() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const s = useBank();
  const t = s.transactions.find((x) => x.id === id);
  const navigate = useNavigate();
  const [extra, setExtra] = useState<Extra>({});
  const [shareOpen, setShareOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setExtra(parseExtra(localStorage.getItem(extraKey(id)))); } catch { setExtra({}); }
  }, [id]);

  const save = (next: Extra): boolean => {
    try {
      localStorage.setItem(extraKey(id), JSON.stringify(next));
      setExtra(next);
      return true;
    } catch {
      toast.error("Zmena sa nepodarila uložiť v tomto zariadení.");
      return false;
    }
  };

  if (s.loading) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center text-sm text-muted-foreground" role="status">
          Načítavam transakciu…
        </div>
      </AppShell>
    );
  }

  if (s.error) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center">
          <p className="text-sm text-muted-foreground" role="alert">{s.error}</p>
          <button type="button" onClick={() => void hydrate()} className="mt-4 inline-block text-[13px] font-semibold text-primary underline">
            Skúsiť znova
          </button>
          <Link to="/platby" search={{ q: search.q, filter: search.filter, searchOpen: search.searchOpen }} className="mt-4 block text-[13px] font-semibold text-primary">Späť na históriu</Link>
        </div>
      </AppShell>
    );
  }

  if (!t) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center">
          <p className="text-sm text-muted-foreground">Transakcia sa nenašla v dostupnej histórii.</p>
          <Link to="/platby" search={{ q: search.q, filter: search.filter, searchOpen: search.searchOpen }} className="mt-4 inline-block text-[13px] font-semibold text-primary">Späť na históriu</Link>
        </div>
      </AppShell>
    );
  }

  const income = t.type === "in";
  const ordered = [...s.transactions].sort((a, b) => {
    const aTime = Date.parse(a.date);
    const bTime = Date.parse(b.date);
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (!aValid && !bValid) return a.id.localeCompare(b.id);
    if (!aValid) return 1;
    if (!bValid) return -1;
    return aTime - bTime || a.id.localeCompare(b.id);
  });
  const index = ordered.findIndex((x) => x.id === t.id);
  const hasValidTransactionDate = Number.isFinite(Date.parse(t.date));
  const runningBalance = hasValidTransactionDate
    ? ordered.slice(0, index + 1).reduce((sum, x) => sum + (x.type === "in" ? x.amount : -x.amount), 0)
    : null;
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
          search={{ q: search.q, filter: search.filter, searchOpen: search.searchOpen }}
          aria-label="Späť na históriu transakcií"
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
                <button className="font-semibold text-detail-action" onClick={() => { if (save({ ...extra, note: noteDraft.trim() })) setEditingNote(false); }}>Uložiť</button>
              </div>
            ) : (
              <button className={rowBtn} onClick={() => { setNoteDraft(note ?? ""); setEditingNote(true); }}>
                <Pencil className="size-7 shrink-0 text-detail-action" />
                <span className={`text-[17px] ${note ? "text-detail-ink" : "text-detail-muted"}`}>{note || "Pridať poznámku alebo #hashtag"}</span>
              </button>
            )}
            <div className={`${rowBtn} mt-1`}>
              <Paperclip className="size-7 shrink-0 text-detail-action" />
              {extra.attachment ? (
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[17px] text-detail-ink"
                  onClick={async () => {
                    try {
                      const file = await readAttachment(id);
                      if (!file) throw new Error("Súbor prílohy sa v tomto zariadení nenašiel.");
                      const url = URL.createObjectURL(file);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = extra.attachment || "priloha";
                      link.style.display = "none";
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      // Niektoré mobilné prehliadače začnú sťahovanie až po návrate z event handlera.
                      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } catch (error) {
                      console.error(error);
                      toast.error(error instanceof Error ? error.message : "Prílohu sa nepodarilo stiahnuť.");
                    }
                  }}
                >
                  {extra.attachment}
                </button>
              ) : (
                <button type="button" className="flex-1 text-left text-[17px] text-detail-muted" onClick={() => fileRef.current?.click()}>
                  Nahrať prílohu
                </button>
              )}
              {extra.attachment && (
                <button
                  type="button"
                  aria-label="Odstrániť prílohu"
                  className="rounded-full p-2 text-detail-muted"
                  onClick={async () => {
                    if (!save({ ...extra, attachment: undefined })) return;
                    try {
                      await deleteAttachment(id);
                      toast.success("Príloha odstránená");
                    } catch (error) {
                      console.error(error);
                      toast.error("Príloha bola odpojená od transakcie, ale súbor sa nepodarilo odstrániť z úložiska.");
                    }
                  }}
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  toast.error("Príloha môže mať najviac 10 MB.");
                  e.target.value = "";
                  return;
                }
                try {
                  await storeAttachment(id, file);
                  if (save({ ...extra, attachment: file.name })) {
                    toast.success("Príloha uložená v tomto zariadení");
                  } else {
                    try { await deleteAttachment(id); } catch (cleanupError) { console.error("Nepodarilo sa odstrániť neuloženú prílohu:", cleanupError); }
                  }
                } catch (error) {
                  console.error(error);
                  toast.error("Prílohu sa nepodarilo uložiť.");
                } finally {
                  e.target.value = "";
                }
              }}
            />
          </section>

          <dl className="space-y-5 rounded-3xl bg-detail-surface p-5">
            <Row label={income ? "Odosielateľ" : "Príjemca"}>
              {t.counterparty}
              {t.iban ? <><br />IBAN: {formatIban(t.iban)}</> : null}
            </Row>
            <Row label="Dátum spracovania">{formatDay(t.date)}</Row>
            <Row label="Typ transakcie">{income ? "Prijatý prevod" : "Odoslaný prevod"}</Row>
            {t.vs ? <Row label="Variabilný symbol">{t.vs}</Row> : null}
            <Row label="Zostatok podľa dostupnej histórie">
              {runningBalance === null ? "Nedostupný – transakcia nemá platný dátum" : formatEur(runningBalance)}
            </Row>
          </dl>

          <button
            className="flex w-full items-center justify-center gap-2 py-3 text-[15px] font-semibold text-destructive"
            onClick={async () => {
              if (!window.confirm("Naozaj odstrániť túto transakciu?")) return;
              try {
                await removeTransaction(t.id);
                try { await deleteAttachment(t.id); } catch (attachmentError) { console.warn("Lokálnu prílohu sa nepodarilo odstrániť:", attachmentError); }
                try { localStorage.removeItem(extraKey(t.id)); } catch (storageError) { console.warn("Metadáta transakcie sa nepodarilo odstrániť:", storageError); }
                toast.success("Transakcia odstránená");
                navigate({ to: "/platby", search: { q: search.q, filter: search.filter, searchOpen: search.searchOpen } });
              } catch (e) { console.error(e); toast.error("Transakciu sa nepodarilo odstrániť"); }
            }}
          >
            <Trash2 className="size-5" /> Odstrániť transakciu
          </button>
        </div>

        {shareOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-foreground/40" onClick={() => setShareOpen(false)}>
            <div className="mx-auto w-full max-w-[430px] space-y-2 rounded-t-3xl bg-detail-surface p-5 pb-8" onClick={(e) => e.stopPropagation()}>
              <p className="mb-2 text-[17px] font-semibold">Zdieľať platbu</p>
              <button className="flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-[16px]" onClick={copy}>
                <Copy className="size-6 text-detail-action" /> Kopírovať údaje platby
              </button>
              <button
                className="flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-[16px]"
                onClick={async () => {
                  try { await exportReceipt(s, t); toast.success("potvrdenie bolo stiahnuté"); }
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
