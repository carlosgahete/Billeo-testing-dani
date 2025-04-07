import { useEffect } from "react";
import { useLocation } from "wouter";

// Componente de redirección para mantener la compatibilidad con enlaces existentes
export default function IncomeExpensePage() {
  const [location, navigate] = useLocation();
  
  useEffect(() => {
    // Obtener los parámetros de consulta de la URL actual
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab') || 'all';
    
    // Redirigir a la página de transacciones con los mismos parámetros
    navigate(`/transactions?tab=${tab}`, { replace: true });
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-neutral-100">
      <div className="text-center">
        <h2 className="text-xl font-medium text-gray-700 mb-2">Redirigiendo...</h2>
        <p className="text-gray-500">Te estamos llevando a la nueva página de Ingresos y Gastos</p>
      </div>
    </div>
  );
}