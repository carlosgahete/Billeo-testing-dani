import { useQuery } from '@tanstack/react-query';
import { useSimpleDashboardFilters } from './useSimpleDashboardFilters';

export interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  balance?: number;
  result?: number;
  baseImponible: number;
  baseImponibleGastos: number;
  ivaRepercutido?: number;
  ivaSoportado?: number;
  irpfRetenidoIngresos?: number;
  irpfTotal?: number;
  totalWithholdings?: number;
  netIncome?: number;
  netExpenses?: number;
  netResult?: number;
  taxes?: {
    vat: number;
    incomeTax: number;
    ivaALiquidar: number;
  };
  taxStats?: {
    ivaRepercutido: number;
    ivaSoportado: number;
    ivaLiquidar: number;
    irpfRetenido: number;
    irpfTotal: number;
    irpfPagar: number;
  };
  year?: string;
  period?: string;
  pendingQuotes?: number;
  pendingQuotesCount?: number;
  issuedCount?: number;
  quarterCount?: number;
  quarterIncome?: number;
  yearCount?: number;
  yearIncome?: number;
  invoices?: {
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    totalAmount: number;
  };
  quotes?: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  allQuotes?: number;
  acceptedQuotes?: number;
  rejectedQuotes?: number;
  [key: string]: any;
}

export function useDashboardData(
  forcedYear?: string,
  forcedPeriod?: string
): {
  data: DashboardStats | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { year, period } = useSimpleDashboardFilters();
  
  // Usar el endpoint alternativo para evitar errores
  const finalYear = forcedYear || year;
  const finalPeriod = forcedPeriod || period;
  
  const timestamp = new Date().toISOString(); // Para evitar caché

  // Utilizamos el endpoint fix aquí
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', finalYear, finalPeriod, timestamp],
    queryFn: async () => {
      try {
        // Intentar primero con el endpoint fijo
        const response = await fetch(`/api/stats/dashboard-fix?year=${finalYear}&period=${finalPeriod}&timestamp=${timestamp}`);
        if (response.ok) {
          return await response.json();
        }
        
        // Si falla, intentar con el endpoint original
        console.log("El endpoint fix falló, probando con el original...");
        const originalResponse = await fetch(`/api/stats/dashboard?year=${finalYear}&period=${finalPeriod}&timestamp=${timestamp}`);
        if (originalResponse.ok) {
          return await originalResponse.json();
        }
        
        // Si ambos fallan, lanzar error
        throw new Error('No se pudo obtener los datos del dashboard');
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        
        // Proporcionar una estructura de datos base para que la UI no falle
        return {
          income: 0,
          expenses: 0,
          pendingInvoices: 0,
          pendingCount: 0,
          baseImponible: 0,
          baseImponibleGastos: 0,
          balance: 0,
          result: 0,
          netIncome: 0,
          netExpenses: 0,
          netResult: 0,
          taxes: {
            vat: 0,
            incomeTax: 0,
            ivaALiquidar: 0
          },
          taxStats: {
            ivaRepercutido: 0,
            ivaSoportado: 0,
            ivaLiquidar: 0,
            irpfRetenido: 0,
            irpfTotal: 0,
            irpfPagar: 0
          },
          year: finalYear,
          period: finalPeriod
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Depuración
  if (dashboardQuery.data) {
    console.log("Dashboard stats", {
      income: dashboardQuery.data.income,
      expenses: dashboardQuery.data.expenses,
      baseImponible: dashboardQuery.data.baseImponible,
      result: dashboardQuery.data.result
    });
  }

  return {
    data: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    isError: dashboardQuery.isError,
    refetch: dashboardQuery.refetch
  };
}