import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ExternalLink } from "lucide-react";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface QuotesSummaryProps {
  data: DashboardStats;
  isLoading: boolean;
}

const QuotesSummary: React.FC<QuotesSummaryProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-indigo-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-indigo-700 flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Presupuestos
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

  const totalQuotes = data?.quotesTotal || 5;
  const acceptedQuotes = data?.quotesAccepted || 3;
  const rejectedQuotes = data?.quotesRejected || 1;
  const pendingQuotes = data?.quotesPending || 0;
  
  // Tasa de aceptación
  const acceptanceRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-indigo-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-indigo-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Presupuestos
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3">Total de presupuestos: {totalQuotes}</h3>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Aceptados</span>
              </div>
              <span className="font-semibold">{acceptedQuotes}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">Rechazados</span>
              </div>
              <span className="font-semibold">{rejectedQuotes}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                <span className="text-sm">Pendientes</span>
              </div>
              <span className="font-semibold">{pendingQuotes}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Tasa de aceptación</span>
              <span className="text-sm font-semibold">{acceptanceRate}%</span>
            </div>
            <Progress value={acceptanceRate} className="h-2" />
          </div>
        </div>
        
        <div className="mt-4">
          <button className="text-blue-600 text-sm w-full text-center border-t border-gray-100 pt-3 transition-colors hover:text-blue-800 flex items-center justify-center">
            Ver presupuestos
            <ExternalLink className="ml-1 h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuotesSummary;