import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import LibroRegistrosSimplePage from "@/pages/admin/libro-registros-simple";

// Componente para acceder al libro de registros del usuario actual
export default function MisRegistrosPage() {
  const { user, isLoading } = useAuth();
  
  // Mostrar loader mientras se obtiene la información del usuario
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Si no hay usuario (no está autenticado), el ProtectedRoute se encargará de redirigirlo
  if (!user) {
    return null;
  }
  
  // Si hay usuario, mostramos su libro de registros pasando su propio ID como parámetro
  return (
    <LibroRegistrosSimplePage 
      params={{userId: user.id.toString()}} 
      forceOwnUser={true} // Parámetro especial para forzar que solo vea sus propios datos
    />
  );
}