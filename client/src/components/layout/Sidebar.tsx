import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  BarChart3, 
  Building2, 
  Settings,
  User,
  X
} from "lucide-react";
import billeoLogo from '../../assets/billeo-logo.png';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  isMobile: boolean;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem = ({ href, icon, label, isActive, onClick }: NavItemProps) => (
  <Link 
    href={href} 
    onClick={onClick}
    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-neutral-600 hover:bg-neutral-100"
    }`}
  >
    <span className="mr-3">{icon}</span>
    <span>{label}</span>
  </Link>
);

const Sidebar = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  mobileMenuOpen, 
  setMobileMenuOpen,
  isMobile 
}: SidebarProps) => {
  const [location] = useLocation();

  // Close mobile menu when a link is clicked
  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Determine if the element is visible
  const isVisible = isMobile ? mobileMenuOpen : sidebarOpen;

  const navigationItems = [
    { 
      href: "/", 
      icon: <LayoutDashboard size={20} />, 
      label: "Dashboard" 
    },
    { 
      href: "/invoices", 
      icon: <Receipt size={20} />, 
      label: "Facturas" 
    },
    { 
      href: "/transactions", 
      icon: <Wallet size={20} />, 
      label: "Ingresos y Gastos" 
    },
    { 
      href: "/reports", 
      icon: <BarChart3 size={20} />, 
      label: "Informes" 
    },
    { 
      href: "/company", 
      icon: <Building2 size={20} />, 
      label: "Empresa" 
    },
    { 
      href: "/settings", 
      icon: <Settings size={20} />, 
      label: "Configuración" 
    }
  ];

  // Desktop sidebar
  if (!isMobile) {
    return (
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-10 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo and toggle button */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-200">
          <div className="flex items-center">
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-6"
            />
          </div>
          
          {/* Toggle sidebar button - hamburger menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-primary p-1 rounded-md hover:bg-primary/10 transition-colors"
            aria-label={sidebarOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Nav Items */}
        <nav className="p-4 space-y-1">
          {navigationItems.map((item, index) => (
            <NavItem
              key={index}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={location === item.href}
              onClick={handleNavClick}
            />
          ))}
        </nav>
        
        {/* User Menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-700">
              <User size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Ana García</p>
              <p className="text-xs text-neutral-500">Administrador</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Mobile sidebar
  return (
    <>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 z-20 lg:hidden cursor-pointer"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-30 transform transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo with close button */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-200">
          <div className="flex items-center">
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-6"
            />
          </div>
          <button
            className="text-primary p-1 rounded-full hover:bg-primary/10"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Nav Items */}
        <nav className="p-4 space-y-1">
          {navigationItems.map((item, index) => (
            <NavItem
              key={index}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={location === item.href}
              onClick={handleNavClick}
            />
          ))}
        </nav>
        
        {/* User Menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-700">
              <User size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Ana García</p>
              <p className="text-xs text-neutral-500">Administrador</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;