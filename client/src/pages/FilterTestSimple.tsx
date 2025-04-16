import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimpleDashboardFilters } from '@/hooks/useSimpleDashboardFilters';

// Componente que implementa un enfoque simplificado para el filtrado
const FilterTestSimple = () => {
  // Usamos el hook simplificado personalizado para los filtros
  const { 
    filters, 
    handleChangeYear, 
    handleChangePeriod 
  } = useSimpleDashboardFilters();

  // Estado para simular la carga de datos
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<string>("Datos iniciales");

  // Simulamos la carga de datos cada vez que cambian los filtros
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulamos una carga de datos que tarda 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Actualizamos los datos según los filtros actuales
      setData(`Datos filtrados para el año ${filters.year} y periodo ${filters.period}`);
      
      setIsLoading(false);
    };
    
    loadData();
  }, [filters]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Prueba de Filtros Simplificada</h1>
      
      <div className="flex gap-4 mb-6">
        {/* Selector de Año */}
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Año:</span>
          <div className="flex gap-2">
            {["2023", "2024", "2025"].map(year => (
              <Button
                key={year}
                variant={filters.year === year ? "default" : "outline"}
                onClick={() => handleChangeYear(year)}
                disabled={isLoading}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Selector de Periodo */}
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Periodo:</span>
          <div className="flex gap-2">
            <Button
              variant={filters.period === "all" ? "default" : "outline"}
              onClick={() => handleChangePeriod("all")}
              disabled={isLoading}
            >
              Todo el año
            </Button>
            {["q1", "q2", "q3", "q4"].map(quarter => (
              <Button
                key={quarter}
                variant={filters.period === quarter ? "default" : "outline"}
                onClick={() => handleChangePeriod(quarter)}
                disabled={isLoading}
              >
                T{quarter.substring(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Tarjeta de visualización de datos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Datos para {filters.year} - {filters.period === "all" ? "Todo el año" : `Trimestre ${filters.period.substring(1)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div>
              {data}
              <p className="mt-4 text-sm text-gray-500">
                Estado actual de filtros: {JSON.stringify(filters)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 bg-gray-100 p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Instrucciones</h2>
        <p>
          Este componente utiliza el hook <code>useSimpleDashboardFilters</code> para gestionar
          los filtros de forma reactiva. Cada vez que se cambia un filtro, se desencadena
          automáticamente una actualización de los datos.
        </p>
        <p className="mt-2">
          Características principales:
        </p>
        <ul className="list-disc ml-8 mt-2">
          <li>No requiere un botón "Aplicar filtros" separado</li>
          <li>Gestión de estado simplificada en un solo hook</li>
          <li>Actualización inmediata cuando cambian los filtros</li>
          <li>Sin problemas de doble clic ni temporización</li>
        </ul>
      </div>
    </div>
  );
};

export default FilterTestSimple;