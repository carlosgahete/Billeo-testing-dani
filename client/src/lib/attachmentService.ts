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
    const expensesWithAttachments = expenses.filter(e => 
      e.attachments && e.attachments.length > 0
    );
    
    if (expensesWithAttachments.length === 0) {
      toast({
        title: "Sin documentos originales",
        description: "No hay documentos originales para descargar en los gastos filtrados.",
        variant: "default"
      });
      return;
    }
    
    console.log(`Procesando ${expensesWithAttachments.length} gastos con documentos originales...`);
    
    // Como primera implementación, descargamos uno por uno
    // En un futuro, podríamos implementar una función de servidor para crear un ZIP
    let totalFiles = 0;
    
    for (const expense of expensesWithAttachments) {
      if (expense.attachments && expense.attachments.length > 0) {
        const category = categories.find(c => c.id === expense.categoryId);
        
        for (const attachment of expense.attachments) {
          setTimeout(() => {
            downloadExpenseOriginal(attachment, expense, category);
            totalFiles++;
          }, totalFiles * 500); // Añadimos un retraso de 500ms entre descargas
        }
      }
    }
    
    // Mensaje de éxito
    toast({
      title: "Descarga iniciada",
      description: `Se están descargando ${totalFiles} documentos originales de gastos.`,
      variant: "default"
    });
    
  } catch (error) {
    console.error('Error al descargar documentos originales de gastos:', error);
    toast({
      title: "Error al descargar",
      description: "No se pudieron descargar los documentos originales de gastos.",
      variant: "destructive"
    });
  }
};