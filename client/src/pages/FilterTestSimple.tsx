import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useSimpleDashboardFilters } from '@/hooks/useSimpleDashboardFilters';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FilterTestSimplePage: React.FC = () => {
  const filters = useSimpleDashboardFilters();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Función para cargar datos
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stats/dashboard?year=${filters.year}&period=${filters.period}&nocache=true`);
      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, [filters.year, filters.period]);
  
  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Prueba Simple de Filtros</h1>
        <p className="mb-6 text-gray-600">Esta página usa un enfoque simplificado para probar el funcionamiento de los filtros.</p>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium">Año</label>
            <select 
              className="border rounded p-2 min-w-[120px]"
              value={filters.year}
              onChange={(e) => filters.changeYear(e.target.value)}
            >
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium">Periodo</label>
            <select 
              className="border rounded p-2 min-w-[120px]"
              value={filters.period}
              onChange={(e) => filters.changePeriod(e.target.value)}
            >
              <option value="all">Todo el año</option>
              <option value="q1">Trimestre 1</option>
              <option value="q2">Trimestre 2</option>
              <option value="q3">Trimestre 3</option>
              <option value="q4">Trimestre 4</option>
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium">Acciones</label>
            <Button onClick={fetchData}>Refrescar Datos</Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center my-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-green-800 mb-2">Ingresos</h3>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(data.income)}</p>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-red-800 mb-2">Gastos</h3>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(data.expenses)}</p>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-blue-800 mb-2">Resultado</h3>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(data.income - data.expenses)}</p>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            No hay datos disponibles
          </div>
        )}
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Estado Actual</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
            {JSON.stringify({
              filters,
              data
            }, null, 2)}
          </pre>
        </div>
      </div>
    </Layout>
  );
};

export default FilterTestSimplePage;