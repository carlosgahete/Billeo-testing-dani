import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Car, 
  Coffee, 
  Home,
  FileText,
  Briefcase,
  HelpCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  paymentMethod: string;
  categoryId: number | null;
  notes?: string;
}

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
}

// Mapa de íconos según la categoría
const CategoryIcons: Record<string, React.ReactNode> = {
  "Supermercado": <ShoppingCart size={18} />,
  "Transporte": <Car size={18} />,
  "Restaurantes": <Coffee size={18} />,
  "Servicios": <Home size={18} />,
  "Servicios Profesionales": <Briefcase size={18} />,
  "Impuestos": <FileText size={18} />,
  "Viajes": <TrendingUp size={18} />,
  "Otros": <HelpCircle size={18} />
};

const getCategoryIcon = (categoryName: string) => {
  return CategoryIcons[categoryName] || <HelpCircle size={18} />;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit' });
};

const TransactionItem = ({ 
  transaction, 
  categories 
}: { 
  transaction: Transaction; 
  categories: Category[] | undefined;
}) => {
  const isIncome = transaction.type === "income";
  const category = categories?.find(c => c.id === transaction.categoryId);
  const categoryName = category?.name || (isIncome ? "Ingreso" : "Otros");
  
  // Determinar el color de fondo basado en la categoría o tipo
  let bgColorClass = isIncome ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500";
  
  // Mapa de colores seguros para categorías comunes
  const safeColorMap: Record<string, string> = {
    "Supermercado": "bg-blue-50 text-blue-600",
    "Transporte": "bg-purple-50 text-purple-600",
    "Restaurantes": "bg-yellow-50 text-yellow-600",
    "Servicios": "bg-cyan-50 text-cyan-600",
    "Servicios Profesionales": "bg-indigo-50 text-indigo-600",
    "Impuestos": "bg-pink-50 text-pink-600",
    "Viajes": "bg-orange-50 text-orange-600",
    "Otros": "bg-gray-50 text-gray-600"
  };
  
  // Usar colores seguros según la categoría
  if (category && safeColorMap[categoryName]) {
    bgColorClass = safeColorMap[categoryName];
  }
  
  // Asegurarse de que el monto sea un número
  const amount = typeof transaction.amount === 'string' 
    ? parseFloat(transaction.amount) 
    : transaction.amount;

  return (
    <div className="py-3 flex justify-between items-center hover:bg-gray-50 rounded-md px-2 transition-colors">
      <div className="flex items-center">
        <div className={`p-2 rounded-full ${bgColorClass} mr-3`}>
          {isIncome ? <TrendingUp size={18} /> : getCategoryIcon(categoryName)}
        </div>
        <div>
          <p className="text-sm font-medium truncate max-w-[180px]">
            {transaction.description}
          </p>
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <span>{formatDate(transaction.date)}</span>
            {category && (
              <>
                <span className="mx-1">•</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {categoryName}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>
      <div className={`${isIncome ? "text-green-600" : "text-red-500"} font-medium text-sm`}>
        {isIncome ? "+" : "-"}{formatCurrency(Math.abs(amount))}
      </div>
    </div>
  );
};

const RecentTransactions = () => {
  const [, navigate] = useLocation();
  
  // Obtener las transacciones más recientes con un límite específico
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions/recent"],
  });
  
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const isLoading = transactionsLoading || categoriesLoading;

  // Manejar casos cuando los datos aún no están disponibles
  const transactionList = transactions || [];
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-gray-200 p-4 flex-row justify-between items-center space-y-0">
        <CardTitle className="font-medium text-gray-800 text-base">Movimientos recientes</CardTitle>
        <Button 
          variant="ghost"
          size="sm"
          className="text-primary h-8 hover:text-primary-dark hover:bg-primary-50/50"
          onClick={() => navigate("/transactions")}
        >
          Ver todos
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 divide-y divide-gray-100">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="py-3">
              <div className="flex justify-between">
                <div className="flex items-center">
                  <Skeleton className="h-8 w-8 rounded-full mr-3" />
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))
        ) : transactionList.length > 0 ? (
          // Mostrar hasta los 5 movimientos más recientes
          transactionList.slice(0, 5).map((transaction) => (
            <TransactionItem 
              key={transaction.id} 
              transaction={transaction} 
              categories={categories || []}
            />
          ))
        ) : (
          <div className="py-6 text-center text-gray-500">
            <HelpCircle className="h-12 w-12 mx-auto opacity-20 mb-2" />
            <p>No hay movimientos recientes</p>
            <Button 
              variant="link" 
              size="sm"
              className="mt-2"
              onClick={() => navigate("/transactions/create")}
            >
              Crear un movimiento
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTransactions;
