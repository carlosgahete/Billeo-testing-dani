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
  
  // Usar datos de empresa desde sessionStorage o valores predeterminados
  let companyData;
  try {
    // Intentar obtener los datos de empresa almacenados en sessionStorage
    const companyJson = sessionStorage.getItem('companyData');
    if (companyJson) {
      companyData = JSON.parse(companyJson);
      console.log("Usando datos de empresa desde sessionStorage:", companyData);
    }
  } catch (error) {
    console.error("Error obteniendo datos de empresa desde sessionStorage:", error);
  }
  
  // Usar los datos de la empresa o valores de respaldo
  const companyName = companyData?.name || "Daniel Perla";
  doc.text(companyName, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`CIF/NIF: ${companyData?.taxId || "50459323D"}`, 14, 30);
  doc.text(`${companyData?.address || "Calle Diogenes 8"}`, 14, 35);
  
  // Ciudad, código postal y país
  let locationText = "";
  if (companyData) {
    const locationParts = [];
    if (companyData.postalCode) locationParts.push(companyData.postalCode);
    if (companyData.city) locationParts.push(companyData.city);
    if (companyData.country) locationParts.push(companyData.country);
    locationText = locationParts.join(", ");
  } else {
    locationText = "28022 Madrid, España";
  }
  
  doc.text(locationText, 14, 40);
  
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
  
  // Verificar si los datos del cliente están en las notas (caso de creación de factura nueva)
  // Formato esperado en las notas: "Nombre Cliente - NIF\nEmail\nDirección\n\nMétodo de pago..."
  let clientName = client.name;
  let clientTaxId = client.taxId || "";
  let clientAddress = client.address || "";
  let clientLocation = `${client.postalCode || ""} ${client.city || ""}, ${client.country || ""}`;
  let clientEmail = client.email || "";
  let clientPhone = client.phone || "";
  
  if (invoice.notes) {
    try {
      // Intentar extraer datos del cliente de las notas
      const lines = invoice.notes.split('\n');
      if (lines.length > 0) {
        // Primera línea suele contener "Nombre - NIF"
        const firstLineParts = lines[0].split(' - ');
        if (firstLineParts.length >= 2) {
          clientName = firstLineParts[0].trim();
          clientTaxId = firstLineParts[1].trim();
          
          // Si hay más líneas, la segunda puede contener el email
          if (lines.length > 1 && lines[1].includes('@')) {
            clientEmail = lines[1].trim();
          }
          
          // La tercera línea puede contener la dirección
          if (lines.length > 2 && !lines[2].startsWith('Método de pago')) {
            clientAddress = lines[2].trim();
          }
          
          console.log("Datos de cliente extraídos de las notas:", {
            name: clientName,
            taxId: clientTaxId,
            email: clientEmail,
            address: clientAddress
          });
        }
      }
    } catch (error) {
      console.error("Error al extraer datos del cliente de las notas:", error);
    }
  }
  
  doc.text(clientName, 14, 68);
  doc.text(`NIF/CIF: ${clientTaxId}`, 14, 73);
  doc.text(clientAddress, 14, 78);
  doc.text(clientLocation, 14, 83);
  if (clientEmail && clientEmail.trim() !== '') doc.text(`Email: ${clientEmail}`, 14, 88);
  if (clientPhone && clientPhone.trim() !== '') doc.text(`Teléfono: ${clientPhone}`, 14, 93);
  
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
    // Usar cuenta bancaria de los datos de la empresa o valor por defecto
    const bankAccount = companyData?.bankAccount || "ES12 3456 7890 1234 5678 9012";
    doc.text(`IBAN: ${bankAccount}`, 14, notesYPosition);
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
    // Declarar la variable companyData al principio para evitar duplicaciones
    let companyData;
    
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
    
    // Usar datos de empresa desde sessionStorage o valores predeterminados
    // Variable ya declarada al inicio de la función
    try {
      // Intentar obtener los datos de empresa almacenados en sessionStorage
      const companyJson = sessionStorage.getItem('companyData');
      if (companyJson) {
        companyData = JSON.parse(companyJson);
        console.log("Usando datos de empresa desde sessionStorage para PDF base64:", companyData);
      }
    } catch (error) {
      console.error("Error obteniendo datos de empresa desde sessionStorage para PDF base64:", error);
    }
    
    // Usar los datos de la empresa o valores de respaldo
    const companyName = companyData?.name || "Daniel Perla";
    doc.text(companyName, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`CIF/NIF: ${companyData?.taxId || "50459323D"}`, 14, 30);
    doc.text(`${companyData?.address || "Calle Diogenes 8"}`, 14, 35);
    
    // Ciudad, código postal y país
    let locationText = "";
    if (companyData) {
      const locationParts = [];
      if (companyData.postalCode) locationParts.push(companyData.postalCode);
      if (companyData.city) locationParts.push(companyData.city);
      if (companyData.country) locationParts.push(companyData.country);
      locationText = locationParts.join(", ");
    } else {
      locationText = "28022 Madrid, España";
    }
    
    doc.text(locationText, 14, 40);
    
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
    
    // Verificar si los datos del cliente están en las notas (caso de creación de factura nueva)
    // Formato esperado en las notas: "Nombre Cliente - NIF\nEmail\nDirección\n\nMétodo de pago..."
    let clientName = client.name;
    let clientTaxId = client.taxId || "";
    let clientAddress = client.address || "";
    let clientLocation = `${client.postalCode || ""} ${client.city || ""}, ${client.country || ""}`;
    let clientEmail = client.email || "";
    let clientPhone = client.phone || "";
    
    if (invoice.notes) {
      try {
        // Intentar extraer datos del cliente de las notas
        const lines = invoice.notes.split('\n');
        if (lines.length > 0) {
          // Primera línea suele contener "Nombre - NIF"
          const firstLineParts = lines[0].split(' - ');
          if (firstLineParts.length >= 2) {
            clientName = firstLineParts[0].trim();
            clientTaxId = firstLineParts[1].trim();
            
            // Si hay más líneas, la segunda puede contener el email
            if (lines.length > 1 && lines[1].includes('@')) {
              clientEmail = lines[1].trim();
            }
            
            // La tercera línea puede contener la dirección
            if (lines.length > 2 && !lines[2].startsWith('Método de pago')) {
              clientAddress = lines[2].trim();
            }
            
            console.log("Datos de cliente extraídos de las notas en base64:", {
              name: clientName,
              taxId: clientTaxId,
              email: clientEmail,
              address: clientAddress
            });
          }
        }
      } catch (error) {
        console.error("Error al extraer datos del cliente de las notas en base64:", error);
      }
    }
    
    doc.text(clientName, 14, 68);
    doc.text(`NIF/CIF: ${clientTaxId}`, 14, 73);
    doc.text(clientAddress, 14, 78);
    doc.text(clientLocation, 14, 83);
    if (clientEmail && clientEmail.trim() !== '') doc.text(`Email: ${clientEmail}`, 14, 88);
    if (clientPhone && clientPhone.trim() !== '') doc.text(`Teléfono: ${clientPhone}`, 14, 93);
    
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
      // Usar cuenta bancaria de los datos de la empresa o valor por defecto
      const bankAccount = companyData?.bankAccount || "ES12 3456 7890 1234 5678 9012";
      doc.text(`IBAN: ${bankAccount}`, 14, notesYPosition);
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
    
    // Return as base64 data URL
    const dataUrl = doc.output('datauristring');
    return dataUrl;
    
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
  // Default options
  const returnBlob = options?.returnAsBlob || false;
  const returnAsBase64 = options?.returnAsBase64 || false;
  
  // Create a new PDF
  const doc = new jsPDF();
  
  // Set some basic styles
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Check if we have a logo
  const logoPath = companyLogo || null;
  
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
      const maxWidth = 40; // ancho máximo
      const maxHeight = 25; // altura máxima
      
      // Calcular el ratio de aspecto para mantener proporciones
      const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
      const width = tmpImg.width * ratio;
      const height = tmpImg.height * ratio;
      
      // Posición alineada a la derecha en la parte superior
      const xPosition = 195 - width; // 195 es aproximadamente el ancho de la página menos margen
      
      // Añadir la imagen al PDF usando la data URL
      doc.addImage(logoDataUrl, 'PNG', xPosition, 10, width, height);
      
      console.log("Logo añadido correctamente al PDF de presupuesto con dimensiones:", width, height);
    } catch (logoError) {
      console.error("Error añadiendo logo al PDF de presupuesto:", logoError);
    }
  }
  
  // Add company logo and info
  doc.setFontSize(20);
  doc.setTextColor(25, 118, 210); // primary color
  
  // Usar datos de empresa desde sessionStorage o valores predeterminados
  let companyData;
  try {
    // Intentar obtener los datos de empresa almacenados en sessionStorage
    const companyJson = sessionStorage.getItem('companyData');
    if (companyJson) {
      companyData = JSON.parse(companyJson);
      console.log("Usando datos de empresa desde sessionStorage para presupuesto:", companyData);
    }
  } catch (error) {
    console.error("Error obteniendo datos de empresa desde sessionStorage para presupuesto:", error);
  }
  
  // Usar los datos de la empresa o valores predeterminados
  const companyName = companyData?.name || "Daniel Perla";
  doc.text(companyName, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`CIF/NIF: ${companyData?.taxId || "50459323D"}`, 14, 30);
  doc.text(`${companyData?.address || "Calle Diogenes 8"}`, 14, 35);
  
  // Ciudad, código postal y país
  let locationText = "";
  if (companyData) {
    const locationParts = [];
    if (companyData.postalCode) locationParts.push(companyData.postalCode);
    if (companyData.city) locationParts.push(companyData.city);
    if (companyData.country) locationParts.push(companyData.country);
    locationText = locationParts.join(", ");
  } else {
    locationText = "28022 Madrid, España";
  }
  
  doc.text(locationText, 14, 40);
  
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
  
  // Verificar si los datos del cliente están en las notas (caso de creación de presupuesto nuevo)
  // Formato esperado en las notas: "Nombre Cliente - NIF\nEmail\nDirección\n\nMás información..."
  let clientName = client.name;
  let clientTaxId = client.taxId || "";
  let clientAddress = client.address || "";
  let clientLocation = `${client.postalCode || ""} ${client.city || ""}, ${client.country || ""}`;
  let clientEmail = client.email || "";
  let clientPhone = client.phone || "";
  
  if (quote.notes) {
    try {
      // Intentar extraer datos del cliente de las notas
      const lines = quote.notes.split('\n');
      if (lines.length > 0) {
        // Primera línea suele contener "Nombre - NIF"
        const firstLineParts = lines[0].split(' - ');
        if (firstLineParts.length >= 2) {
          clientName = firstLineParts[0].trim();
          clientTaxId = firstLineParts[1].trim();
          
          // Si hay más líneas, la segunda puede contener el email
          if (lines.length > 1 && lines[1].includes('@')) {
            clientEmail = lines[1].trim();
          }
          
          // La tercera línea puede contener la dirección
          if (lines.length > 2) {
            clientAddress = lines[2].trim();
          }
          
          console.log("Datos de cliente extraídos de las notas del presupuesto:", {
            name: clientName,
            taxId: clientTaxId,
            email: clientEmail,
            address: clientAddress
          });
        }
      }
    } catch (error) {
      console.error("Error al extraer datos del cliente de las notas del presupuesto:", error);
    }
  }
  
  doc.text(clientName, 14, 68);
  doc.text(`NIF/CIF: ${clientTaxId}`, 14, 73);
  doc.text(clientAddress, 14, 78);
  doc.text(clientLocation, 14, 83);
  if (clientEmail && clientEmail.trim() !== '') doc.text(`Email: ${clientEmail}`, 14, 88);
  if (clientPhone && clientPhone.trim() !== '') doc.text(`Teléfono: ${clientPhone}`, 14, 93);
  
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
  
  // Add payment details and notes
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  let notesYPosition = finalY + 30;
  
  // Add notes if they exist
  if (quote.notes) {
    doc.text("NOTAS:", 14, notesYPosition);
    notesYPosition += 6;
    doc.text(quote.notes, 14, notesYPosition);
  }
  
  // Add validity notice
  notesYPosition += 15;
  doc.text("Este presupuesto es válido hasta la fecha indicada.", 14, notesYPosition);
  
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
  
  // Return based on options
  if (returnAsBase64) {
    return doc.output('datauristring');
  } else if (returnBlob) {
    return doc.output('blob');
  } else {
    doc.save(`Presupuesto_${quote.quoteNumber}.pdf`);
  }
}

