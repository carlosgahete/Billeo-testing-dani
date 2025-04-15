import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Receipt, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import MobileInvoiceForm from "@/components/invoices/MobileInvoiceForm";

const CreateInvoicePage = () => {
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  const [, navigate] = useLocation();
  const [isMobile, setIsMobile] = useState(false);

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

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className={`max-w-full ${isMobile ? 'p-2 pt-1' : 'p-4 md:p-6'}`}>
      {/* Cabecera estilo Apple - solo visible en escritorio */}
      <div className={`w-full flex items-center justify-between mb-6 ${isMobile ? 'hidden' : ''}`}>
        <div className="flex items-center">
          <button 
            onClick={() => navigate("/invoices")}
            className="button-apple-secondary button-apple-sm mr-3 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center">
              <Receipt className="h-5 w-5 mr-2 text-blue-500" />
              {authLoading ? "Cargando..." : "Crear nueva factura"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Completa los detalles para generar un documento profesional
            </p>
          </div>
        </div>
      </div>
      
      {/* Botón de volver para móvil sin título */}
      {isMobile && (
        <>
          <div className="mt-1 mb-1 ml-2">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigate("/invoices"); }} 
              className="text-blue-500 no-underline"
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <ChevronLeft size={16} style={{ marginRight: 1 }} />
              Volver
            </a>
          </div>
          <div className="px-4 py-2">
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <Receipt className="h-5 w-5 mr-2 text-blue-500" />
              Crear nueva factura
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Completa los detalles para generar un documento profesional
            </p>
          </div>
        </>
      )}
      
      {/* Renderiza el formulario adecuado según el dispositivo */}
      {isMobile ? <MobileInvoiceForm /> : <InvoiceForm />}
    </div>
  );
};

export default CreateInvoicePage;
