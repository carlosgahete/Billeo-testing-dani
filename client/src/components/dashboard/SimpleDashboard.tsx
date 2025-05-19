import React, { useState, useCallback, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSimpleDashboardFilters } from '@/hooks/useSimpleDashboardFilters';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleDashboardProps {
  className?: string;
}

const SimpleDashboard: React.FC<SimpleDashboardProps> = ({ className = '' }) => {
  // Usar hooks para datos del dashboard y filtros
  const { data: dashboardData, isLoading, refetch } = useDashboardData();
  const filters = useSimpleDashboardFilters();
  
  // Estado local para controlar la apertura/cierre de los dropdowns
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  
  // Funciones para cambiar los filtros - memoizadas para evitar recreaciones
  const handleYearChange = useCallback((newYear: string) => {
    console.log('Cambiando año a:', newYear);
    filters.changeYear(newYear);
    setYearDropdownOpen(false);
  }, [filters]);
  
  const handlePeriodChange = useCallback((newPeriod: string) => {
    console.log('Cambiando periodo a:', newPeriod);
    filters.changePeriod(newPeriod);
    setPeriodDropdownOpen(false);
  }, [filters]);
  
  // Función para refrescar manualmente los datos
  const handleRefresh = useCallback(() => {
    console.log('Refrescando datos manualmente');
    refetch();
  }, [refetch]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // Datos predeterminados si no hay datos - memoizado para evitar recálculos
  const stats = useMemo(() => dashboardData || { 
    income: 0, 
    expenses: 0,
    pendingInvoices: 0,
    pendingCount: 0,
    taxes: { vat: 0, incomeTax: 0, ivaALiquidar: 0 }
  }, [dashboardData]);
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Dashboard Simplificado</h2>
        
        <div className="flex space-x-2">
          {/* Selector de Año */}
          <div className="relative">
            <button
              className="px-3 py-1.5 border rounded-md bg-white flex items-center"
              onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            >
              {filters?.year || new Date().getFullYear().toString()}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 ml-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {yearDropdownOpen && (
              <div className="absolute right-0 mt-1 bg-white border rounded-md shadow-lg z-10 w-32">
                {[2025, 2024, 2023].map((year) => (
                  <button
                    key={year}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                      filters?.year === year.toString() ? 'bg-blue-50 text-blue-600 font-medium' : ''
                    }`}
                    onClick={() => handleYearChange(year.toString())}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Selector de Periodo */}
          <div className="relative">
            <button
              className="px-3 py-1.5 border rounded-md bg-white flex items-center"
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
            >
              {filters?.period === "all" ? "Todo el año" : 
              filters?.period === "q1" ? "Trimestre 1" : 
              filters?.period === "q2" ? "Trimestre 2" : 
              filters?.period === "q3" ? "Trimestre 3" : 
              filters?.period === "q4" ? "Trimestre 4" : "Todo el año"}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 ml-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {periodDropdownOpen && (
              <div className="absolute right-0 mt-1 bg-white border rounded-md shadow-lg z-10 w-40">
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    filters?.period === "all" ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                  onClick={() => handlePeriodChange("all")}
                >
                  Todo el año
                </button>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    filters?.period === "q1" ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                  onClick={() => handlePeriodChange("q1")}
                >
                  Trimestre 1
                </button>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    filters?.period === "q2" ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                  onClick={() => handlePeriodChange("q2")}
                >
                  Trimestre 2
                </button>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    filters?.period === "q3" ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                  onClick={() => handlePeriodChange("q3")}
                >
                  Trimestre 3
                </button>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    filters?.period === "q4" ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                  onClick={() => handlePeriodChange("q4")}
                >
                  Trimestre 4
                </button>
              </div>
            )}
          </div>
          
          {/* Botón de Refresh */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
          >
            Refrescar
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ingresos */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-green-800">Ingresos</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.income)}</p>
        </div>
        
        {/* Gastos */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-red-800">Gastos</h3>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.expenses)}</p>
        </div>
        
        {/* Resultado */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-800">Resultado</h3>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(stats.income - stats.expenses)}</p>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Logs de Depuración</h3>
        <div className="text-sm text-gray-600">
          <p>Año seleccionado: {filters?.year}</p>
          <p>Periodo seleccionado: {filters?.period}</p>
          <p>Ingresos: {formatCurrency(stats.income)}</p>
          <p>Gastos: {formatCurrency(stats.expenses)}</p>
          <p>IVA a liquidar: {formatCurrency(stats.taxes?.ivaALiquidar || 0)}</p>
        </div>
      </div>
    </div>
  );
};

// Aplicar memoización al componente para evitar renderizados innecesarios
export default React.memo(SimpleDashboard);