export async function generateReportPDF(
  title: string,
  subtitle: string,
  data: any[],
  columns: { header: string; accessor: string }[],
  options?: {
    returnAsBlob?: boolean;
    dateRange?: { start: string; end: string };
    summary?: { label: string; value: string }[];
    logo?: string | null;
  }
): Promise<void | Blob> {
  // Create a new PDF in landscape mode for reports
  const doc = new jsPDF({
    orientation: 'landscape'
  });
  
  // Set some basic styles
  doc.setFont("helvetica");
  doc.setFontSize(10);
  
  // Check if we have a logo
  const logoPath = options?.logo || null;
  
  // Cargar el logo si existe
  if (logoPath) {
    try {
      console.log("Preparando logo para PDF de informe desde:", logoPath);
      
      // Usar la utilidad para convertir la imagen a data URL desde la ruta relativa
      const logoDataUrl = await getImageAsDataUrl(logoPath);
      
      // Crear una imagen temporal para obtener las dimensiones reales y mantener proporciones
      const tmpImg = new Image();
      await new Promise<void>((resolve, reject) => {
        tmpImg.onload = () => resolve();
        tmpImg.onerror = () => reject(new Error('Error al cargar imagen para calcular proporciones'));
        tmpImg.src = logoDataUrl;
      });
      
      // Calcular dimensiones manteniendo proporciones
      const maxWidth = 30;
      const maxHeight = 20;
      
      // Calcular el ratio de aspecto para mantener proporciones
      const ratio = Math.min(maxWidth / tmpImg.width, maxHeight / tmpImg.height);
      const width = tmpImg.width * ratio;
      const height = tmpImg.height * ratio;
      
      // Posición alineada a la derecha en la parte superior
      const xPosition = 280 - width; // ajustado para orientación landscape
      
      // Añadir la imagen al PDF usando la data URL
      doc.addImage(logoDataUrl, 'PNG', xPosition, 10, width, height);
      
      console.log("Logo añadido correctamente al PDF de informe");
    } catch (logoError) {
      console.error("Error añadiendo logo al PDF de informe:", logoError);
    }
  }
  
  // Add report title and date information
  doc.setFontSize(18);
  doc.setTextColor(25, 118, 210); // primary color
  doc.text(title, 14, 20);
  
  doc.setFontSize(12);
  doc.text(subtitle, 14, 30);
  
  let yPosition = 40;
  
  // Add date range information if provided
  if (options?.dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Período: ${formatDate(options.dateRange.start)} - ${formatDate(options.dateRange.end)}`, 14, yPosition);
    yPosition += 10;
  }
  
  // Add summary information if provided
  if (options?.summary && options.summary.length > 0) {
    yPosition += 5;
    doc.setFontSize(11);
    doc.setTextColor(25, 118, 210);
    doc.text("Resumen:", 14, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Organize summary in two columns if more than 3 items
    if (options.summary.length > 3) {
      const middleIndex = Math.ceil(options.summary.length / 2);
      const leftColumn = options.summary.slice(0, middleIndex);
      const rightColumn = options.summary.slice(middleIndex);
      
      // Left column
      for (let i = 0; i < leftColumn.length; i++) {
        const item = leftColumn[i];
        doc.text(`${item.label}: ${item.value}`, 14, yPosition);
        yPosition += 6;
      }
      
      // Reset y position for right column
      yPosition -= leftColumn.length * 6;
      
      // Right column
      for (let i = 0; i < rightColumn.length; i++) {
        const item = rightColumn[i];
        doc.text(`${item.label}: ${item.value}`, 120, yPosition);
        yPosition += 6;
      }
      
      // Determine the highest bottom point
      yPosition = Math.max(yPosition, yPosition + (rightColumn.length - leftColumn.length) * 6);
    } else {
      // Single column if 3 or fewer items
      for (let i = 0; i < options.summary.length; i++) {
        const item = options.summary[i];
        doc.text(`${item.label}: ${item.value}`, 14, yPosition);
        yPosition += 6;
      }
    }
  }
  
  // Add some space before the table
  yPosition += 5;
  
  // Prepare table headers and data
  const headers = columns.map(col => col.header);
  const tableRows = data.map(item => 
    columns.map(col => {
      const value = item[col.accessor];
      // Format based on potential value types
      if (typeof value === 'number') {
        return value.toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      } else if (value instanceof Date) {
        return formatDate(value.toISOString());
      } else if (typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
      } else {
        return value?.toString() || '';
      }
    })
  );
  
  // Create the table with data
  autoTable(doc, {
    startY: yPosition,
    head: [headers],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [25, 118, 210], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 }
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Billeo - Gestión financiera",
      148, 200, { align: "center" } // adjusted for landscape
    );
    doc.text(`Página ${i} de ${pageCount}`, 280, 200, { align: "right" }); // adjusted for landscape
    // Add current date to footer
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    doc.text(`Generado: ${day}/${month}/${year} ${hours}:${minutes}`, 14, 200);
  }
  
  // Return as blob or save as file
  if (options?.returnAsBlob) {
    return doc.output('blob');
  } else {
    const fileName = `${title.replace(/[^\w\s]/gi, '')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }
}