import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Info, ChevronRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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

interface RecentTransactionsProps {
  data: DashboardStats;
  isLoading: boolean;
}

const RecentTransactions = ({ data, isLoading }: RecentTransactionsProps) => {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-indigo-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-indigo-700 flex items-center">
              <Receipt className="mr-2 h-5 w-5" />
              Transacciones recientes
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
  const recentTransactions = [
    { id: 1, description: "Material de oficina", date: "03/04/2025", amount: 125.50, type: "expense" },
    { id: 2, description: "Pago cliente ABC", date: "01/04/2025", amount: 650.00, type: "income" },
    { id: 3, description: "Hosting y dominio", date: "27/03/2025", amount: 89.90, type: "expense" },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-indigo-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-indigo-700 flex items-center">
            <Receipt className="mr-2 h-5 w-5" />
            Transacciones recientes
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Las transacciones más recientes registradas en el sistema.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {recentTransactions.map((transaction) => (
            <div 
              key={transaction.id} 
              className="flex justify-between items-center p-2 border rounded-md cursor-pointer hover:bg-indigo-50 transition-colors"
              onClick={() => navigate(`/transactions/${transaction.id}`)}
            >
              <div className="flex items-center">
                <div className={`p-1 rounded-full mr-3 ${
                  transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowUpRight className={`h-4 w-4 text-green-600`} />
                  ) : (
                    <ArrowDownLeft className={`h-4 w-4 text-red-600`} />
                  )}
                </div>
                <div>
                  <div className="font-medium">{transaction.description}</div>
                  <div className="text-sm text-neutral-500">{transaction.date}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`font-semibold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {transaction.amount.toLocaleString('es-ES')} €
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
            className="w-full text-indigo-600 border-indigo-300 hover:bg-indigo-50"
            onClick={() => navigate("/transactions")}
          >
            Ver todas las transacciones
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentTransactions;