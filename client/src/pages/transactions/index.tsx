import { useQuery } from "@tanstack/react-query";
import TransactionList from "@/components/transactions/TransactionList";
import { Loader2 } from "lucide-react";
import { useEffect } from 'react';

const TransactionsPage = () => {
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  // Función para ocultar calendarios flotantes en la carga de la página
  useEffect(() => {
    // Insertar estilos especiales para asegurar que los calendarios no interfieran
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* Estilos específicos para calendarios en página de transacciones */
      .rdp-table { background-color: white !important; }
      .transactions-page .rdp { position: relative !important; z-index: 50 !important; }
      .transactions-page .calendar-root { position: relative !important; }
    `;
    document.head.appendChild(styleEl);

    return () => {
      // Limpiar los estilos cuando se desmonte el componente
      document.head.removeChild(styleEl);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="transactions-page">
      <TransactionList />
    </div>
  );
};

export default TransactionsPage;
