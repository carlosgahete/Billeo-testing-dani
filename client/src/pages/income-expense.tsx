import { useEffect, useRef } from "react";
import Layout from "@/components/layout/Layout";
import IncomeExpenseReport from "@/components/reports/IncomeExpenseReport";

export default function IncomeExpensePage() {
  // Referencia para rastrear si ya se ha montado
  const mountedRef = useRef(false);
  
  // Un efecto específico para esta página que forzará el cierre correcto del sidebar 
  // y evitará el problema visual de tener que hacer doble clic
  useEffect(() => {
    // Solo ejecutar en la primera carga de la página
    if (!mountedRef.current) {
      mountedRef.current = true;
      
      // Forzar el cierre del sidebar (si está abierto al cargar)
      const mainElement = document.querySelector('main');
      if (mainElement) {
        // Asegurar margen inicial correcto
        setTimeout(() => {
          mainElement.style.transition = 'none'; // Desactivar animaciones temporalmente
          mainElement.style.marginLeft = '16rem'; // Margen cuando está abierto
          
          // Pequeña espera para que React procese cambios en DOM
          setTimeout(() => {
            mainElement.style.transition = 'all 300ms'; // Restaurar animaciones
            mainElement.style.marginLeft = '0'; // Cerrar sidebar
          }, 10);
        }, 100);
      }
      
      // Sobrescribir el comportamiento del botón para esta página específica
      const sidebarToggleButton = document.querySelector('button[aria-label="Cerrar menú lateral"]');
      if (sidebarToggleButton) {
        // Agregar un nuevo listener para evitar problemas con tipos de TypeScript
        sidebarToggleButton.addEventListener('click', () => {
          // Esperar a que termine el evento original
          setTimeout(() => {
            // Forzar actualización inmediata del margen
            if (mainElement) {
              mainElement.style.marginLeft = '0';
            }
          }, 50);
        });
      }
    }
    
    // Limpieza al desmontar el componente
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <Layout>
      <IncomeExpenseReport />
    </Layout>
  );
}