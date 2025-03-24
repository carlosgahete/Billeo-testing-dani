import { useQuery } from "@tanstack/react-query";
import { 
  Wallet, 
  ShoppingCart, 
  Receipt, 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardMetricsProps {
  userId: number;
}

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color,
  isLoading
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: { value: string; isPositive: boolean } | null;
  color: "green" | "red" | "yellow" | "blue";
  isLoading: boolean;
}) => {
  const colorMap = {
    green: {
      bg: "bg-secondary-50",
      text: "text-secondary-600",
    },
    red: {
      bg: "bg-danger-50",
      text: "text-danger-500",
    },
    yellow: {
      bg: "bg-warning-50",
      text: "text-warning-700",
    },
    blue: {
      bg: "bg-primary-50",
      text: "text-primary-600",
    },
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-neutral-500 text-sm">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-neutral-800">{value}</p>
            )}
            {trend && !isLoading && (
              <p className={`text-xs ${trend.isPositive ? "text-secondary-600" : "text-danger-600"} flex items-center mt-1`}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {trend.value}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-full ${colorMap[color].bg} ${colorMap[color].text}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardMetrics = ({ userId }: DashboardMetricsProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Ingresos totales"
        value={data ? formatCurrency(data.income) : "0,00 €"}
        icon={<Wallet size={20} />}
        trend={{ value: "12% desde el último mes", isPositive: true }}
        color="green"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Gastos totales"
        value={data ? formatCurrency(data.expenses) : "0,00 €"}
        icon={<ShoppingCart size={20} />}
        trend={{ value: "8% desde el último mes", isPositive: false }}
        color="red"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Facturas pendientes"
        value={data ? formatCurrency(data.pendingInvoices) : "0,00 €"}
        icon={<Receipt size={20} />}
        trend={data ? { 
          value: `${data.pendingCount} facturas por cobrar`, 
          isPositive: false 
        } : null}
        color="yellow"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Balance neto"
        value={data ? formatCurrency(data.balance) : "0,00 €"}
        icon={<PiggyBank size={20} />}
        trend={{ value: "15% desde el último mes", isPositive: true }}
        color="blue"
        isLoading={isLoading}
      />
    </div>
  );
};

export default DashboardMetrics;
