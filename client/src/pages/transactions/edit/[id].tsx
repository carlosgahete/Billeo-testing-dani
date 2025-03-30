import { useQuery } from "@tanstack/react-query";
import TransactionForm from "@/components/transactions/TransactionForm";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";

const EditTransactionPage = () => {
  const { id } = useParams();
  const transactionId = parseInt(id);
  
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  const [, navigate] = useLocation();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/transactions")}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-neutral-800">Editar movimiento</h1>
      </div>
      <TransactionForm transactionId={transactionId} />
    </div>
  );
};

export default EditTransactionPage;