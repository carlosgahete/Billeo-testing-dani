import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Vamos a simplificar el scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  useEffect(() => {
    // Close mobile menu when switching to desktop
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
    // Set sidebar based on screen size
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      {/* Mobile header */}
      {isMobile && (
        <Header 
          isMobile={true} 
          mobileMenuOpen={mobileMenuOpen} 
          setMobileMenuOpen={setMobileMenuOpen} 
        />
      )}

      <div className="flex flex-1 overflow-auto">
        {/* Sidebar - Diseño fijo */}
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMobile={isMobile}
        />
        
        {/* Botón flotante para cuando el sidebar está cerrado en desktop */}
        {!isMobile && !sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-10 bg-white rounded-full p-2 shadow-md text-primary hover:bg-primary/10 transition-colors"
            aria-label="Abrir menú lateral"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}

        {/* Main content - Dashboard wrapper con scroll ilimitado */}
        <div 
          className={`
            flex-1 
            overflow-y-auto 
            dashboard-wrapper
            ${isMobile ? 'pt-20' : ''}
            ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'} 
            transition-all duration-300
            w-full
          `}
        >
          <div className="w-full min-h-screen py-1 lg:py-6 px-1 sm:px-2 lg:px-4 pb-20 max-w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
