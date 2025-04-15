import { useQuery } from "@tanstack/react-query";
import InvoiceList from "@/components/invoices/InvoiceList";
import { Loader2, Receipt, FileCheck, Calendar, AlertTriangle, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardStats } from "@/types/dashboard";

const InvoicesPage = () => {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  // Usar el hook personalizado para obtener los datos del dashboard
  const { 
    data: stats, 
    isLoading: statsLoading,
    filters
  } = useDashboardData();
  
  // Manejar cambio de año desde InvoiceList
  const handleYearFilterChange = (year: string) => {
    filters.changeYear(year);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Formatear valores monetarios en euros
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value || 0);
  };

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
                  Facturas Emitidas {filters?.year !== "all" && <span>({filters?.year})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#007AFF] pt-1">
                {stats?.issuedCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {formatCurrency(stats?.income || 0)}
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
                  Este Año {filters?.year === "all" && <span>({new Date().getFullYear()})</span>}
                  {filters?.year !== "all" && <span>({filters?.year})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#34C759] pt-1">
                {filters?.year === "all" ? stats?.yearCount || 0 : stats?.issuedCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {formatCurrency(
                  filters?.year === "all" ? stats?.yearIncome || 0 : stats?.income || 0
                )}
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
                  Este Trimestre {filters?.year !== "all" && <span>({filters?.year})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF9500] pt-1">
                {filters?.year === "all" ? stats?.quarterCount || 0 : 
                 (stats?.quarterCount && filters?.year === new Date().getFullYear().toString() ? 
                 stats.quarterCount : 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {formatCurrency(
                  filters?.year === "all" ? stats?.quarterIncome || 0 : 
                  (stats?.quarterIncome && filters?.year === new Date().getFullYear().toString() ? 
                  stats.quarterIncome : 0)
                )}
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
                  Pendientes de Cobro {filters?.year !== "all" && <span>({filters?.year})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF3B30] pt-1">
                {stats?.pendingCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {formatCurrency(stats?.pendingInvoices || 0)}
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
