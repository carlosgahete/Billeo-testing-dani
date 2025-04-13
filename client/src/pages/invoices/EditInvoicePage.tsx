import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Receipt, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import MobileInvoiceForm from "@/components/invoices/MobileInvoiceForm";

// Página específica para editar facturas con manejo de errores mejorado
export default function EditInvoicePage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Estado para almacenar los datos cargados de la factura
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Convertir el ID a número
  const invoiceId = parseInt(id as string);
  
  // Detectar si es móvil al montar el componente y actualizar al cambiar el tamaño de la ventana
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Comprobar al cargar
    checkIfMobile();
    
    // Añadir listener para cambios de tamaño
    window.addEventListener('resize', checkIfMobile);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // Definir la interfaz para los datos de la factura
  interface InvoiceData {
    invoice?: any;
    items?: any[];
    [key: string]: any; // Permitir acceso con índices de tipo string
  }
  
  // Consulta para obtener los datos de la factura
  const { data, isLoading, isError, error } = useQuery<InvoiceData>({
    queryKey: ["/api/invoices", invoiceId],
    refetchOnWindowFocus: false, // No recargar al volver a enfocar la ventana
    staleTime: 0, // No usar caché
    retry: 3, // Intentar hasta 3 veces
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
    // Consulta simplificada para obtener la factura completa con sus items
    queryFn: async () => {
      try {
        // Obtener factura completa con sus items (respuesta estructurada como {invoice, items})
        const response = await fetch(`/api/invoices/${invoiceId}`);
        
        if (!response.ok) {
          throw new Error(`Error al obtener factura: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("🔍 Respuesta API:", data);
        
        // Verificar que tenemos la estructura esperada
        if (!data || !data.invoice) {
          throw new Error("Formato de respuesta incorrecto del servidor");
        }
        
        // Asegurarnos de que items sea un array, incluso si está vacío
        if (!data.items) {
          data.items = [];
        }
        
        return data;
      } catch (err) {
        console.error("❌ Error al obtener datos de la factura:", err);
        throw new Error("No se pudieron obtener los datos de la factura. Por favor, intenta de nuevo.");
      }
    }
  });
  
  // Efecto simplificado para procesar los datos una vez se cargan
  useEffect(() => {
    if (isError) {
      console.error("Error al cargar datos de factura:", error);
      setLoadError("No se pudieron cargar los datos de la factura");
      return;
    }
    
    if (!isLoading && data) {
      try {
        if (!data.invoice || !data.items) {
          throw new Error("El formato de los datos recibidos no es válido");
        }
        
        console.log("✅ Datos de factura cargados:", {
          invoiceId: data.invoice.id,
          invoiceNumber: data.invoice.invoiceNumber,
          itemsCount: data.items.length,
          firstItem: data.items[0] ? `${data.items[0].description} (${data.items[0].quantity}x€${data.items[0].unitPrice})` : 'N/A'
        });
        
        // Usar datos directamente - ya están en el formato correcto { invoice, items }
        setInvoiceData(data);
        
      } catch (error: any) {
        console.error("❌ Error al procesar datos:", error.message);
        setLoadError(error.message || "Error al procesar los datos");
      }
    }
  }, [data, isLoading, isError, error]);
  
  // Mostrar una pantalla de carga mientras se obtienen los datos
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
          <p className="text-muted-foreground">Cargando datos de la factura...</p>
        </div>
      </div>
    );
  }
  
  // Mostrar un mensaje si ocurrió un error al cargar los datos
  if (loadError) {
    toast({
      title: "Error al cargar factura",
      description: loadError,
      variant: "destructive",
    });
    
    // Si hay un error, mostramos un componente de error en lugar de redirigir
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Button onClick={() => navigate("/invoices")}>
            Volver a facturas
          </Button>
        </div>
      </div>
    );
  }
  
  // Renderizar el formulario con los datos cargados
  return (
    <div className={`max-w-full ${isMobile ? 'p-2 pt-1' : ''}`}>
      {/* Cabecera para escritorio - cabecera bonita con gradiente */}
      {!isMobile && (
        <div className="w-full bg-gradient-to-r from-blue-600 to-blue-400 py-4 px-5 flex items-center mb-6 shadow-md rounded-lg mx-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/invoices")}
            className="border-white bg-transparent hover:bg-blue-500 text-white hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Volver</span>
          </Button>
          <div className="ml-4 flex-1">
            <h1 className="text-xl font-bold text-white flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Editar factura
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Modifica los detalles de la factura {invoiceData?.invoice?.invoiceNumber || ""}
            </p>
          </div>
        </div>
      )}
      
      {/* Botón de volver para móvil sin título - estilo iOS textual */}
      {isMobile && (
        <div className="mt-1 mb-3 ml-2">
          <button onClick={() => navigate("/invoices")} className="apple-back-button">
            <ChevronLeft />
            <span>Volver</span>
          </button>
        </div>
      )}
      
      {/* Renderiza el formulario adecuado según el dispositivo */}
      {invoiceData && (
        isMobile ? (
          <MobileInvoiceForm 
            invoiceId={invoiceId} 
            initialData={invoiceData} 
          />
        ) : (
          <InvoiceForm 
            invoiceId={invoiceId} 
            initialData={invoiceData} 
          />
        )
      )}
    </div>
  );
}