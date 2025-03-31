import { useQuery } from "@tanstack/react-query";
import TransactionForm from "@/components/transactions/TransactionForm";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const CreateTransactionPage = () => {
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
    <div className="max-w-full">
      <div className="flex flex-col mb-6 gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/transactions")}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-xl font-bold text-neutral-800 break-words">
          Registrar movimiento
        </h1>
      </div>
      <TransactionForm />
    </div>
  );
};

export default CreateTransactionPage;
