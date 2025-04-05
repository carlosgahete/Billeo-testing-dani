import { useQuery } from "@tanstack/react-query";

export interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  taxes?: {
    ivaALiquidar?: number;
    incomeTax?: number;
  };
  taxStats?: {
    ivaRepercutido?: number;
    ivaSoportado?: number;
    ivaLiquidar?: number;
    irpfRetenido?: number;
    irpfTotal?: number;
    irpfPagar?: number;
  };
  [key: string]: any;
}

/**
 * Hook para obtener los datos del dashboard
 */
export function useDashboardData() {
  return useQuery<DashboardStats>({
    queryKey: ['/api/stats/dashboard'],
    refetchOnWindowFocus: false
  });
}