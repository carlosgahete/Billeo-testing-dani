// Importamos la función y los tipos directamente desde pdf.ts
import { generateInvoicePDF } from './pdf';

// Reutilizamos las mismas interfaces de pdf.ts por coherencia de tipos
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
  status: "pending" | "paid" | "overdue" | "canceled";
  notes?: string;
  additionalTaxes?: AdditionalTax[] | null;
  logo?: string | null;
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

// Función para formatear nombres basados en filtros
export const formatFilterName = (
  yearFilter: string,
  quarterFilter: string,
  clientFilter: string | number,
  statusFilter: string,
  clientName: string = '',
  dateRange: { start?: Date, end?: Date } = {}
): string => {
  const parts: string[] = [];
  
  // Año
  if (yearFilter && yearFilter !== 'all') {
    parts.push(yearFilter);
  }
  
  // Trimestre
  if (quarterFilter && quarterFilter !== 'all') {
    const quarterMap: Record<string, string> = {
      'q1': 'PrimerTrimestre',
      'q2': 'SegundoTrimestre',
      'q3': 'TercerTrimestre',
      'q4': 'CuartoTrimestre'
    };
    parts.push(quarterMap[quarterFilter] || quarterFilter);
  }
  
  // Cliente
  if (clientFilter && clientFilter !== 'all' && clientName) {
    parts.push(clientName.replace(/\s+/g, '-'));
  }
  
  // Estado
  if (statusFilter && statusFilter !== 'all') {
    const statusMap: Record<string, string> = {
      'pending': 'Pendientes',
      'paid': 'Pagadas',
      'overdue': 'Vencidas',
      'canceled': 'Canceladas'
    };
    parts.push(statusMap[statusFilter] || statusFilter);
  }
  
  // Rango de fechas
  if (dateRange.start && dateRange.end) {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const startMonth = monthNames[dateRange.start.getMonth()];
    const endMonth = monthNames[dateRange.end.getMonth()];
    
    if (startMonth === endMonth && dateRange.start.getFullYear() === dateRange.end.getFullYear()) {
      parts.push(`${startMonth}${dateRange.start.getFullYear()}`);
    } else {
      parts.push(`${startMonth}-${endMonth}${dateRange.end.getFullYear()}`);
    }
  }
  
  // Si no hay partes específicas, usar un nombre genérico
  if (parts.length === 0) {
    return `Facturas_Todas`;
  }
  
  return `Facturas_${parts.join('_')}`;
};

// Función para generar el nombre de un archivo PDF individual dentro del ZIP
export const formatInvoiceFileName = (
  invoice: Invoice, 
  clientName: string, 
  filterInfo: string
): string => {
  // Limpiar el nombre del cliente para usarlo en el nombre del archivo
  const safeClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  
  // Formar el nombre del archivo
  return `Factura_${invoice.invoiceNumber}_${safeClientName}_${filterInfo}.pdf`;
};

// Función para generar un blob de PDF para una factura
export const generateInvoicePDFBlob = async (
  invoice: Invoice,
  client: Client,
  items: InvoiceItem[]
): Promise<Blob> => {
  // Usar la función existente para generar un PDF, pero en lugar de descargarlo,
  // capturarlo como un Blob
  const pdfData = await generateInvoicePDF(invoice, client, items, true) as Blob;
  return pdfData;
};

// Función principal para descargar facturas filtradas como ZIP
export const downloadFilteredInvoicesAsZip = async (
  invoices: Invoice[],
  clients: Client[],
  yearFilter: string,
  quarterFilter: string,
  clientFilter: string | number,
  statusFilter: string,
  getInvoiceItems: (invoiceId: number) => Promise<InvoiceItem[]>,
  dateRange: { start?: Date, end?: Date } = {}
): Promise<void> => {
  if (!invoices || invoices.length === 0) {
    console.error('No hay facturas para descargar');
    return;
  }
  
  // 1. Determinar el nombre del archivo ZIP
  const clientName = clientFilter !== 'all' && clients
    ? clients.find(c => c.id.toString() === clientFilter.toString())?.name || ''
    : '';
  
  const zipFileName = formatFilterName(
    yearFilter, 
    quarterFilter, 
    clientFilter, 
    statusFilter, 
    clientName,
    dateRange
  );
  
  console.log(`Preparando descarga de ZIP: ${zipFileName}.zip`);
  
  try {
    // 2. Crear un array para almacenar las promesas de generación de PDFs
    const files: { name: string; data: Blob }[] = [];
    const filterSuffix = zipFileName.replace('Facturas_', '');
    
    // 3. Generar PDFs para cada factura
    for (const invoice of invoices) {
      const client = clients.find(c => c.id === invoice.clientId);
      
      if (!client) {
        console.error(`No se encontró cliente para la factura ${invoice.invoiceNumber}`);
        continue;
      }
      
      try {
        // Obtener los items de la factura
        const items = await getInvoiceItems(invoice.id);
        
        // Generar el nombre del archivo PDF dentro del ZIP
        const pdfFileName = formatInvoiceFileName(invoice, client.name, filterSuffix);
        
        // Generar el PDF como Blob
        const pdfBlob = await generateInvoicePDFBlob(invoice, client, items);
        
        // Agregar a la lista de archivos
        files.push({
          name: pdfFileName,
          data: pdfBlob
        });
        
        console.log(`PDF generado: ${pdfFileName}`);
      } catch (error) {
        console.error(`Error al generar PDF para factura ${invoice.invoiceNumber}:`, error);
      }
    }
    
    if (files.length === 0) {
      console.error('No se pudo generar ningún PDF para incluir en el ZIP');
      return;
    }
    
    // 4. Ya que no podemos utilizar JSZip en este momento, descargamos los PDFs individualmente
    // y mostramos un mensaje informativo al usuario
    
    // Primero mostramos una alerta informativa
    alert(`Se van a descargar ${files.length} facturas individuales ya que la función de ZIP no está disponible.
Por favor, espere mientras se completan las descargas.`);
    
    // Descargamos cada archivo individualmente
    for (const file of files) {
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(file.data);
      downloadLink.download = file.name;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Pequeña pausa para no saturar
      await new Promise(resolve => setTimeout(resolve, 500)); // Aumentamos el tiempo para evitar bloqueos
    }
    
    // Informamos al usuario que se completó la operación
    alert(`Se han descargado ${files.length} facturas correctamente.
    
Las facturas tienen el formato: Factura_[Número]_[Cliente]_[Filtros].pdf`);
    
    console.log(`Descargados ${files.length} archivos PDF de facturas`);
  } catch (error) {
    console.error('Error al generar o descargar los PDFs:', error);
    alert('Ha ocurrido un error al generar los PDFs. Por favor, inténtelo de nuevo.');
  }
};