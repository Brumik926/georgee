import { jsPDF } from "jspdf";
import type { BankState, Txn } from "@/lib/bank-store";
import { formatEur } from "@/lib/bank-store";
import fontUrl from "@/assets/DejaVuSans.ttf?url";
import slspLogo from "@/assets/slsp-logo.png.asset.json";
import georgeLogo from "@/assets/george-logo.png.asset.json";

async function loadImage(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Helper na prevod fontu na base64
async function getFontData() {
  const res = await fetch(fontUrl);
  const buf = await res.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function createBaseDoc() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  try {
    const font = await getFontData();
    doc.addFileToVFS("DejaVuSans.ttf", font);
    doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    doc.addFont("DejaVuSans.ttf", "DejaVu", "bold");
    doc.setFont("DejaVu", "normal");
  } catch (e) {
    console.warn("Font sa nepodarilo načítať, používam default.");
    doc.setFont("helvetica");
  }
  return doc;
}

function saveDoc(doc: jsPDF, filename: string) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportStatement(s: BankState, txns: Txn[]) {
  const doc = await createBaseDoc();
  
  // Hlavička
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 153);
  doc.text("George - Výpis z účtu", 15, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(`Majiteľ: ${s.owner}`, 15, 30);
  doc.text(`IBAN: ${s.iban}`, 15, 36);
  doc.text(`Dátum: ${new Date().toLocaleDateString("sk-SK")}`, 150, 30);

  // Tabuľka
  doc.setDrawColor(200);
  doc.line(15, 42, 195, 42);
  
  doc.setFontSize(9);
  doc.text("Dátum", 15, 48);
  doc.text("Popis transakcie", 40, 48);
  doc.text("Suma", 150, 48, { align: "right" });
  doc.line(15, 52, 195, 52);

  let y = 60;
  for (const t of txns) {
    if (y > 280) { doc.addPage(); y = 20; }
    
    doc.text(new Date(t.date).toLocaleDateString("sk-SK"), 15, y);
    doc.text(t.counterparty.substring(0, 35), 40, y);
    
    const amount = (t.type === "in" ? "+" : "-") + formatEur(t.amount);
    doc.setTextColor(t.type === "in" ? 0 : 200, 0, 0);
    doc.text(amount, 150, y, { align: "right" });
    doc.setTextColor(0);
    
    y += 8;
  }

  saveDoc(doc, `Vypis_Uctu_${new Date().getTime()}.pdf`);
}


export async function exportReceipt(s: BankState, t: Txn) {
  const doc = await createBaseDoc();

  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 15;
  const right = pageWidth - 15;
  const contentWidth = right - left;

  const date = new Date(t.date).toLocaleDateString("sk-SK");
  const amount =
    (t.type === "in" ? "+" : "−") + formatEur(t.amount);

  const line = (y: number) => {
    doc.setDrawColor(205, 208, 212);
    doc.setLineWidth(0.25);
    doc.line(left, y, right, y);
  };

  const row = (
    label: string,
    value: string,
    y: number
  ) => {
    doc.setFontSize(10);
    doc.setTextColor(45, 45, 45);
    doc.text(label, left + 2, y);

    doc.setTextColor(20, 20, 20);

    const valueLines = doc.splitTextToSize(
      value,
      contentWidth * 0.58
    );

    doc.text(valueLines, left + 65, y);

    const rowHeight = Math.max(11, valueLines.length * 5);
    line(y + 7 + (valueLines.length - 1) * 5);

    return y + rowHeight;
  };

  // Hlavička: logo Slovenská sporiteľňa vľavo, symbol George vpravo
  const [slsp, george] = await Promise.all([loadImage(slspLogo.url), loadImage(georgeLogo.url)]);
  if (slsp) doc.addImage(slsp, "PNG", left, 10, 44, 13.5);
  else {
    doc.setFontSize(19);
    doc.setTextColor(20, 35, 65);
    doc.text("Slovenská sporiteľňa", left, 19);
  }
  if (george) doc.addImage(george, "PNG", right - 11, 10, 11, 13.2);

  // Hlavička podľa vzoru: meno príjemcu a hneď pod ním názov platby so sumou
  const recipient = t.type === "in" ? s.owner : t.counterparty;

  doc.setFontSize(15);
  doc.setTextColor(25, 25, 25);
  doc.text(recipient || "—", left, 47);

  doc.setFontSize(10.5);
  doc.setTextColor(45, 45, 45);
  doc.text("Platobný príkaz na úhradu / FIT 2.0 (EB)", left, 55);

  doc.setFontSize(17);
  doc.setTextColor(
    t.type === "in" ? 0 : 35,
    t.type === "in" ? 125 : 35,
    t.type === "in" ? 65 : 35
  );

  doc.text(amount, right, 55, { align: "right" });

  line(62);

  // Bankové údaje
  let y = 72;

  y = row("IBAN", s.iban, y);
  y = row("Partner", t.counterparty, y);
  if (t.iban) y = row("IBAN", t.iban, y);
  y = row("Popis transakcie", t.category, y);
  y = row("Dátum splatnosti", date, y);
  y = row("Dátum valuty", date, y);

  // Dátum vyhotovenia
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Platba bola zaučtovaná: ${new Date().toLocaleDateString("sk-SK")}`,
    left,
    y
  );

  saveDoc(doc, `Potvrdenie_${t.id}.pdf`);
}
