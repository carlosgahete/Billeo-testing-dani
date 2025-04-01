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
      
      // Verificar que los datos tienen la estructura esperada
      if (!data.invoice || !data.items || !Array.isArray(data.items)) {
        console.error("⚠️ Datos de factura con formato inválido:", data);
        setLoadError("Los datos de la factura no tienen el formato esperado");
        return;
      }
      
      // Almacenar los datos procesados para pasarlos al formulario
      setInvoiceData(data);
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