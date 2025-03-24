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
  <Link href={href}>
    <a
      onClick={onClick}
      className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? "bg-primary-50 text-primary-700"
          : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </a>
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
        {/* Logo */}
        <div className="h-16 px-6 flex items-center border-b border-neutral-200">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-8 w-8 text-primary-700"
          >
            <path 
              d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M3 7L12 13L21 7" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
          <span className="ml-2 text-xl font-semibold text-primary-700">Billeo</span>
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
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-8 w-8 text-primary-700"
            >
              <path 
                d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <path 
                d="M3 7L12 13L21 7" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
            <span className="ml-2 text-xl font-semibold text-primary-700">Billeo</span>
          </div>
          <button
            className="text-neutral-500 p-1 rounded-full hover:bg-neutral-100"
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