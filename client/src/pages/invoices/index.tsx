import { useQuery } from "@tanstack/react-query";
import InvoiceList from "@/components/invoices/InvoiceList";
import { Loader2, Receipt, ArrowUpRight, FileCheck, Calendar, AlertTriangle } from "lucide-react";
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
    <div className="w-full px-4 space-y-6">
      {/* Header con gradiente y animación */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-8 px-6 md:px-10 mb-6 shadow-lg">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center">
            <Receipt className="h-6 w-6 mr-2" />
            Gestión de Facturas
          </h1>
          <p className="text-blue-100 max-w-2xl">
            Crea, edita y gestiona todas tus facturas profesionales, con datos fiscales actualizados y exportación a PDF.
          </p>
          <div className="mt-4 flex space-x-3">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white text-blue-600 hover:bg-blue-50 border-none"
              onClick={() => navigate("/invoices/create")}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Nueva factura
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-transparent text-white border-white hover:bg-blue-700"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Ver Dashboard
            </Button>
          </div>
        </div>
        
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -m-32"></div>
        <div className="absolute bottom-0 left-10 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20 -m-20"></div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
