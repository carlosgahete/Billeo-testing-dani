import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, ExternalLink } from "lucide-react";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface InvoicesSummaryProps {
  data: DashboardStats;
  isLoading: boolean;
}

const InvoicesSummary: React.FC<InvoicesSummaryProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-blue-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-blue-700 flex items-center">
              <Receipt className="mr-2 h-5 w-5" />
              Facturas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalInvoices = data?.invoicesTotal || 0;
  const paidInvoices = data?.invoicesPaid || 0;
  const pendingInvoices = data?.invoicesPending || 0;
  const overdueInvoices = data?.invoicesOverdue || 0;
  
  // Tasa de cobro
  const collectionRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-blue-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <Receipt className="mr-2 h-5 w-5" />
            Facturas
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3">Total de facturas: {totalInvoices}</h3>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Pagadas</span>
              </div>
              <span className="font-semibold">{paidInvoices}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                <span className="text-sm">Pendientes</span>
              </div>
              <span className="font-semibold">{pendingInvoices}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">Vencidas</span>
              </div>
              <span className="font-semibold">{overdueInvoices}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Tasa de cobro</span>
              <span className="text-sm font-semibold">{collectionRate}%</span>
            </div>
            <Progress value={collectionRate} className="h-2" />
          </div>
        </div>
        
        <div className="mt-4">
          <button className="text-blue-600 text-sm w-full text-center border-t border-gray-100 pt-3 transition-colors hover:text-blue-800 flex items-center justify-center">
            Ver facturas
            <ExternalLink className="ml-1 h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicesSummary;