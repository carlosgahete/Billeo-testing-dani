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

interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  balance: number;
  result: number;
  totalWithholdings: number;
  taxes: {
    vat: number;
    incomeTax: number;
  };
}

interface DashboardMetricsProps {
  userId: number;
}

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color,
  isLoading,
  className = ""
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: { value: string; isPositive: boolean } | null;
  color: "green" | "red" | "yellow" | "blue";
  isLoading: boolean;
  className?: string;
}) => {
  const colorMap = {
    green: {
      bg: "bg-secondary-50",
      text: "text-secondary-600",
      border: "border-secondary-100",
    },
    red: {
      bg: "bg-danger-50",
      text: "text-danger-500",
      border: "border-danger-100",
    },
    yellow: {
      bg: "bg-warning-50",
      text: "text-warning-700",
      border: "border-warning-100",
    },
    blue: {
      bg: "bg-primary-50",
      text: "text-primary-600",
      border: "border-primary-100",
    },
  };

  return (
    <Card className={`border ${colorMap[color].border} hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <div className={`p-1.5 mr-2 rounded-md ${colorMap[color].bg} ${colorMap[color].text}`}>
                {icon}
              </div>
              <p className="text-neutral-600 text-sm font-medium">{title}</p>
            </div>
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
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardMetrics = ({ userId }: DashboardMetricsProps) => {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
    // Desactivamos los errores TypeScript sobre las propiedades anulables
    select: (data) => data as DashboardStats
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      useGrouping: true
    }).format(value);
  };

  return (
    <div className="mb-1">
      
      {/* Espacio vacío - ya no se muestra contenido aquí */}
    </div>
  );
};

export default DashboardMetrics;
