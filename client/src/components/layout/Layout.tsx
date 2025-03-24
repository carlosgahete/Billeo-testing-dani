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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isMobile={isMobile}
        />

        {/* Main content */}
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isMobile ? 'pt-16' : ''} ${!isMobile && !sidebarOpen ? 'ml-0' : ''}`}>
          {/* Toggle sidebar button for desktop when sidebar is closed */}
          {!isMobile && !sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow-md hover:bg-neutral-100 transition-colors"
              aria-label="Abrir menú lateral"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}
          <div className={`p-4 lg:p-6 transition-all duration-300 ${!isMobile && !sidebarOpen ? 'ml-0' : ''}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
