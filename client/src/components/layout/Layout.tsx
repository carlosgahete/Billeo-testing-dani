import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Close mobile menu when switching to desktop
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
    // Solo abrimos el sidebar automáticamente la primera vez en desktop
    // NO forzamos que esté abierto cada vez que cambia el tamaño de la pantalla
  }, [isMobile]);

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      {/* Header - solo visible en modo móvil */}
      <Header 
        isMobile={isMobile} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMobile={isMobile}
        />
        
        {/* Botón flotante para controlar el sidebar en desktop */}
        {!isMobile && (
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed top-20 left-4 z-50 bg-white rounded-full p-3 shadow-md text-primary hover:bg-primary/10 transition-colors"
            aria-label={sidebarOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
          >
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        )}

        {/* Main content */}
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="p-4 lg:p-6 mt-16 transition-all duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
