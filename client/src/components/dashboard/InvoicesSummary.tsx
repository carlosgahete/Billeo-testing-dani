import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { FileText, FileCheck, Clock, Info, Loader2, AlertTriangle } from "lucide-react";

interface DashboardStats {
  pendingInvoices: number;
  pendingCount: number;
  invoices?: {
    total: number;
    pending: number;
    paid: number;
    overdue: number;
  };
}

const InvoicesSummary = () => {
  const [, navigate] = useLocation();
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden h-full">
        <CardHeader className="bg-blue-50 p-2">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Facturas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 flex items-center justify-center h-[240px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  // Obtener datos de facturas
  const totalInvoices = stats?.pendingCount || 0;
  const pendingInvoices = stats?.pendingInvoices || 0;
  const paidInvoices = totalInvoices - pendingInvoices;
  const overdueInvoices = 0; // Placeholder, ajustar si hay datos reales disponibles
  
  // Calcular el porcentaje de cobro (evitar división por cero)
  const paymentRate = totalInvoices > 0 
    ? Math.round((paidInvoices / totalInvoices) * 100) 
    : 0;

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="bg-blue-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Facturas
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[200px] text-xs">Resumen de las facturas emitidas y su estado de pago</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <p className="text-2xl font-bold text-blue-600">{totalInvoices}</p>
        <p className="text-sm text-gray-500 mb-3">Total de facturas</p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-400 mr-2"></div>
              <span className="text-sm">Pendientes</span>
            </div>
            <span className="font-medium">{pendingInvoices}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
              <span className="text-sm">Pagadas</span>
            </div>
            <span className="font-medium">{paidInvoices}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
              <span className="text-sm">Vencidas</span>
            </div>
            <span className="font-medium">{overdueInvoices}</span>
          </div>
        </div>
        
        <div className="mt-3">
          <p className="text-sm text-gray-500">Tasa de cobro</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${paymentRate}%` }}
            ></div>
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">{paymentRate}%</p>
        </div>
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/invoices")}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Ver facturas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicesSummary;