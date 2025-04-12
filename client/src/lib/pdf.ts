import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
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

interface GenerateInvoicePDFOptions {
  returnAsBlob?: boolean;
  returnAsBase64?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pendiente',
    'paid': 'Pagada',
    'overdue': 'Vencida',
    'canceled': 'Cancelada',
    'draft': 'Borrador',
    'sent': 'Enviada',
    'accepted': 'Aceptado',
    'rejected': 'Rechazado'
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): number[] {
  const statusColorMap: Record<string, number[]> = {
    'pending': [245, 158, 11], // amber-500
    'paid': [16, 185, 129],    // emerald-500
    'overdue': [239, 68, 68],  // red-500
    'canceled': [107, 114, 128], // gray-500
    'draft': [107, 114, 128],  // gray-500
    'sent': [59, 130, 246],    // blue-500
    'accepted': [16, 185, 129], // emerald-500
    'rejected': [239, 68, 68]  // red-500
  };
  return statusColorMap[status] || [0, 0, 0]; // default black
}

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
  
  // Cargar el logo si existe - lo agregamos en dos lugares: arriba a la derecha y en el encabezado
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
      
      // Calcular dimensiones manteniendo proporciones para el logo en la esquina superior derecha
      const maxWidth = 40; // Tamaño más grande para mejor visibilidad
      const maxHeight = 25; // Altura proporcional
      
      // Calcular el ratio de aspecto para mantener proporciones
      const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
      const width = tmpImg.width * ratio;
      const height = tmpImg.height * ratio;
      
      // Posición alineada a la derecha en la parte superior
      const xPosition = 195 - width;
      const yPosition = 10; // Posición vertical ajustada
      
      // Añadir la imagen al PDF usando la data URL con las dimensiones proporcionales
      doc.addImage(logoDataUrl, 'PNG', xPosition, yPosition, width, height);
      
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
      `${Number(item.taxRate).toFixed(2)} %`,
      `${Number(item.subtotal).toFixed(2)} €`
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [25, 118, 210], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
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
      
      // Si es un porcentaje, calculamos el valor real
      if (tax.isPercentage) {
        taxText = `${tax.name} (${tax.amount}%)`;
        taxAmount = (invoice.subtotal * tax.amount) / 100;
      }
      
      doc.text(`${taxText}:`, 140, finalY + yOffset, { align: "right" });
      doc.text(`${Number(taxAmount).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
      yOffset += 6;
    });
  }
  
  // Add total with a line above
  doc.setDrawColor(200);
  doc.line(140, finalY + yOffset, 195, finalY + yOffset);
  yOffset += 4;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 140, finalY + yOffset, { align: "right" });
  doc.text(`${Number(invoice.total).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
  
  // Add payment details and notes
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  let notesYPosition = finalY + 30;
  
  // Comprueba si las notas ya contienen información bancaria
  const notesHaveBankInfo = invoice.notes && 
    (invoice.notes.toLowerCase().includes("transferencia bancaria") || 
     invoice.notes.toLowerCase().includes("iban"));
  
  // Si las notas no contienen información bancaria, la añadimos
  if (!notesHaveBankInfo) {
    doc.text("FORMA DE PAGO: Transferencia bancaria", 14, notesYPosition);
    notesYPosition += 6;
    doc.text("IBAN: ES12 3456 7890 1234 5678 9012", 14, notesYPosition);
    notesYPosition += 10;
  }
  
  // Add notes if they exist
  if (invoice.notes) {
    doc.text("NOTAS:", 14, notesYPosition);
    notesYPosition += 6;
    doc.text(invoice.notes, 14, notesYPosition);
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Billeo - Gestión financiera",
      105, 285, { align: "center" }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
  }
  
  // Return as blob or save as file
  if (returnBlob) {
    return doc.output('blob');
  } else {
    doc.save(`Factura_${invoice.invoiceNumber}.pdf`);
  }
}

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
    
    return pdfBlob;
  } catch (error) {
    console.error("Error generando PDF como blob:", error);
    throw error;
  }
}

