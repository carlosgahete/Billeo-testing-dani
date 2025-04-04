import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Info, ChevronRight } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface RecentInvoicesProps {
  data: DashboardStats;
  isLoading: boolean;
}

const RecentInvoices = ({ data, isLoading }: RecentInvoicesProps) => {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-slate-700 flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Facturas recientes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          
          <div className="mt-4">
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Datos ficticios para la demo
  const recentInvoices = [
    { id: 1, invoiceNumber: "F-2025-001", client: "Cliente A", amount: 545.50, status: "paid" },
    { id: 2, invoiceNumber: "F-2025-002", client: "Cliente B", amount: 1230.99, status: "pending" },
    { id: 3, invoiceNumber: "F-2025-003", client: "Cliente C", amount: 890.00, status: "paid" },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-slate-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Facturas recientes
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Las facturas más recientes emitidas a tus clientes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {recentInvoices.map((invoice) => (
            <div 
              key={invoice.id} 
              className="flex justify-between items-center p-2 border rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              <div>
                <div className="font-medium">{invoice.invoiceNumber}</div>
                <div className="text-sm text-neutral-500">{invoice.client}</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="font-semibold">{invoice.amount.toLocaleString('es-ES')} €</div>
                  <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'} className="text-xs">
                    {invoice.status === 'paid' ? 'Pagada' : 'Pendiente'}
                  </Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/invoices")}
          >
            Ver todas las facturas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentInvoices;