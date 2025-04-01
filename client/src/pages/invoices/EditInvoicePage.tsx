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
  }
  
  // Consulta para obtener los datos de la factura
  const { data, isLoading, isError, error } = useQuery<InvoiceData>({
    queryKey: ["/api/invoices", invoiceId],
    refetchOnWindowFocus: false, // No recargar al volver a enfocar la ventana
    staleTime: 0, // No usar caché
  });
  
  // Efecto para procesar los datos una vez se cargan
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
      
      // Obtener todas las keys del objeto data para saber qué contiene
      console.log("⚡ Keys del objeto:", Object.keys(data));
      
      // Intentar adaptar diferentes formatos posibles
      let formattedData;
      
      if (data.invoice && data.items) {
        // Formato esperado: { invoice: {...}, items: [...] }
        formattedData = data;
        console.log("✅ Formato 1: Datos ya tienen formato esperado");
      }
      else if (!data.invoice && !data.items && typeof data === 'object') {
        // Es posible que el invoice sea el objeto principal y que los items estén en otra propiedad
        // Primero buscamos si hay una propiedad que contenga un array
        let itemsProperty = null;
        let invoiceData = { ...data };
        
        for (const key in data) {
          if (Array.isArray(data[key])) {
            itemsProperty = key;
            break;
          }
        }
        
        // Si encontramos una propiedad que sea un array, asumimos que son los items
        if (itemsProperty) {
          const items = data[itemsProperty];
          delete invoiceData[itemsProperty]; // Eliminar la propiedad de items
          
          formattedData = {
            invoice: invoiceData,
            items: items
          };
          console.log("✅ Formato 2: Datos adaptados de objeto con array de items");
        } else {
          // Tratar todo el objeto como la factura y crear items vacíos
          formattedData = {
            invoice: data,
            items: []
          };
          console.log("⚠️ Formato 3: No se encontraron items, usando datos planos");
        }
      }
      else if (Array.isArray(data)) {
        // Si lo que recibimos es un array, el primer elemento podría ser la factura
        // y el resto podrían ser los items
        if (data.length > 0) {
          formattedData = {
            invoice: data[0],
            items: data.slice(1)
          };
          console.log("✅ Formato 4: Datos adaptados de array");
        } else {
          setLoadError("Los datos recibidos son un array vacío");
          return;
        }
      }
      else {
        console.error("⚠️ Formato de datos desconocido:", data);
        setLoadError("Los datos recibidos tienen un formato desconocido");
        return;
      }
      
      // Validar que tengamos lo mínimo necesario
      if (!formattedData.invoice) {
        console.error("⚠️ No se pudo extraer la información de la factura");
        setLoadError("No se pudo extraer la información de la factura");
        return;
      }
      
      // Si no hay items, creamos un array vacío
      if (!formattedData.items || !Array.isArray(formattedData.items)) {
        formattedData.items = [];
        console.warn("⚠️ No se encontraron items, se usará un array vacío");
      }
      
      console.log("✅ Datos formateados finales:", formattedData);
      setInvoiceData(formattedData);
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