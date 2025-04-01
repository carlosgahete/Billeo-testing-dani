import { useQuery } from "@tanstack/react-query";
import InvoiceList from "@/components/invoices/InvoiceList";
import { Loader2, Receipt, ArrowUpRight, FileCheck, Calendar, AlertTriangle, CalendarDays } from "lucide-react";
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
    <div className="w-full pl-0 pr-4 md:px-4 md:pl-14 space-y-6 mt-2">
      {/* Título de la página */}
      <div className="flex items-center mx-4 md:ml-0 mb-4">
        <Receipt className="h-5 w-5 mr-2 text-blue-600" />
        <h1 className="text-xl font-medium text-gray-800">Gestión de Facturas</h1>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 mx-4 md:ml-0">
        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-start">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Facturas Emitidas</p>
              <h3 className="text-2xl font-bold text-neutral-800">{stats?.issuedCount || 0}</h3>
              <p className="text-xs text-neutral-500 mt-1">Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.income || 0)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-start">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
              <CalendarDays className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Este Año ({new Date().getFullYear()})</p>
              <h3 className="text-2xl font-bold text-neutral-800">{stats?.yearCount || 0}</h3>
              <p className="text-xs text-neutral-500 mt-1">Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.yearIncome || 0)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-amber-100 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-start">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center mr-4">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Este Trimestre</p>
              <h3 className="text-2xl font-bold text-neutral-800">{stats?.quarterCount || 0}</h3>
              <p className="text-xs text-neutral-500 mt-1">Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.quarterIncome || 0)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-warning-100 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-start">
            <div className="h-10 w-10 rounded-full bg-warning-100 flex items-center justify-center mr-4">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Pendientes de Cobro</p>
              <h3 className="text-2xl font-bold text-neutral-800">{stats?.pendingCount || 0}</h3>
              <p className="text-xs text-neutral-500 mt-1">Valor: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.pendingInvoices || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Lista de facturas */}
      <InvoiceList />
    </div>
  );
};

export default InvoicesPage;
