import { useQuery } from "@tanstack/react-query";
import InvoiceList from "@/components/invoices/InvoiceList";
import { Loader2, Receipt, FileCheck, Calendar, AlertTriangle, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState, useMemo } from "react";

// Definimos las interfaces que necesitamos
interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}

const InvoicesPage = () => {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [yearFilter, setYearFilter] = useState("all");
  
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  // Consulta para obtener todas las facturas
  const { 
    data: invoices = [],
    isLoading: invoicesLoading
  } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    staleTime: 1000 * 60 * 5 // 5 minutos
  });
  
  // Manejar cambio de año desde InvoiceList
  const handleYearFilterChange = (year: string) => {
    setYearFilter(year);
  };

  // Formatear valores monetarios en euros
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value || 0);
  };

  // Obtener los años únicos de las facturas
  const availableYears = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    
    const yearsSet = new Set<string>();
    invoices.forEach(invoice => {
      const date = new Date(invoice.issueDate);
      yearsSet.add(date.getFullYear().toString());
    });
    
    return Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
  }, [invoices]);

  // Filtrar facturas por año
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    if (yearFilter === "all") {
      return invoices;
    }
    
    return invoices.filter(invoice => {
      const date = new Date(invoice.issueDate);
      return date.getFullYear().toString() === yearFilter;
    });
  }, [invoices, yearFilter]);
  
  // Calcular estadísticas para las tarjetas
  const stats = useMemo(() => {
    const total = filteredInvoices.length;
    const pending = filteredInvoices.filter(i => i.status === 'pending').length;
    const pendingValue = filteredInvoices
      .filter(i => i.status === 'pending')
      .reduce((sum, i) => sum + i.total, 0);
    const totalValue = filteredInvoices.reduce((sum, i) => sum + i.total, 0);
    
    // Factura del trimestre actual (si estamos en yearFilter = 'all' o en el año actual)
    const currentYear = new Date().getFullYear().toString();
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
    
    // Si yearFilter no es "all" y no es el año actual, no mostramos facturas del trimestre
    const isCurrentYearSelected = yearFilter === "all" || yearFilter === currentYear;
    
    // Filtrar facturas del trimestre actual del año actual
    const quarterInvoices = isCurrentYearSelected ? filteredInvoices.filter(invoice => {
      const date = new Date(invoice.issueDate);
      const invoiceYear = date.getFullYear().toString();
      const invoiceQuarter = Math.floor(date.getMonth() / 3) + 1;
      
      return (yearFilter === "all" || invoiceYear === yearFilter) && 
             invoiceQuarter === currentQuarter &&
             invoiceYear === currentYear;
    }) : [];
    
    const quarterCount = quarterInvoices.length;
    const quarterValue = quarterInvoices.reduce((sum, i) => sum + i.total, 0);
    
    return {
      totalCount: total,
      totalValue: totalValue,
      pendingCount: pending,
      pendingValue: pendingValue,
      quarterCount: quarterCount,
      quarterValue: quarterValue,
      availableYears: availableYears
    };
  }, [filteredInvoices, yearFilter, availableYears]);

  if (authLoading || invoicesLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Valores para mostrar en las tarjetas
  const currentYear = new Date().getFullYear().toString();
  const yearsText = stats.availableYears.length > 0 ? 
    stats.availableYears.join("-") : 
    currentYear;

  return (
    <div className="w-full pl-0 pr-2 md:px-2 space-y-0 sm:space-y-6 mt-0 sm:mt-2 max-w-full">
      {/* El encabezado solo se muestra en desktop, NUNCA en móvil */}
      {!isMobile && (
        <div className="hidden md:block section-header mx-2 fade-in">
          <div className="flex items-center">
            <div className="bg-[#E9F8FB] p-3 rounded-full mr-3 self-start mt-1 ml-10 md:ml-12">
              <Receipt className="h-5 w-5 text-[#007AFF]" />
            </div>
            <div className="flex-grow my-auto">
              <h2 className="text-xl font-semibold text-gray-800 tracking-tight leading-none mb-0.5 mt-2">Gestión de Facturas</h2>
              <p className="text-sm text-gray-500 mt-0 leading-tight">Administra y controla tus documentos fiscales</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tarjetas de resumen estilo Apple - Solo visibles en desktop */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 mx-2">
        {/* Tarjeta 1: Facturas Emitidas */}
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#F0F7FF] p-2.5 rounded-full mr-3">
                <FileCheck className="h-4 w-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Facturas Emitidas {yearFilter !== "all" && <span>({yearFilter})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#007AFF] pt-1">
                {stats.totalCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {formatCurrency(stats.totalValue)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tarjeta 2: Este Año */}
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#F5FFF7] p-2.5 rounded-full mr-3">
                <CalendarDays className="h-4 w-4 text-[#34C759]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Años {stats.availableYears.length > 0 && <span>({yearsText})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#34C759] pt-1">
                {stats.availableYears.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total años con facturas
              </div>
            </div>
          </div>
        </div>
        
        {/* Tarjeta 3: Este Trimestre */}
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#FFF9F5] p-2.5 rounded-full mr-3">
                <Calendar className="h-4 w-4 text-[#FF9500]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Este Trimestre {yearFilter !== "all" && <span>({yearFilter})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF9500] pt-1">
                {stats.quarterCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {formatCurrency(stats.quarterValue)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tarjeta 4: Pendientes de Cobro */}
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#FEECEB] p-2.5 rounded-full mr-3">
                <AlertTriangle className="h-4 w-4 text-[#FF3B30]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Pendientes de Cobro {yearFilter !== "all" && <span>({yearFilter})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF3B30] pt-1">
                {stats.pendingCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {formatCurrency(stats.pendingValue)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de facturas */}
      <InvoiceList onYearFilterChange={handleYearFilterChange} />
    </div>
  );
};

export default InvoicesPage;
