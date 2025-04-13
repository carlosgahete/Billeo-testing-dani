import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/ui/search-bar";
import { 
  Edit, 
  Trash2, 
  Download, 
  Plus, 
  FileDown, 
  CheckCircle, 
  DollarSign, 
  Check, 
  MoreVertical,
  Mail,
  FileCheck,
  Filter,
  Calendar,
  Tag,
  WrenchIcon,
  CircleDollarSign,
  RefreshCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDFBlob, generateInvoicePDF } from "@/lib/pdf";
import { formatInvoiceFileName, downloadFilteredInvoicesAsZip } from "@/lib/zipService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SendInvoiceEmailDialog } from "./SendInvoiceEmailDialog";
import RepairInvoiceButton from "./RepairInvoiceButton";

// Función de utilidad para forzar la actualización de datos
const forceDataRefresh = () => {
  console.log("🔄 Iniciando actualización completa de datos...");
  
  // Eliminación completa de datos en caché para forzar recargas frescas
  queryClient.removeQueries({ queryKey: ["/api/stats/dashboard"] });
  queryClient.removeQueries({ queryKey: ["/api/invoices"] });
  queryClient.removeQueries({ queryKey: ["/api/invoices/recent"] });
  
  // Invalidar todas las consultas relevantes
  queryClient.invalidateQueries();
  
  // Dar tiempo al backend para procesar la acción
  setTimeout(() => {
    // Hacer peticiones manuales para asegurar datos frescos
    fetch("/api/stats/dashboard?nocache=" + Date.now(), { 
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } 
    })
    .then(() => {
      console.log("⚡ Forzando recarga de datos:", new Date().toISOString());
      
      // Refrescar explícitamente todas las consultas relevantes
      queryClient.refetchQueries({ queryKey: ["/api/stats/dashboard"] });
      queryClient.refetchQueries({ queryKey: ["/api/invoices"] });
      queryClient.refetchQueries({ queryKey: ["/api/invoices/recent"] });
      
      // Refrescar nuevamente después de un tiempo adicional con mayor retraso
      setTimeout(() => {
        queryClient.invalidateQueries();
        queryClient.refetchQueries({ queryKey: ["/api/stats/dashboard"] });
        console.log("🔄 Segunda actualización de datos completada");
      }, 1000);
    })
    .catch(err => console.error("Error al recargar dashboard:", err));
  }, 300);
};

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
  attachments?: string[];
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

const StatusBadge = ({ status }: { status: string }) => {
  // Estilo Apple: colores más sofisticados y badges más redondeados
  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { 
      label: "Pendiente", 
      className: "bg-amber-50 text-amber-600 border border-amber-200" 
    },
    paid: { 
      label: "Pagada", 
      className: "bg-green-50 text-green-600 border border-green-200" 
    },
    overdue: { 
      label: "Vencida", 
      className: "bg-red-50 text-red-600 border border-red-200" 
    },
    canceled: { 
      label: "Cancelada", 
      className: "bg-gray-50 text-gray-600 border border-gray-200" 
    },
  };

  const { label, className } = statusMap[status] || { 
    label: status, 
    className: "bg-gray-50 text-gray-600 border border-gray-200" 
  };

  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
};

