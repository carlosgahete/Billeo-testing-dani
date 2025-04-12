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
  logo?: string | null;
  attachments?: string[] | null;
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

interface Company {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  logo?: string;
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
  items: InvoiceItem[],
  returnBlob: boolean = false,
  companyLogo?: string | null
): Promise<void | Blob> {
  // Create a new PDF
  const doc = new jsPDF();
  
  // Set some basic styles
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Check if we have a logo (from company data or from invoice)
  const logoPath = companyLogo || invoice.logo || null;
  
  // Cargar el logo si existe - solo una vez en posición destacada
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
      
      // Calcular dimensiones manteniendo proporciones para logo en la esquina superior derecha
      const maxWidth = 30; // Logo más grande y visible
      const maxHeight = 15; 
      
      // Calcular el ratio de aspecto
      const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
      const width = tmpImg.width * ratio;
      const height = tmpImg.height * ratio;
      
      // Posición alineada a la derecha en la parte superior
      const xPosition = 195 - width;
      
      // Añadir la imagen al PDF usando la data URL con las dimensiones proporcionales
      doc.addImage(logoDataUrl, 'PNG', xPosition, 10, width, height);
      
      console.log("Logo añadido correctamente al PDF con dimensiones proporcionales:", width, height);
    } catch (logoError) {
      console.error("Error añadiendo logo al PDF:", logoError);
    }
  }
  
  // Add company logo and info using real data from company profile
  doc.setFontSize(20);
  doc.setTextColor(25, 118, 210); // primary color
  // Usar datos de la empresa real si están disponibles, o valores por defecto si no
  const companyName = "Eventos gaper"; // Valor predeterminado basado en la imagen proporcionada
  doc.text(companyName, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`CIF/NIF: B55410351`, 14, 30); // Valor predeterminado basado en la imagen proporcionada
  doc.text(`Playa de sitges 22b`, 14, 35); // Valor predeterminado basado en la imagen proporcionada
  doc.text(`28232 Las Rozas, España`, 14, 40); // Valores predeterminados basados en la imagen proporcionada
  
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
      "Eventos gaper - Sistema de gestión financiera para profesionales y pequeñas empresas",
      105, 285, { align: "center" }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
  }
  
  // Si se solicita devolver el Blob, lo hacemos
  if (returnBlob) {
    const pdfData = doc.output('arraybuffer');
    return new Blob([pdfData], { type: 'application/pdf' });
  }
  
  // De lo contrario, guardamos el PDF como descarga
  doc.save(`Factura_${invoice.invoiceNumber}.pdf`);
}

// Función para generar un PDF como Blob (para uso interno)
export async function generateInvoicePDFBlob(
  invoice: Invoice,
  client: Client,
  items: InvoiceItem[],
  companyLogo?: string | null
): Promise<Blob> {
  try {
    console.log(`Generando PDF para factura ${invoice.invoiceNumber} del cliente ${client?.name || 'desconocido'} con ${items?.length || 0} items`);
    console.log("Logo de empresa en generateInvoicePDFBlob:", companyLogo);
    
    // Llamamos a la función original pero con returnBlob = true y pasando el logo
    const pdfBlob = await generateInvoicePDF(invoice, client, items, true, companyLogo) as Blob;
    
    if (!pdfBlob || !(pdfBlob instanceof Blob)) {
      console.error('Error: No se generó un blob válido para el PDF');
      // Si no hay un blob válido, crear uno básico con un mensaje de error
      return new Blob(['Error al generar el PDF'], { type: 'application/pdf' });
    }
    
    console.log(`PDF generado correctamente: ${pdfBlob.size} bytes`);
    return pdfBlob;
  } catch (error) {
    console.error('Error en generateInvoicePDFBlob:', error);
    // En caso de error, devolvemos un blob básico con un mensaje de error
    return new Blob(['Error al generar el PDF: ' + (error instanceof Error ? error.message : String(error))], 
                    { type: 'application/pdf' });
  }
}

// Función para generar un PDF como base64 para enviar por email
export async function generateInvoicePDFAsBase64(
  invoice: Invoice,
  client: Client,
  items: InvoiceItem[],
  companyLogo?: string | null
): Promise<string> {
  // Create a new PDF
  const doc = new jsPDF();
  
  // Set some basic styles
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Usar el logo pasado como parámetro o el de la factura
  const logoPath = companyLogo || invoice.logo || null;
  
  // Cargar el logo si existe - solo una vez en posición destacada
  if (logoPath) {
    try {
      console.log("Preparando logo para PDF email desde:", logoPath);
      
      // Usar la utilidad para convertir la imagen a data URL desde la ruta relativa
      const logoDataUrl = await getImageAsDataUrl(logoPath);
      
      // Crear una imagen temporal para obtener las dimensiones reales y mantener proporciones
      const tmpImg = new Image();
      await new Promise<void>((resolve, reject) => {
        tmpImg.onload = () => resolve();
        tmpImg.onerror = () => reject(new Error('Error al cargar imagen para calcular proporciones'));
        tmpImg.src = logoDataUrl;
      });
      
      // Calcular dimensiones manteniendo proporciones para logo en la esquina superior derecha
      const maxWidth = 30; // Logo más grande y visible
      const maxHeight = 15; 
      
      // Calcular el ratio de aspecto
      const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
      const width = tmpImg.width * ratio;
      const height = tmpImg.height * ratio;
      
      // Posición alineada a la derecha en la parte superior
      const xPosition = 195 - width;
      
      // Añadir la imagen al PDF usando la data URL con las dimensiones proporcionales
      doc.addImage(logoDataUrl, 'PNG', xPosition, 10, width, height);
      
      console.log("Logo añadido correctamente al PDF email con dimensiones proporcionales:", width, height);
    } catch (logoError) {
      console.error("Error añadiendo logo al PDF email:", logoError);
    }
  }
  
  // Add company logo and info from company profile
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // blue-600
  // Utilizar información predeterminada basada en la imagen
  doc.text("Eventos gaper", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  // Usar valores predeterminados
  doc.text("CIF/NIF: B55410351", 14, 30);
  doc.text("Playa de sitges 22b", 14, 35);
  
  // Formatear dirección completa
  const postalCode = "28232";
  const city = "Las Rozas";
  const country = "España";
  doc.text(`${postalCode} ${city}, ${country}`, 14, 40);
  
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
  doc.setFont("helvetica", "normal");
  
  // Add payment details and notes
  doc.setFontSize(10);
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
      "Eventos gaper - Sistema de gestión financiera para profesionales y pequeñas empresas",
      105, 285, { align: "center" }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
  }
  
  // Convert the PDF to base64
  const pdfBase64 = doc.output('datauristring');
  return pdfBase64;
}

// Función para generar un PDF de presupuesto y descargarlo
export async function generateQuotePDF(
  quote: Quote,
  client: Client,
  items: QuoteItem[],
  returnBlob: boolean = false,
  companyLogo?: string | null
): Promise<void | Blob> {
  // Create a new PDF
  const doc = new jsPDF();
  
  // Set some basic styles
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Check if we have a logo (from company data or from quote)
  const logoPath = companyLogo || null;
  
  // Cargar el logo si existe - solo una vez en posición destacada
  if (logoPath) {
    try {
      console.log("Preparando logo para PDF presupuesto desde:", logoPath);
      
      // Usar la utilidad para convertir la imagen a data URL desde la ruta relativa
      const logoDataUrl = await getImageAsDataUrl(logoPath);
      
      // Crear una imagen temporal para obtener las dimensiones reales y mantener proporciones
      const tmpImg = new Image();
      await new Promise<void>((resolve, reject) => {
        tmpImg.onload = () => resolve();
        tmpImg.onerror = () => reject(new Error('Error al cargar imagen para calcular proporciones'));
        tmpImg.src = logoDataUrl;
      });
      
      // Calcular dimensiones manteniendo proporciones para logo en la esquina superior derecha
      const maxWidth = 30; // Logo más grande y visible
      const maxHeight = 15; 
      
      // Calcular el ratio de aspecto
      const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
      const width = tmpImg.width * ratio;
      const height = tmpImg.height * ratio;
      
      // Posición alineada a la derecha en la parte superior
      const xPosition = 195 - width;
      
      // Añadir la imagen al PDF usando la data URL con las dimensiones proporcionales
      doc.addImage(logoDataUrl, 'PNG', xPosition, 10, width, height);
      
      console.log("Logo añadido correctamente al PDF presupuesto con dimensiones proporcionales:", width, height);
    } catch (logoError) {
      console.error("Error añadiendo logo al PDF presupuesto:", logoError);
    }
  }
  
  // Add company info using real data from company profile
  doc.setFontSize(20);
  doc.setTextColor(25, 118, 210); // primary color
  // Usar datos de la empresa real si están disponibles, o valores por defecto si no
  const companyName = "Eventos gaper"; // Valor predeterminado basado en la imagen proporcionada
  doc.text(companyName, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`CIF/NIF: B55410351`, 14, 30); // Valor predeterminado basado en la imagen proporcionada
  doc.text(`Playa de sitges 22b`, 14, 35); // Valor predeterminado basado en la imagen proporcionada
  doc.text(`28232 Las Rozas, España`, 14, 40); // Valores predeterminados basados en la imagen proporcionada
  
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
  const statusText = getStatusText(quote.status);
  const statusColor = getStatusColor(quote.status);
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
  
  if (quote.notes) {
    doc.text("NOTAS:", 14, finalY + 30);
    doc.text(quote.notes, 14, finalY + 36);
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Eventos gaper - Sistema de gestión financiera para profesionales y pequeñas empresas",
      105, 285, { align: "center" }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
  }
  
  // Si se solicita devolver el Blob, lo hacemos
  if (returnBlob) {
    const pdfData = doc.output('arraybuffer');
    return new Blob([pdfData], { type: 'application/pdf' });
  }
  
  // De lo contrario, guardamos el PDF como descarga
  doc.save(`Presupuesto_${quote.quoteNumber}.pdf`);
}

// Función para generar un PDF de presupuesto como Blob (para uso interno)
export async function generateQuotePDFBlob(
  quote: Quote,
  client: Client,
  items: QuoteItem[],
  companyLogo?: string | null
): Promise<Blob> {
  try {
    console.log(`Generando PDF para presupuesto ${quote.quoteNumber} del cliente ${client?.name || 'desconocido'} con ${items?.length || 0} items`);
    
    // Llamamos a la función original pero con returnBlob = true
    const pdfBlob = await generateQuotePDF(quote, client, items, true, companyLogo) as Blob;
    
    if (!pdfBlob || !(pdfBlob instanceof Blob)) {
      console.error('Error: No se generó un blob válido para el PDF del presupuesto');
      // Si no hay un blob válido, crear uno básico con un mensaje de error
      return new Blob(['Error al generar el PDF del presupuesto'], { type: 'application/pdf' });
    }
    
    console.log(`PDF del presupuesto generado correctamente: ${pdfBlob.size} bytes`);
    return pdfBlob;
  } catch (error) {
    console.error('Error en generateQuotePDFBlob:', error);
    // En caso de error, devolvemos un blob básico con un mensaje de error
    return new Blob(['Error al generar el PDF del presupuesto: ' + (error instanceof Error ? error.message : String(error))], 
                    { type: 'application/pdf' });
  }
}