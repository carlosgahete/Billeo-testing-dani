import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardStats } from '@/types/dashboard';
import { toast } from '@/hooks/use-toast';

// Hook para obtener y refrescar los datos del dashboard
export function useDashboardData() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [period, setPeriod] = useState('all');
  
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<DashboardStats>({
    queryKey: ['/api/stats/dashboard', year, period],
    queryFn: async () => {
      const response = await fetch(`/api/stats/dashboard?year=${year}&period=${period}`);
      if (!response.ok) {
        throw new Error('Error fetching dashboard data');
      }
      return response.json();
    },
    refetchOnWindowFocus: false
  });
  
  // Manejar errores
  useEffect(() => {
    if (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error al cargar datos',
        description: 'No se pudieron cargar las estadísticas del dashboard. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    }
  }, [error]);
  
  // Funciones para cambiar filtros
  const changeYear = (newYear: string) => {
    setYear(newYear);
  };
  
  const changePeriod = (newPeriod: string) => {
    setPeriod(newPeriod);
  };
  
  return {
    data,
    isLoading,
    error,
    refetch,
    filters: {
      year,
      period,
      changeYear,
      changePeriod
    }
  };
}