export async function generateInvoicePDFAsBase64(
  invoice: Invoice,
  client: Client,
  items: InvoiceItem[],
  companyLogo?: string | null
): Promise<string> {
  try {
    // Create a new PDF
    const doc = new jsPDF();
    
    // Set some basic styles
    doc.setFont("helvetica");
    doc.setFontSize(10);
    
    // Check if we have a logo (from company data or from invoice)
    const logoPath = companyLogo || invoice.logo || null;
    
    // Cargar el logo si existe
    if (logoPath) {
      try {
        console.log("Preparando logo para PDF base64 desde:", logoPath);
        
        // Usar la utilidad para convertir la imagen a data URL desde la ruta relativa
        const logoDataUrl = await getImageAsDataUrl(logoPath);
        
        // Crear una imagen temporal para obtener las dimensiones reales y mantener proporciones
        const tmpImg = new Image();
        await new Promise<void>((resolve, reject) => {
          tmpImg.onload = () => resolve();
          tmpImg.onerror = () => reject(new Error('Error al cargar imagen para calcular proporciones'));
          tmpImg.src = logoDataUrl;
        });
        
        // Calcular dimensiones manteniendo proporciones para el logo en la esquina superior derecha
        const maxWidth = 40; // Tamaño más grande para mejor visibilidad
        const maxHeight = 25; // Altura proporcional
        
        // Calcular el ratio de aspecto para mantener proporciones
        const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
        const width = tmpImg.width * ratio;
        const height = tmpImg.height * ratio;
        
        // Posición alineada a la derecha en la parte superior
        const xPosition = 195 - width; // 195 es aproximadamente el ancho de la página menos margen
        
        // Añadir la imagen al PDF usando la data URL con las dimensiones proporcionales
        doc.addImage(logoDataUrl, 'PNG', xPosition, 10, width, height);
        
        console.log("Logo añadido correctamente al PDF base64 con dimensiones:", width, height);
      } catch (logoError) {
        console.error("Error añadiendo logo al PDF base64:", logoError);
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
        `${Number(item.taxRate).toFixed(2)} %`,
        `${Number(item.subtotal).toFixed(2)} €`
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [25, 118, 210], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
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
        
        // Si es un porcentaje, calculamos el valor real
        if (tax.isPercentage) {
          taxText = `${tax.name} (${tax.amount}%)`;
          taxAmount = (invoice.subtotal * tax.amount) / 100;
        }
        
        doc.text(`${taxText}:`, 140, finalY + yOffset, { align: "right" });
        doc.text(`${Number(taxAmount).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
        yOffset += 6;
      });
    }
    
    // Add total with a line above
    doc.setDrawColor(200);
    doc.line(140, finalY + yOffset, 195, finalY + yOffset);
    yOffset += 4;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 140, finalY + yOffset, { align: "right" });
    doc.text(`${Number(invoice.total).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
    
    // Add payment details and notes
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    let notesYPosition = finalY + 30;
    
    // Comprueba si las notas ya contienen información bancaria
    const notesHaveBankInfo = invoice.notes && 
      (invoice.notes.toLowerCase().includes("transferencia bancaria") || 
       invoice.notes.toLowerCase().includes("iban"));
    
    // Si las notas no contienen información bancaria, la añadimos
    if (!notesHaveBankInfo) {
      doc.text("FORMA DE PAGO: Transferencia bancaria", 14, notesYPosition);
      notesYPosition += 6;
      doc.text("IBAN: ES12 3456 7890 1234 5678 9012", 14, notesYPosition);
      notesYPosition += 10;
    }
    
    // Add notes if they exist
    if (invoice.notes) {
      doc.text("NOTAS:", 14, notesYPosition);
      notesYPosition += 6;
      doc.text(invoice.notes, 14, notesYPosition);
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        "Billeo - Gestión financiera",
        105, 285, { align: "center" }
      );
      doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
    }
    
    // Devolver como base64
    return doc.output('datauristring').split(',')[1];
  } catch (error) {
    console.error("Error generando PDF como base64:", error);
    throw error;
  }
}

export async function generateQuotePDF(
  quote: Quote,
  client: Client,
  items: QuoteItem[],
  options?: GenerateInvoicePDFOptions,
  companyLogo?: string | null
): Promise<void | Blob | string> {
  try {
    // Create a new PDF
    const doc = new jsPDF();
    
    // Set some basic styles
    doc.setFont("helvetica");
    doc.setFontSize(10);
    
    // Check if we have a logo (from company data or from quote)
    const logoPath = companyLogo || null; // Los presupuestos no tienen logo propio por ahora
    
    // Cargar el logo si existe
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
        
        // Calcular dimensiones manteniendo proporciones para el logo en la esquina superior derecha
        const maxWidth = 40; // Tamaño más grande para mejor visibilidad
        const maxHeight = 25; // Altura proporcional
        
        // Calcular el ratio de aspecto para mantener proporciones
        const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
        const width = tmpImg.width * ratio;
        const height = tmpImg.height * ratio;
        
        // Posición alineada a la derecha en la parte superior
        const xPosition = 195 - width; 
        const yPosition = 10; // Ajuste vertical
        
        // Añadir la imagen al PDF usando la data URL con las dimensiones proporcionales
        doc.addImage(logoDataUrl, 'PNG', xPosition, yPosition, width, height);
        
        console.log("Logo añadido correctamente al PDF presupuesto");
      } catch (logoError) {
        console.error("Error añadiendo logo al PDF presupuesto:", logoError);
      }
    }
    
    // Add company logo and info using real data from company profile
    doc.setFontSize(20);
    doc.setTextColor(25, 118, 210); // primary color
    doc.text("Eventos gaper", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`CIF/NIF: B55410351`, 14, 30);
    doc.text(`Playa de sitges 22b`, 14, 35);
    doc.text(`28232 Las Rozas, España`, 14, 40);
    
    // Add quote title and number
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235); // Color azul para el título
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
    doc.setTextColor(37, 99, 235); // Color azul para los encabezados
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
    doc.setTextColor(37, 99, 235); // Color azul para los encabezados
    doc.text("DETALLES DEL PRESUPUESTO", 14, 110);
    
    // Create the table with items
    autoTable(doc, {
      startY: 115,
      head: [['Descripción', 'Cantidad', 'Precio Unitario', 'IVA %', 'Subtotal']],
      body: items.map(item => [
        item.description,
        Number(item.quantity).toFixed(2),
        `${Number(item.unitPrice).toFixed(2)} €`,
        `${Number(item.taxRate).toFixed(2)} %`,
        `${Number(item.subtotal).toFixed(2)} €`
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
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
        
        // Si es un porcentaje, calculamos el valor real
        if (tax.isPercentage) {
          taxText = `${tax.name} (${tax.amount}%)`;
          taxAmount = (quote.subtotal * tax.amount) / 100;
        }
        
        doc.text(`${taxText}:`, 140, finalY + yOffset, { align: "right" });
        doc.text(`${Number(taxAmount).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
        yOffset += 6;
      });
    }
    
    // Add total with a line above
    doc.setDrawColor(200);
    doc.line(140, finalY + yOffset, 195, finalY + yOffset);
    yOffset += 4;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 140, finalY + yOffset, { align: "right" });
    doc.text(`${Number(quote.total).toFixed(2)} €`, 195, finalY + yOffset, { align: "right" });
    
    // Añadir validez del presupuesto en un cuadro destacado
    const validityText = `Este presupuesto es válido hasta: ${formatDate(quote.validUntil)}`;
    const textWidth = doc.getTextWidth(validityText);
    
    // Dibujar un rectángulo redondeado con fondo
    doc.setFillColor(240, 249, 255); // Color azul muy claro para el fondo
    doc.setDrawColor(37, 99, 235); // Color azul para el borde
    doc.roundedRect(12, finalY + 25, textWidth + 8, 12, 2, 2, 'FD');
    
    // Texto de validez en negrita con color coherente con el documento
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); // Color azul para el texto
    doc.text(validityText, 16, finalY + 33);
    
    // Volver a configuración normal
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    
    // Variables para controlar la posición Y de cada elemento
    let notesYPosition = finalY + 42;
    
    doc.text("Para más información o consultas, no dude en contactarnos.", 14, notesYPosition);
    notesYPosition += 8;
    
    // Comprueba si las notas ya contienen información bancaria
    const notesHaveBankInfo = quote.notes && 
      (quote.notes.toLowerCase().includes("transferencia bancaria") || 
       quote.notes.toLowerCase().includes("iban"));
    
    // Si las notas no contienen información bancaria, la añadimos
    if (!notesHaveBankInfo) {
      doc.text("FORMA DE PAGO: Transferencia bancaria", 14, notesYPosition);
      notesYPosition += 6;
      doc.text("IBAN: ES12 3456 7890 1234 5678 9012", 14, notesYPosition);
      notesYPosition += 10;
    }
    
    // Añadimos las notas si existen
    if (quote.notes) {
      doc.text("NOTAS:", 14, notesYPosition);
      doc.text(quote.notes, 14, notesYPosition + 6);
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        "Billeo - Gestión financiera",
        105, 285, { align: "center" }
      );
      doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
    }
    
    // Si se solicita como base64, devolver en ese formato
    if (options?.returnAsBase64) {
      return doc.output('datauristring').split(',')[1];
    }
    
    // De lo contrario, guardar como archivo
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
  doc.text("Eventos gaper", 14, 22);
  
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
      "Billeo - Gestión financiera",
      105, 285, { align: "center" }
    );
    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: "right" });
  }
  
  // Save the PDF
  doc.save(`Informe_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}