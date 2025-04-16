import { useQuery } from "@tanstack/react-query";
import InvoiceList from "@/components/invoices/InvoiceList";
import { Loader2, Receipt, FileCheck, Calendar, AlertTriangle, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { DashboardStats } from "@/types/dashboard";

const InvoicesPage = () => {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [yearFilter, setYearFilter] = useState("all");
  
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  // Consulta para obtener estadísticas basadas en el año seleccionado
  const { 
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery<DashboardStats>({
    queryKey: ['/api/stats/dashboard', yearFilter],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/stats/dashboard?year=${yearFilter}&period=all`);
        if (response.status === 401) {
          console.log("Usuario no autenticado, redirigiendo a login");
          // Podríamos redirigir aquí con navigate('/login') si fuera necesario
          return {
            income: 0,
            expenses: 0,
            pendingInvoices: 0,
            pendingCount: 0,
            pendingQuotes: 0,
            pendingQuotesCount: 0,
            yearCount: 0,
            yearIncome: 0,
            quarterCount: 0,
            quarterIncome: 0,
            issuedCount: 0,
            taxes: {
              vat: 0,
              incomeTax: 0,
              ivaALiquidar: 0
            }
          } as DashboardStats;
        }
        
        if (!response.ok) {
          throw new Error('Error fetching dashboard data');
        }
        
        return response.json();
      } catch (error) {
        console.error("Error obteniendo estadísticas:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true
  });
  
  // Manejar cambio de año desde InvoiceList
  const handleYearFilterChange = (year: string) => {
    setYearFilter(year);
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

  // Valores para mostrar en las tarjetas
  const currentYear = new Date().getFullYear().toString();
  const isCurrentYearSelected = yearFilter === currentYear || yearFilter === "all";

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
                {statsLoading ? "..." : (stats?.issuedCount || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {statsLoading ? "..." : formatCurrency(stats?.income || 0)}
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
                  Este Año {yearFilter === "all" && <span>({currentYear})</span>}
                  {yearFilter !== "all" && <span>({yearFilter})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#34C759] pt-1">
                {statsLoading ? "..." : (
                  yearFilter === "all" ? stats?.yearCount || 0 : stats?.issuedCount || 0
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {statsLoading ? "..." : formatCurrency(
                  yearFilter === "all" ? stats?.yearIncome || 0 : stats?.income || 0
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
                  Este Trimestre {yearFilter !== "all" && <span>({yearFilter})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF9500] pt-1">
                {statsLoading ? "..." : (
                  yearFilter === "all" ? stats?.quarterCount || 0 : 
                  (stats?.quarterCount && isCurrentYearSelected ? stats.quarterCount : 0)
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {statsLoading ? "..." : formatCurrency(
                  yearFilter === "all" ? stats?.quarterIncome || 0 : 
                  (stats?.quarterIncome && isCurrentYearSelected ? stats.quarterIncome : 0)
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
                  Pendientes de Cobro {yearFilter !== "all" && <span>({yearFilter})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF3B30] pt-1">
                {statsLoading ? "..." : (stats?.pendingCount || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {statsLoading ? "..." : formatCurrency(stats?.pendingInvoices || 0)}
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
