import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  BarChart3, 
  Building2, 
  Settings,
  User,
  X,
  LogOut,
  FileText
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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

const NavItem = ({ href, icon, label, isActive, onClick }: NavItemProps) => {
  // Solución específica para la navegación a páginas problemáticas
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
    
    // Si estamos navegando a páginas que necesitan cierre especial del sidebar
    if (href === "/income-expense" || href === "/quotes") {
      // Identificar todos los botones de sidebar y asignarles una clase especial 
      document.querySelectorAll('button[aria-label="Cerrar menú lateral"]').forEach((btn, index) => {
        btn.classList.add('billeo-sidebar-toggle');
      });
      
      // Forzar cierre del sidebar
      setTimeout(() => {
        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.style.marginLeft = '0';
        }
      }, 100);
    }
  };
  
  return (
    <Link 
      href={href} 
      onClick={handleClick}
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
};

const Sidebar = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  mobileMenuOpen, 
  setMobileMenuOpen,
  isMobile 
}: SidebarProps) => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();

  // Cierra el sidebar completamente con un solo clic en cualquier página
  const handleSidebarClose = () => {
    setSidebarOpen(false);
    // Forzar actualización inmediata de la UI para evitar efectos visuales extraños
    requestAnimationFrame(() => {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.style.marginLeft = '0';
      }
    });
  };

  // Close mobile menu when a link is clicked
  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    } else if (location === "/income-expense" || location === "/quotes") {
      // Extra precaución para las páginas problemáticas
      handleSidebarClose();
    }
  };
  
  // Logout functionality
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

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
      href: "/quotes", 
      icon: <FileText size={20} />, 
      label: "Presupuestos" 
    },
    { 
      href: "/income-expense", 
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
            onClick={handleSidebarClose}
            className="text-primary p-1 rounded-md hover:bg-primary/10 transition-colors"
            aria-label="Cerrar menú lateral"
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
        
        {/* User Menu - Desktop */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.profileImage ? user.profileImage : undefined} alt={user?.name || "Usuario"} />
                <AvatarFallback className="text-xs">
                  {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : <User size={20} />}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.name || "Usuario"}</p>
                <p className="text-xs text-neutral-500">{user?.role || "Usuario"}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-neutral-500 hover:text-red-500"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </Button>
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
        
        {/* User Menu - Mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.profileImage ? user.profileImage : undefined} alt={user?.name || "Usuario"} />
                <AvatarFallback className="text-xs">
                  {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : <User size={20} />}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.name || "Usuario"}</p>
                <p className="text-xs text-neutral-500">{user?.role || "Usuario"}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-neutral-500 hover:text-red-500"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;