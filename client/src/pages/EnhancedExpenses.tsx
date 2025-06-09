import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EnhancedExpenseForm from "@/components/expenses/EnhancedExpenseForm";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Filter, Receipt, Building2, Calculator } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EnhancedExpense {
  id: number;
  expenseNumber: string;
  description: string;
  expenseDate: string;
  supplierName?: string;
  supplierTaxId?: string;
  netAmount: string;
  vatAmount: string;
  irpfAmount: string;
  totalAmount: string;
  deductibleForCorporateTax: boolean;
  deductibleForIrpf: boolean;
  invoiceNumber?: string;
  createdFromOcr: boolean;
  requiresReview: boolean;
}

interface TaxSummary {
  totalExpenses: number;
  totalNet: number;
  totalVat: number;
  totalVatDeductible: number;
  totalIrpf: number;
  totalGross: number;
  deductibleCorporateTax: number;
  deductibleIrpf: number;
}

const EnhancedExpenses = () => {
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("all");

  // Obtener gastos mejorados
  const { data: expenses, isLoading: expensesLoading, refetch } = useQuery<EnhancedExpense[]>({
    queryKey: ["/api/expenses", { year: selectedYear, month: selectedMonth }],
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  // Obtener resumen fiscal
  const { data: taxSummary } = useQuery<TaxSummary>({
    queryKey: ["/api/expenses/tax-summary", { year: selectedYear, month: selectedMonth }],
    refetchInterval: 30000,
  });

  const handleExpenseCreated = () => {
    setShowForm(false);
    refetch();
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
            className="mb-4"
          >
            ← Volver a gastos
          </Button>
          <h1 className="text-3xl font-bold">Nuevo Gasto</h1>
        </div>
        <EnhancedExpenseForm />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Receipt className="h-8 w-8 mr-3" />
            Gastos Fiscales
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema avanzado de gastos con información fiscal completa
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium mb-1">Año</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2023, 2022, 2021].map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mes</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString()}>
                    {format(new Date(2024, i, 1), 'MMMM', { locale: es })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Fiscal */}
      {taxSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(taxSummary.totalGross)}</div>
              <p className="text-xs text-muted-foreground">
                {taxSummary.totalExpenses} gastos registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Base Imponible</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(taxSummary.totalNet)}</div>
              <p className="text-xs text-muted-foreground">
                Sin IVA ni IRPF
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IVA Soportado</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(taxSummary.totalVat)}</div>
              <p className="text-xs text-muted-foreground">
                Deducible: {formatCurrency(taxSummary.totalVatDeductible)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IRPF Retenido</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(taxSummary.totalIrpf)}</div>
              <p className="text-xs text-muted-foreground">
                Retenciones practicadas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Descripción</th>
                    <th className="text-left p-2">Proveedor</th>
                    <th className="text-right p-2">Neto</th>
                    <th className="text-right p-2">IVA</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-center p-2">Estado</th>
                    <th className="text-center p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{expense.description}</div>
                          {expense.expenseNumber && (
                            <div className="text-sm text-gray-500">
                              {expense.expenseNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          {expense.supplierName && (
                            <div className="font-medium">{expense.supplierName}</div>
                          )}
                          {expense.supplierTaxId && (
                            <div className="text-sm text-gray-500">
                              {expense.supplierTaxId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(expense.netAmount)}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(expense.vatAmount)}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(expense.totalAmount)}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center space-x-1">
                          {expense.createdFromOcr && (
                            <Badge variant="secondary" className="text-xs">OCR</Badge>
                          )}
                          {expense.requiresReview && (
                            <Badge variant="destructive" className="text-xs">Revisar</Badge>
                          )}
                          {expense.deductibleForCorporateTax && (
                            <Badge variant="default" className="text-xs">Deducible</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/expenses/enhanced/${expense.id}/edit`)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay gastos registrados</p>
              <Button
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Crear primer gasto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedExpenses; 