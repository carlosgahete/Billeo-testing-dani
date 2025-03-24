import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  paymentMethod: string;
  categoryId: number | null;
}

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
}

const TransactionItem = ({ 
  transaction, 
  categories 
}: { 
  transaction: Transaction; 
  categories: Category[] | undefined;
}) => {
  const isIncome = transaction.type === "income";
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  };

  return (
    <div className="py-3 flex justify-between items-center">
      <div className="flex items-center">
        <div className={`p-2 rounded-full ${isIncome ? "bg-secondary-50 text-secondary-600" : "bg-danger-50 text-danger-500"} mr-3`}>
          {isIncome ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
        </div>
        <div>
          <p className="text-sm font-medium">{transaction.description}</p>
          <p className="text-xs text-neutral-500">
            {formatDate(transaction.date)} - {transaction.paymentMethod}
          </p>
        </div>
      </div>
      <div className={isIncome ? "text-secondary-600 font-medium" : "text-danger-500 font-medium"}>
        {isIncome ? "+" : "-"}{formatCurrency(Math.abs(Number(transaction.amount)))}
      </div>
    </div>
  );
};

const RecentTransactions = () => {
  const [, navigate] = useLocation();
  
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions/recent"],
  });
  
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });
  
  const isLoading = transactionsLoading || categoriesLoading;

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200 p-4 flex-row justify-between items-center space-y-0">
        <CardTitle className="font-medium text-neutral-800">Movimientos recientes</CardTitle>
        <Button 
          variant="link"
          className="text-primary-600 text-sm px-0"
          onClick={() => navigate("/transactions")}
        >
          Ver todos
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 divide-y divide-neutral-200">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="py-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
          ))
        ) : transactions?.length > 0 ? (
          transactions.map((transaction: Transaction) => (
            <TransactionItem 
              key={transaction.id} 
              transaction={transaction} 
              categories={categories}
            />
          ))
        ) : (
          <div className="py-4 text-center text-neutral-500">
            No hay movimientos recientes
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTransactions;
