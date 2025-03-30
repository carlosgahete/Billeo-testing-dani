import { useQuery } from "@tanstack/react-query";
import TransactionForm from "@/components/transactions/TransactionForm";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const EditTransactionPage = () => {
  const { id } = useParams();
  const transactionId = parseInt(id);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  console.log("Editing transaction with ID:", transactionId);
  
  // Interfaz para la respuesta de autenticación
  interface AuthResponse {
    authenticated: boolean;
    user?: {
      id: number;
      username: string;
      name: string;
      [key: string]: any;
    };
  }
  
  // Verificar estado de autenticación
  const { data: authData, isLoading: authLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/session"],
  });
  
  // Redireccionar si no está autenticado
  useEffect(() => {
    if (!authLoading && (!authData || !authData.authenticated)) {
      toast({
        title: "Acceso denegado",
        description: "Debes iniciar sesión para editar una transacción",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [authData, authLoading, navigate, toast]);

  if (authLoading || !authData?.authenticated) {
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