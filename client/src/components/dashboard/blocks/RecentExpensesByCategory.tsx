import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, subMonths, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
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
import { useLocation } from "wouter";

// Definición de tipos
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
  categoryIcon?: string;
  categoryColor?: string;
  paymentMethod: string | null;
  notes: string | null;
}

interface Category {
  id: number;
  userId: number;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
}

// Componente principal
const RecentExpensesByCategoryBase: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  const [_, setLocation] = useLocation();
  
  // Estado para el rango de fechas
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  
  // Estado para el período predefinido seleccionado
  const [selectedPeriod, setSelectedPeriod] = useState<string>("mes");
  
  // Estado para guardar las transacciones procesadas
  const [processedTransactions, setProcessedTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Obtener las transacciones
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Obtener las categorías
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Formato para moneda - memoizado para evitar recreaciones en cada render
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(value / 100);
  }, []);
  
  // Manejador para el cambio de período predefinido - memoizado para evitar recreaciones
  const handlePeriodChange = useCallback((value: string) => {
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
        from = subMonths(today, 1);
    }
    
    setDateRange({ from, to: today });
  }, []);
  
  // Formatear fechas para mostrar - memoizado para mejorar rendimiento
  const formatDateDisplay = useCallback(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "d MMM yyyy", { locale: es })} - ${format(dateRange.to, "d MMM yyyy", { locale: es })}`;
    }
    return "";
  }, [dateRange]);

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
      const filteredTransactions = transactions
        .filter(transaction => {
          // Solo incluir gastos
          if (transaction.type !== 'expense') return false;
          
          // Verificar si la fecha está dentro del rango seleccionado
          const txDate = new Date(transaction.date);
          return dateRange.from && dateRange.to && 
                 isWithinInterval(txDate, {
                   start: dateRange.from,
                   end: dateRange.to
                 });
        })
        .map(transaction => {
          // Enriquecer con información de categoría
          const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : null;
          return {
            ...transaction,
            categoryName: category ? category.name : "Sin categoría",
            categoryIcon: category?.icon || "💼",
            categoryColor: category?.color || "#6E56CF"
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Ordenar por fecha descendente
        .slice(0, 5); // Limitar a los 5 más recientes

      setProcessedTransactions(filteredTransactions);
      setIsProcessing(false);
    }
  }, [transactions, categories, dateRange]);

  // Navegación a la página de detalles - memoizado para evitar recreaciones
  const goToTransactionDetails = useCallback((id: number) => {
    setLocation(`/transactions/${id}`);
  }, [setLocation]);

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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center mb-2 md:mb-0">
          <CreditCard className="h-5 w-5 text-indigo-500 mr-2" />
          <h3 className="text-lg font-medium">Gastos Recientes</h3>
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
        {processedTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay gastos en el período seleccionado</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation('/expenses/new')}
            >
              Registrar gasto
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lista de transacciones recientes */}
            <div className="space-y-3">
              {processedTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  onClick={() => goToTransactionDetails(transaction.id)}
                >
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                      style={{ backgroundColor: `${transaction.categoryColor}20` }}
                    >
                      <span className="text-xl">{transaction.categoryIcon}</span>
                    </div>
                    <div>
                      <p className="font-medium line-clamp-1">{transaction.title || transaction.description}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-2">{format(new Date(transaction.date), "d MMM yyyy", { locale: es })}</span>
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                          {transaction.categoryName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <p className="font-medium text-red-600 mr-2">
                      {formatCurrency(-parseFloat(transaction.amount))}
                    </p>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Botón para ver todos los gastos */}
            <div className="pt-2 border-t">
              <Button 
                variant="ghost" 
                className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                onClick={() => setLocation('/expenses')}
              >
                Ver todos los gastos
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Aplicar memoización al componente para evitar renderizados innecesarios
export default React.memo(RecentExpensesByCategoryBase);