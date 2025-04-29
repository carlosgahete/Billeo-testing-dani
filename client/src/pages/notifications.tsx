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

// Página de notificaciones
export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Estado para almacenar las notificaciones (simulado por ahora)
  const [notifications, setNotifications] = useState<Notification[]>([
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
  ]);

  // Contadores para las pestañas
  const unreadCount = notifications.filter(n => !n.read).length;
  const allCount = notifications.length;

  // Función para marcar notificación como leída
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    toast({
      title: "Notificación marcada como leída",
      description: "La notificación ha sido marcada como leída correctamente",
      variant: "default",
    });
  };

  // Función para marcar todas las notificaciones como leídas
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast({
      title: "Notificaciones actualizadas",
      description: "Todas las notificaciones han sido marcadas como leídas",
      variant: "default",
    });
  };

  // Función para eliminar una notificación
  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast({
      title: "Notificación eliminada",
      description: "La notificación ha sido eliminada correctamente",
      variant: "default",
    });
  };

  // Función para eliminar todas las notificaciones
  const deleteAllNotifications = () => {
    setNotifications([]);
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

  // Efectos para sincronizar notificaciones con el Header
  useEffect(() => {
    // Aquí se podría implementar la lógica para cargar las notificaciones desde el servidor
    // o sincronizar con otros componentes
    const storedNotifications = sessionStorage.getItem('notifications');
    if (storedNotifications) {
      try {
        setNotifications(JSON.parse(storedNotifications));
      } catch (e) {
        console.error('Error al cargar notificaciones:', e);
      }
    }
  }, []);

  // Guardar notificaciones en sessionStorage cuando cambien
  useEffect(() => {
    sessionStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Encabezado con botón de regreso */}
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/")}
          className="mr-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
      </div>

      {/* Acciones generales */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-primary/5 text-primary">
            {unreadCount} no leídas
          </Badge>
          <Badge variant="outline" className="bg-gray-100">
            {allCount} total
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              className="text-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
          {allCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteAllNotifications}
              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              Eliminar todas
            </Button>
          )}
        </div>
      </div>

      {/* Tabs para filtrar notificaciones */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 mb-6">
          <TabsTrigger value="all" className="rounded-l-md">
            Todas ({allCount})
          </TabsTrigger>
          <TabsTrigger value="unread" className="rounded-r-md">
            No leídas ({unreadCount})
          </TabsTrigger>
        </TabsList>

        {/* Lista de todas las notificaciones */}
        <TabsContent value="all">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay notificaciones</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className={`overflow-hidden transition-colors ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{notification.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {notification.date || notification.time}
                            </span>
                            {!notification.read && (
                              <Badge variant="default" className="ml-2 h-2 w-2 p-0 rounded-full" />
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end mt-3">
                          {!notification.read && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => markAsRead(notification.id)}
                              className="h-8 text-xs text-primary"
                            >
                              Marcar como leída
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
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
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay notificaciones sin leer</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications
                .filter(notification => !notification.read)
                .map((notification) => (
                  <Card key={notification.id} className="border-l-4 border-l-primary overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{notification.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {notification.date || notification.time}
                              </span>
                              <Badge variant="default" className="ml-2 h-2 w-2 p-0 rounded-full" />
                            </div>
                          </div>

                          <div className="flex justify-end mt-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => markAsRead(notification.id)}
                              className="h-8 text-xs text-primary"
                            >
                              Marcar como leída
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
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