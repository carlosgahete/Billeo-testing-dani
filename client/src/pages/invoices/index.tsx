import { useQuery } from "@tanstack/react-query";
import InvoiceList from "@/components/invoices/InvoiceList";
import { 
  Loader2, 
  Receipt, 
  FileCheck, 
  Calendar, 
  AlertTriangle, 
  CalendarDays, 
  Plus, 
  ArrowUpRight,
  ReceiptText
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

// Definimos la interfaz para los datos de estadísticas
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
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats = {} as DashboardStats } = useQuery<DashboardStats>({
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
    <div className="w-full p-6 bg-gray-50">
      {/* Cabecera del dashboard con título y controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center mb-3 md:mb-0">
          <div className="bg-[#04C4D9] p-2 rounded-full mr-3">
            <ReceiptText className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Facturas</h2>
        </div>
        
        <div className="flex items-center">
          <Button 
            onClick={() => navigate("/invoices/new")}
            className="h-9 bg-[#04C4D9] hover:bg-[#03b3c7] text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Nueva Factura
          </Button>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Facturas Emitidas */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Facturas Emitidas</h3>
              <div className="p-2 rounded-full bg-blue-100">
                <FileCheck className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            
            <div className="mt-4 mb-1">
              <div className="text-2xl font-bold text-gray-900">
                {stats?.issuedCount || 0}
              </div>
            </div>
          </div>
          
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Valor total</span>
              <span className="font-medium text-blue-600">{formatCurrency(stats?.income || 0)}</span>
            </div>
          </div>
        </Card>
        
        {/* Este Año */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Este Año ({new Date().getFullYear()})</h3>
              <div className="p-2 rounded-full bg-green-100">
                <CalendarDays className="h-4 w-4 text-green-600" />
              </div>
            </div>
            
            <div className="mt-4 mb-1">
              <div className="text-2xl font-bold text-gray-900">
                {stats?.yearCount || 0}
              </div>
            </div>
          </div>
          
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Valor facturado</span>
              <span className="font-medium text-green-600">{formatCurrency(stats?.yearIncome || 0)}</span>
            </div>
          </div>
        </Card>
        
        {/* Este Trimestre */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Este Trimestre</h3>
              <div className="p-2 rounded-full bg-amber-100">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            
            <div className="mt-4 mb-1">
              <div className="text-2xl font-bold text-gray-900">
                {stats?.quarterCount || 0}
              </div>
            </div>
          </div>
          
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Valor facturado</span>
              <span className="font-medium text-amber-600">{formatCurrency(stats?.quarterIncome || 0)}</span>
            </div>
          </div>
        </Card>
        
        {/* Pendientes de Cobro */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Pendientes de Cobro</h3>
              <div className="p-2 rounded-full bg-orange-100">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            
            <div className="mt-4 mb-1">
              <div className="text-2xl font-bold text-gray-900">
                {stats?.pendingCount || 0}
              </div>
            </div>
          </div>
          
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Importe pendiente</span>
              <span className="font-medium text-orange-600">{formatCurrency(stats?.pendingInvoices || 0)}</span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Lista de facturas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center">
            <Receipt className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-800">Listado de Facturas</h3>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/reports/invoices")}
            className="text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            <ArrowUpRight className="h-4 w-4 mr-1" /> Ver Informes
          </Button>
        </div>
        <InvoiceList />
      </div>
    </div>
  );
};

export default InvoicesPage;
