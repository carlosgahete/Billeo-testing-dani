import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardMetricsProps {
  userId: number;
}

interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  pendingQuotes: number;
  pendingQuotesCount: number;
  baseImponible?: number;
  ivaRepercutido?: number;
  ivaSoportado?: number;
  irpfRetenidoIngresos?: number;
  totalWithholdings?: number;
  taxes: {
    vat: number;
    incomeTax: number;
    ivaALiquidar: number;
  };
  [key: string]: any;
}

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