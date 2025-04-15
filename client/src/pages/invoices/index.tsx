import { useQuery } from "@tanstack/react-query";
import InvoiceList from "@/components/invoices/InvoiceList";
import { Loader2, Receipt, ArrowUpRight, FileCheck, Calendar, AlertTriangle, CalendarDays, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";

// Interfaz para las estadísticas del dashboard
interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  issuedCount: number;
  yearCount: number;
  yearIncome: number;
  quarterCount: number;
  quarterIncome: number;
  [key: string]: any;
}

const InvoicesPage = () => {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });
  
  // Para filtrar estadísticas por año
  const filteredStats = stats ? 
    (selectedYear === "all" ? stats : {
      ...stats,
      issuedCount: stats.yearCount, // Si se filtra por año, usar datos del año
      income: stats.yearIncome
    }) : 
    {} as DashboardStats;
    
  // Manejar cambio de año desde InvoiceList
  const handleYearFilterChange = (year: string) => {
    setSelectedYear(year);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

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
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#F0F7FF] p-2.5 rounded-full mr-3">
                <FileCheck className="h-4 w-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Facturas Emitidas {selectedYear !== "all" && <span>({selectedYear})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#007AFF] pt-1">
                {filteredStats?.issuedCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(filteredStats?.income || 0)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#F5FFF7] p-2.5 rounded-full mr-3">
                <CalendarDays className="h-4 w-4 text-[#34C759]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Este Año {selectedYear === "all" && <span>({new Date().getFullYear()})</span>}
                  {selectedYear !== "all" && <span>({selectedYear})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#34C759] pt-1">
                {selectedYear === "all" ? stats?.yearCount || 0 : filteredStats?.issuedCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                  selectedYear === "all" ? stats?.yearIncome || 0 : filteredStats?.income || 0
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#FFF9F5] p-2.5 rounded-full mr-3">
                <Calendar className="h-4 w-4 text-[#FF9500]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Este Trimestre {selectedYear !== "all" && <span>({selectedYear})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF9500] pt-1">
                {selectedYear === "all" ? stats?.quarterCount || 0 : 
                 stats?.quarterCount && selectedYear === new Date().getFullYear().toString() ? 
                 stats.quarterCount : 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                  selectedYear === "all" ? stats?.quarterIncome || 0 : 
                  stats?.quarterIncome && selectedYear === new Date().getFullYear().toString() ? 
                  stats.quarterIncome : 0
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#FEECEB] p-2.5 rounded-full mr-3">
                <AlertTriangle className="h-4 w-4 text-[#FF3B30]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Pendientes de Cobro {selectedYear !== "all" && <span>({selectedYear})</span>}
                </p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF3B30] pt-1">
                {filteredStats?.pendingCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(filteredStats?.pendingInvoices || 0)}
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
