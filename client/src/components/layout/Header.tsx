import { useState } from "react";
import { Menu, Bell, User } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import billeoLogo from '../../assets/billeo-logo.png';

interface HeaderProps {
  isMobile: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const Header = ({ isMobile, mobileMenuOpen, setMobileMenuOpen }: HeaderProps) => {
  const [, navigate] = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([
    { 
      id: 1, 
      title: 'Factura pendiente', 
      message: 'La factura #F-2023-042 está pendiente de pago', 
      time: '2h', 
      read: false 
    },
    { 
      id: 2, 
      title: 'Recordatorio de impuestos', 
      message: 'El plazo para la declaración trimestral termina en 5 días', 
      time: '1d', 
      read: false 
    },
    { 
      id: 3, 
      title: 'Nuevo movimiento', 
      message: 'Se ha registrado un nuevo ingreso de 1.250€', 
      time: '2d', 
      read: true 
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  return (
    <header className="bg-white shadow-sm z-10 fixed top-0 left-0 right-0">
      <div className="px-4 h-16 flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-primary mr-2 p-1 h-8 w-8"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <Menu size={20} />
          </Button>
        </div>

        <div className="flex items-center">
          <div 
            onClick={() => navigate("/")} 
            className="cursor-pointer transition-opacity hover:opacity-80"
            role="button"
            aria-label="Ir a la página de inicio"
          >
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-8"
              loading="eager"
            />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={24} className="text-primary" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notificaciones</span>
              {unreadCount > 0 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs text-primary-600 h-auto p-0"
                  onClick={markAllAsRead}
                >
                  Marcar todas como leídas
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  No hay notificaciones
                </div>
              ) : (
                notifications.map(notification => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    onClick={() => markAsRead(notification.id)}
                    className={`cursor-pointer ${notification.read ? '' : 'bg-primary-50'}`}
                  >
                    <div className="flex flex-col py-1 w-full">
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-xs text-neutral-500">{notification.time}</div>
                      </div>
                      <div className="text-sm text-neutral-600 mt-1">{notification.message}</div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Button variant="link" className="w-full justify-center h-auto py-2">
                Ver todas las notificaciones
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
