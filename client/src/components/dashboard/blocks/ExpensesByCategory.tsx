import React, { useState, useEffect } from "react";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, subMonths, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

// Los iconos para cada categoría se asignarán según el nombre
// Esto se puede ampliar según las categorías que tengan los usuarios
const CATEGORY_ICONS: Record<string, string> = {
  "Sin categoría": "💰",
  "Suministros": "💡",
  "Material oficina": "📎",
  "Software y suscripciones": "🔒",
  "Marketing": "📣",
  "Transporte": "🚗",
  "Alimentación": "🍔",
  "Alojamiento": "🏨",
  "Telefonía": "📱",
  "Internet": "🌐",
  "Seguros": "🛡️",
  "Formación": "📚",
  "Asesoría": "📋",
  "Impuestos": "📊",
  "Otros": "📦"
};

// Los colores para cada categoría
const CATEGORY_COLORS: Record<string, string> = {
  "Sin categoría": "#000000",
  "Suministros": "#4355b9",
  "Material oficina": "#5c6bc0",
  "Software y suscripciones": "#6f42c1",
  "Marketing": "#3355b9",
  "Transporte": "#42a5f5",
  "Alimentación": "#26a69a",
  "Alojamiento": "#66bb6a",
  "Telefonía": "#ec407a",
  "Internet": "#7e57c2",
  "Seguros": "#5c6bc0",
  "Formación": "#26a69a",
  "Asesoría": "#8d6e63",
  "Impuestos": "#ef5350",
  "Otros": "#78909c"
};

// Función para obtener un color aleatorio para categorías sin color predefinido
const getRandomColor = () => {
  return "#" + Math.floor(Math.random()*16777215).toString(16);
};

interface CategoryExpense {
  name: string;
  value: number;
  percent: number;
  transactions: number;
  color: string;
  icon: React.ReactNode;
}

interface Transaction {
  id: number;
  userId: number;
  type: string;
  title: string | null;
  date: string;
  amount: string;
  description: string;
  categoryId: number | null;
  categoryName?: string;
  paymentMethod: string | null;
  notes: string | null;
}

interface Category {
  id: number;
  userId: number;
  name: string;
  type: string;
  color: string | null;
}

const ExpensesByCategory: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  // Estado para el rango de fechas
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });
  
  // Estado para el período predefinido seleccionado
  const [selectedPeriod, setSelectedPeriod] = useState<string>("trimestre");
  
  // Estado para guardar las categorías procesadas
  const [processedCategories, setProcessedCategories] = useState<CategoryExpense[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Obtener las transacciones
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Obtener las categorías
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Formato para moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(value / 100);
  };
  
  // Manejador para el cambio de período predefinido
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    
    const today = new Date();
    let from: Date;
    
    switch (value) {
      case "mes":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "trimestre":
        from = subMonths(today, 3);
        break;
      case "semestre":
        from = subMonths(today, 6);
        break;
      case "año":
        from = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        from = subMonths(today, 3);
    }
    
    setDateRange({ from, to: today });
  };
  
  // Formatear fechas para mostrar
  const formatDateDisplay = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "d MMM yyyy", { locale: es })} - ${format(dateRange.to, "d MMM yyyy", { locale: es })}`;
    }
    return "";
  };
  
  // Efecto para procesar las transacciones cuando cambia alguna dependencia
  useEffect(() => {
    // Solo procesar si tenemos transacciones, categorías y un rango de fechas definido
    if (transactions && categories && dateRange?.from && dateRange?.to) {
      setIsProcessing(true);

      // Creamos un mapa de categorías por ID para acceso rápido
      const categoryMap = new Map<number, Category>();
      categories.forEach(category => {
        categoryMap.set(category.id, category);
      });

      // Filtramos las transacciones por tipo (gasto) y por rango de fechas
      const filteredTransactions = transactions.filter(transaction => {
        // Solo incluir gastos
        if (transaction.type !== 'expense') return false;
        
        // Verificar si la fecha está dentro del rango seleccionado
        const txDate = new Date(transaction.date);
        return dateRange.from && dateRange.to && 
               isWithinInterval(txDate, {
                 start: dateRange.from,
                 end: dateRange.to
               });
      });

      // Agrupamos por categoría
      const expensesByCategory: Record<string, { 
        total: number, 
        count: number, 
        categoryId: number | null,
        categoryName: string,
        color: string
      }> = {};

      filteredTransactions.forEach(tx => {
        const categoryId = tx.categoryId;
        const category = categoryId ? categoryMap.get(categoryId) : null;
        const categoryName = category ? category.name : "Sin categoría";
        const amount = parseFloat(tx.amount);

        // Inicializar si no existe
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = {
            total: 0,
            count: 0,
            categoryId: categoryId,
            categoryName: categoryName,
            color: category?.color || CATEGORY_COLORS[categoryName] || getRandomColor()
          };
        }

        // Acumular
        expensesByCategory[categoryName].total += Math.abs(amount);
        expensesByCategory[categoryName].count += 1;
      });

      // Calcular el total de gastos
      const totalExpense = Object.values(expensesByCategory)
        .reduce((sum, cat) => sum + cat.total, 0);

      // Convertir a array y calcular porcentajes
      const categoriesArray: CategoryExpense[] = Object.entries(expensesByCategory)
        .map(([name, data]) => {
          const percent = totalExpense > 0 
            ? parseFloat(((data.total * 100) / totalExpense).toFixed(2))
            : 0;
            
          // Multiplicamos por 100 para convertir de euros a céntimos
          return {
            name,
            value: Math.round(data.total * 100),
            percent,
            transactions: data.count,
            color: data.color,
            icon: <span className="text-xl">{CATEGORY_ICONS[name] || "📦"}</span>
          };
        })
        .sort((a, b) => b.value - a.value);  // Ordenar de mayor a menor

      setProcessedCategories(categoriesArray);
      setIsProcessing(false);
    }
  }, [transactions, categories, dateRange]);

  // Datos para el gráfico circular
  const chartData = processedCategories.map(cat => ({
    name: cat.name,
    value: cat.value,
    color: cat.color
  }));

  // Calcular el total de gastos
  const totalExpenses = processedCategories.reduce((sum, cat) => sum + cat.value, 0);
  
  // Determinar si está cargando
  const isLoading = dashboardLoading || transactionsLoading || categoriesLoading || isProcessing;
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center p-3 bg-gray-50">
          <Skeleton className="h-5 w-5 mr-2" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4">
          <Skeleton className="h-7 w-24 mb-2" />
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center mb-2 md:mb-0">
          <h3 className="text-lg font-medium">Pagos</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Selector de período predefinido */}
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="trimestre">Último trimestre</SelectItem>
              <SelectItem value="semestre">Último semestre</SelectItem>
              <SelectItem value="año">Este año</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Selector de rango de fechas personalizado */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>{formatDateDisplay()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="p-4">
        {processedCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay gastos en el período seleccionado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Gráfico de sectores */}
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Lista de categorías */}
            <div className="lg:col-span-3 space-y-3">
              {processedCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: category.color + '20' }}>
                      <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: category.color }}>
                        {category.icon}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-gray-500">{category.transactions} transacciones</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(-category.value)}</p>
                    <p className="text-sm text-gray-500">{category.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesByCategory;