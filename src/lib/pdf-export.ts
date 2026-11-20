
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

  // Hlavička
  doc.setFontSize(19);
  doc.setTextColor(20, 35, 65);
  doc.text("Slovenská sporiteľňa", left, 19);

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "",
    left,
    25
  );

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "",
    left,
    30
  );

  // Názov dokumentu
  doc.setFontSize(15);
  doc.setTextColor(25, 25, 25);
  doc.text("Záznam transakcie", left, 47);

  // Základné informácie a suma
  doc.setFontSize(10);
  doc.text(s.owner, left, 58);

  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);
  doc.text("Transakcia", left, 64);

  doc.setFontSize(17);
  doc.setTextColor(
    t.type === "in" ? 0 : 35,
    t.type === "in" ? 125 : 35,
    t.type === "in" ? 65 : 35
  );

  doc.text(amount, right, 63, { align: "right" });

  line(70);

  // Bankové údaje
  let y = 80;

  y = row("IBAN účtu", s.iban, y);
  y = row("Partner", t.counterparty, y);
  y = row("Popis transakcie", t.category, y);
  y = row("Dátum transakcie", date, y);
  y = row(
    "Typ transakcie",
    t.type === "in" ? "Prichádzajúca" : "Odchádzajúca",
    y
  );

  // Dátum vyhotovenia
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Dátum vyhotovenia: ${new Date().toLocaleDateString("sk-SK")}`,
    left,
    y
  );

  // Upozornenie
  y += 22;
  line(y);

  doc.setFontSize(9);
  doc.setTextColor(75, 75, 75);
  doc.text(
    "Tento dokument obsahuje údaje evidované v SLSP.",
    left,
    y + 10
  );

  doc.text(
    "Potvrdzuje bankovú transakciu",
    left,
    y + 16
  );

  doc.text(
    "",
    left,
    y + 22
  );

  // Spodná poznámka
  doc.setFontSize(9);
  doc.setTextColor(160, 45, 45);
  doc.text(
    "Plaba bola zaúčtovaná",
    pageWidth / 2,
    285,
    { align: "center" }
  );

  saveDoc(doc, `Potvrdenie_${t.id}.pdf`);
}

