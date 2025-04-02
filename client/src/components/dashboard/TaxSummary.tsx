import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  FileText, 
  Info,
  CalendarDays,
  AlertCircle
} from "lucide-react";

// Define the expected data structure
interface DashboardStats {
  taxes: {
    vat: number;
    incomeTax: number;
  };
  totalWithholdings: number;
  income: number;
  expenses: number;
  result: number;
}

// Tipos para los períodos fiscales
type YearType = '2024' | '2025';
type PeriodType = 'all' | 'q1' | 'q2' | 'q3' | 'q4';

const TaxSummary = () => {
  const [, navigate] = useLocation();
  const [year, setYear] = useState<YearType>('2025');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [selectedVat, setSelectedVat] = useState<number>(0);
  const [selectedWithholdings, setSelectedWithholdings] = useState<number>(0);
  const [hasData, setHasData] = useState<boolean>(true);
  
  const { data, isLoading, refetch } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", year, period],
    queryFn: async () => {
      const response = await fetch(`/api/stats/dashboard?year=${year}&period=${period}`);
      if (!response.ok) {
        throw new Error('Error al obtener estadísticas');
      }
      return response.json();
    }
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

  // Nombres descriptivos para los períodos
  const periodNames = {
    all: 'Todo el año',
    q1: '1T (Ene-Mar)',
    q2: '2T (Abr-Jun)',
    q3: '3T (Jul-Sep)',
    q4: '4T (Oct-Dic)'
  };

  // Obtener la fecha mínima y máxima de transacciones/facturas
  const getQuarterFromMonth = (month: number): PeriodType => {
    if (month < 4) return 'q1';
    if (month < 7) return 'q2';
    if (month < 10) return 'q3';
    return 'q4';
  };

  // Efecto para recalcular valores cuando cambia el período, año o datos
  useEffect(() => {
    if (!data) return;
    
    // Valores base
    const totalVat = data.taxes?.vat ?? 0;
    const totalWithholdings = data.totalWithholdings ?? 0;
    
    // Verificar si hay datos para el período actual
    const hasDataForPeriod = totalVat > 0 || totalWithholdings > 0;
    
    // Actualizar estado
    setHasData(hasDataForPeriod);
    setSelectedVat(totalVat);
    setSelectedWithholdings(totalWithholdings);
    
    console.log("Datos fiscales:", {
      período: period,
      año: year,
      totalVat,
      totalWithholdings,
      hasDataForPeriod
    });
  }, [data, year, period]);

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="bg-blue-50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Resumen Fiscal
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Resumen de IVA a pagar al declarar el trimestre y el IRPF retenido en las facturas recibidas como gastos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {/* Selectores de período */}
        <div className="flex gap-2 mb-4">
          <Select value={year} onValueChange={(value: string) => setYear(value as YearType)}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={(value: string) => setPeriod(value as PeriodType)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el año</SelectItem>
              <SelectItem value="q1">1er trimestre</SelectItem>
              <SelectItem value="q2">2º trimestre</SelectItem>
              <SelectItem value="q3">3er trimestre</SelectItem>
              <SelectItem value="q4">4º trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {hasData ? (
          <>
            {/* IVA del período seleccionado */}
            <div className="p-3 bg-red-50 shadow-sm border border-red-100 rounded-md">
              <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                <CalendarDays className="mr-1 h-4 w-4" />
                IVA a liquidar ({periodNames[period]}, {year})
              </h3>
              <div className="flex justify-between items-center">
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <span className="text-red-600 font-bold text-xl">
                    {formatCurrency(selectedVat)}
                  </span>
                )}
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  21% IVA
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {period === 'all' 
                  ? 'Resumen anual de IVA (modelo 390)'
                  : `IVA trimestral - modelo 303 (${periodNames[period]})`}
              </p>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger className="w-full mt-1">
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-1 cursor-default">
                      ℹ️ Resultado de restar IVA repercutido - IVA soportado
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs bg-white shadow-lg z-50">
                    <p className="w-[300px] text-xs">
                      El IVA soportado es el que has pagado a tus proveedores en tus compras y gastos.
                      El IVA repercutido es el que has cobrado a tus clientes.
                      La diferencia (a liquidar) se declara trimestralmente en el modelo 303.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Retenciones acumuladas del período seleccionado */}
            <div className="p-3 bg-green-50 shadow-sm border border-green-100 rounded-md mt-3">
              <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                IRPF adelantado ({periodNames[period]}, {year})
              </h3>
              <div className="flex justify-between items-center">
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <span className="text-green-800 font-bold text-xl">{formatCurrency(selectedWithholdings)}</span>
                )}
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  15% IRPF
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {period === 'all' 
                  ? 'IRPF retenido que te descuentan en facturas emitidas'
                  : `IRPF adelantado del periodo (${periodNames[period]})`}
              </p>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger className="w-full mt-1">
                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-sm p-1 cursor-default">
                      ℹ️ Retenciones a cuenta del IRPF
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs bg-white shadow-lg z-50">
                    <p className="w-[250px] text-xs">
                      Las retenciones a cuenta del IRPF son cantidades que tus clientes 
                      retienen de tus facturas y pagan directamente a Hacienda a tu nombre.
                      Estas retenciones se descontarán de tu declaración anual de IRPF.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
            <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-700">No hay datos disponibles</h3>
            <p className="text-xs text-gray-500 mt-1">
              No se encontraron facturas ni transacciones para el período seleccionado.
            </p>
          </div>
        )}
        
        <Button 
          variant="default" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => navigate("/reports")}
        >
          Ver informes fiscales
        </Button>
      </CardContent>
    </Card>
  );
};

export default TaxSummary;
