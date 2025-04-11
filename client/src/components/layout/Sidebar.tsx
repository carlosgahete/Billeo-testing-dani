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
  PieChart,
  TrendingUp,
  ScanLine,
  Plus
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import billeoLogo from '/src/assets/billeo-logo.png';
// Importamos también el logo con espacio en caso de que sea necesario
import billeoLogoAlt from '/src/assets/billeo logo.png';

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

  // Definir el tipo de elemento de navegación
  type NavItem = { href: string; icon: React.ReactNode; label: string };
  
  // Crear items de navegación base
  const baseNavigationItems: NavItem[] = [
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
      href: "/quotes", 
      icon: <FileText size={20} />, 
      label: "Presupuestos" 
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
  
  // Detectar si estamos viendo un usuario específico como administrador
  const currentPath = location;
  
  console.log("Current path:", currentPath);
  
  // Nos aseguramos de que tengamos un usuario identificado
  // No necesitamos esta comprobación aquí, porque se usa más abajo con userIsAdmin y userIsSuperAdmin
  
  // Verificar si la URL contiene un patrón que indique que estamos viendo un usuario específico
  // Patrones posibles:
  // 1. /admin/users/view/123 - Ver detalles de usuario
  // 2. /dashboard/123 - Ver dashboard de un usuario específico
  // 3. /admin/user/123 - Ver cualquier página de usuario
  // 4. /admin/users/123 - Ver cualquier página de usuario
  let viewedUserId = '';
  
  try {
    // Extraer los componentes de la ruta
    const pathParts = currentPath.split('/').filter(part => part.length > 0);
    console.log("Path parts:", pathParts);
    
    // Detectar si estamos impersonando a un cliente
    // Esto puede ocurrir de varias formas según el flujo de la aplicación:
    
    // 1. Si estamos en "/dashboard/123" donde 123 es el ID del usuario
    if (pathParts.length >= 2 && pathParts[0] === 'dashboard' && /^\d+$/.test(pathParts[1])) {
      viewedUserId = pathParts[1];
      console.log("Found client ID in dashboard path:", viewedUserId);
    }
    
    // 2. Patrones de URLs de administración que contengan el ID de un usuario
    else if (pathParts.length >= 3 && 
             (pathParts[0] === 'admin' || pathParts[0] === 'a')) {
      // Si estamos en /admin/users/123 o similares
      const lastPart = pathParts[pathParts.length - 1];
      if (/^\d+$/.test(lastPart)) {
        viewedUserId = lastPart;
        console.log("Found client ID in admin path:", viewedUserId);
      }
    }
    
    // 3. Si estamos en otras rutas pero impersonando a un usuario
    // Aquí podríamos tener una variable en el contexto de la aplicación
    // que indique si estamos impersonando a un usuario
    // Por ahora, solo usamos la detección basada en URL
  } catch (error) {
    console.error("Error al procesar la URL:", error);
  }
  
  console.log("Final viewedUserId:", viewedUserId);
  
  // Verificar si el usuario es superadmin o admin con más detalle
  const userIsSuperAdmin = user && (user.role === 'superadmin' || user.role === 'SUPERADMIN');
  console.log("Usuario actual:", user);
  console.log("Rol del usuario:", user?.role);
  console.log("Usuario es superadmin:", userIsSuperAdmin);
  
  // Verificar si el usuario es admin normal
  const userIsAdmin = user && (user.role === 'admin' || user.role === 'ADMIN');
  console.log("Usuario es admin normal:", userIsAdmin);
  
  // Verificar si está impersonando o viendo un cliente
  const isViewingClient = viewedUserId !== '';
  console.log("ID de cliente siendo visto:", viewedUserId);
  console.log("Está viendo un cliente:", isViewingClient);

  // Elementos de administración
  const adminItems: NavItem[] = [];
  
  // Si es admin o superadmin, mostrar Gestión de Usuarios
  if (userIsAdmin || userIsSuperAdmin) {
    adminItems.push({ 
      href: "/admin/users", 
      icon: <Users size={20} />, 
      label: "Gestión de Usuarios" 
    });
  }
  
  // Añadimos varios enlaces al Libro de Registros para superadmin
  if (userIsSuperAdmin) {
    // Libro de Registros Simple
    adminItems.push({
      href: "/admin/libro-registros-simple/1",  // ID 1 para datos de demo
      icon: <FileText size={20} />,
      label: "Libro Registros (Simple)",
    });
    
    // Libro de Registros Enhanced
    adminItems.push({
      href: "/admin/libro-registros-enhanced/1",  // ID 1 para datos de demo
      icon: <BarChart3 size={20} />,
      label: "Libro Registros (Completo)",
    });
    
    // Libro de Registros original
    adminItems.push({
      href: "/admin/libro-registros/1",  // ID 1 para datos de demo
      icon: <PieChart size={20} />,
      label: "Libro Registros (Original)",
    });
  }
  
  console.log("Admin items:", adminItems);
  
  // Combinar todos los arrays
  const navigationItems: NavItem[] = [...baseNavigationItems, ...adminItems];

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
              src={billeoLogoAlt} 
              alt="Billeo Logo" 
              className="h-6"
              onError={(e) => {
                // Si hay error al cargar la imagen, intentamos con la otra versión
                e.currentTarget.src = billeoLogo;
              }}
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
              src={billeoLogoAlt} 
              alt="Billeo Logo" 
              className="h-6"
              onError={(e) => {
                // Si hay error al cargar la imagen, intentamos con la otra versión
                e.currentTarget.src = billeoLogo;
              }}
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