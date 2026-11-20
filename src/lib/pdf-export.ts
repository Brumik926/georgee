import { jsPDF } from "jspdf";
import type { BankState, Txn } from "@/lib/bank-store";
import { formatEur } from "@/lib/bank-store";
import fontUrl from "@/assets/DejaVuSans.ttf?url";

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
  
  doc.setFontSize(16);
  doc.text("Potvrdenie o transakcii", 15, 20);
  
  doc.setFontSize(10);
  doc.text(`Dátum: ${new Date(t.date).toLocaleDateString("sk-SK")}`, 15, 30);
  doc.text(`Príjemca: ${t.counterparty}`, 15, 36);
  doc.text(`Suma: ${formatEur(t.amount)}`, 15, 42);
  doc.text(`Kategória: ${t.category}`, 15, 48);
  
  saveDoc(doc, `Potvrdenie_${t.id}.pdf`);
}
