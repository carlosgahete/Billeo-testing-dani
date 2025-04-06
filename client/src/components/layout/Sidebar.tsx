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
  FileText,
  Users,
  LineChart,
  PieChart,
  TrendingUp,
  ScanLine,
  Plus
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
  // Solución para la navegación en todas las páginas
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
    
    // No aplicamos ninguna lógica adicional aquí,
    // ya que ahora manejamos el cierre del sidebar en handleNavClick
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
  const { user, logoutMutation, refreshUser } = useAuth();

  // Cierra el sidebar completamente con un solo clic en cualquier página
  const handleSidebarClose = () => {
    setSidebarOpen(false);
    // Forzar actualización inmediata de la UI para evitar efectos visuales extraños
    setTimeout(() => {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.style.marginLeft = '0';
        // Aplicar estilo importante para forzar el cambio
        mainElement.setAttribute('style', 'margin-left: 0 !important');
      }
    }, 10);
  };

  // Close mobile menu when a link is clicked
  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    } else {
      // Siempre cerramos el sidebar al navegar, independientemente de la página
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

  // Crear items de navegación base
  const baseNavigationItems = [
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
      href: "/income-expense", 
      icon: <Wallet size={20} />, 
      label: "Ingresos y Gastos" 
    },
    { 
      href: "/quotes", 
      icon: <FileText size={20} />, 
      label: "Presupuestos" 
    },
    { 
      href: "/analytics", 
      icon: <LineChart size={20} />, 
      label: "Analítica" 
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
  
  // Agregar elementos de administración si el usuario es administrador
  const adminItems = user?.role === 'admin' ? [
    { 
      href: "/admin/users", 
      icon: <Users size={20} />, 
      label: "Gestión de Usuarios" 
    }
  ] : [];
  
  // Combinar ambos arrays
  const navigationItems = [...baseNavigationItems, ...adminItems];

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
          
          {/* Botón de cierre del sidebar */}
          <button
            onClick={handleSidebarClose}
            className="text-primary p-1 rounded-md hover:bg-primary/10 transition-colors"
            aria-label="Cerrar menú lateral"
          >
            <X size={20} />
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
          <div className="flex flex-col space-y-3">
            {/* Usuario y botón de logout */}
            <div className="flex items-center justify-between w-full">
              <Link href="/profile" onClick={handleNavClick}>
                <div className="flex items-center cursor-pointer hover:opacity-90 transition-opacity">
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
              </Link>
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
        
        {/* Botón de escanear documentos */}
        <div className="px-4 pt-4 pb-2">
          <Link href="/document-scan" onClick={handleNavClick}>
            <Button className="w-full font-medium" size="default">
              <ScanLine className="mr-2 h-4 w-4" />
              Escanear gasto
            </Button>
          </Link>
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
          <div className="flex flex-col space-y-3">
            {/* Usuario y botón de logout */}
            <div className="flex items-center justify-between w-full">
              <Link href="/profile" onClick={handleNavClick}>
                <div className="flex items-center cursor-pointer hover:opacity-90 transition-opacity">
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
              </Link>
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
        </div>
      </aside>
    </>
  );
};

export default Sidebar;