import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getImageAsDataUrl } from "./image-utils";

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

interface Quote {
  id: number;
  quoteNumber: string;
  clientId: number;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes?: string;
  additionalTaxes?: AdditionalTax[] | null;
  attachments?: string[] | null;
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

interface QuoteItem {
  id: number;
  quoteId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
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

// Función para generar un PDF y descargarlo
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
  autoTable(doc, {
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
  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY + 10;
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

// Función para generar un PDF como base64 para enviar por email
export async function generateInvoicePDFAsBase64(
  invoice: Invoice,
  client: Client,
  items: InvoiceItem[],
  companyInfo: any = null
): Promise<string> {
  // Create a new PDF
  const doc = new jsPDF();
  
  // Set some basic styles
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Add company logo and info (placeholder for real data)
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(companyInfo?.name || "Billeo", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(companyInfo?.taxId || "NIF: B12345678", 14, 30);
  doc.text(companyInfo?.address || "Dirección", 14, 35);
  doc.text(`${companyInfo?.postalCode || ""} ${companyInfo?.city || ""}, ${companyInfo?.country || "España"}`, 14, 40);
  if (companyInfo?.email) doc.text(`Email: ${companyInfo.email}`, 14, 45);
  if (companyInfo?.phone) doc.text(`Teléfono: ${companyInfo.phone}`, 14, 50);
  
  // Add invoice title and number
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235); // blue-600
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
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text("CLIENTE", 14, 65);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(client.name, 14, 73);
  doc.text(`NIF/CIF: ${client.taxId}`, 14, 78);
  doc.text(client.address, 14, 83);
  doc.text(`${client.postalCode} ${client.city}, ${client.country}`, 14, 88);
  if (client.email) doc.text(`Email: ${client.email}`, 14, 93);
  if (client.phone) doc.text(`Teléfono: ${client.phone}`, 14, 98);
  
  // Add invoice items
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text("DETALLES DE LA FACTURA", 14, 115);
  
  // Create the table with items
  autoTable(doc, {
    startY: 120,
    head: [['Descripción', 'Cantidad', 'Precio Unitario', 'IVA %', 'Subtotal']],
    body: items.map(item => [
      item.description,
      Number(item.quantity).toFixed(2),
      `${Number(item.unitPrice).toFixed(2)} €`,
      `${Number(item.taxRate).toFixed(2)}%`,
      `${Number(item.subtotal).toFixed(2)} €`
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
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
  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY + 10;
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
  if (companyInfo?.bankAccount) {
    doc.text(`IBAN: ${companyInfo.bankAccount}`, 14, finalY + 36);
  } else {
    doc.text("IBAN: ES12 3456 7890 1234 5678 9012", 14, finalY + 36);
  }
  
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
      `${companyInfo?.name || "Billeo"} - Sistema de gestión financiera`,
      105, 285, { align: "center" }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
  }
  
  // Return the PDF as base64 string
  return doc.output('datauristring').split(',')[1];
}

export async function generateQuotePDF(
  quote: Quote,
  client: Client,
  items: QuoteItem[]
): Promise<void> {
  try {
    // Create a new PDF
    const doc = new jsPDF();
    
    // Set some basic styles
    doc.setFont("helvetica");
    doc.setFontSize(10);
    
    // Check if the quote has a logo
    const logoPath = quote.attachments && quote.attachments.length > 0 ? quote.attachments[0] : null;
    
    // Cargar el logo si existe
    if (logoPath) {
      try {
        console.log("Preparando logo para PDF desde:", logoPath);
        
        // Usar la utilidad para convertir la imagen a data URL desde la ruta relativa
        const logoDataUrl = await getImageAsDataUrl(logoPath);
        
        // Crear una imagen temporal para obtener las dimensiones reales y mantener proporciones
        const tmpImg = new Image();
        await new Promise<void>((resolve, reject) => {
          tmpImg.onload = () => resolve();
          tmpImg.onerror = () => reject(new Error('Error al cargar imagen para calcular proporciones'));
          tmpImg.src = logoDataUrl;
        });
        
        // Calcular dimensiones manteniendo proporciones (50% más pequeño)
        const maxWidth = 25; // 50% más pequeño que el original de 50
        const maxHeight = 12.5; // 50% más pequeño que el original de 25
        
        // Calcular el ratio de aspecto
        const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
        const width = tmpImg.width * ratio;
        const height = tmpImg.height * ratio;
        
        // Posición alineada con subtotal (195 - width para alineación a la derecha)
        const xPosition = 195 - width;
        
        // Añadir la imagen al PDF usando la data URL con las dimensiones proporcionales
        doc.addImage(logoDataUrl, 'PNG', xPosition, 10, width, height);
        console.log("Logo añadido correctamente al PDF con dimensiones proporcionales:", width, height);
      } catch (logoError) {
        console.error("Error añadiendo logo al PDF:", logoError);
      }
    }
    
    // Añadir información de la empresa
    doc.setFontSize(20);
    doc.setTextColor(25, 118, 210); // primary color
    doc.text("Billeo", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Tu empresa, S.L.", 14, 30);
    doc.text("NIF: B12345678", 14, 35);
    doc.text("Calle Ejemplo 123", 14, 40);
    doc.text("28001 Madrid, España", 14, 45);
    
    // Add quote title and number
    doc.setFontSize(16);
    doc.setTextColor(25, 118, 210);
    doc.text(`PRESUPUESTO Nº: ${quote.quoteNumber}`, 140, 22, { align: "right" });
    
    // Add quote details
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Fecha de emisión: ${formatDate(quote.issueDate)}`, 140, 30, { align: "right" });
    doc.text(`Válido hasta: ${formatDate(quote.validUntil)}`, 140, 35, { align: "right" });
    
    // Add status
    let statusText;
    switch (quote.status) {
      case "draft":
        statusText = "Borrador";
        break;
      case "sent":
        statusText = "Enviado";
        break;
      case "accepted":
        statusText = "Aceptado";
        break;
      case "rejected":
        statusText = "Rechazado";
        break;
      case "expired":
        statusText = "Vencido";
        break;
      default:
        statusText = quote.status;
    }
    
    let statusColor;
    switch (quote.status) {
      case "draft":
        statusColor = [97, 97, 97]; // gray
        break;
      case "sent":
        statusColor = [25, 118, 210]; // blue
        break;
      case "accepted":
        statusColor = [46, 125, 50]; // green
        break;
      case "rejected":
        statusColor = [211, 47, 47]; // red
        break;
      case "expired":
        statusColor = [211, 47, 47]; // red
        break;
      default:
        statusColor = [0, 0, 0]; // black
    }
    
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
    
    // Add quote items
    doc.setFontSize(12);
    doc.setTextColor(25, 118, 210);
    doc.text("DETALLES DEL PRESUPUESTO", 14, 110);
    
    // Create the table with items
    autoTable(doc, {
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
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    let yOffset = 0;
    
    doc.setFontSize(10);
    doc.text("Subtotal:", 140, finalY + yOffset, { align: "right" });
    doc.text(`${Number(quote.subtotal).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
    yOffset += 6;
    
    doc.text("IVA:", 140, finalY + yOffset, { align: "right" });
    doc.text(`${Number(quote.tax).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
    yOffset += 6;
    
    // Add additional taxes if they exist
    if (quote.additionalTaxes && quote.additionalTaxes.length > 0) {
      quote.additionalTaxes.forEach(tax => {
        let taxText = tax.name;
        let taxAmount = tax.amount;
        
        // Format differently based on whether it's percentage or fixed
        if (tax.isPercentage) {
          taxText += ` (${taxAmount}%)`;
          taxAmount = (Number(quote.subtotal) * taxAmount) / 100;
        }
        
        doc.text(`${taxText}:`, 140, finalY + yOffset, { align: "right" });
        doc.text(`${taxAmount.toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
        yOffset += 6;
      });
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 140, finalY + yOffset + 4, { align: "right" });
    doc.text(`${Number(quote.total).toFixed(2)} €`, 195, finalY + yOffset + 4, { align: "right" });
    
    // Add payment details and notes
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Add note about validity
    doc.text(`Este presupuesto es válido hasta el ${formatDate(quote.validUntil)}.`, 14, finalY + 30);
    doc.text("Para más información o consultas, no dude en contactarnos.", 14, finalY + 36);
    
    if (quote.notes) {
      doc.text("NOTAS:", 14, finalY + 46);
      doc.text(quote.notes, 14, finalY + 52);
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        "Billeo - Sistema de gestión financiera para profesionales y pequeñas empresas",
        105, 285, { align: "center" }
      );
      doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
    }
    
    // Save the PDF
    doc.save(`Presupuesto_${quote.quoteNumber}.pdf`);
  } catch (error) {
    console.error("Error general generando PDF:", error);
    throw error;
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
  autoTable(doc, {
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
  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY + 10;
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