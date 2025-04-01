import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InvoiceForm from "@/components/invoices/InvoiceForm";

// Página específica para editar facturas con manejo de errores mejorado
export default function EditInvoicePage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Estado para almacenar los datos cargados de la factura
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Convertir el ID a número
  const invoiceId = parseInt(id as string);
  
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
    // Aquí intentamos obtener directamente la factura si el primer intento falla
    queryFn: async () => {
      try {
        // Intentar obtener los datos con el formato estándar
        const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
        const invoiceData = await invoiceResponse.json();
        console.log("🔍 Respuesta API (formato 1):", invoiceData);
        
        if (invoiceData && typeof invoiceData === 'object') {
          return invoiceData;
        }
        
        // Si falla, intentar obtener la factura y los items por separado
        console.log("⚠️ Formato 1 falló, intentando formato alternativo");
        const invoiceBasicResponse = await fetch(`/api/invoices/${invoiceId}?basic=true`);
        const invoiceBasic = await invoiceBasicResponse.json();
        
        const invoiceItemsResponse = await fetch(`/api/invoices/${invoiceId}/items`);
        const invoiceItems = await invoiceItemsResponse.json();
        
        console.log("🔍 Respuesta API (formato 2):", { invoice: invoiceBasic, items: invoiceItems });
        return { invoice: invoiceBasic, items: invoiceItems };
      } catch (err) {
        console.error("❌ Error al obtener datos de la factura:", err);
        throw new Error("No se pudieron obtener los datos de la factura. Por favor, intenta de nuevo.");
      }
    }
  });
  
  // Efecto para procesar los datos una vez se cargan (versión simplificada)
  useEffect(() => {
    if (isError) {
      console.error("Error al cargar datos de factura:", error);
      setLoadError("No se pudieron cargar los datos de la factura");
      return;
    }
    
    if (!isLoading && data) {
      console.log("⚡ Datos de factura cargados:", data);
      console.log("⚡ Tipo de datos:", typeof data);
      console.log("⚡ Es array?", Array.isArray(data));
      console.log("⚡ Keys del objeto:", data ? Object.keys(data) : []);
      
      try {
        // Procesamiento simplificado para evitar errores de TypeScript
        let formattedData: any = null;
        
        // Caso 1: El formato ya es el esperado { invoice: {...}, items: [...] }
        if (data && data.invoice && ('items' in data)) {
          formattedData = { 
            invoice: data.invoice,
            items: Array.isArray(data.items) ? data.items : []
          };
          console.log("✅ Formato 1: Datos ya tienen formato esperado");
        }
        // Caso 2: Es un objeto pero no tiene la estructura esperada
        else if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Buscar si hay alguna propiedad que sea un array (posibles items)
          let itemsProperty = '';
          let itemsArray: any[] = [];
          const invoiceData = { ...data };
          
          // Buscar una propiedad que sea un array para usarla como items
          Object.keys(data).forEach(key => {
            if (Array.isArray(data[key as keyof typeof data])) {
              itemsProperty = key;
              // Usar type assertion para acceder con seguridad
              itemsArray = data[key as keyof typeof data] as any[];
            }
          });
          
          // Si encontramos una propiedad que contenga un array, asumimos que son los items
          if (itemsProperty && itemsArray.length > 0) {
            // Eliminar la propiedad de items del objeto principal
            delete (invoiceData as any)[itemsProperty];
            
            formattedData = {
              invoice: invoiceData,
              items: itemsArray
            };
            console.log("✅ Formato 2: Datos adaptados de objeto con array de items");
          } else {
            // No hay array, tratamos todo como la factura y creamos items vacíos
            formattedData = {
              invoice: data,
              items: []
            };
            console.log("⚠️ Formato 3: No se encontraron items, usando datos planos");
          }
        }
        // Caso 3: Los datos son un array
        else if (Array.isArray(data)) {
          if (data.length > 0) {
            formattedData = {
              invoice: data[0],
              items: data.slice(1)
            };
            console.log("✅ Formato 4: Datos adaptados de array");
          } else {
            throw new Error("Los datos recibidos son un array vacío");
          }
        }
        // Caso 4: Formato desconocido
        else {
          throw new Error("Formato de datos desconocido");
        }
        
        // Validación final
        if (!formattedData || !formattedData.invoice) {
          throw new Error("No se pudo extraer la información de la factura");
        }
        
        // Asegurar que items siempre sea un array
        if (!formattedData.items || !Array.isArray(formattedData.items)) {
          formattedData.items = [];
          console.warn("⚠️ No se encontraron items, se usará un array vacío");
        }
        
        console.log("✅ Datos formateados finales:", formattedData);
        setInvoiceData(formattedData);
        
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
    return (
      <div className="max-w-full">
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
              Error al cargar factura
            </h1>
          </div>
        </div>
        
        <div className="p-6 max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Error al cargar datos
          </h2>
          <p className="text-red-600 mb-4">
            {loadError}
          </p>
          <Button onClick={() => navigate("/invoices")}>
            Volver a facturas
          </Button>
        </div>
      </div>
    );
  }
  
  // Renderizar el formulario con los datos cargados
  return (
    <div className="max-w-full">
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
      
      {invoiceData && (
        <InvoiceForm 
          invoiceId={invoiceId} 
          initialData={invoiceData} 
        />
      )}
    </div>
  );
}