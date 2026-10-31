type PdfInvoice = {
  invoiceNumber: string;
  status: string;
  customer: string;
  email: string;
  issueDate: string;
  dueDate: string;
  lines: Array<{ description: string; quantity: number; total: string }>;
  subtotal: string;
  discount: string;
  tax: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
};

function escapePdf(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildInvoicePdf(invoice: PdfInvoice): Uint8Array {
  const rows = [
    "BRIGHTLOOP SOFTWARE",
    `Invoice ${invoice.invoiceNumber}`,
    `Status: ${invoice.status}`,
    `Customer: ${invoice.customer}`,
    `Email: ${invoice.email}`,
    `Issued: ${invoice.issueDate}    Due: ${invoice.dueDate}`,
    "",
    "Description                              Qty        Total",
    ...invoice.lines.map((line) => {
      const name = line.description.slice(0, 40).padEnd(42, " ");
      return `${name}${String(line.quantity).padStart(4, " ")}    ${line.total}`;
    }),
    "",
    `Subtotal:  INR ${invoice.subtotal}`,
    `Discount:  INR ${invoice.discount}`,
    `Tax:       INR ${invoice.tax}`,
    `Total:     INR ${invoice.grandTotal}`,
    `Paid:      INR ${invoice.amountPaid}`,
    `Balance:   INR ${invoice.balanceDue}`,
  ];

  const content = rows
    .map((line, index) => `BT /F1 11 Tf 48 ${790 - index * 16} Td (${escapePdf(line)}) Tj ET`)
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}
