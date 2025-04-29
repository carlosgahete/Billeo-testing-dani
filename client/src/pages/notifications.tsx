import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, Bell, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Interfaz para las notificaciones
interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: "info" | "warning" | "success"; // Tipo opcional para mostrar diferentes iconos
  date?: string; // Fecha completa para mostrar en la vista detallada
}

// Función auxiliar para obtener notificaciones del sessionStorage
const getStoredNotifications = (): Notification[] => {
  try {
    const stored = sessionStorage.getItem('notifications');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error al leer notificaciones:', e);
  }
  
  // Notificaciones por defecto si no hay ninguna guardada
  return [
    { 
      id: 1, 
      title: 'Factura pendiente', 
      message: 'La factura #F-2023-042 está pendiente de pago. Revisala antes de la fecha límite.', 
      time: '2h', 
      read: false,
      type: "warning",
      date: "29 Abr 2025, 12:30"
    },
    { 
      id: 2, 
      title: 'Recordatorio de impuestos', 
      message: 'El plazo para la declaración trimestral termina en 5 días. Asegúrate de tener toda la documentación preparada.', 
      time: '1d', 
      read: false,
      type: "info",
      date: "28 Abr 2025, 09:15"
    },
    { 
      id: 3, 
      title: 'Nuevo movimiento registrado', 
      message: 'Se ha registrado un nuevo ingreso de 1.250€ en tu cuenta asociada.', 
      time: '2d', 
      read: true,
      type: "success",
      date: "27 Abr 2025, 14:45"
    },
    { 
      id: 4, 
      title: 'Factura pagada', 
      message: 'La factura #F-2023-038 ha sido marcada como pagada.', 
      time: '3d', 
      read: true,
      type: "success",
      date: "26 Abr 2025, 11:20"
    },
    { 
      id: 5, 
      title: 'Nuevo cliente registrado', 
      message: 'Se ha añadido un nuevo cliente: "Empresa XYZ, S.L."', 
      time: '1w', 
      read: true,
      type: "info",
      date: "22 Abr 2025, 16:10"
    }
  ];
};

// Función auxiliar para guardar notificaciones en sessionStorage
const storeNotifications = (notifications: Notification[]) => {
  try {
    sessionStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Disparar evento para notificar a otros componentes
    window.dispatchEvent(new Event('notifications-updated'));
  } catch (e) {
    console.error('Error al guardar notificaciones:', e);
  }
};

// Página de notificaciones
export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Estado para almacenar las notificaciones
  const [notifications, setNotifications] = useState<Notification[]>(getStoredNotifications());

  // Contadores para las pestañas
  const unreadCount = notifications.filter(n => !n.read).length;
  const allCount = notifications.length;

  // Función para marcar notificación como leída
  const markAsRead = (id: number) => {
    const updatedNotifications = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    storeNotifications(updatedNotifications);
    
    toast({
      title: "Notificación marcada como leída",
      description: "La notificación ha sido marcada como leída correctamente",
      variant: "default",
    });
  };

  // Función para marcar todas las notificaciones como leídas
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    storeNotifications(updatedNotifications);
    
    toast({
      title: "Notificaciones actualizadas",
      description: "Todas las notificaciones han sido marcadas como leídas",
      variant: "default",
    });
  };

  // Función para eliminar una notificación
  const deleteNotification = (id: number) => {
    const updatedNotifications = notifications.filter(n => n.id !== id);
    setNotifications(updatedNotifications);
    storeNotifications(updatedNotifications);
    
    toast({
      title: "Notificación eliminada",
      description: "La notificación ha sido eliminada correctamente",
      variant: "default",
    });
  };

  // Función para eliminar todas las notificaciones
  const deleteAllNotifications = () => {
    setNotifications([]);
    storeNotifications([]);
    
    toast({
      title: "Notificaciones eliminadas",
      description: "Todas las notificaciones han sido eliminadas",
      variant: "default",
    });
  };

  // Función para obtener el icono según el tipo de notificación
  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "info":
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  // Efecto para sincronizar notificaciones si cambian en el Header
  useEffect(() => {
    const handleStorageChange = () => {
      setNotifications(getStoredNotifications());
    };

    // Evento personalizado para detectar cambios
    window.addEventListener('notifications-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('notifications-updated', handleStorageChange);
    };
  }, []);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
      {/* Encabezado con botón de regreso */}
      <div className="flex items-center mb-4 sm:mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/")}
          className="mr-2 p-1 sm:p-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="text-sm sm:text-base">Volver</span>
        </Button>
        <h1 className="text-xl sm:text-2xl font-semibold">Notificaciones</h1>
      </div>

      {/* Acciones generales - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center mb-4 sm:mb-6">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-primary/5 text-primary">
            {unreadCount} no leídas
          </Badge>
          <Badge variant="outline" className="bg-gray-100">
            {allCount} total
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              className="text-xs sm:text-sm h-8 px-2 sm:px-3"
            >
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Marcar leídas
            </Button>
          )}
          {allCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteAllNotifications}
              className="text-xs sm:text-sm h-8 px-2 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              Eliminar todas
            </Button>
          )}
        </div>
      </div>

      {/* Tabs para filtrar notificaciones */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4 sm:mb-6">
          <TabsTrigger value="all" className="rounded-l-md text-xs sm:text-sm py-1.5">
            Todas ({allCount})
          </TabsTrigger>
          <TabsTrigger value="unread" className="rounded-r-md text-xs sm:text-sm py-1.5">
            No leídas ({unreadCount})
          </TabsTrigger>
        </TabsList>

        {/* Lista de todas las notificaciones */}
        <TabsContent value="all">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500">No hay notificaciones</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className={`overflow-hidden transition-colors ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}>
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-start gap-2 sm:gap-4">
                      <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm sm:text-base truncate">{notification.title}</h3>
                            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-3 sm:line-clamp-2">{notification.message}</p>
                          </div>
                          
                          <div className="flex items-center space-x-1 sm:flex-shrink-0">
                            <span className="text-xs text-gray-500 flex items-center whitespace-nowrap">
                              <Calendar className="h-3 w-3 mr-1" />
                              {notification.date || notification.time}
                            </span>
                            {!notification.read && (
                              <Badge variant="default" className="ml-2 h-2 w-2 p-0 rounded-full" />
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 justify-end mt-2 sm:mt-3">
                          {!notification.read && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => markAsRead(notification.id)}
                              className="h-7 sm:h-8 text-xs text-primary px-2 sm:px-3"
                            >
                              Marcar leída
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-7 sm:h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Lista de notificaciones no leídas */}
        <TabsContent value="unread">
          {unreadCount === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500">No hay notificaciones sin leer</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {notifications
                .filter(notification => !notification.read)
                .map((notification) => (
                  <Card key={notification.id} className="border-l-4 border-l-primary overflow-hidden">
                    <CardContent className="p-3 sm:p-5">
                      <div className="flex items-start gap-2 sm:gap-4">
                        <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1 sm:gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm sm:text-base truncate">{notification.title}</h3>
                              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-3 sm:line-clamp-2">{notification.message}</p>
                            </div>
                            
                            <div className="flex items-center space-x-1 sm:flex-shrink-0">
                              <span className="text-xs text-gray-500 flex items-center whitespace-nowrap">
                                <Calendar className="h-3 w-3 mr-1" />
                                {notification.date || notification.time}
                              </span>
                              <Badge variant="default" className="ml-2 h-2 w-2 p-0 rounded-full" />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 justify-end mt-2 sm:mt-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => markAsRead(notification.id)}
                              className="h-7 sm:h-8 text-xs text-primary px-2 sm:px-3"
                            >
                              Marcar leída
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="h-7 sm:h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3"
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}