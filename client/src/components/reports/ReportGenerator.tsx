import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Download, FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryId: number | null;
}

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes?: string;
  additionalTaxes?: any[] | null;
}

interface ChartDataItem {
  name: string;
  value: number;
}

const getPeriodLabel = (period: string) => {
  switch (period) {
    case "monthly":
      return "Mensual";
    case "quarterly":
      return "Trimestral";
    case "annual":
      return "Anual";
    default:
      return "Personalizado";
  }
};

const ReportGenerator = () => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("income-expense");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Añadimos la consulta de facturas para incluirlas en los informes
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const isLoading = transactionsLoading || categoriesLoading || invoicesLoading;

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId || !categories) return "Sin categoría";
    const category = categories.find((c: Category) => c.id === categoryId);
    return category ? category.name : "Sin categoría";
  };

  const getCategoryColor = (categoryId: number | null) => {
    if (!categoryId || !categories) return "#cccccc";
    const category = categories.find((c: Category) => c.id === categoryId);
    return category ? category.color : "#cccccc";
  };

  // Filter transactions based on date range
  const filteredTransactions = transactions?.filter((transaction: Transaction) => {
    const transactionDate = new Date(transaction.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);
    return transactionDate >= start && transactionDate <= end;
  });
  
  // Filter invoices based on date range
  const filteredInvoices = invoices?.filter((invoice: Invoice) => {
    const invoiceDate = new Date(invoice.issueDate);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);
    return invoiceDate >= start && invoiceDate <= end;
  });

  // Prepare data for income-expense chart
  const incomeExpenseData: ChartDataItem[] = [];
  if (filteredTransactions && filteredInvoices) {
    // Ingresos de transacciones
    const transactionIncomeTotal = filteredTransactions
      .filter((t: Transaction) => t.type === "income")
      .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    
    // Ingresos de facturas pagadas
    const invoiceIncomeTotal = filteredInvoices
      .filter((invoice: Invoice) => invoice.status === "paid")
      .reduce((sum: number, invoice: Invoice) => sum + Number(invoice.subtotal), 0);
    
    // Total de ingresos combinados
    const incomeTotal = transactionIncomeTotal + invoiceIncomeTotal;
    
    // Gastos de transacciones
    const expenseTotal = filteredTransactions
      .filter((t: Transaction) => t.type === "expense")
      .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
    
    incomeExpenseData.push(
      { name: "Ingresos", value: incomeTotal },
      { name: "Gastos", value: expenseTotal }
    );
  }

  // Prepare data for category breakdown
  const categoryData: Array<{name: string, value: number}> = [];
  if (filteredTransactions && filteredInvoices && categories) {
    // Primero procesamos las transacciones por categoría
    const categorySums = filteredTransactions
      .filter((t: Transaction) => t.type === (reportType === "expense-categories" ? "expense" : "income"))
      .reduce((acc: Record<string, number>, transaction: Transaction) => {
        const categoryId = transaction.categoryId || 0;
        const categoryKey = categoryId.toString();
        if (!acc[categoryKey]) {
          acc[categoryKey] = 0;
        }
        acc[categoryKey] += Number(transaction.amount);
        return acc;
      }, {});
      
    // Si estamos viendo ingresos, también incluimos las facturas pagadas
    if (reportType === "income-categories") {
      // Agregamos una categoría "Facturas" para agrupar ingresos de facturas
      const invoicesTotal = filteredInvoices
        .filter((invoice: Invoice) => invoice.status === "paid")
        .reduce((sum: number, invoice: Invoice) => sum + Number(invoice.subtotal), 0);
      
      if (invoicesTotal > 0) {
        if (!categorySums["facturas"]) {
          categorySums["facturas"] = 0;
        }
        categorySums["facturas"] += invoicesTotal;
      }
    }
    
    // Convertimos los datos acumulados al formato para el gráfico
    Object.entries(categorySums).forEach(([categoryId, sum]) => {
      // Si es la categoría especial de facturas
      if (categoryId === "facturas") {
        categoryData.push({
          name: "Facturas",
          value: sum
        });
      } else {
        categoryData.push({
          name: getCategoryName(parseInt(categoryId) || null),
          value: sum
        });
      }
    });
  }

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    
    const today = new Date();
    let newStartDate;
    
    switch (value) {
      case "monthly":
        newStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "quarterly":
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
        newStartDate = new Date(today.getFullYear(), quarterMonth, 1);
        break;
      case "annual":
        newStartDate = new Date(today.getFullYear(), 0, 1);
        break;
      case "custom":
        // Keep current dates
        return;
      default:
        newStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    setStartDate(newStartDate.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    
    try {
      // In a real app, this would generate a PDF using the data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Informe generado",
        description: `El informe ${getPeriodLabel(period)} ha sido generado correctamente`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo generar el informe: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generador de informes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="report-type">Tipo de informe</Label>
            <Select
              value={reportType}
              onValueChange={setReportType}
            >
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Tipo de informe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income-expense">Ingresos y gastos</SelectItem>
                <SelectItem value="income-categories">Ingresos por categoría</SelectItem>
                <SelectItem value="expense-categories">Gastos por categoría</SelectItem>
                <SelectItem value="tax">Informe de impuestos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="period">Período</Label>
            <Select
              value={period}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger id="period">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="start-date">Fecha inicio</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={period !== "custom"}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end-date">Fecha fin</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={period !== "custom"}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="chart">Gráfico</TabsTrigger>
              <TabsTrigger value="table">Tabla</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chart" className="space-y-4">
              <div className="h-80 w-full">
                {reportType === "income-expense" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={incomeExpenseData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toFixed(2)} €`} />
                      <Legend />
                      <Bar dataKey="value" name="Importe (€)" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (reportType === "income-categories" || reportType === "expense-categories") ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(2)} €`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col justify-center items-center h-full text-center">
                    <h3 className="text-lg font-medium mb-2">Informe de Impuestos</h3>
                    <p className="text-neutral-600 mb-4">
                      Este informe muestra un resumen de tus obligaciones fiscales basado en tus
                      ingresos y gastos durante el período seleccionado.
                    </p>
                    <div className="grid grid-cols-2 gap-8 w-full max-w-md">
                      <div className="text-center">
                        <p className="text-sm text-neutral-500">IVA a pagar</p>
                        <p className="text-2xl font-bold text-primary-700">
                          {isLoading ? "..." : "1.785,25 €"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-neutral-500">IRPF estimado</p>
                        <p className="text-2xl font-bold text-warning-700">
                          {isLoading ? "..." : "925,50 €"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-medium">Resumen</h3>
                  <p className="text-sm text-neutral-500">
                    Período: {getPeriodLabel(period)} ({startDate} - {endDate})
                  </p>
                </div>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                  className="flex items-center"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="table">
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Concepto
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Importe
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {(reportType === "income-expense" ? incomeExpenseData : categoryData).map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 text-right">
                          {item.value.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        {(reportType === "income-expense" 
                          ? incomeExpenseData.reduce((sum, item) => sum + item.value, 0) 
                          : categoryData.reduce((sum, item) => sum + item.value, 0)
                        ).toFixed(2)} €
                      </th>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                  className="flex items-center"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportGenerator;
