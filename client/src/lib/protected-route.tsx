import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { lazy, Suspense } from "react";

// Función de carga optimizada para componentes
const LazyLoader = () => (
  <div className="flex items-center justify-center h-[calc(100vh-200px)]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.FC<{}>;
}) {
  const { user, isLoading } = useAuth();

  // Si estamos cargando los datos del usuario, mostrar un indicador de carga más ligero
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Si no hay usuario, redirigir al inicio de sesión
  if (!user) {
    console.log(`ProtectedRoute: Acceso denegado a ${path} - Usuario no autenticado`);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Usuario autenticado - Renderizar el componente
  console.log(`ProtectedRoute: Acceso permitido a ${path} - Usuario: ${user.username}`);
  return (
    <Route path={path}>
      <Suspense fallback={<LazyLoader />}>
        <Component />
      </Suspense>
    </Route>
  );
}

export function ProtectedAdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.FC<{}>;
}) {
  const { user, isLoading } = useAuth();
  
  // Si estamos cargando los datos del usuario, mostrar un indicador de carga
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Si no hay usuario o no es administrador, redirigir
  if (!user) {
    console.log(`ProtectedAdminRoute: Acceso denegado a ${path} - Usuario no autenticado`);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // Si el usuario no es administrador o superadmin, redirigir al dashboard
  // También permitimos a los usuarios "Superadmin" o "billeo_admin" independientemente de su rol
  if (user.role !== 'admin' && 
      user.role !== 'superadmin' && 
      user.role !== 'SUPERADMIN' && 
      user.username !== 'Superadmin' &&
      user.username !== 'billeo_admin') {
    console.log(`ProtectedAdminRoute: Acceso denegado a ${path} - Usuario ${user.username} no tiene permisos de administrador`);
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  // Usuario administrador autenticado - Renderizar el componente
  console.log(`ProtectedAdminRoute: Acceso permitido a ${path} - Admin: ${user.username}`);
  return (
    <Route path={path}>
      <Suspense fallback={<LazyLoader />}>
        <Component />
      </Suspense>
    </Route>
  );
}