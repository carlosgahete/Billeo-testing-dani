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
  const incomeExpenseData: ChartDataItem[] = [
    { name: "Ingresos", value: 0 },
    { name: "Gastos", value: 0 }
  ];
  
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
    
    // Actualizar los valores
    incomeExpenseData[0].value = incomeTotal;
    incomeExpenseData[1].value = expenseTotal;
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

  // Estilo común para botón exportar PDF
  const exportButtonClass = `
    flex items-center shadow-md hover:shadow-lg transition-all duration-300
    bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600
    text-white font-medium px-4 py-2 rounded-lg
  `;

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
                  <div className="flex flex-col h-full">
                  <div className="mb-4 text-center">
                    <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">Comparativa de Ingresos y Gastos</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Período actual: {getPeriodLabel(period)}</p>
                  </div>

                  <div className="flex justify-center gap-5 mt-5 relative">
                    {/* Barra de Ingresos */}
                    <div className="flex flex-col items-center z-10 px-6 w-1/3 max-w-[180px]">
                      <div className="h-[180px] w-full relative bg-neutral-50 dark:bg-neutral-800/50 rounded-lg overflow-hidden flex flex-col-reverse">
                        <div 
                          className="w-full bg-emerald-500 shadow-lg rounded-t-sm relative"
                          style={{
                            height: `${Math.min(Math.max(40, (incomeExpenseData[0].value / (Math.max(incomeExpenseData[0].value, incomeExpenseData[1].value) * 1.1)) * 180), 180)}px`,
                            animation: 'growUp 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }}
                        >
                          <div className="absolute top-0 left-0 right-0 -translate-y-full mb-2 px-2 py-1 bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-emerald-100 dark:border-emerald-800 min-w-[150px] text-center flex justify-center items-center mx-auto" style={{ width: '160px', marginBottom: '5px', marginLeft: 'auto', marginRight: 'auto' }}>
                            <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {incomeExpenseData[0].value.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Ingresos</span>
                      </div>
                    </div>
                    
                    {/* Barra de Gastos */}
                    <div className="flex flex-col items-center z-10 px-6 w-1/3 max-w-[180px]">
                      <div className="h-[180px] w-full relative bg-neutral-50 dark:bg-neutral-800/50 rounded-lg overflow-hidden flex flex-col-reverse">
                        <div 
                          className="w-full bg-rose-500 shadow-lg rounded-t-sm relative"
                          style={{
                            height: `${Math.min(Math.max(40, (incomeExpenseData[1].value / (Math.max(incomeExpenseData[0].value, incomeExpenseData[1].value) * 1.1)) * 180), 180)}px`,
                            animation: 'growUp 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }}
                        >
                          <div className="absolute top-0 left-0 right-0 -translate-y-full mb-2 px-2 py-1 bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-rose-100 dark:border-rose-800 min-w-[150px] text-center flex justify-center items-center mx-auto" style={{ width: '160px', marginBottom: '5px', marginLeft: 'auto', marginRight: 'auto' }}>
                            <span className="font-semibold text-xs text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              {incomeExpenseData[1].value.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Gastos</span>
                      </div>
                    </div>
                    
                    {/* Barra de Balance */}
                    <div className="flex flex-col items-center z-10 px-6 w-1/3 max-w-[180px]">
                      <div className="h-[180px] w-full relative bg-neutral-50 dark:bg-neutral-800/50 rounded-lg overflow-hidden flex flex-col-reverse">
                        <div 
                          className="w-full bg-blue-500 shadow-lg rounded-t-sm relative"
                          style={{
                            height: `${Math.min(Math.max(40, ((incomeExpenseData[0].value - incomeExpenseData[1].value) / (Math.max(incomeExpenseData[0].value, incomeExpenseData[1].value) * 1.1)) * 180), 180)}px`,
                            animation: 'growUp 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }}
                        >
                          <div className="absolute top-0 left-0 right-0 -translate-y-full mb-2 px-2 py-1 bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-blue-100 dark:border-blue-800 min-w-[150px] text-center flex justify-center items-center mx-auto" style={{ width: '160px', marginBottom: '5px', marginLeft: 'auto', marginRight: 'auto' }}>
                            <span className="font-semibold text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {(incomeExpenseData[0].value - incomeExpenseData[1].value).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Balance</span>
                      </div>
                    </div>
                  </div>
                </div>
                ) : (reportType === "income-categories" || reportType === "expense-categories") ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {COLORS.map((color, index) => (
                          <linearGradient 
                            key={`gradient-${index}`}
                            id={`colorGradient-${index}`} 
                            x1="0" 
                            y1="0" 
                            x2="0" 
                            y2="1"
                          >
                            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = 25 + innerRadius + (outerRadius - innerRadius);
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          
                          return percent > 0.05 ? (
                            <text 
                              x={x} 
                              y={y} 
                              fill="#333333"
                              textAnchor={x > cx ? 'start' : 'end'} 
                              dominantBaseline="central"
                              style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                textShadow: '0px 0px 2px white'
                              }}
                            >
                              {`${name}: ${(percent * 100).toFixed(0)}%`}
                            </text>
                          ) : null;
                        }}
                        outerRadius={100}
                        innerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#colorGradient-${index % COLORS.length})`}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => {
                          const numValue = Number(value);
                          return isNaN(numValue) 
                            ? value 
                            : `${numValue.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €`;
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          padding: '10px',
                          border: '1px solid #eaeaea',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{
                          fontWeight: 'bold',
                          marginBottom: '5px'
                        }}
                      />
                      <Legend 
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: 20
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col justify-center items-center h-full text-center">
                    <h3 className="text-xl font-medium mb-3 text-blue-800">Informe de Impuestos</h3>
                    <p className="text-neutral-600 mb-6 max-w-xl">
                      Este informe muestra un resumen de tus obligaciones fiscales basado en tus
                      ingresos y gastos durante el período seleccionado.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center justify-center mb-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-blue-700 uppercase tracking-wider mb-1">IVA a pagar</p>
                        <p className="text-3xl font-bold text-blue-800 mb-2">
                          {isLoading ? 
                            <span className="inline-block w-24 h-8 bg-blue-200 animate-pulse rounded"></span> : 
                            "1.785,25 €"
                          }
                        </p>
                        <p className="text-xs text-blue-600">Próximo vencimiento: 20 de abril</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center justify-center mb-3">
                          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-amber-700 uppercase tracking-wider mb-1">IRPF estimado</p>
                        <p className="text-3xl font-bold text-amber-800 mb-2">
                          {isLoading ? 
                            <span className="inline-block w-24 h-8 bg-amber-200 animate-pulse rounded"></span> : 
                            "925,50 €"
                          }
                        </p>
                        <p className="text-xs text-amber-600">Declaración anual del 1 al 30 de junio</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-shadow duration-300 md:col-span-2">
                        <div className="flex items-center justify-center mb-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-emerald-700 uppercase tracking-wider mb-1">Tributación optimizada</p>
                        <p className="text-xl font-bold text-emerald-800 mb-2">
                          Ahorro estimado: 435,75 €
                        </p>
                        <p className="text-xs text-emerald-600">Basado en tus gastos deducibles y optimización fiscal</p>
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
                  className={exportButtonClass}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="h-5 w-5 mr-2" />
                      <span>Exportar PDF</span>
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
                  className={exportButtonClass}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="h-5 w-5 mr-2" />
                      <span>Exportar PDF</span>
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