// Importamos la función directamente desde pdf.ts
import { generateInvoicePDF, generateInvoicePDFBlob } from './pdf';

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

// Nota: La función generateInvoicePDFBlob ahora está definida en pdf.ts

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
    // 2. Crear un array para almacenar la información de los PDFs
    const files: { name: string; data: Blob }[] = [];
    const filterSuffix = zipFileName.replace('Facturas_', '');
    
    // 3. Generar PDFs para cada factura con sufijo único por factura
    // para evitar problemas con nombres duplicados
    for (const invoice of invoices) {
      const client = clients.find(c => c.id === invoice.clientId);
      
      if (!client) {
        console.error(`No se encontró cliente para la factura ${invoice.invoiceNumber}`);
        continue;
      }
      
      try {
        // Obtener los items de la factura
        const items = await getInvoiceItems(invoice.id);
        
        // Generar un sufijo único para cada factura que incluya la fecha y hora actual
        // y el ID de la factura para garantizar unicidad
        const uniqueSuffix = `${filterSuffix}_id${invoice.id}_${Date.now()}`;
        
        // Generar el nombre del archivo PDF dentro del ZIP
        const pdfFileName = formatInvoiceFileName(invoice, client.name, uniqueSuffix);
        
        // Generar el PDF como Blob
        const pdfBlob = await generateInvoicePDFBlob(invoice, client, items);
        
        // Agregar a la lista de archivos
        files.push({
          name: pdfFileName,
          data: pdfBlob
        });
        
        console.log(`PDF generado: ${pdfFileName} para la factura ${invoice.invoiceNumber}`);
      } catch (error) {
        console.error(`Error al generar PDF para factura ${invoice.invoiceNumber}:`, error);
      }
    }
    
    if (files.length === 0) {
      console.error('No se pudo generar ningún PDF para incluir en el ZIP');
      return;
    }
    
    // 4. Ya que no podemos utilizar JSZip en este momento, mostramos las facturas en una tarjeta
    // en el DOM para que el usuario pueda acceder a ellas
    
    // Crear un contenedor para las facturas
    const container = document.createElement('div');
    container.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    container.style.backdropFilter = 'blur(4px)';
    
    // Crear la tarjeta
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col';
    
    // Crear la cabecera de la tarjeta
    const header = document.createElement('div');
    header.className = 'p-4 border-b border-gray-200 flex justify-between items-center';
    header.innerHTML = `
      <h2 class="text-lg font-medium text-gray-800">Facturas exportadas (${files.length})</h2>
      <button id="close-modal" class="text-gray-500 hover:text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    
    // Crear el cuerpo de la tarjeta
    const body = document.createElement('div');
    body.className = 'p-4 overflow-auto flex-1';
    
    // Crear una lista de facturas
    const list = document.createElement('div');
    list.className = 'grid gap-3 grid-cols-1 sm:grid-cols-2';
    
    // Añadir cada factura a la lista
    for (const file of files) {
      const item = document.createElement('div');
      item.className = 'border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow';
      
      const url = URL.createObjectURL(file.data);
      
      item.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-800 truncate">${file.name}</span>
        </div>
        <div class="flex space-x-2">
          <a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Ver
          </a>
          <a href="${url}" download="${file.name}" class="text-green-600 hover:text-green-800 text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Descargar
          </a>
        </div>
      `;
      
      list.appendChild(item);
    }
    
    // Añadir la lista al cuerpo
    body.appendChild(list);
    
    // Añadir el footer con botón para cerrar
    const footer = document.createElement('div');
    footer.className = 'p-4 border-t border-gray-200 flex justify-end';
    footer.innerHTML = `
      <button id="download-all" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2">
        Descargar todas
      </button>
      <button id="close-button" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
        Cerrar
      </button>
    `;
    
    // Añadir todos los elementos
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    container.appendChild(card);
    document.body.appendChild(container);
    
    // Crear un array para almacenar las URLs de los blobs
    const createdURLs: string[] = [];
    
    // Guardar las URLs para limpiarlas después
    document.querySelectorAll('a[href^="blob:"]').forEach(element => {
      const url = element.getAttribute('href');
      if (url) createdURLs.push(url);
    });
    
    // Función para limpiar recursos y cerrar modal
    const closeAndCleanup = () => {
      // Revocar todas las URLs de blobs
      createdURLs.forEach(url => {
        URL.revokeObjectURL(url);
      });
      
      // Eliminar el modal
      document.body.removeChild(container);
      console.log(`Limpiadas ${createdURLs.length} URLs de blobs`);
    };
    
    // Añadir eventos
    document.getElementById('close-modal')?.addEventListener('click', closeAndCleanup);
    document.getElementById('close-button')?.addEventListener('click', closeAndCleanup);
    
    document.getElementById('download-all')?.addEventListener('click', async () => {
      try {
        // Intentar primero con la API de File System Access si está disponible
        // Esta API permite al usuario seleccionar una carpeta donde guardar los archivos
        if ('showDirectoryPicker' in window) {
          try {
            // Mostrar diálogo para seleccionar carpeta
            const directoryHandle = await (window as any).showDirectoryPicker({
              mode: 'readwrite',
              startIn: 'downloads',
              id: 'facturas-billeo',
              suggestedName: `Facturas_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}`
            });
            
            // Crear subcarpeta con la fecha actual
            const folderName = `Facturas_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}`;
            let subfolder;
            
            try {
              // Intentar obtener la carpeta si ya existe
              subfolder = await directoryHandle.getDirectoryHandle(folderName);
            } catch (e) {
              // Crear la carpeta si no existe
              subfolder = await directoryHandle.getDirectoryHandle(folderName, { create: true });
            }
            
            // Guardar cada archivo en la carpeta
            let savedCount = 0;
            for (const file of files) {
              try {
                // Crear o sobrescribir el archivo en la carpeta
                const fileHandle = await subfolder.getFileHandle(file.name, { create: true });
                // Obtener un writable stream
                const writable = await fileHandle.createWritable();
                // Escribir el contenido del archivo
                await writable.write(file.data);
                // Cerrar el stream
                await writable.close();
                savedCount++;
              } catch (fileError) {
                console.error(`Error al guardar el archivo ${file.name}:`, fileError);
              }
            }
            
            // Mensaje de éxito
            alert(`Se han guardado ${savedCount} facturas en la carpeta "${folderName}".`);
            return;
          } catch (err) {
            // Si el usuario cancela la selección de carpeta o hay otro error, usar el método alternativo
            console.log('No se pudo usar File System Access API, usando método alternativo:', err);
          }
        }
        
        // Método alternativo: descargar individualmente
        const downloadUrls: string[] = [];
        
        for (const file of files) {
          const url = URL.createObjectURL(file.data);
          downloadUrls.push(url);
          
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = file.name;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        
        // Limpieza después de un breve tiempo para asegurar que las descargas se iniciaron
        setTimeout(() => {
          downloadUrls.forEach(url => {
            URL.revokeObjectURL(url);
          });
          console.log(`Limpiadas ${downloadUrls.length} URLs de blobs de descargas`);
        }, 2000);
        
        alert(`Se han descargado ${files.length} facturas. 
Como tu navegador no soporta la selección de carpetas, los archivos se han descargado individualmente en tu carpeta de descargas.`);
      } catch (error) {
        console.error('Error al descargar facturas:', error);
        alert('Ha ocurrido un error al descargar las facturas.');
      }
    });
    
    console.log(`Generados ${files.length} archivos PDF de facturas y mostrados en tarjeta`);
  } catch (error) {
    console.error('Error al generar o mostrar los PDFs:', error);
    
    // Mostrar un mensaje de error más amigable con estilo propio de la aplicación
    const errorContainer = document.createElement('div');
    errorContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    errorContainer.style.backdropFilter = 'blur(4px)';
    
    const errorCard = document.createElement('div');
    errorCard.className = 'bg-white rounded-xl shadow-xl p-6 max-w-md w-full';
    
    errorCard.innerHTML = `
      <div class="flex items-center justify-center mb-4 text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 class="text-xl font-medium text-center mb-2">Error al generar los PDFs</h2>
      <p class="text-gray-600 text-center mb-6">Ha ocurrido un problema al procesar las facturas. Por favor, inténtelo de nuevo.</p>
      <div class="flex justify-center">
        <button id="error-close" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
          Cerrar
        </button>
      </div>
    `;
    
    errorContainer.appendChild(errorCard);
    document.body.appendChild(errorContainer);
    
    document.getElementById('error-close')?.addEventListener('click', () => {
      document.body.removeChild(errorContainer);
    });
  }
};