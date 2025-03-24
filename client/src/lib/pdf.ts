import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface AdditionalTax {
  name: string;
  amount: number;
  isPercentage?: boolean;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes?: string;
  additionalTaxes?: AdditionalTax[] | null;
}

interface Client {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
}

export async function generateInvoicePDF(
  invoice: Invoice,
  client: Client,
  items: InvoiceItem[]
): Promise<void> {
  // Create a new PDF
  const doc = new jsPDF();
  
  // Set some basic styles
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Add company logo and info (placeholder for real data)
  doc.setFontSize(20);
  doc.setTextColor(25, 118, 210); // primary color
  doc.text("FinanzaPro", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("Tu empresa, S.L.", 14, 30);
  doc.text("NIF: B12345678", 14, 35);
  doc.text("Calle Ejemplo 123", 14, 40);
  doc.text("28001 Madrid, España", 14, 45);
  
  // Add invoice title and number
  doc.setFontSize(16);
  doc.setTextColor(25, 118, 210);
  doc.text(`FACTURA Nº: ${invoice.invoiceNumber}`, 140, 22, { align: "right" });
  
  // Add invoice details
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Fecha de emisión: ${formatDate(invoice.issueDate)}`, 140, 30, { align: "right" });
  doc.text(`Fecha de vencimiento: ${formatDate(invoice.dueDate)}`, 140, 35, { align: "right" });
  
  // Add status
  const statusText = getStatusText(invoice.status);
  const statusColor = getStatusColor(invoice.status);
  doc.setFontSize(12);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`Estado: ${statusText}`, 140, 45, { align: "right" });
  
  // Add client information
  doc.setFontSize(12);
  doc.setTextColor(25, 118, 210);
  doc.text("CLIENTE", 14, 60);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(client.name, 14, 68);
  doc.text(`NIF/CIF: ${client.taxId}`, 14, 73);
  doc.text(client.address, 14, 78);
  doc.text(`${client.postalCode} ${client.city}, ${client.country}`, 14, 83);
  if (client.email) doc.text(`Email: ${client.email}`, 14, 88);
  if (client.phone) doc.text(`Teléfono: ${client.phone}`, 14, 93);
  
  // Add invoice items
  doc.setFontSize(12);
  doc.setTextColor(25, 118, 210);
  doc.text("DETALLES DE LA FACTURA", 14, 110);
  
  // Create the table with items
  (doc as any).autoTable({
    startY: 115,
    head: [['Descripción', 'Cantidad', 'Precio Unitario', 'IVA %', 'Subtotal']],
    body: items.map(item => [
      item.description,
      Number(item.quantity).toFixed(2),
      `${Number(item.unitPrice).toFixed(2)} €`,
      `${Number(item.taxRate).toFixed(2)}%`,
      `${Number(item.subtotal).toFixed(2)} €`
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [25, 118, 210], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });
  
  // Add totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  let yOffset = 0;
  
  doc.setFontSize(10);
  doc.text("Subtotal:", 140, finalY + yOffset, { align: "right" });
  doc.text(`${Number(invoice.subtotal).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
  yOffset += 6;
  
  doc.text("IVA:", 140, finalY + yOffset, { align: "right" });
  doc.text(`${Number(invoice.tax).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
  yOffset += 6;
  
  // Add additional taxes if they exist
  if (invoice.additionalTaxes && invoice.additionalTaxes.length > 0) {
    invoice.additionalTaxes.forEach(tax => {
      let taxText = tax.name;
      let taxAmount = tax.amount;
      
      // Format differently based on whether it's percentage or fixed
      if (tax.isPercentage) {
        taxText += ` (${taxAmount}%)`;
        taxAmount = (Number(invoice.subtotal) * taxAmount) / 100;
      }
      
      doc.text(`${taxText}:`, 140, finalY + yOffset, { align: "right" });
      doc.text(`${taxAmount.toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
      yOffset += 6;
    });
  }
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 140, finalY + yOffset + 4, { align: "right" });
  doc.text(`${Number(invoice.total).toFixed(2)} €`, 195, finalY + yOffset + 4, { align: "right" });
  
  // Add payment details and notes
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("FORMA DE PAGO: Transferencia bancaria", 14, finalY + 30);
  doc.text("IBAN: ES12 3456 7890 1234 5678 9012", 14, finalY + 36);
  
  if (invoice.notes) {
    doc.text("NOTAS:", 14, finalY + 46);
    doc.text(invoice.notes, 14, finalY + 52);
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "FinanzaPro - Sistema de gestión financiera para profesionales y pequeñas empresas",
      105, 285, { align: "center" }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
  }
  
  // Save the PDF
  doc.save(`Factura_${invoice.invoiceNumber}.pdf`);
}

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusText(status: string): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "paid":
      return "Pagada";
    case "overdue":
      return "Vencida";
    case "canceled":
      return "Cancelada";
    default:
      return status;
  }
}

function getStatusColor(status: string): number[] {
  switch (status) {
    case "pending":
      return [245, 124, 0]; // warning (orange)
    case "paid":
      return [46, 125, 50]; // success (green)
    case "overdue":
      return [211, 47, 47]; // error (red)
    case "canceled":
      return [97, 97, 97]; // neutral (gray)
    default:
      return [0, 0, 0];
  }
}

export async function generateReportPDF(
  title: string,
  period: string,
  data: any[]
): Promise<void> {
  // Create a new PDF
  const doc = new jsPDF();
  
  // Set some basic styles
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Add company logo and title
  doc.setFontSize(20);
  doc.setTextColor(25, 118, 210); // primary color
  doc.text("FinanzaPro", 14, 22);
  
  doc.setFontSize(16);
  doc.text(title, 14, 35);
  
  // Add report details
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Período: ${period}`, 14, 45);
  doc.text(`Fecha de generación: ${formatDate(new Date().toISOString())}`, 14, 50);
  
  // Create the table with data
  (doc as any).autoTable({
    startY: 60,
    head: [['Concepto', 'Importe']],
    body: data.map(item => [
      item.name,
      `${Number(item.value).toFixed(2)} €`
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [25, 118, 210], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });
  
  // Add totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const total = data.reduce((sum, item) => sum + Number(item.value), 0);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 140, finalY, { align: "right" });
  doc.text(`${total.toFixed(2)} €`, 195, finalY, { align: "right" });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "FinanzaPro - Sistema de gestión financiera para profesionales y pequeñas empresas",
      105, 285, { align: "center" }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
  }
  
  // Save the PDF
  doc.save(`Informe_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}