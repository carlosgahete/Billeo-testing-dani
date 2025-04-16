import React from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Dashboard completamente rediseñado para la aplicación
 */
const NewDashboard: React.FC = () => {
  const { data, isLoading, filters } = useDashboardData();
  const { year, period, changeYear, changePeriod } = filters;

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i.toString());
    }
    return years;
  };

  const periodOptions = [
    { value: 'all', label: 'Todo el año' },
    { value: 'Q1', label: '1er Trimestre' },
    { value: 'Q2', label: '2do Trimestre' },
    { value: 'Q3', label: '3er Trimestre' },
    { value: 'Q4', label: '4to Trimestre' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg font-medium">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="container px-4 mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Financiero</h1>
        
        <div className="flex gap-2">
          <Select value={year} onValueChange={changeYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {generateYearOptions().map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={changePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tarjetas de ingresos y gastos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos (Base Imponible)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.baseImponible || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gastos (Base Imponible)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.baseImponibleGastos || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultado Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.netResult || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Facturas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.pendingInvoices || 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              {data?.pendingCount || 0} facturas sin cobrar
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de impuestos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>IVA a liquidar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.taxes?.ivaALiquidar || 0)}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">IVA Repercutido:</span>
                <div>{formatCurrency(data?.ivaRepercutido || 0)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">IVA Soportado:</span>
                <div>{formatCurrency(data?.ivaSoportado || 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IRPF a pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.taxes?.incomeTax || 0)}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">IRPF Retenido:</span>
                <div>{formatCurrency(data?.irpfRetenidoIngresos || 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores netos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Ingresos netos:</span>
                <div className="font-semibold">{formatCurrency(data?.netIncome || 0)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Gastos netos:</span>
                <div className="font-semibold">{formatCurrency(data?.netExpenses || 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Espacio para futuras secciones / gráficos */}
      <div className="mb-6">
        {/* Aquí se pueden añadir gráficos, tablas adicionales u otra información relevante */}
      </div>
    </div>
  );
};

export default NewDashboard;