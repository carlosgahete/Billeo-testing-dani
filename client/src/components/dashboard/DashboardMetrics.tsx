import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import CustomizableDashboard from "./CustomizableDashboard";
import QuickStats from "./blocks/QuickStats";
import NetIncomeCard from "./blocks/SimplifiedNetIncomeCard";
import NetExpensesCard from "./blocks/SimplifiedNetExpensesCard";
import FinalResultCard from "./blocks/SimplifiedFinalResultCard";

interface DashboardMetricsProps {
  userId: number;
}

interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  [key: string]: any;
}

const DashboardMetrics = ({ userId }: DashboardMetricsProps) => {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"]
  });

  return (
    <div>
      {/* Estadísticas rápidas - Vista general */}
      <div className="mb-4">
        <QuickStats data={data} isLoading={isLoading} />
      </div>
      
      {/* Tarjetas de ingresos, gastos y resultado final */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <NetIncomeCard data={data} isLoading={isLoading} />
        <NetExpensesCard data={data} isLoading={isLoading} />
        <FinalResultCard data={data} isLoading={isLoading} />
      </div>
      
      {/* Dashboard personalizable */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Dashboard Personalizado</h2>
        <CustomizableDashboard userId={userId} />
      </div>
    </div>
  );
};

export default DashboardMetrics;