const MarkAsPaidButton = ({ 
  invoice
}: { 
  invoice: Invoice
}) => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  
  // Si la factura ya está pagada, no mostrar el botón
  if (invoice.status === 'paid') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" disabled className="text-green-600">
              <CheckCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta factura ya está marcada como pagada</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleMarkAsPaid = async () => {
    setIsPending(true);
    try {
      // Primero obtener los ítems actuales de la factura
      const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
      const invoiceData = await response.json();
      
      // Actualizar el estado de la factura a "paid"
      await apiRequest("PUT", `/api/invoices/${invoice.id}`, {
        invoice: { status: "paid" },
        items: invoiceData?.items || [] // Mantener los items existentes
      });
      
      toast({
        title: "Factura marcada como pagada",
        description: `La factura ${invoice.invoiceNumber} ha sido marcada como pagada y se ha registrado en los ingresos totales.`,
      });
      
      // Usar un enfoque más seguro, dirigiendo directamente a la página de facturas
      setTimeout(() => {
        window.location.href = '/invoices';
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo marcar la factura como pagada: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-green-600 hover:bg-green-50"
            onClick={handleMarkAsPaid}
            disabled={isPending}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Marcar como pagada</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const DeleteInvoiceDialog = ({ 
  invoiceId, 
  invoiceNumber, 
  onConfirm 
}: { 
  invoiceId: number; 
  invoiceNumber: string; 
  onConfirm: () => void; 
}) => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      // Eliminar la factura
      await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
      
      // Notificar al usuario
      toast({
        title: "Factura eliminada",
        description: `La factura ${invoiceNumber} ha sido eliminada con éxito`,
      });
      
      // Cerrar el diálogo
      onConfirm();
      
      // Redireccionar a la página de facturas
      setTimeout(() => {
        window.location.href = '/invoices';
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo eliminar la factura: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la factura {invoiceNumber} y no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const InvoiceList = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Estados para los filtros
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [quarterFilter, setQuarterFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: invoicesData = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: clientsData = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Obtener información de la empresa para los PDFs y emails
  const { data: companyData } = useQuery<Company>({
    queryKey: ["/api/company"],
  });

  const handleExportInvoicePDF = async (invoice: Invoice) => {
    try {
      const client = clientsData?.find((c: Client) => c.id === invoice.clientId);
      
      if (!client) {
        toast({
          title: "Error",
          description: "No se pudo encontrar la información del cliente",
          variant: "destructive",
        });
        return;
      }
      
      // Get invoice items
      const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
      const data = await response.json();
      
      console.log("Compañía:", companyData);
      console.log("Logo de la empresa:", companyData?.logo);
      
      // Generar el PDF como Blob en lugar de descargarlo directamente
      // Pasamos directamente el logo de la empresa como cuarto parámetro
      const pdfBlob = await generateInvoicePDFBlob(invoice, client, data.items, companyData?.logo);
      
      if (!pdfBlob) {
        throw new Error("No se pudo generar el PDF");
      }
      
      // Generar un ID único para esta instancia
      const instanceId = `invoice-pdf-${invoice.id}-${Date.now()}`;
      
      // Mostrar la factura en una tarjeta similar a la vista múltiple pero con un solo elemento
      const container = document.createElement('div');
      container.id = `container-${instanceId}`;
      container.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      container.style.backdropFilter = 'blur(4px)';
      
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col';
      
      // Crear la cabecera de la tarjeta
      const header = document.createElement('div');
      header.className = 'p-4 border-b border-gray-200 flex justify-between items-center';
      header.innerHTML = `
        <h2 class="text-lg font-medium text-gray-800">Factura ${invoice.invoiceNumber}</h2>
        <button id="close-modal-${instanceId}" class="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      
      // Crear el cuerpo de la tarjeta
      const body = document.createElement('div');
      body.className = 'p-6 overflow-auto flex-1';
      
      const fileName = formatInvoiceFileName(invoice, client.name, "visualizacion");
      const url = URL.createObjectURL(pdfBlob);
      
      // Guardar la URL para revocarla después
      const pdfUrl = url;
      
      body.innerHTML = `
        <div class="flex flex-col items-center justify-center">
          <div class="text-center mb-4">
            <p class="text-sm text-gray-600 mb-2">Cliente: ${client.name}</p>
            <p class="text-sm text-gray-600 mb-4">Total: ${new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 2
            }).format(invoice.total)}</p>
            
            <div class="bg-gray-100 rounded-lg p-4 mb-4">
              <p class="text-xs text-gray-500 mb-2">Previsualización no disponible</p>
              <p class="text-xs text-gray-500">Haz clic en "Ver PDF" para visualizar el documento completo</p>
            </div>
            
            <div class="flex justify-center space-x-3">
              <a href="${url}" id="view-pdf-${instanceId}" target="_blank" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Ver PDF
              </a>
              <a href="${url}" id="download-pdf-${instanceId}" download="${fileName}" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Descargar
              </a>
            </div>
          </div>
        </div>
      `;
      
      // Añadir el footer con botón para cerrar
      const footer = document.createElement('div');
      footer.className = 'p-4 border-t border-gray-200 flex justify-end';
      footer.innerHTML = `
        <button id="close-button-${instanceId}" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
          Cerrar
        </button>
      `;
      
      // Añadir todos los elementos
      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(footer);
      container.appendChild(card);
      document.body.appendChild(container);
      
      // Función para cerrar y limpiar
      const closeModal = () => {
        // Revocar la URL del Blob para liberar memoria
        URL.revokeObjectURL(pdfUrl);
        document.body.removeChild(container);
        console.log(`Liberada URL para factura ${invoice.invoiceNumber}`);
      };
      
      // Añadir eventos
      document.getElementById(`close-modal-${instanceId}`)?.addEventListener('click', closeModal);
      document.getElementById(`close-button-${instanceId}`)?.addEventListener('click', closeModal);
      
      // También limpiar cuando se descargue o vea el PDF
      document.getElementById(`view-pdf-${instanceId}`)?.addEventListener('click', () => {
        // Dar tiempo para que el navegador abra el PDF antes de revocar la URL
        setTimeout(() => {
          // No cerramos el modal, solo aseguramos que se liberará la memoria cuando se cierre
          console.log(`PDF visualizado: ${fileName}`);
        }, 1000);
      });
      
      document.getElementById(`download-pdf-${instanceId}`)?.addEventListener('click', () => {
        setTimeout(() => {
          console.log(`PDF descargado: ${fileName}`);
          // No cerramos el modal, solo registramos la acción
        }, 1000);
      });
      
    } catch (error: any) {
      console.error("Error al generar el PDF:", error);
      toast({
        title: "Error",
        description: `No se pudo generar el PDF: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getClientName = (clientId: number) => {
    if (!clientsData) return "Cargando...";
    const client = clientsData.find((c: Client) => c.id === clientId);
    return client ? client.name : "Cliente no encontrado";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  };
  
  // Funciones para obtener años y trimestres disponibles
  const getAvailableYears = () => {
    if (!invoicesData || invoicesData.length === 0) return ["all"];
    
    const yearsSet = new Set<string>();
    yearsSet.add("all");
    
    invoicesData.forEach(invoice => {
      const date = new Date(invoice.issueDate);
      yearsSet.add(date.getFullYear().toString());
    });
    
    return Array.from(yearsSet).sort();
  };
  
  const getQuarterFromMonth = (month: number) => {
    if (month >= 0 && month <= 2) return "q1";
    if (month >= 3 && month <= 5) return "q2";
    if (month >= 6 && month <= 8) return "q3";
    return "q4";
  };
  
  // Función para filtrar facturas según los filtros aplicados
  const filteredInvoices = useMemo(() => {
    if (!invoicesData) return [];
    
    return invoicesData.filter(invoice => {
      const date = new Date(invoice.issueDate);
      const invoiceYear = date.getFullYear().toString();
      const invoiceMonth = date.getMonth();
      const invoiceQuarter = getQuarterFromMonth(invoiceMonth);
      
      // Filtrar por año
      if (yearFilter !== "all" && invoiceYear !== yearFilter) {
        return false;
      }
      
      // Filtrar por trimestre
      if (quarterFilter !== "all" && invoiceQuarter !== quarterFilter) {
        return false;
      }
      
      // Filtrar por cliente
      if (clientFilter !== "all" && invoice.clientId.toString() !== clientFilter) {
        return false;
      }
      
      // Filtrar por estado
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }
      
      // Filtrar por búsqueda global
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        
        // Convertir datos a minúsculas para búsqueda no sensible a mayúsculas
        const invoiceNumber = invoice.invoiceNumber?.toLowerCase() || '';
        const clientName = getClientName(invoice.clientId)?.toLowerCase() || '';
        const issueDateFormatted = formatDate(invoice.issueDate)?.toLowerCase() || '';
        const statusText = invoice.status?.toLowerCase() || '';
        const subtotalText = invoice.subtotal?.toString() || '';
        const totalText = invoice.total?.toString() || '';
        
        // Verificar si algún campo contiene la cadena de búsqueda
        const hasMatch = 
          invoiceNumber.includes(query) || 
          clientName.includes(query) || 
          issueDateFormatted.includes(query) || 
          statusText.includes(query) || 
          subtotalText.includes(query) || 
          totalText.includes(query);
            
        if (hasMatch) {
          console.log(`Coincidencia encontrada para "${query}" en factura ${invoiceNumber}, cliente "${clientName}"`);
          return true;
        }
        
        // Si no hay coincidencia directa, buscar en nombres completos de clientes
        if (clientsData) {
          const matchingClient = clientsData.find(c => 
            c.name?.toLowerCase()?.includes(query)
          );
          
          if (matchingClient && matchingClient.id === invoice.clientId) {
            console.log(`Coincidencia encontrada por cliente completo "${matchingClient.name}" para factura ${invoiceNumber}`);
            return true;
          }
        }
        
        console.log(`No coincide para "${query}" en factura ${invoiceNumber}, cliente "${clientName}"`);
        return false;
      }
      
      return true;
    });
  }, [invoicesData, yearFilter, quarterFilter, clientFilter, statusFilter, searchQuery, clientsData]);
  
  // Función para exportar todas las facturas
  const exportAllInvoices = async () => {
    // Reutilizamos la función de exportar facturas filtradas pero con TODAS las facturas 
    // (como si estuvieran filtradas a "all")
    try {
      if (!invoicesData || invoicesData.length === 0) {
        toast({
          title: "No hay facturas",
          description: "No hay facturas disponibles para exportar.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Preparando todas las facturas",
        description: `Generando ${invoicesData.length} facturas para descargar...`,
      });
      
      // Crear un contenedor para mostrar progreso
      const progressContainer = document.createElement('div');
      progressContainer.id = 'export-progress-container';
      progressContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      progressContainer.style.backdropFilter = 'blur(4px)';
      
      const progressCard = document.createElement('div');
      progressCard.className = 'bg-white rounded-xl shadow-xl p-6 max-w-md w-full';
      
      progressCard.innerHTML = `
        <h2 class="text-xl font-medium text-center mb-4">Generando todas las facturas</h2>
        <div class="mb-4">
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div id="progress-bar" class="h-full bg-blue-600 rounded-full" style="width: 0%"></div>
          </div>
          <p id="progress-text" class="text-sm text-center mt-2">Preparando facturas (0/${invoicesData.length})</p>
        </div>
        <div id="progress-details" class="max-h-32 overflow-y-auto text-xs text-gray-500 mb-4"></div>
      `;
      
      progressContainer.appendChild(progressCard);
      document.body.appendChild(progressContainer);
      
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      const progressDetails = document.getElementById('progress-details');
      
      // Función para actualizar el progreso
      const updateProgress = (current: number, message: string) => {
        const percentage = Math.round((current / invoicesData.length) * 100);
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `Procesando facturas (${current}/${invoicesData.length})`;
        
        if (progressDetails) {
          const detail = document.createElement('div');
          detail.className = 'mb-1';
          detail.textContent = message;
          progressDetails.appendChild(detail);
          progressDetails.scrollTop = progressDetails.scrollHeight;
        }
      };
      
      try {
        // Generar cada PDF individualmente
        const downloads: Array<{
          blob: Blob,
          fileName: string,
          invoiceNumber: string
        }> = [];
        
        for (let i = 0; i < invoicesData.length; i++) {
          const invoice = invoicesData[i];
          
          // Buscar cliente
          const client = clientsData?.find(c => c.id === invoice.clientId);
          if (!client) {
            updateProgress(i + 1, `⚠️ Omitida factura ${invoice.invoiceNumber}: Cliente no encontrado`);
            continue;
          }
          
          try {
            // Obtener items
            updateProgress(i + 1, `Obteniendo detalles de factura ${invoice.invoiceNumber}...`);
            const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
            const data = await response.json();
            const items = data.items || [];
            
            // Generar PDF
            updateProgress(i + 1, `Generando PDF para factura ${invoice.invoiceNumber}...`);
            // Usar el logo de la empresa en la generación del PDF
            const pdfBlob = await generateInvoicePDFBlob(invoice, client, items, companyData?.logo);
            
            // Nombre único para el archivo
            const fileName = `Factura_${invoice.invoiceNumber}_${client.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            
            // Crear objeto de descarga
            downloads.push({
              blob: pdfBlob,
              fileName: fileName,
              invoiceNumber: invoice.invoiceNumber
            });
            
            updateProgress(i + 1, `✓ Factura ${invoice.invoiceNumber} lista para descargar`);
          } catch (error) {
            console.error(`Error al generar PDF para factura ${invoice.invoiceNumber}:`, error);
            updateProgress(i + 1, `❌ Error en factura ${invoice.invoiceNumber}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }
        
        // Eliminar el modal de progreso
        document.body.removeChild(progressContainer);
        
        if (downloads.length === 0) {
          toast({
            title: "Error",
            description: "No se pudo generar ninguna factura para descargar.",
            variant: "destructive",
          });
          return;
        }
        
        // Mostrar diálogo de confirmación con las facturas generadas
        const confirmContainer = document.createElement('div');
        confirmContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        confirmContainer.style.backdropFilter = 'blur(4px)';
        
        const confirmCard = document.createElement('div');
        confirmCard.className = 'bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden flex flex-col';
        
        // Crear cabecera
        const header = document.createElement('div');
        header.className = 'p-4 border-b border-gray-200 flex justify-between items-center';
        header.innerHTML = `
          <h2 class="text-lg font-medium text-gray-800">Todas las facturas generadas (${downloads.length})</h2>
          <button id="close-dialog" class="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;
        
        // Lista de facturas
        const body = document.createElement('div');
        body.className = 'p-4 overflow-auto max-h-[60vh]';
        
        const fileList = document.createElement('ul');
        fileList.className = 'divide-y divide-gray-200';
        
        downloads.forEach((download, index) => {
          const item = document.createElement('li');
          item.className = 'py-3 flex justify-between items-center';
          
          item.innerHTML = `
            <span class="font-medium">${download.invoiceNumber}</span>
            <button id="download-btn-${index}" class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
              Descargar
            </button>
          `;
          
          fileList.appendChild(item);
        });
        
        body.appendChild(fileList);
        
        // Footer con botones
        const footer = document.createElement('div');
        footer.className = 'p-4 border-t border-gray-200 flex justify-between';
        
        footer.innerHTML = `
          <button id="download-all-btn" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Descargar todas
          </button>
          <button id="close-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cerrar
          </button>
        `;
        
        // Añadir elementos al DOM
        confirmCard.appendChild(header);
        confirmCard.appendChild(body);
        confirmCard.appendChild(footer);
        confirmContainer.appendChild(confirmCard);
        document.body.appendChild(confirmContainer);
        
        // Función para limpiar recursos
        const cleanup = () => {
          document.body.removeChild(confirmContainer);
        };
        
        // Event listeners
        document.getElementById('close-dialog')?.addEventListener('click', cleanup);
        document.getElementById('close-btn')?.addEventListener('click', cleanup);
        
        // Botones individuales de descarga
        downloads.forEach((download, index) => {
          document.getElementById(`download-btn-${index}`)?.addEventListener('click', () => {
            // Descargar archivo individual
            const url = URL.createObjectURL(download.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = download.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Revocar URL después de un momento
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 1000);
          });
        });
        
        // Botón descargar todas
        document.getElementById('download-all-btn')?.addEventListener('click', () => {
          // Descargar todas secuencialmente con un pequeño retardo entre cada una
          toast({
            title: "Descargando facturas",
            description: `Descargando ${downloads.length} facturas...`,
          });
          
          // Secuencia con delay para evitar problemas del navegador
          const downloadSequentially = async () => {
            for (let i = 0; i < downloads.length; i++) {
              const download = downloads[i];
              const url = URL.createObjectURL(download.blob);
              
              const a = document.createElement('a');
              a.href = url;
              a.download = download.fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              // Esperar un momento entre descargas
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Revocar URL
              URL.revokeObjectURL(url);
            }
            
            toast({
              title: "Descarga completada",
              description: `Se han descargado ${downloads.length} facturas.`,
            });
          };
          
          downloadSequentially();
        });
        
      } catch (error) {
        // En caso de error, eliminar modal de progreso si sigue existiendo
        const container = document.getElementById('export-progress-container');
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
        
        throw error; // Re-lanzar para el catch exterior
      }
    } catch (error: any) {
      console.error("Error al exportar todas las facturas:", error);
      
      toast({
        title: "Error",
        description: `No se pudo completar la exportación: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  // Función para exportar facturas filtradas como ZIP
  const handleExportFilteredInvoices = async () => {
    try {
      // Verificar si hay facturas filtradas
      if (!filteredInvoices || filteredInvoices.length === 0) {
        toast({
          title: "No hay facturas",
          description: "No se encontraron facturas que cumplan con los filtros actuales.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Preparando facturas",
        description: `Generando ${filteredInvoices.length} facturas para descargar...`,
      });
      
      // Crear un contenedor para mostrar progreso
      const progressContainer = document.createElement('div');
      progressContainer.id = 'export-progress-container';
      progressContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      progressContainer.style.backdropFilter = 'blur(4px)';
      
      const progressCard = document.createElement('div');
      progressCard.className = 'bg-white rounded-xl shadow-xl p-6 max-w-md w-full';
      
      progressCard.innerHTML = `
        <h2 class="text-xl font-medium text-center mb-4">Generando facturas</h2>
        <div class="mb-4">
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div id="progress-bar" class="h-full bg-blue-600 rounded-full" style="width: 0%"></div>
          </div>
          <p id="progress-text" class="text-sm text-center mt-2">Preparando facturas (0/${filteredInvoices.length})</p>
        </div>
        <div id="progress-details" class="max-h-32 overflow-y-auto text-xs text-gray-500 mb-4"></div>
      `;
      
      progressContainer.appendChild(progressCard);
      document.body.appendChild(progressContainer);
      
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      const progressDetails = document.getElementById('progress-details');
      
      // Función para actualizar el progreso
      const updateProgress = (current: number, message: string) => {
        const percentage = Math.round((current / filteredInvoices.length) * 100);
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `Procesando facturas (${current}/${filteredInvoices.length})`;
        
        if (progressDetails) {
          const detail = document.createElement('div');
          detail.className = 'mb-1';
          detail.textContent = message;
          progressDetails.appendChild(detail);
          progressDetails.scrollTop = progressDetails.scrollHeight;
        }
      };
      
      try {
        // Generar cada PDF individualmente y descargarlos uno por uno
        // para asegurar que todas las facturas se descarguen
        const downloads: Array<{
          blob: Blob,
          fileName: string,
          invoiceNumber: string
        }> = [];
        
        for (let i = 0; i < filteredInvoices.length; i++) {
          const invoice = filteredInvoices[i];
          
          // Buscar cliente
          const client = clientsData?.find(c => c.id === invoice.clientId);
          if (!client) {
            updateProgress(i + 1, `⚠️ Omitida factura ${invoice.invoiceNumber}: Cliente no encontrado`);
            continue;
          }
          
          try {
            // Obtener items
            updateProgress(i + 1, `Obteniendo detalles de factura ${invoice.invoiceNumber}...`);
            const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
            const data = await response.json();
            const items = data.items || [];
            
            // Generar PDF
            updateProgress(i + 1, `Generando PDF para factura ${invoice.invoiceNumber}...`);
            // Incluir el logo de la empresa en el PDF
            const pdfBlob = await generateInvoicePDFBlob(invoice, client, items, companyData?.logo);
            
            // Nombre único para el archivo 
            const fileName = `Factura_${invoice.invoiceNumber}_${client.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            
            // Crear objeto de descarga
            downloads.push({
              blob: pdfBlob,
              fileName: fileName,
              invoiceNumber: invoice.invoiceNumber
            });
            
            updateProgress(i + 1, `✓ Factura ${invoice.invoiceNumber} lista para descargar`);
          } catch (error) {
            console.error(`Error al generar PDF para factura ${invoice.invoiceNumber}:`, error);
            updateProgress(i + 1, `❌ Error en factura ${invoice.invoiceNumber}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }
        
        // Eliminar el modal de progreso
        document.body.removeChild(progressContainer);
        
        if (downloads.length === 0) {
          toast({
            title: "Error",
            description: "No se pudo generar ninguna factura para descargar.",
            variant: "destructive",
          });
          return;
        }
        
        // Mostrar diálogo de confirmación con las facturas generadas
        const confirmContainer = document.createElement('div');
        confirmContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        confirmContainer.style.backdropFilter = 'blur(4px)';
        
        const confirmCard = document.createElement('div');
        confirmCard.className = 'bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden flex flex-col';
        
        // Crear cabecera
        const header = document.createElement('div');
        header.className = 'p-4 border-b border-gray-200 flex justify-between items-center';
        header.innerHTML = `
          <h2 class="text-lg font-medium text-gray-800">Facturas generadas (${downloads.length})</h2>
          <button id="close-dialog" class="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;
        
        // Lista de facturas
        const body = document.createElement('div');
        body.className = 'p-4 overflow-auto max-h-[60vh]';
        
        const fileList = document.createElement('ul');
        fileList.className = 'divide-y divide-gray-200';
        
        downloads.forEach((download, index) => {
          const item = document.createElement('li');
          item.className = 'py-3 flex justify-between items-center';
          
          item.innerHTML = `
            <span class="font-medium">${download.invoiceNumber}</span>
            <button id="download-btn-${index}" class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
              Descargar
            </button>
          `;
          
          fileList.appendChild(item);
        });
        
        body.appendChild(fileList);
        
        // Footer con botones
        const footer = document.createElement('div');
        footer.className = 'p-4 border-t border-gray-200 flex justify-between';
        
        footer.innerHTML = `
          <button id="download-all-btn" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Descargar todas
          </button>
          <button id="close-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cerrar
          </button>
        `;
        
        // Añadir elementos al DOM
        confirmCard.appendChild(header);
        confirmCard.appendChild(body);
        confirmCard.appendChild(footer);
        confirmContainer.appendChild(confirmCard);
        document.body.appendChild(confirmContainer);
        
        // Función para limpiar recursos
        const cleanup = () => {
          document.body.removeChild(confirmContainer);
        };
        
        // Event listeners
        document.getElementById('close-dialog')?.addEventListener('click', cleanup);
        document.getElementById('close-btn')?.addEventListener('click', cleanup);
        
        // Botones individuales de descarga
        downloads.forEach((download, index) => {
          document.getElementById(`download-btn-${index}`)?.addEventListener('click', () => {
            // Descargar archivo individual
            const url = URL.createObjectURL(download.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = download.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Revocar URL después de un momento
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 1000);
          });
        });
        
        // Botón descargar todas
        document.getElementById('download-all-btn')?.addEventListener('click', () => {
          // Descargar todas secuencialmente con un pequeño retardo entre cada una
          toast({
            title: "Descargando facturas",
            description: `Descargando ${downloads.length} facturas...`,
          });
          
          // Secuencia con delay para evitar problemas del navegador
          const downloadSequentially = async () => {
            for (let i = 0; i < downloads.length; i++) {
              const download = downloads[i];
              const url = URL.createObjectURL(download.blob);
              
              const a = document.createElement('a');
              a.href = url;
              a.download = download.fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              // Esperar un momento entre descargas
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Revocar URL
              URL.revokeObjectURL(url);
            }
            
            toast({
              title: "Descarga completada",
              description: `Se han descargado ${downloads.length} facturas.`,
            });
          };
          
          downloadSequentially();
        });
        
      } catch (error) {
        // En caso de error, eliminar modal de progreso si sigue existiendo
        const container = document.getElementById('export-progress-container');
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
        
        throw error; // Re-lanzar para el catch exterior
      }
    } catch (error: any) {
      console.error("Error al exportar facturas filtradas:", error);
      toast({
        title: "Error",
        description: `No se pudieron exportar las facturas: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  // Función para manejar "Marcar como pagada" en el menú móvil
  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      // Primero obtener los ítems actuales de la factura
      const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
      const invoiceData = await response.json();
      
      // Actualizar el estado de la factura a "paid"
      await apiRequest("PUT", `/api/invoices/${invoice.id}`, {
        invoice: { status: "paid" },
        items: invoiceData?.items || []
      });
      
      toast({
        title: "Factura marcada como pagada",
        description: `La factura ${invoice.invoiceNumber} ha sido marcada como pagada`,
      });
      
      // Redireccionar a la página de facturas
      setTimeout(() => {
        window.location.href = '/invoices';
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo marcar la factura como pagada: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Nº Factura",
      cell: ({ row }) => (
        <div className="font-medium text-primary-600 px-2 py-3">
          {row.getValue("invoiceNumber")}
        </div>
      ),
    },
    {
      accessorKey: "clientId",
      header: () => <span className="hidden md:inline px-2">Cliente</span>,
      cell: ({ row }) => (
        <div className="hidden md:table-cell px-2 py-3">
          {getClientName(row.getValue("clientId"))}
        </div>
      ),
    },
    {
      accessorKey: "issueDate",
      header: () => <span className="hidden sm:inline px-2">Fecha emisión</span>,
      cell: ({ row }) => (
        <div className="hidden sm:table-cell px-2 py-3">
          {formatDate(row.getValue("issueDate"))}
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: () => <span className="hidden lg:inline px-2">Vencimiento</span>,
      cell: ({ row }) => (
        <div className="hidden lg:table-cell px-2 py-3">
          {formatDate(row.getValue("dueDate"))}
        </div>
      ),
    },
    {
      accessorKey: "subtotal",
      header: () => <span className="hidden lg:inline px-2">Base</span>,
      cell: ({ row }) => (
        <div className="hidden lg:table-cell px-2 py-3">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            useGrouping: true
          }).format(Number(row.getValue("subtotal")))}
        </div>
      ),
    },
    {
      accessorKey: "tax",
      header: () => <span className="hidden xl:inline px-2">IVA</span>,
      cell: ({ row }) => (
        <div className="hidden xl:table-cell px-2 py-3">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            useGrouping: true
          }).format(Number(row.getValue("tax")))}
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <div className="font-medium px-2 py-3">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            useGrouping: true
          }).format(Number(row.getValue("total")))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <div className="px-2 py-3">
          <StatusBadge status={row.getValue("status")} />
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
        
        return (
          <>
            {/* Versión móvil: Botones esenciales */}
            <div className="flex justify-end md:hidden space-x-1">
              {/* Botón de enviar por email */}
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-600 hover:bg-blue-50"
                aria-label="Enviar por email"
                onClick={() => {
                  // Buscar el diálogo de email
                  const emailButton = document.querySelector(`[data-invoice-id="${invoice.id}"] button[aria-label="Enviar por email"]`);
                  if (emailButton) {
                    (emailButton as HTMLButtonElement).click();
                  }
                }}
              >
                <Mail className="h-4 w-4" />
              </Button>
              
              {/* Botón de descargar */}
              <Button
                variant="ghost"
                size="icon"
                className="text-green-600 hover:bg-green-50"
                onClick={() => handleExportInvoicePDF(invoice)}
              >
                <FileDown className="h-4 w-4" />
              </Button>
              
              {/* Botón de eliminar */}
              <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`¿Estás seguro de eliminar la factura ${invoice.invoiceNumber}?`)) {
                    apiRequest("DELETE", `/api/invoices/${invoice.id}`).then(() => {
                      toast({
                        title: "Factura eliminada",
                        description: `La factura ${invoice.invoiceNumber} ha sido eliminada con éxito`,
                      });
                      // Actualizar la lista
                      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Versión desktop: Botones individuales */}
            <div className="hidden md:flex justify-end space-x-1" data-invoice-id={invoice.id}>


              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar factura</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExportInvoicePDF(invoice)}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Exportar PDF</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Botón para marcar factura como pagada */}
              <MarkAsPaidButton invoice={invoice} />
              
              {/* Botón para enviar factura por email */}
              {clientsData?.find(c => c.id === invoice.clientId) && (
                <SendInvoiceEmailDialog 
                  invoice={invoice} 
                  client={clientsData?.find(c => c.id === invoice.clientId) as Client}
                  company={companyData || null}
                />
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DeleteInvoiceDialog
                        invoiceId={invoice.id}
                        invoiceNumber={invoice.invoiceNumber}
                        onConfirm={() => {
                          // Invalidar consultas después de eliminar
                          forceDataRefresh();
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Eliminar factura</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </>
        );
      },
    },
  ];

  if (invoicesLoading || clientsLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  const isMobile = window.innerWidth < 768;

  return (
    <div className="w-full fade-in">
      {/* Encabezado estilo Apple - SOLO VISIBLE EN ESCRITORIO */}
      {!isMobile && (
        <div className="hidden md:flex glass-panel overflow-hidden rounded-3xl bg-gradient-to-r from-[#007AFF]/10 to-[#007AFF]/5 p-4 justify-between items-center mx-2 mb-4 border border-[#007AFF]/20">
          <div className="flex items-center">
            <div className="bg-[#F0F7FF] p-2.5 rounded-full mr-3">
              <FileCheck className="h-4 w-4 text-[#007AFF]" />
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-0.5">Facturas emitidas</h3>
              <p className="text-sm text-gray-500">
                {invoicesData?.length || 0} facturas en total
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              className="button-apple-secondary button-apple-sm flex items-center"
              onClick={exportAllInvoices}
            >
              <Download className="h-4 w-4 mr-1.5" />
              <span>Exportar todo</span>
            </button>
            
            {/* Botón para exportar solo las facturas filtradas */}
            {filteredInvoices.length > 0 && filteredInvoices.length !== invoicesData?.length && (
              <button
                className="button-apple-secondary button-apple-sm flex items-center ml-1"
                onClick={handleExportFilteredInvoices}
                title={`Exportar ${filteredInvoices.length} facturas filtradas`}
              >
                <FileDown className="h-4 w-4 mr-1.5" />
                <span className="hidden lg:inline">Exportar filtradas</span>
                <span className="lg:hidden">Filtradas</span>
              </button>
            )}
            
            <button
              className="button-apple button-apple-sm flex items-center ml-1"
              onClick={() => navigate("/invoices/create")}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Nueva factura</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Botón de acción flotante (FAB) para crear facturas en móvil */}
      <div className="fixed bottom-6 right-6 z-10 md:hidden">
        <button
          className="w-14 h-14 rounded-full bg-[#007AFF] text-white shadow-lg flex items-center justify-center hover:bg-[#0071EB] active:bg-[#0068D6] transition-colors"
          onClick={() => navigate("/invoices/create")}
          aria-label="Nueva factura"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>

      {/* Panel de filtros - Botón integrado en la interfaz de DataTable */}
      <div className="mb-4 mx-2 hidden md:block">
        {isFilterVisible && (
          <Card className="p-4 mb-4 bg-gray-50/80 backdrop-blur-sm border border-gray-200/60">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Filtro por año */}
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Año
                  </label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un año" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los años</SelectItem>
                      {getAvailableYears().filter(year => year !== "all").map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por trimestre */}
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Trimestre
                  </label>
                  <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un trimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los trimestres</SelectItem>
                      <SelectItem value="q1">1º Trimestre (Ene-Mar)</SelectItem>
                      <SelectItem value="q2">2º Trimestre (Abr-Jun)</SelectItem>
                      <SelectItem value="q3">3º Trimestre (Jul-Sep)</SelectItem>
                      <SelectItem value="q4">4º Trimestre (Oct-Dic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por cliente */}
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    Cliente
                  </label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los clientes</SelectItem>
                      {clientsData.map(client => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por estado */}
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    Estado
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="paid">Pagada</SelectItem>
                      <SelectItem value="overdue">Vencida</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resumen de filtros aplicados */}
              <div className="mt-4 text-sm text-muted-foreground">
                Mostrando {filteredInvoices.length} de {invoicesData.length} facturas
                {yearFilter !== "all" && <span> del año <b>{yearFilter}</b></span>}
                {quarterFilter !== "all" && (
                  <span> del <b>
                    {quarterFilter === "q1" && "1º trimestre"}
                    {quarterFilter === "q2" && "2º trimestre"}
                    {quarterFilter === "q3" && "3º trimestre"}
                    {quarterFilter === "q4" && "4º trimestre"}
                  </b></span>
                )}
                {clientFilter !== "all" && (
                  <span> de <b>{getClientName(parseInt(clientFilter))}</b></span>
                )}
                {statusFilter !== "all" && (
                  <span> con estado <b>
                    {statusFilter === "pending" && "Pendiente"}
                    {statusFilter === "paid" && "Pagada"}
                    {statusFilter === "overdue" && "Vencida"}
                    {statusFilter === "canceled" && "Cancelada"}
                  </b></span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabla de facturas */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-gray-200/50 shadow-sm mx-2 scale-in">
        <div className="w-full">
          {/* Versión desktop: Barra de búsqueda y filtros */}
          <div className="hidden md:block">
            <SearchBar
              placeholder="Buscar facturas por número, cliente o fecha..."
              initialValue={searchQuery}
              onSearch={(value) => {
                console.log(`InvoiceList: SearchBar actualizó query a "${value}"`);
                setSearchQuery(value);
              }}
              filterButton={
                <Button 
                  variant="outline" 
                  className="flex items-center gap-1"
                  onClick={() => setIsFilterVisible(!isFilterVisible)}
                >
                  <Filter className="h-4 w-4" />
                  {isFilterVisible ? "Ocultar filtros" : "Mostrar filtros"}
                </Button>
              }
            />
          </div>
          
          {/* Versión móvil: Interfaz estilo iOS con botones de acción principales */}
          <div className="block md:hidden">
            {/* Barra de búsqueda estilo iOS */}
            <div className="px-4 pt-3 pb-2 bg-white">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full px-10 py-2 search-field-apple text-sm rounded-xl bg-gray-100/80 border-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                </div>
              </div>
            </div>
            
            {/* Filtros rápidos tipo segmentos de iOS */}
            <div className="px-4 mb-2 flex justify-center">
              <div className="w-full max-w-[320px] bg-gray-100 p-1 rounded-lg flex">
                <button 
                  onClick={() => setStatusFilter('all')} 
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'all' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-600'}`}
                >
                  Todas
                </button>
                <button 
                  onClick={() => setStatusFilter('paid')} 
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'paid' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-600'}`}
                >
                  Pagadas
                </button>
                <button 
                  onClick={() => setStatusFilter('pending')} 
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'pending' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-600'}`}
                >
                  Pendientes
                </button>
              </div>
            </div>
          </div>
          
          {/* Versión de escritorio: tabla normal */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={filteredInvoices}
              pagination={true}
              showSearch={false}
            />
          </div>
          
          {/* Versión móvil: Estilo lista iOS */}
          <div className="block md:hidden">
            <div className="px-4 pb-16">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="mb-3 flex justify-center">
                    <FileCheck className="h-12 w-12 text-gray-300" />
                  </div>
                  <p className="text-sm">No se encontraron facturas</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredInvoices.map((invoice) => {
                    const client = clientsData?.find((c) => c.id === invoice.clientId);
                    const statusColors = {
                      paid: "bg-green-50 text-green-700 border-green-200",
                      pending: "bg-blue-50 text-blue-700 border-blue-200",
                      overdue: "bg-red-50 text-red-700 border-red-200",
                      canceled: "bg-gray-50 text-gray-700 border-gray-200",
                    };
                    const statusColorClass = statusColors[invoice.status];
                    
                    return (
                      <li key={invoice.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200/80">
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-800">#{invoice.invoiceNumber}</h3>
                            <span className={`text-xs px-2 py-1 rounded-md ${statusColorClass}`}>
                              {invoice.status === "paid" && "Pagada"}
                              {invoice.status === "pending" && "Pendiente"}
                              {invoice.status === "overdue" && "Vencida"}
                              {invoice.status === "canceled" && "Cancelada"}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-1">
                            {client?.name || "Cliente desconocido"}
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <div className="text-xs text-gray-500">
                              {new Date(invoice.issueDate).toLocaleDateString("es-ES")}
                            </div>
                            <div className="font-semibold text-gray-900">
                              {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(invoice.total)}
                            </div>
                          </div>
                          
                          {/* Acciones rápidas */}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleExportInvoicePDF(invoice)}
                                className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-blue-600 transition-colors"
                                aria-label="Descargar"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              
                              {/* Botón para enviar por email en móvil */}
                              <SendInvoiceEmailDialog
                                invoice={invoice}
                                client={client}
                                company={companyData}
                                trigger={
                                  <button
                                    className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-blue-600 transition-colors"
                                    aria-label="Enviar por email"
                                  >
                                    <Mail className="h-4 w-4" />
                                  </button>
                                }
                              />
                              
                              {/* Botón para eliminar factura */}
                              <DeleteInvoiceDialog
                                invoiceId={invoice.id}
                                invoiceNumber={invoice.invoiceNumber}
                                onConfirm={() => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] })}
                              />
                            </div>
                            
                            <button
                              onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                              className="text-xs py-1.5 px-3 rounded-lg bg-[#007AFF] text-white font-medium"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;