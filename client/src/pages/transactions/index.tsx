import { useQuery } from "@tanstack/react-query";
import TransactionList from "@/components/transactions/TransactionList";
import { Loader2, BarChart3 } from "lucide-react";
import { Header } from "@/components/ui/header";

const TransactionsPage = () => {
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return <TransactionList />;
};

export default TransactionsPage;
