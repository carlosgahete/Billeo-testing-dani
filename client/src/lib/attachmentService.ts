import { toast } from "@/hooks/use-toast";

export interface Expense {
  id: number;
  userId: number;
  description: string;
  amount: number;
  date: string;
  type: 'expense';
  categoryId: number;
  paymentMethod: string;
  accountNumber?: string;
  notes?: string;
  attachments?: string[];
  title?: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
}

// Función para formatear nombres de archivos adjuntos de gastos
export const formatExpenseAttachmentFileName = (
  filename: string,
  expense: Expense,
  category?: Category
): string => {
  // Extrae la extensión del archivo original
  const ext = filename.split('.').pop() || '';
  
  // Obtener el nombre del proveedor si existe
  let providerName = '';
  
  // Si hay título, usarlo como proveedor
  if (expense.title) {
    providerName = expense.title;
  } else if (expense.notes) {
    // Buscar el proveedor en las notas (generadas por el escaneo de documentos)
    const providerMatch = expense.notes.match(/🏢 Proveedor:\s*([^\n]+)/);
    if (providerMatch && providerMatch[1] && providerMatch[1] !== 'No detectado') {
      providerName = providerMatch[1].trim();
    }
  }
  
  // Fallback a descripción si no hay proveedor
  if (!providerName) {
    providerName = expense.description;
  }
  
  // Limpiar el nombre del proveedor
  const safeProviderName = providerName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  
  // Formatear la fecha
  const expenseDate = new Date(expense.date);
  const formattedDate = expenseDate.toISOString().split('T')[0];
  
  // Obtener nombre de categoría
  const categoryName = category ? category.name.replace(/\s+/g, '_') : 'SinCategoria';
  
  // Crear nombre formateado
  return `${safeProviderName}_${formattedDate}_${categoryName}.${ext}`;
};

// Función para descargar un archivo original de gasto individual
export const downloadExpenseOriginal = (
  filename: string,
  expense: Expense,
  category?: Category
): void => {
  try {
    if (!filename) {
      throw new Error('Nombre de archivo no válido');
    }
    
    // Generar URL con parámetros para el nombre formateado
    const providerParam = encodeURIComponent(expense.title || expense.description || '');
    const dateParam = encodeURIComponent(new Date(expense.date).toISOString().split('T')[0]);
    const categoryParam = encodeURIComponent(category?.name || '');
    
    // Crear URL con los parámetros para el backend
    const downloadUrl = `/api/download/${filename}?provider=${providerParam}&date=${dateParam}&category=${categoryParam}`;
    
    // Abrir en una nueva pestaña
    window.open(downloadUrl, '_blank');
    
  } catch (error) {
    console.error('Error al descargar documento original del gasto:', error);
    toast({
      title: "Error al descargar",
      description: "No se pudo descargar el documento original del gasto.",
      variant: "destructive"
    });
  }
};

// Función para ver un documento original en el navegador
export const viewExpenseOriginal = (
  filename: string,
  expense: Expense,
  category?: Category
): void => {
  try {
    if (!filename) {
      throw new Error('Nombre de archivo no válido');
    }
    
    // Mostrar información de debug
    console.log(`Intentando ver archivo: ${filename} del gasto ID ${expense.id}`);
    
    // Obtener solo el nombre del archivo sin la ruta
    const filenameOnly = filename.split('/').pop() || filename;
    
    console.log(`Nombre de archivo extraído: ${filenameOnly}`);
    
    // Crear URL para visualizar
    window.open(`/api/view-file/${filenameOnly}`, '_blank');
    
    // Mostrar notificación de éxito
    toast({
      title: "Abriendo documento",
      description: "El documento se está abriendo en una nueva pestaña",
      variant: "default"
    });
    
  } catch (error) {
    console.error('Error al visualizar documento original del gasto:', error);
    toast({
      title: "Error al visualizar documento",
      description: "No se pudo abrir el documento original del gasto.",
      variant: "destructive"
    });
  }
};

// Función para descargar múltiples documentos originales de gastos
export const downloadExpenseOriginalsAsZip = async (
  expenses: Expense[],
  categories: Category[]
): Promise<void> => {
  try {
    if (!expenses || expenses.length === 0) {
      throw new Error('No hay gastos con documentos originales para descargar');
    }
    
    // Filtrar gastos que tienen documentos adjuntos
    const expensesWithAttachments = expenses.filter(e => {
      // Verificar si attachments existe
      if (!e.attachments) return false;
      
      // Si es un string en lugar de un array, intentar parsearlo
      if (typeof e.attachments === 'string') {
        try {
          const parsed = JSON.parse(e.attachments);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch (err) {
          // Si no es JSON válido, verificar si es un string no vacío
          return e.attachments.trim() !== '';
        }
      }
      
      // Si ya es un array, verificar si tiene elementos
      return Array.isArray(e.attachments) && e.attachments.length > 0;
    });
    
    if (expensesWithAttachments.length === 0) {
      toast({
        title: "Sin documentos originales",
        description: "No hay documentos originales para descargar en los gastos filtrados.",
        variant: "default"
      });
      return;
    }
    
    console.log(`Procesando ${expensesWithAttachments.length} gastos con documentos originales...`);
    
    // Recopilar todos los archivos adjuntos
    const allAttachments: string[] = [];
    for (const expense of expensesWithAttachments) {
      // Normalizar attachments a un array de strings
      let attachmentsArray: string[] = [];
      
      if (typeof expense.attachments === 'string') {
        try {
          // Intentar parsear el string como JSON
          const parsed = JSON.parse(expense.attachments);
          if (Array.isArray(parsed)) {
            attachmentsArray = parsed;
          } else {
            attachmentsArray = [expense.attachments];
          }
        } catch (err) {
          // Si no es JSON válido, tratar como un solo string
          attachmentsArray = [expense.attachments];
        }
      } else if (Array.isArray(expense.attachments)) {
        attachmentsArray = expense.attachments;
      }
      
      // Extraer solo el nombre del archivo sin la ruta para cada adjunto
      const cleanAttachments = attachmentsArray.map(a => a.split('/').pop() || a);
      allAttachments.push(...cleanAttachments);
      
      // Mostrar información de depuración
      console.log(`Gasto ID ${expense.id} tiene adjuntos:`, attachmentsArray);
      console.log(`Nombres de archivo limpios:`, cleanAttachments);
    }
    
    // Determinar el período para los nombres de archivo
    const today = new Date();
    const period = `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Obtener enlaces de descarga del servidor
    const response = await fetch('/api/batch-download-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filenames: allAttachments,
        period: period
      }),
    });
    
    if (!response.ok) {
      throw new Error('Error al obtener enlaces de descarga');
    }
    
    const result = await response.json();
    
    if (result.downloadLinks && result.downloadLinks.length > 0) {
      const { downloadLinks } = result;
      
      // Mostrar mensaje de inicio de descarga
      toast({
        title: "Preparando descarga",
        description: `Se van a descargar ${downloadLinks.length} documentos originales.`,
        variant: "default"
      });
      
      // Descargar los archivos uno por uno con un pequeño retraso entre ellos
      downloadLinks.forEach((link: any, index: number) => {
        setTimeout(() => {
          window.open(link.downloadUrl, '_blank');
        }, index * 800); // Retraso de 800ms entre descargas
      });
      
      // Mensaje final
      setTimeout(() => {
        toast({
          title: "Descarga completada",
          description: `Se han descargado ${downloadLinks.length} documentos originales.`,
          variant: "default"
        });
      }, downloadLinks.length * 800 + 1000);
    } else {
      throw new Error('No se encontraron archivos para descargar');
    }
    
  } catch (error) {
    console.error('Error al descargar documentos originales de gastos:', error);
    toast({
      title: "Error al descargar documentos",
      description: "No se pudieron descargar los documentos originales de gastos.",
      variant: "destructive"
    });
  }
};