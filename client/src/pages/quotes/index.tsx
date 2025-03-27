import { useAuth } from "@/hooks/use-auth";
import { QuoteList } from "@/components/quotes/QuoteList";
import { PageTitle } from "@/components/ui/page-title";
import Layout from "@/components/layout/Layout";
import { useState, useEffect } from "react";

export default function QuotesPage() {
  const { user } = useAuth();
  const [showButton, setShowButton] = useState(false);
  
  useEffect(() => {
    // Si estamos en la página de presupuestos, ocultamos el botón del Layout principal
    // y activamos el nuestro si es necesario
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      setShowButton(!sidebar.classList.contains('translate-x-0'));
    }
    
    // Escuchar los cambios en el sidebar
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          setShowButton(!sidebar.classList.contains('translate-x-0'));
        }
      });
    });
    
    if (sidebar) {
      observer.observe(sidebar, { attributes: true });
    }
    
    return () => {
      if (sidebar) {
        observer.disconnect();
      }
    };
  }, []);
  
  // Función para abrir el sidebar
  const handleOpenSidebar = () => {
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      setShowButton(false);
      
      // Actualizar el margen del contenido principal
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.style.marginLeft = '16rem';
      }
    }
  };

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <Layout>
      {showButton && (
        <button 
          onClick={handleOpenSidebar}
          className="fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow-md text-primary hover:bg-primary/10 transition-colors"
          aria-label="Abrir menú lateral"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}
      <PageTitle 
        title="Presupuestos" 
        description="Gestiona tus presupuestos, envíalos a clientes y conviértelos en facturas." 
      />
      <div className="mt-6">
        <QuoteList userId={user.id} showActions={true} />
      </div>
    </Layout>
  );
}