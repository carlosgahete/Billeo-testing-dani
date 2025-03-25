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
  CalendarDays
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
type YearType = '2023' | '2024' | '2025';
type PeriodType = 'all' | 'q1' | 'q2' | 'q3' | 'q4';

// Función para calcular datos fiscales basados en el año
const calculateYearlyData = (base: number, year: YearType): number => {
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(year);
  
  // Simulación simple: años pasados tienen menos, años futuros tienen más
  if (selectedYear < currentYear) {
    return base * 0.7; // 70% para años pasados
  } else if (selectedYear > currentYear) {
    return base * 1.3; // 130% para años futuros
  }
  return base; // 100% para año actual
};

const TaxSummary = () => {
  const [, navigate] = useLocation();
  const [year, setYear] = useState<YearType>('2025');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [selectedVat, setSelectedVat] = useState<number>(0);
  const [selectedWithholdings, setSelectedWithholdings] = useState<number>(0);
  
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
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

  // Efecto para recalcular valores cuando cambia el período, año o datos
  useEffect(() => {
    // Default tax values when data is not available
    const baseVat = data?.taxes?.vat ?? 0;
    const baseWithholdings = data?.totalWithholdings ?? 0;
    
    // Ajustar por año
    const yearAdjustedVat = calculateYearlyData(baseVat, year);
    const yearAdjustedWithholdings = calculateYearlyData(baseWithholdings, year);
    
    // Calcular valores por trimestre
    let periodVat = yearAdjustedVat;
    let periodWithholdings = yearAdjustedWithholdings;
    
    if (period !== 'all') {
      // Distribución trimestral (podría tener lógica más compleja)
      const distribution = {
        q1: 0.2, // 20% en primer trimestre
        q2: 0.3, // 30% en segundo trimestre
        q3: 0.2, // 20% en tercer trimestre
        q4: 0.3  // 30% en cuarto trimestre
      };
      
      periodVat = yearAdjustedVat * distribution[period];
      periodWithholdings = yearAdjustedWithholdings * distribution[period];
    }
    
    setSelectedVat(periodVat);
    setSelectedWithholdings(periodWithholdings);
  }, [data, year, period]);

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="bg-blue-50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Resumen Fiscal
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Info className="h-4 w-4 text-neutral-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-[200px] text-xs">IVA a pagar por trimestres y retenciones acumuladas</p>
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
              <SelectItem value="2023">2023</SelectItem>
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
        
        {/* IVA del período seleccionado */}
        <div className="p-3 bg-blue-50 shadow-sm border border-blue-100 rounded-md">
          <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
            <CalendarDays className="mr-1 h-4 w-4" />
            IVA a liquidar ({periodNames[period]}, {year})
          </h3>
          <div className="flex justify-between items-center">
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <span className="text-blue-800 font-bold text-xl">{formatCurrency(selectedVat)}</span>
            )}
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              21% IVA
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {period === 'all' 
              ? 'Resumen anual de IVA (modelo 390)'
              : `IVA trimestral - modelo 303 (${periodNames[period]})`}
          </p>
        </div>
        
        {/* Retenciones acumuladas del período seleccionado */}
        <div className="p-3 bg-amber-50 shadow-sm border border-amber-100 rounded-md mt-3">
          <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
            Retenciones IRPF ({periodNames[period]}, {year})
          </h3>
          <div className="flex justify-between items-center">
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <span className="text-amber-800 font-bold text-xl">{formatCurrency(selectedWithholdings)}</span>
            )}
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
              15% IRPF
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {period === 'all' 
              ? 'Retenciones acumuladas en el año (modelo 190)'
              : `Retenciones del trimestre - modelo 111 (${periodNames[period]})`}
          </p>
        </div>
        
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
