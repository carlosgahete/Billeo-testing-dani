import TransactionForm from "@/components/transactions/TransactionForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";

const EditTransactionPage = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  
  // Validar que tenemos un ID válido
  if (!id || isNaN(parseInt(id))) {
    console.log("❌ ID de transacción inválido:", id);
    navigate("/transactions");
    return null;
  }
  
  const transactionId = parseInt(id);
  console.log("✅ Editando transacción con ID:", transactionId);

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
          Editar movimiento
        </h1>
      </div>
      <TransactionForm transactionId={transactionId} />
    </div>
  );
};

export default EditTransactionPage;