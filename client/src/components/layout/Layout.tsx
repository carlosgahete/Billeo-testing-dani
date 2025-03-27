import { ReactNode, useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLocation] = useLocation();
  const previousLocation = useRef(currentLocation);
  
  useEffect(() => {
    // Close mobile menu when switching to desktop
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
    // Set sidebar based on screen size
    setSidebarOpen(!isMobile);
  }, [isMobile]);
  
  // Detect route changes to ensure sidebar state is consistent
  useEffect(() => {
    if (currentLocation !== previousLocation.current) {
      if (isMobile) {
        setMobileMenuOpen(false); // Close mobile menu on route change
      }
      previousLocation.current = currentLocation;
    }
  }, [currentLocation, isMobile]);
  
  // Detección más agresiva para corregir rutas con problemas de sidebar
  useEffect(() => {
    if (currentLocation === "/income-expense") {
      // Usamos un enfoque más directo para la página problemática
      const mainElement = document.querySelector('main');
      if (mainElement) {
        // Si detectamos que estamos en esta página, forzamos el estilo inline
        if (!sidebarOpen) {
          mainElement.style.marginLeft = '0 !important';
          mainElement.classList.remove('ml-64');
          mainElement.classList.add('ml-0');
        } else {
          mainElement.style.marginLeft = '16rem !important';
        }
      }
    }
  }, [currentLocation, sidebarOpen]);

  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open);
    
    // Force update main content position immediately
    const mainElement = document.querySelector('main');
    if (mainElement) {
      if (open) {
        mainElement.classList.remove('ml-0');
        mainElement.classList.add('ml-64');
        mainElement.style.marginLeft = '16rem';
        
        // Ocultar el botón flotante cuando el sidebar está abierto
        const toggleBtn = document.getElementById('main-sidebar-toggle');
        if (toggleBtn) {
          toggleBtn.style.display = 'none';
        }
      } else {
        mainElement.classList.remove('ml-64');
        mainElement.classList.add('ml-0');
        mainElement.style.marginLeft = '0';
        
        // Asegurarse de que el botón flotante sea visible 
        // (después de un pequeño retraso para permitir la animación del sidebar)
        setTimeout(() => {
          const toggleBtn = document.getElementById('main-sidebar-toggle');
          if (toggleBtn) {
            toggleBtn.style.display = 'block';
          }
        }, 300);
      }
    }
  }

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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={handleSidebarToggle}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMobile={isMobile}
        />
        
        {/* Botón flotante para cuando el sidebar está cerrado en desktop */}
        {!isMobile && !sidebarOpen && (
          <button 
            onClick={() => handleSidebarToggle(true)}
            className="fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow-md text-primary hover:bg-primary/10 transition-colors sidebar-toggle-btn"
            aria-label="Abrir menú lateral"
            id="main-sidebar-toggle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}

        {/* Main content */}
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isMobile ? 'pt-16' : ''}`}
             style={{ marginLeft: sidebarOpen ? '16rem' : '0' }}>
          <div className="max-w-6xl mx-auto p-4 lg:p-6 transition-all duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
