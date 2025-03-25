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
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };

  return (
    <div className="mb-6">
      {/* Primera fila: Métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <MetricCard
          title="Ingresos totales"
          value={data ? formatCurrency(data.income) : "0,00 €"}
          icon={<Wallet size={20} />}
          trend={data && data.income > 0 ? { 
            value: `Facturación bruta`, 
            isPositive: true 
          } : null}
          color="green"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Gastos totales"
          value={data ? formatCurrency(data.expenses) : "0,00 €"}
          icon={<ShoppingCart size={20} />}
          trend={data && data.expenses > 0 ? { 
            value: `Gastos deducibles`, 
            isPositive: false 
          } : null}
          color="red"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Retenciones"
          value={data ? formatCurrency(data.totalWithholdings || 0) : "0,00 €"}
          icon={<AlertTriangle size={20} />}
          trend={data && data.totalWithholdings > 0 ? { 
            value: `IRPF y otras retenciones`, 
            isPositive: false 
          } : null}
          color="yellow"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Resultado"
          value={data ? formatCurrency(data.result || data.balance) : "0,00 €"}
          icon={<PiggyBank size={20} />}
          trend={data && (data.result || data.balance) > 0 ? { 
            value: `Ingresos - Gastos - Retenciones`, 
            isPositive: true 
          } : { 
            value: `Pérdidas en el periodo`, 
            isPositive: false 
          }}
          color="blue"
          isLoading={isLoading}
        />
      </div>
      
      {/* Segunda fila: métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Facturas pendientes"
          value={data ? formatCurrency(data.pendingInvoices) : "0,00 €"}
          icon={<Receipt size={20} />}
          trend={data ? { 
            value: `${data.pendingCount || 0} facturas por cobrar`, 
            isPositive: false 
          } : null}
          color="yellow"
          isLoading={isLoading}
          className="h-full"
        />
        
        {/* Se podría añadir otra tarjeta aquí si es necesario */}
        <Card className="border border-gray-200 h-full">
          <CardContent className="p-4">
            <div className="flex items-center mb-1">
              <div className="p-1.5 mr-2 rounded-md bg-blue-50 text-blue-600">
                <TrendingUp size={20} />
              </div>
              <p className="text-neutral-600 text-sm font-medium">Balance trimestral</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-1" />
            ) : (
              <div>
                <p className="text-2xl font-bold text-neutral-800">
                  {formatCurrency((data?.result || 0) - (data?.taxes?.vat || 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Resultado después de impuestos estimados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardMetrics;
