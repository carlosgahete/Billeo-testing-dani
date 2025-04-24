import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageTitle } from '@/components/ui/page-title';
import ExpensesByCategoryApple from '@/components/dashboard/ExpensesByCategoryApple';
import { Loader2, ArrowUpFromLine, ArrowDownToLine, PiggyBank } from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useSimpleDashboardFilters } from '@/hooks/useSimpleDashboardFilters';
import { useLocation } from 'wouter';

const AppleDashboardDemo: React.FC = () => {
  const [, navigate] = useLocation();
  const { year: currentYear, period: currentPeriod, changeYear: setYear, changePeriod: setPeriod } = useSimpleDashboardFilters();
  
  // Obtener datos de usuario para verificar autenticación
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ['/api/auth/session'],
  });
  
  // Obtener datos del dashboard
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ['/api/stats/dashboard-fix'],
  });

  // Estado de carga
  const isLoading = userLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Información financiera
  const incomeTotal = stats?.income || 0;
  const expensesTotal = stats?.expenses || 0;
  const balanceTotal = incomeTotal - expensesTotal;

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <PageTitle 
          title="Dashboard Estilo Apple"
          description="Visualización de gastos con un diseño minimalista y elegante"
        />
        
        {/* Filtros de año y periodo */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Select value={currentYear} onValueChange={setYear}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={currentPeriod} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el año</SelectItem>
              <SelectItem value="q1">1er trimestre</SelectItem>
              <SelectItem value="q2">2º trimestre</SelectItem>
              <SelectItem value="q3">3er trimestre</SelectItem>
              <SelectItem value="q4">4º trimestre</SelectItem>
              <SelectItem value="m1">Enero</SelectItem>
              <SelectItem value="m2">Febrero</SelectItem>
              <SelectItem value="m3">Marzo</SelectItem>
              <SelectItem value="m4">Abril</SelectItem>
              <SelectItem value="m5">Mayo</SelectItem>
              <SelectItem value="m6">Junio</SelectItem>
              <SelectItem value="m7">Julio</SelectItem>
              <SelectItem value="m8">Agosto</SelectItem>
              <SelectItem value="m9">Septiembre</SelectItem>
              <SelectItem value="m10">Octubre</SelectItem>
              <SelectItem value="m11">Noviembre</SelectItem>
              <SelectItem value="m12">Diciembre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Resumen principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Tarjeta de Ingresos */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-emerald-50 p-2">
            <CardTitle className="text-lg text-emerald-700 flex items-center">
              <ArrowUpFromLine className="mr-2 h-5 w-5" />
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-600">
              {new Intl.NumberFormat('es-ES', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              }).format(incomeTotal)} €
            </p>
          </CardContent>
        </Card>
        
        {/* Tarjeta de Gastos */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-red-50 p-2">
            <CardTitle className="text-lg text-red-700 flex items-center">
              <ArrowDownToLine className="mr-2 h-5 w-5" />
              Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat('es-ES', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              }).format(expensesTotal)} €
            </p>
          </CardContent>
        </Card>
        
        {/* Tarjeta de Resultado */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-blue-50 p-2">
            <CardTitle className="text-lg text-blue-700 flex items-center">
              <PiggyBank className="mr-2 h-5 w-5" />
              Resultado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat('es-ES', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              }).format(balanceTotal)} €
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Sección de Gastos por Categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpensesByCategoryApple />
        
        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50 p-2">
            <CardTitle className="text-lg">Información</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este panel muestra el componente <strong>ExpensesByCategoryApple</strong>, que 
                proporciona una visualización con estilo Apple de los gastos por categoría.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Características principales:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Gráfico de donut con estilo minimalista Apple</li>
                <li>Respeta los filtros de año y trimestre</li>
                <li>Muestra el total en el centro con formato localizado</li>
                <li>Leyenda con los valores y porcentajes de cada categoría</li>
                <li>Estados de carga y vacío con diseño adecuado</li>
                <li>Animaciones suaves en las transiciones</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Puedes cambiar el periodo utilizando los selectores en la parte superior
                para ver cómo el componente se actualiza automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppleDashboardDemo;