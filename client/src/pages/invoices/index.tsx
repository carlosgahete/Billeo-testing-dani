import { useQuery } from "@tanstack/react-query";
import InvoiceList from "@/components/invoices/InvoiceList";
import { Loader2, Receipt, ArrowUpRight, FileCheck, Calendar, AlertTriangle, CalendarDays, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const InvoicesPage = () => {
  const [, navigate] = useLocation();
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="w-full pl-0 pr-2 md:px-2 space-y-6 mt-2 max-w-full">
      {/* Cabecera estilo Apple - Solo visible en desktop */}
      <div className="hidden sm:block section-header mx-2 fade-in">
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
      
      {/* Cabecera simple para móvil */}
      <div className="sm:hidden px-4 py-3 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Facturas</h2>
      </div>
      
      {/* Tarjetas de resumen estilo Apple - Solo visibles en desktop */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 mx-2">
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#F0F7FF] p-2.5 rounded-full mr-3">
                <FileCheck className="h-4 w-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Facturas Emitidas</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#007AFF] pt-1">
                {stats?.issuedCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.income || 0)}
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
                <p className="text-sm text-gray-600">Este Año ({new Date().getFullYear()})</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#34C759] pt-1">
                {stats?.yearCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.yearIncome || 0)}
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
                <p className="text-sm text-gray-600">Este Trimestre</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF9500] pt-1">
                {stats?.quarterCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.quarterIncome || 0)}
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
                <p className="text-sm text-gray-600">Pendientes de Cobro</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF3B30] pt-1">
                {stats?.pendingCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.pendingInvoices || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de facturas */}
      <InvoiceList />
    </div>
  );
};

export default InvoicesPage;
