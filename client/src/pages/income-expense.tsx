import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import IncomeExpenseReport from "@/components/reports/IncomeExpenseReport";

export default function IncomeExpensePage() {
  // Estilos directos para ocultar el botón de sidebar redundante
  useEffect(() => {
    // Crear estilos CSS para inyectar
    const style = document.createElement('style');
    style.id = 'fix-income-expense-sidebar';
    style.innerHTML = `
      /* Escondemos el segundo botón de sidebar que aparece en la página de Ingresos y Gastos */
      .billeo-sidebar-toggle:nth-of-type(2) {
        display: none !important;
      }
    `;
    
    // Añadir los estilos al head del documento
    document.head.appendChild(style);
    
    // Limpieza al desmontar
    return () => {
      const styleElement = document.getElementById('fix-income-expense-sidebar');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  return (
    <Layout>
      <IncomeExpenseReport />
    </Layout>
  );
}